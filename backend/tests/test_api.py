import pytest
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.db.seed import init_db
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    db = SessionLocal()
    init_db(db)
    db.close()

def test_health_check():
    response = client.get("/api/v1/status/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "CEEP+" in data["projeto"]

def test_login_success_aluno():
    response = client.post("/api/v1/auth/login", json={
        "email": "aluno@ceep.demo",
        "password": "demo123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ALUNO"
    assert data["nome"] == "Aluno Demo"

def test_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "aluno@ceep.demo",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "incorretos" in response.json()["detail"]

def test_unauthenticated_request_rejected():
    response = client.get("/api/v1/student/dashboard")
    assert response.status_code == 403 or response.status_code == 401

def test_student_can_list_tasks():
    login_resp = client.post("/api/v1/auth/login", json={"email": "aluno@ceep.demo", "password": "demo123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/tasks/", headers=headers)
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) >= 3
    # Todas as tarefas retornadas pertencem ao aluno logado
    titles = [t["titulo"] for t in tasks]
    assert "Trabalho de Banco de Dados" in titles
    assert "Maquete Estrutural — Edificações" not in titles # Pertence a outro aluno

def test_student_can_toggle_own_task():
    login_resp = client.post("/api/v1/auth/login", json={"email": "aluno@ceep.demo", "password": "demo123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Pega uma tarefa
    list_resp = client.get("/api/v1/tasks/", headers=headers)
    task = list_resp.json()[0]
    initial_status = task["status"]

    # 2. Toggle status
    toggle_resp = client.patch(f"/api/v1/tasks/{task['id']}/toggle", headers=headers)
    assert toggle_resp.status_code == 200
    updated_task = toggle_resp.json()
    assert updated_task["status"] != initial_status

    # 3. Toggle de volta para restaurar
    restore_resp = client.patch(f"/api/v1/tasks/{task['id']}/toggle", headers=headers)
    assert restore_resp.status_code == 200
    assert restore_resp.json()["status"] == initial_status

def test_student_cannot_toggle_other_student_task():
    # 1. Login como Aluno Demo
    login_resp = client.post("/api/v1/auth/login", json={"email": "aluno@ceep.demo", "password": "demo123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Localiza no banco a tarefa que pertence a Outro Aluno Demo
    db = SessionLocal()
    other_user = db.query(Usuario).filter(Usuario.email == "outro.aluno@ceep.demo").first()
    other_task = db.query(Tarefa).filter(Tarefa.aluno_id == other_user.id).first()
    db.close()

    assert other_task is not None

    # 3. Aluno Demo tenta alterar a tarefa do Outro Aluno -> 404 Not Found
    resp = client.patch(f"/api/v1/tasks/{other_task.id}/toggle", headers=headers)
    assert resp.status_code == 404
    assert "não pertence" in resp.json()["detail"] or "não encontrada" in resp.json()["detail"]

def test_rbac_student_denied_management_endpoint():
    login_resp = client.post("/api/v1/auth/login", json={"email": "aluno@ceep.demo", "password": "demo123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    mgmt_resp = client.get("/api/v1/management/overview", headers=headers)
    assert mgmt_resp.status_code == 403
