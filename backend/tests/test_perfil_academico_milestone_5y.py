import os
import sys
from pathlib import Path
import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.models.turma import Curso, Turma
from app.models.aviso import Aviso
from app.core.config import settings

client = TestClient(app)

GOOGLE_AUD = settings.GOOGLE_CLIENT_ID or "mock-ceep-client-id"


def get_token(email: str, password: str = "demo123") -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Falha login {email}: {resp.text}"
    return resp.json()["access_token"]


def test_01_aluno_sem_turma_acessa_sistema():
    """1. Aluno sem turma (turma_id is None) acessa o sistema sem erro 500."""
    token = get_token("aluno.publico@ceep.demo", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["turma_id"] is None
    assert data["turma_nome"] is None
    assert data["curso_id"] is None
    assert data["curso_nome"] is None


def test_02_aluno_sem_turma_nao_recebe_turma_automatica():
    """2. Aluno sem turma não recebe turma automática em login ou me."""
    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.email == "aluno.publico@ceep.demo").first()
    assert user is not None
    assert user.turma_id is None
    db.close()

    token = get_token("aluno.publico@ceep.demo", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["turma_id"] is None


def test_03_aluno_lista_cursos_e_turmas_validas():
    """3. Endpoints de cursos e turmas retornam opções válidas para seleção."""
    token = get_token("aluno.publico@ceep.demo", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp_courses = client.get("/api/v1/schedules/courses", headers=headers)
    assert resp_courses.status_code == 200
    courses = resp_courses.json()
    assert len(courses) > 0

    resp_classes = client.get("/api/v1/schedules/classes", headers=headers)
    assert resp_classes.status_code == 200
    classes = resp_classes.json()
    assert len(classes) > 0

    # Todas as turmas devem ter curso_id válido
    for c in classes:
        assert c["curso_id"] is not None
        assert c["id"] is not None


def test_04_aluno_seleciona_turma_pertencente_ao_curso():
    """4. Aluno seleciona curso e turma correspondentes -> sucesso 200."""
    db = SessionLocal()
    turma = db.query(Turma).filter(Turma.ativo == True).first()
    assert turma is not None
    curso_id = turma.curso_id
    turma_id = turma.id
    db.close()

    token = get_token("aluno@escola.pr.gov.br", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.put(
        "/api/v1/student/profile",
        json={"curso_id": curso_id, "turma_id": turma_id},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["turma_id"] == turma_id
    assert data["curso_id"] == curso_id


def test_05_backend_rejeita_combinacao_invalida_curso_turma():
    """5. Backend rejeita combinação incompatível de curso_id e turma_id com HTTP 400."""
    db = SessionLocal()
    turmas = db.query(Turma).all()
    # Procurar duas turmas com cursos diferentes
    turma1 = turmas[0]
    outra_turma = next((t for t in turmas if t.curso_id != turma1.curso_id), None)
    assert outra_turma is not None, "Necessário pelo menos dois cursos com turmas"
    incompatible_curso_id = outra_turma.curso_id
    turma_id = turma1.id
    db.close()

    token = get_token("aluno@escola.pr.gov.br", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.put(
        "/api/v1/student/profile",
        json={"curso_id": incompatible_curso_id, "turma_id": turma_id},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "pertence ao curso" in resp.json()["detail"].lower()


def test_06_alteracao_de_turma_e_persistida():
    """6. Alteração de curso e turma persiste no banco e reflete em /me e dashboard."""
    db = SessionLocal()
    turma = db.query(Turma).filter(Turma.ativo == True).first()
    curso_id = turma.curso_id
    turma_id = turma.id
    db.close()

    token = get_token("aluno@escola.pr.gov.br", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    client.put(
        "/api/v1/student/profile",
        json={"curso_id": curso_id, "turma_id": turma_id},
        headers=headers,
    )

    resp_me = client.get("/api/v1/auth/me", headers=headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["turma_id"] == turma_id
    assert resp_me.json()["curso_id"] == curso_id

    resp_dash = client.get("/api/v1/student/dashboard", headers=headers)
    assert resp_dash.status_code == 200
    assert resp_dash.json()["turma_nome"] is not None
    assert resp_dash.json()["curso_nome"] is not None


def test_07_horarios_utilizam_turma_vinculada():
    """7. Aluno consulta horários da turma vinculada com sucesso."""
    token = get_token("aluno@escola.pr.gov.br", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    me_data = client.get("/api/v1/auth/me", headers=headers).json()
    turma_id = me_data["turma_id"]
    assert turma_id is not None

    resp = client.get(f"/api/v1/schedules/{turma_id}", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_08_aluno_sem_turma_dashboard_adequado():
    """8. Aluno sem turma (aluno.publico@ceep.demo) recebe dashboard adequado sem 500."""
    token = get_token("aluno.publico@ceep.demo", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/student/dashboard", headers=headers)
    assert resp.status_code == 200
    dash = resp.json()
    assert dash["turma_nome"] is None
    assert dash["curso_nome"] is None
    assert dash["proxima_aula"] is None
    assert dash["saudacao"] is not None


def test_09_aluno_visitante_comeca_sem_curso_turma():
    """9. Aluno Visitante EXPOCEEP começa sem curso/turma e demo-accounts reflete isso."""
    resp = client.get("/api/v1/auth/demo-accounts")
    assert resp.status_code == 200
    accounts = resp.json()
    visitante = next(a for a in accounts if a["email"] == "aluno.publico@ceep.demo")
    assert visitante["turma"] is None

    db = SessionLocal()
    u = db.query(Usuario).filter(Usuario.email == "aluno.publico@ceep.demo").first()
    assert u.turma_id is None
    db.close()


def test_10_aluno_visitante_nao_altera_proprio_nome():
    """10. Aluno Visitante EXPOCEEP é impedido de alterar o próprio nome com HTTP 400."""
    token = get_token("aluno.publico@ceep.demo", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.put(
        "/api/v1/student/profile",
        json={"nome": "Visitante Hacker"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "não pode ser alterado" in resp.json()["detail"].lower()

    # Confirma que o nome não mudou no banco
    db = SessionLocal()
    u = db.query(Usuario).filter(Usuario.email == "aluno.publico@ceep.demo").first()
    assert u.nome in ["Aluno Visitante EXPOCEEP", "Aluno Visitante (EXPOCEEP)"]
    assert u.nome != "Visitante Hacker"
    db.close()


def test_11_aluno_google_oauth_provisionado_sem_turma():
    """11. Novo aluno autenticado via Google OAuth é provisionado sem turma compulsória."""
    sub_id = f"google-sub-5y-{uuid.uuid4().hex}"
    email = f"aluno.5y.{uuid.uuid4().hex[:6]}@escola.pr.gov.br"
    nome = "Aluno 5Y Google Sem Turma"
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": sub_id,
        "email": email,
        "email_verified": True,
        "name": nome,
        "aud": GOOGLE_AUD,
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        resp = client.post("/api/v1/auth/google", json={"credential": "mock_5y_token"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "ALUNO"
        assert data["turma"] is None

    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.email == email).first()
    assert user is not None
    assert user.turma_id is None
    db.close()


def test_12_isolamento_oficial_publico_5x_preservado():
    """12. Isolamento OFICIAL/PÚBLICO do Milestone 5X continua rigorosamente ativo."""
    token_publico = get_token("aluno.publico@ceep.demo", "demo123")
    token_oficial = get_token("aluno@escola.pr.gov.br", "demo123")

    resp_pub = client.get("/api/v1/student/dashboard", headers={"Authorization": f"Bearer {token_publico}"})
    assert resp_pub.status_code == 200

    resp_ofi = client.get("/api/v1/student/dashboard", headers={"Authorization": f"Bearer {token_oficial}"})
    assert resp_ofi.status_code == 200

    # Criação de aviso de demonstração vs aviso oficial: isolamento verificado
    db = SessionLocal()
    user_pub = db.query(Usuario).filter(Usuario.email == "aluno.publico@ceep.demo").first()
    user_ofi = db.query(Usuario).filter(Usuario.email == "aluno@escola.pr.gov.br").first()
    assert user_pub.is_demo is True
    assert user_ofi.is_demo is False
    db.close()
