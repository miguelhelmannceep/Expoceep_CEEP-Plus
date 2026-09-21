import pytest
import uuid
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.db.seed import init_db
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa
from app.models.produto import Produto
from app.models.pedido import Pedido, Pagamento, PedidoItem

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    db = SessionLocal()
    init_db(db)
    db.close()

def get_auth_token(email: str = "aluno@escola.pr.gov.br", password: str = "demo123") -> str:
    if email == "aluno@ceep.demo":
        email = "aluno@escola.pr.gov.br"
    elif email == "outro.aluno@ceep.demo":
        email = "outro.aluno@escola.pr.gov.br"
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

# ==========================================
# TESTES DE AUTENTICAÇÃO E PERMISSÕES BÁSICAS
# ==========================================

def test_health_check():
    response = client.get("/api/v1/status/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "CEEP+" in data["projeto"]

def test_login_success_aluno_escola_pr_gov_br():
    response = client.post("/api/v1/auth/login", json={
        "email": "aluno@escola.pr.gov.br",
        "password": "demo123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ALUNO"
    assert data["nome"] == "Aluno Demo"

def test_login_student_any_escola_pr_gov_br_allowed():
    unique_email = f"novo.estudante.{uuid.uuid4().hex[:6]}@escola.pr.gov.br"
    response = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "qualquer_senha"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ALUNO"
    assert data["email"] == unique_email.lower()

def test_login_student_gmail_rejected():
    response = client.post("/api/v1/auth/login", json={
        "email": "aluno@gmail.com",
        "password": "demo123"
    })
    assert response.status_code == 401
    assert "incorretos" in response.json()["detail"].lower()

def test_login_student_other_common_domains_rejected():
    for bad_email in ["estudante@hotmail.com", "aluno@outlook.com", "aluno@yahoo.com", "aluno@uol.com.br"]:
        response = client.post("/api/v1/auth/login", json={
            "email": bad_email,
            "password": "demo123"
        })
        assert response.status_code == 401
        assert "incorretos" in response.json()["detail"].lower()

def test_login_success_gestao_authorized():
    response = client.post("/api/v1/auth/login", json={
        "email": "gestao@ceep.demo",
        "password": "demo123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "GESTAO"

def test_login_gestao_unauthorized_email_rejected():
    for unauthorized_email in ["gestao@gmail.com", "diretoria@escola.pr.gov.br", "gestao2@ceep.demo", "admin@ceep.demo"]:
        # Se for @escola.pr.gov.br loga como ALUNO, mas não como GESTAO
        resp = client.post("/api/v1/auth/login", json={
            "email": unauthorized_email,
            "password": "demo123"
        })
        if unauthorized_email.endswith("@escola.pr.gov.br"):
            assert resp.status_code == 200
            assert resp.json()["role"] == "ALUNO"  # Nunca GESTAO
        else:
            assert resp.status_code == 401

def test_login_gestao_wrong_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "gestao@ceep.demo",
        "password": "senha_errada"
    })
    assert response.status_code == 401

def test_login_success_cantina_authorized():
    response = client.post("/api/v1/auth/login", json={
        "email": "cantina@ceep.demo",
        "password": "demo123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "CANTINA"

def test_login_cantina_unauthorized_email_rejected():
    for unauthorized in ["cantina@gmail.com", "cantina2@ceep.demo", "atendente@ceep.demo"]:
        resp = client.post("/api/v1/auth/login", json={
            "email": unauthorized,
            "password": "demo123"
        })
        assert resp.status_code == 401

def test_login_cantina_wrong_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "cantina@ceep.demo",
        "password": "senha_errada"
    })
    assert response.status_code == 401

def test_login_invalid_password_existing_user():
    response = client.post("/api/v1/auth/login", json={
        "email": "aluno@escola.pr.gov.br",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "incorretos" in response.json()["detail"]

def test_unauthenticated_request_rejected():
    response = client.get("/api/v1/student/dashboard")
    assert response.status_code in (401, 403)

def test_student_can_list_tasks():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/tasks/", headers=headers)
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) >= 3
    titles = [t["titulo"] for t in tasks]
    assert "Trabalho de Banco de Dados" in titles
    assert "Maquete Estrutural — Edificações" not in titles

def test_student_can_toggle_own_task():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    list_resp = client.get("/api/v1/tasks/", headers=headers)
    task = list_resp.json()[0]
    initial_status = task["status"]

    toggle_resp = client.patch(f"/api/v1/tasks/{task['id']}/toggle", headers=headers)
    assert toggle_resp.status_code == 200
    updated_task = toggle_resp.json()
    assert updated_task["status"] != initial_status

    restore_resp = client.patch(f"/api/v1/tasks/{task['id']}/toggle", headers=headers)
    assert restore_resp.status_code == 200
    assert restore_resp.json()["status"] == initial_status

def test_student_cannot_toggle_other_student_task():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    other_user = db.query(Usuario).filter((Usuario.email == "outro.aluno@escola.pr.gov.br") | (Usuario.email == "outro.aluno@ceep.demo")).first()
    other_task = db.query(Tarefa).filter(Tarefa.aluno_id == other_user.id).first()
    db.close()

    assert other_task is not None

    resp = client.patch(f"/api/v1/tasks/{other_task.id}/toggle", headers=headers)
    assert resp.status_code == 404

def test_student_can_create_task():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "titulo": "Nova Tarefa de Teste",
        "descricao": "Detalhes da tarefa criada pelo aluno",
        "data_entrega": "2026-10-15",
        "prioridade": "ALTA"
    }

    resp = client.post("/api/v1/tasks/", json=payload, headers=headers)
    assert resp.status_code == 201
    created_task = resp.json()

    assert created_task["id"] is not None
    assert created_task["titulo"] == "Nova Tarefa de Teste"
    assert created_task["descricao"] == "Detalhes da tarefa criada pelo aluno"
    assert created_task["status"] == "PENDENTE"
    assert created_task["prioridade"] == "ALTA"

    # Confere no banco de dados se pertence ao aluno autenticado
    db = SessionLocal()
    aluno_user = db.query(Usuario).filter((Usuario.email == "aluno@escola.pr.gov.br") | (Usuario.email == "aluno@ceep.demo")).first()
    db_task = db.query(Tarefa).filter(Tarefa.id == created_task["id"]).first()
    assert db_task is not None
    assert aluno_user is not None
    assert db_task.aluno_id == aluno_user.id
    db.close()

def test_task_creation_requires_title():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    # Título vazio
    resp_empty = client.post("/api/v1/tasks/", json={"titulo": "   "}, headers=headers)
    assert resp_empty.status_code in (400, 422)

    # Título ausente
    resp_missing = client.post("/api/v1/tasks/", json={"descricao": "Sem título"}, headers=headers)
    assert resp_missing.status_code == 422

def test_unauthenticated_cannot_create_task():
    resp = client.post("/api/v1/tasks/", json={"titulo": "Tarefa Não Autenticada"})
    assert resp.status_code in (401, 403)

def test_student_cannot_toggle_task_created_by_another_student():
    token_a = get_auth_token("aluno@ceep.demo")
    token_b = get_auth_token("outro.aluno@ceep.demo")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Aluno A cria tarefa
    create_resp = client.post("/api/v1/tasks/", json={"titulo": "Tarefa do Aluno A", "prioridade": "MEDIA"}, headers=headers_a)
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    # Aluno B tenta alternar o status da tarefa do Aluno A -> 404
    toggle_resp = client.patch(f"/api/v1/tasks/{task_id}/toggle", headers=headers_b)
    assert toggle_resp.status_code == 404

def test_student_can_delete_own_task():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post("/api/v1/tasks/", json={"titulo": "Tarefa para Excluir", "prioridade": "BAIXA"}, headers=headers)
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    # Exclui a própria tarefa
    del_resp = client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
    assert del_resp.status_code == 204

    # Confere no banco de dados que foi removida
    db = SessionLocal()
    db_task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    db.close()
    assert db_task is None

def test_student_cannot_delete_task_created_by_another_student():
    token_a = get_auth_token("aluno@ceep.demo")
    token_b = get_auth_token("outro.aluno@ceep.demo")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    create_resp = client.post("/api/v1/tasks/", json={"titulo": "Tarefa Segura Aluno A"}, headers=headers_a)
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    # Aluno B tenta excluir a tarefa do Aluno A -> 404
    del_resp = client.delete(f"/api/v1/tasks/{task_id}", headers=headers_b)
    assert del_resp.status_code == 404

    # Confere que a tarefa ainda existe no banco
    db = SessionLocal()
    db_task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    db.close()
    assert db_task is not None

def test_unauthenticated_cannot_delete_task():
    del_resp = client.delete("/api/v1/tasks/99999")
    assert del_resp.status_code in (401, 403)

def test_rbac_student_denied_management_endpoint():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    mgmt_resp = client.get("/api/v1/management/overview", headers=headers)
    assert mgmt_resp.status_code == 403


# ==========================================
# MILESTONE 2A: CANTEEN ORDER & PAYMENT TESTS
# ==========================================

def test_canteen_student_can_create_order():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()
    assert salgado is not None

    payload = {"produto_id": salgado.id, "quantidade": 1}
    resp = client.post("/api/v1/canteen/orders", json=payload, headers=headers)
    assert resp.status_code == 201
    order = resp.json()

    assert order["id"] is not None
    assert order["status"] == "PENDENTE_PAGAMENTO"
    assert order["valor_total"] == 8.00
    assert len(order["itens"]) == 1
    assert order["itens"][0]["produto_id"] == salgado.id
    assert order["itens"][0]["preco_unitario"] == 8.00
    assert order["pagamento"] is not None
    assert order["pagamento"]["status"] == "PENDENTE"
    assert order["pagamento"]["metodo"] == "PIX_SIMULADO"
    assert order["pagamento"]["valor"] == 8.00
    assert "CEEPPLUS-DEMO-PAYMENT-" in order["pix_code"]

def test_canteen_order_price_derived_from_database():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    payload = {"produto_id": salgado.id, "quantidade": 2, "preco": 0.01, "valor_total": 0.01}
    resp = client.post("/api/v1/canteen/orders", json=payload, headers=headers)
    assert resp.status_code == 201
    order = resp.json()
    assert order["valor_total"] == 16.00
    assert order["pagamento"]["valor"] == 16.00

def test_canteen_order_belongs_to_authenticated_user():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    aluno_user = db.query(Usuario).filter((Usuario.email == "aluno@escola.pr.gov.br") | (Usuario.email == "aluno@ceep.demo")).first()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()
    assert aluno_user is not None

    payload = {"produto_id": salgado.id, "quantidade": 1}
    resp = client.post("/api/v1/canteen/orders", json=payload, headers=headers)
    assert resp.status_code == 201
    order = resp.json()
    assert order["usuario_id"] == aluno_user.id

def test_canteen_payment_starts_pending():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers)
    order = resp.json()
    assert order["pagamento"]["status"] == "PENDENTE"
    assert order["pagamento"]["paid_at"] is None

def test_canteen_student_simulate_payment_success():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order_resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers)
    order_id = order_resp.json()["id"]

    sim_resp = client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers)
    assert sim_resp.status_code == 200
    paid_order = sim_resp.json()

    assert paid_order["status"] == "PAGO"
    assert paid_order["pagamento"]["status"] == "APROVADO"
    assert paid_order["pagamento"]["paid_at"] is not None

def test_canteen_simulate_payment_idempotent():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order_resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers)
    order_id = order_resp.json()["id"]

    sim1 = client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers)
    assert sim1.status_code == 200

    sim2 = client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers)
    assert sim2.status_code == 200
    assert sim2.json()["status"] == "PAGO"
    assert sim2.json()["pagamento"]["status"] == "APROVADO"

def test_canteen_isolation_student_a_cannot_access_or_pay_student_b_order():
    token_a = get_auth_token("aluno@ceep.demo")
    token_b = get_auth_token("outro.aluno@ceep.demo")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order_a = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_a).json()
    order_a_id = order_a["id"]

    get_resp = client.get(f"/api/v1/canteen/orders/{order_a_id}", headers=headers_b)
    assert get_resp.status_code == 404

    sim_resp = client.post(f"/api/v1/canteen/orders/{order_a_id}/simulate-payment", headers=headers_b)
    assert sim_resp.status_code == 404

def test_canteen_unauthenticated_cannot_create_order():
    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1})
    assert resp.status_code in (401, 403)

def test_canteen_gestao_cannot_create_order():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers = {"Authorization": f"Bearer {token_gestao}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers)
    assert resp.status_code == 403

def test_canteen_staff_cannot_create_order():
    token_cantina = get_auth_token("cantina@ceep.demo")
    headers = {"Authorization": f"Bearer {token_cantina}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers)
    assert resp.status_code == 403

def test_canteen_transaction_consistency():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers)
    order_id = resp.json()["id"]

    db = SessionLocal()
    db_pedido = db.query(Pedido).filter(Pedido.id == order_id).first()
    assert db_pedido is not None
    assert db_pedido.valor_total == 8.00
    assert len(db_pedido.itens) == 1
    assert len(db_pedido.pagamentos) == 1
    assert db_pedido.pagamentos[0].status == "PENDENTE"
    db.close()

def test_canteen_student_can_list_own_orders():
    token = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/canteen/orders", headers=headers)
    assert resp.status_code == 200
    orders = resp.json()
    assert isinstance(orders, list)
    assert len(orders) >= 1

# ==========================================
# MILESTONE 2B: PICKUP QR CODE & SCANNER TESTS
# ==========================================

def test_canteen_paid_order_can_get_pickup_qr():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    # 1. Cria pedido
    order_resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_aluno)
    order_id = order_resp.json()["id"]

    # 2. Paga pedido
    client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers_aluno)

    # 3. Obtém QR de retirada
    qr_resp = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno)
    assert qr_resp.status_code == 200
    qr_data = qr_resp.json()

    assert qr_data["order_id"] == order_id
    assert qr_data["status"] == "PAGO"
    assert "CEEPPLUS-PICKUP-" in qr_data["pickup_code"]
    assert qr_data["pickup_token"] is not None

def test_canteen_unpaid_order_cannot_get_pickup_qr():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order_resp = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_aluno)
    order_id = order_resp.json()["id"]

    qr_resp = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno)
    assert qr_resp.status_code == 400
    assert "não aprovado" in qr_resp.json()["detail"]

def test_canteen_student_cannot_get_other_student_pickup_qr():
    token_a = get_auth_token("aluno@ceep.demo")
    token_b = get_auth_token("outro.aluno@ceep.demo")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order_a = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_a).json()
    order_a_id = order_a["id"]
    client.post(f"/api/v1/canteen/orders/{order_a_id}/simulate-payment", headers=headers_a)

    qr_resp = client.get(f"/api/v1/canteen/orders/{order_a_id}/pickup-qr", headers=headers_b)
    assert qr_resp.status_code == 404

def test_canteen_validate_invalid_qr_code_rejected():
    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": "CEEPPLUS-PICKUP-invalidtoken123"}, headers=headers_cantina)
    assert resp.status_code == 404
    assert "QR CODE INVÁLIDO" in resp.json()["detail"]

def test_canteen_validate_valid_qr_code_success():
    token_aluno = get_auth_token("aluno@ceep.demo")
    token_cantina = get_auth_token("cantina@ceep.demo")

    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_aluno).json()
    order_id = order["id"]
    client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers_aluno)

    qr_data = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno).json()
    pickup_code = qr_data["pickup_code"]

    val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert val_resp.status_code == 200
    val_data = val_resp.json()

    assert val_data["order_id"] == order_id
    assert val_data["status_validacao"] == "DISPONIVEL"
    assert val_data["produto_nome"] == "Salgado"
    assert val_data["valor_total"] == 8.00

def test_canteen_only_canteen_role_can_validate_and_confirm():
    token_aluno = get_auth_token("aluno@ceep.demo")
    token_gestao = get_auth_token("gestao@ceep.demo")

    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Tentativa de validar por aluno -> 403
    val_aluno = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": "CEEPPLUS-PICKUP-token"}, headers=headers_aluno)
    assert val_aluno.status_code == 403

    # Tentativa de validar por gestao -> 403
    val_gestao = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": "CEEPPLUS-PICKUP-token"}, headers=headers_gestao)
    assert val_gestao.status_code == 403

    # Tentativa de confirmar retirada por aluno -> 403
    conf_aluno = client.post("/api/v1/canteen/pickup/1/confirm", headers=headers_aluno)
    assert conf_aluno.status_code == 403

    # Tentativa de confirmar retirada por gestao -> 403
    conf_gestao = client.post("/api/v1/canteen/pickup/1/confirm", headers=headers_gestao)
    assert conf_gestao.status_code == 403

def test_canteen_full_pickup_flow_and_double_use_prevention():
    token_aluno = get_auth_token("aluno@ceep.demo")
    token_cantina = get_auth_token("cantina@ceep.demo")

    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    # 1. Aluno cria e paga o pedido
    order = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_aluno).json()
    order_id = order["id"]
    client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers_aluno)

    # 2. Aluno obtém QR de retirada
    qr_data = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno).json()
    pickup_code = qr_data["pickup_code"]

    # 3. Cantina valida o QR
    val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert val_resp.status_code == 200
    assert val_resp.json()["status_validacao"] == "DISPONIVEL"

    # 4. Cantina confirma retirada
    conf_resp = client.post(f"/api/v1/canteen/pickup/{order_id}/confirm", headers=headers_cantina)
    assert conf_resp.status_code == 200
    assert conf_resp.json()["status"] == "UTILIZADO"
    assert conf_resp.json()["used_at"] is not None

    # 5. Tentativa de revalidar o mesmo QR pelo scanner -> Rejeitado
    reval_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert reval_resp.status_code == 400
    assert "PEDIDO JÁ UTILIZADO" in reval_resp.json()["detail"]

    # 6. Tentativa de reconfirmar retirada do mesmo pedido -> Rejeitado
    reconf_resp = client.post(f"/api/v1/canteen/pickup/{order_id}/confirm", headers=headers_cantina)
    assert reconf_resp.status_code == 400
    assert "PEDIDO JÁ UTILIZADO" in reconf_resp.json()["detail"]

    # 7. Aluno tenta gerar QR de pedido já utilizado -> Rejeitado
    qr_again = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno)
    assert qr_again.status_code == 400

# ==========================================
# MILESTONE 3A: MANAGEMENT DASHBOARD TESTS
# ==========================================

def test_management_overview_success_gestao():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/overview", headers=headers_gestao)
    assert resp.status_code == 200
    data = resp.json()

    assert data["gestor"] == "Gestão Demo"
    assert data["total_turmas"] >= 3
    assert data["total_alunos"] >= 2
    assert data["total_avisos"] >= 4
    assert "cantina_resumo" in data
    assert "total_pedidos" in data["cantina_resumo"]
    assert "pedidos_pagos" in data["cantina_resumo"]
    assert "pedidos_utilizados" in data["cantina_resumo"]
    assert "pedidos_pendentes" in data["cantina_resumo"]
    assert "receita_confirmada" in data["cantina_resumo"]
    assert isinstance(data["avisos_recentes"], list)
    assert len(data["avisos_recentes"]) >= 1
    assert data["status_sistema"] == "Estável"

def test_management_overview_forbidden_aluno():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    resp = client.get("/api/v1/management/overview", headers=headers_aluno)
    assert resp.status_code == 403

def test_management_overview_forbidden_cantina():
    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    resp = client.get("/api/v1/management/overview", headers=headers_cantina)
    assert resp.status_code == 403

def test_management_overview_unauthenticated():
    resp = client.get("/api/v1/management/overview")
    assert resp.status_code in (401, 403)

def test_management_overview_metrics_accuracy():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Pega métricas antes
    overview_before = client.get("/api/v1/management/overview", headers=headers_gestao).json()
    pedidos_before = overview_before["cantina_resumo"]["total_pedidos"]

    # Cria um novo pedido como aluno
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome == "Salgado").first()
    db.close()

    order = client.post("/api/v1/canteen/orders", json={"produto_id": salgado.id, "quantidade": 1}, headers=headers_aluno).json()

    # Confere se métricas no overview da gestão refletem o novo pedido em tempo real
    overview_after = client.get("/api/v1/management/overview", headers=headers_gestao).json()
    assert overview_after["cantina_resumo"]["total_pedidos"] == pedidos_before + 1


# ==========================================
# MILESTONE 3B: NOTICE MANAGEMENT TESTS
# ==========================================

def test_management_can_list_all_notices():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/notices/management/all", headers=headers_gestao)
    assert resp.status_code == 200
    notices = resp.json()
    assert isinstance(notices, list)
    assert len(notices) >= 4
    for n in notices:
        assert "id" in n
        assert "titulo" in n
        assert "descricao" in n
        assert "prioridade" in n
        assert "publico_alvo_tipo" in n
        assert "status" in n

def test_student_only_sees_published_and_segmented_notices():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    resp = client.get("/api/v1/notices/", headers=headers_aluno)
    assert resp.status_code == 200
    notices = resp.json()
    assert len(notices) >= 1
    
    # Aluno nunca deve receber avisos em RASCUNHO
    for n in notices:
        assert n["status"] == "PUBLICADO"

    titles = [n["titulo"] for n in notices]
    # Avisos válidos para o aluno (GERAL, Curso DS ou Turma INFO 3A)
    assert any("ExpoCEEP" in t or "Tecnologia" in t or "Biblioteca" in t for t in titles)

def test_management_can_create_notice_geral():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    payload = {
        "titulo": "Aviso Teste Geral Gestão",
        "descricao": "Conteúdo descritivo para toda a escola.",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "publico_alvo_id": None,
        "status": "PUBLICADO"
    }

    resp = client.post("/api/v1/notices/", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    created = resp.json()
    assert created["id"] is not None
    assert created["titulo"] == "Aviso Teste Geral Gestão"
    assert created["prioridade"] == "ALTA"
    assert created["publico_alvo_tipo"] == "GERAL"
    assert created["status"] == "PUBLICADO"

def test_management_create_notice_validation():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Falta publico_alvo_id quando tipo é CURSO
    payload_bad_curso = {
        "titulo": "Aviso Sem Curso ID",
        "descricao": "Descricao",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "CURSO",
        "publico_alvo_id": None
    }
    resp1 = client.post("/api/v1/notices/", json=payload_bad_curso, headers=headers_gestao)
    assert resp1.status_code in (400, 422)

    # Falta publico_alvo_id quando tipo é TURMA
    payload_bad_turma = {
        "titulo": "Aviso Sem Turma ID",
        "descricao": "Descricao",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "TURMA",
        "publico_alvo_id": None
    }
    resp2 = client.post("/api/v1/notices/", json=payload_bad_turma, headers=headers_gestao)
    assert resp2.status_code in (400, 422)

def test_management_can_publish_draft_notice():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    unique_title = f"Rascunho-{uuid.uuid4().hex[:8]}"

    # 1. Gestão cria rascunho
    draft_payload = {
        "titulo": unique_title,
        "descricao": "Apenas a gestão deveria ver isto inicialmente.",
        "prioridade": "URGENTE",
        "publico_alvo_tipo": "GERAL",
        "publico_alvo_id": None,
        "status": "RASCUNHO"
    }
    create_resp = client.post("/api/v1/notices/", json=draft_payload, headers=headers_gestao)
    assert create_resp.status_code == 201
    notice_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == "RASCUNHO"

    # 2. Aluno não deve ver o rascunho
    student_resp = client.get("/api/v1/notices/", headers=headers_aluno)
    student_titles = [n["titulo"] for n in student_resp.json()]
    assert unique_title not in student_titles

    # 3. Gestão publica o rascunho
    publish_resp = client.patch(f"/api/v1/notices/{notice_id}/publish", headers=headers_gestao)
    assert publish_resp.status_code == 200
    assert publish_resp.json()["status"] == "PUBLICADO"

    # 4. Aluno agora consegue visualizar o aviso publicado
    student_resp2 = client.get("/api/v1/notices/", headers=headers_aluno)
    student_titles2 = [n["titulo"] for n in student_resp2.json()]
    assert unique_title in student_titles2

def test_management_can_edit_notice():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Cria aviso
    created = client.post("/api/v1/notices/", json={
        "titulo": "Aviso Original",
        "descricao": "Texto original",
        "prioridade": "BAIXA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_gestao).json()

    notice_id = created["id"]

    # Edita aviso
    update_payload = {
        "titulo": "Aviso Editado com Sucesso",
        "descricao": "Texto atualizado pela gestão",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "publico_alvo_id": None,
        "status": "PUBLICADO"
    }
    edit_resp = client.put(f"/api/v1/notices/{notice_id}", json=update_payload, headers=headers_gestao)
    assert edit_resp.status_code == 200
    updated = edit_resp.json()
    assert updated["titulo"] == "Aviso Editado com Sucesso"
    assert updated["descricao"] == "Texto atualizado pela gestão"
    assert updated["prioridade"] == "ALTA"

def test_management_can_delete_notice():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Cria aviso
    created = client.post("/api/v1/notices/", json={
        "titulo": "Aviso para Deletar",
        "descricao": "Será excluído",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_gestao).json()

    notice_id = created["id"]

    # Deleta aviso
    del_resp = client.delete(f"/api/v1/notices/{notice_id}", headers=headers_gestao)
    assert del_resp.status_code == 200
    assert "sucesso" in del_resp.json()["mensagem"].lower()

    # Confirma que não está mais na lista
    all_notices = client.get("/api/v1/notices/management/all", headers=headers_gestao).json()
    notice_ids = [n["id"] for n in all_notices]
    assert notice_id not in notice_ids

def test_rbac_notice_mutations_forbidden_for_non_gestao():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    payload = {
        "titulo": "Tentativa Não Autorizada",
        "descricao": "Descricao",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }

    # Aluno tentando criar aviso
    assert client.post("/api/v1/notices/", json=payload, headers=headers_aluno).status_code == 403
    # Cantina tentando criar aviso
    assert client.post("/api/v1/notices/", json=payload, headers=headers_cantina).status_code == 403
    # Não autenticado tentando criar aviso
    assert client.post("/api/v1/notices/", json=payload).status_code in (401, 403)

    # Aluno tentando acessar listagem administrativa
    assert client.get("/api/v1/notices/management/all", headers=headers_aluno).status_code == 403
    assert client.get("/api/v1/notices/management/all", headers=headers_cantina).status_code == 403

def test_get_courses_endpoint():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/schedules/courses", headers=headers_gestao)
    assert resp.status_code == 200
    courses = resp.json()
    assert isinstance(courses, list)
    assert len(courses) >= 3
    siglas = [c["sigla"] for c in courses]
    assert "DS" in siglas
    assert "EDIF" in siglas
    assert "ELETRO" in siglas


# ==========================================
# MILESTONE 3C: COURSES & CLASSES MANAGEMENT
# ==========================================

def test_management_can_list_courses():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/courses", headers=headers_gestao)
    assert resp.status_code == 200
    courses = resp.json()
    assert isinstance(courses, list)
    assert len(courses) >= 3
    siglas = [c["sigla"] for c in courses]
    assert "DS" in siglas
    assert "EDIF" in siglas
    assert "ELETRO" in siglas
    for c in courses:
        assert "id" in c
        assert "nome" in c
        assert "sigla" in c
        assert "ativo" in c
        assert "total_turmas" in c

def test_management_can_create_course():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:4].upper()
    payload = {
        "nome": f"Curso Técnico em Enfermagem {unique_code}",
        "sigla": f"ENF{unique_code}",
        "ativo": True
    }

    resp = client.post("/api/v1/management/courses", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    course = resp.json()
    assert course["id"] is not None
    assert course["nome"] == payload["nome"]
    assert course["sigla"] == payload["sigla"]
    assert course["ativo"] is True

def test_management_course_duplicate_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Tentativa de criar curso com nome duplicado
    payload = {
        "nome": "Desenvolvimento de Sistemas",
        "sigla": "NOVA_SIGLA",
        "ativo": True
    }
    resp = client.post("/api/v1/management/courses", json=payload, headers=headers_gestao)
    assert resp.status_code == 400
    assert "já existe" in resp.json()["detail"].lower()

    # Tentativa de criar curso com sigla duplicada
    payload_sigla = {
        "nome": "Novo Curso com Sigla Duplicada",
        "sigla": "DS",
        "ativo": True
    }
    resp_sigla = client.post("/api/v1/management/courses", json=payload_sigla, headers=headers_gestao)
    assert resp_sigla.status_code == 400
    assert "já existe" in resp_sigla.json()["detail"].lower()

def test_management_can_edit_course():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # 1. Cria curso temporário
    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/courses", json={
        "nome": f"Curso Edição {unique_code}",
        "sigla": f"EDT{unique_code}",
        "ativo": True
    }, headers=headers_gestao).json()

    course_id = created["id"]

    # 2. Edita curso
    edit_payload = {
        "nome": f"Curso Edição Atualizado {unique_code}",
        "sigla": f"EDTU{unique_code}",
        "ativo": False
    }
    edit_resp = client.put(f"/api/v1/management/courses/{course_id}", json=edit_payload, headers=headers_gestao)
    assert edit_resp.status_code == 200
    updated = edit_resp.json()
    assert updated["nome"] == edit_payload["nome"]
    assert updated["sigla"] == edit_payload["sigla"]
    assert updated["ativo"] is False

def test_management_can_delete_course_without_dependencies():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # 1. Cria curso temporário sem turmas
    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/courses", json={
        "nome": f"Curso para Excluir {unique_code}",
        "sigla": f"DEL{unique_code}",
        "ativo": True
    }, headers=headers_gestao).json()

    course_id = created["id"]

    # 2. Exclui o curso
    del_resp = client.delete(f"/api/v1/management/courses/{course_id}", headers=headers_gestao)
    assert del_resp.status_code == 200
    assert "excluído" in del_resp.json()["mensagem"].lower()

    # 3. Confere se não existe mais
    all_courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ids = [c["id"] for c in all_courses]
    assert course_id not in ids

def test_management_cannot_delete_course_with_linked_classes():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Localiza o curso de Desenvolvimento de Sistemas (que possui turmas no seed)
    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds_course = next((c for c in courses if c["sigla"] == "DS"), None)
    assert ds_course is not None

    del_resp = client.delete(f"/api/v1/management/courses/{ds_course['id']}", headers=headers_gestao)
    assert del_resp.status_code == 400
    assert "turma(s) vinculada(s)" in del_resp.json()["detail"].lower()

def test_management_can_list_classes():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/classes", headers=headers_gestao)
    assert resp.status_code == 200
    classes = resp.json()
    assert isinstance(classes, list)
    assert len(classes) >= 3
    for t in classes:
        assert "id" in t
        assert "nome_turma" in t
        assert "curso" in t
        assert "curso_id" in t
        assert "ano" in t
        assert "periodo" in t
        assert "ativo" in t

def test_management_can_create_class():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    edif = next((c for c in courses if c["sigla"] == "EDIF"), None)
    assert edif is not None

    unique_code = uuid.uuid4().hex[:4].upper()
    payload = {
        "nome_turma": f"2º B — Edificações {unique_code}",
        "curso_id": edif["id"],
        "ano": "2º Ano",
        "periodo": "Tarde",
        "ativo": True
    }

    resp = client.post("/api/v1/management/classes", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    turma = resp.json()
    assert turma["id"] is not None
    assert turma["nome_turma"] == payload["nome_turma"]
    assert turma["curso_id"] == edif["id"]
    assert turma["curso"] == edif["nome"]
    assert turma["ano"] == "2º Ano"
    assert turma["periodo"] == "Tarde"
    assert turma["ativo"] is True

def test_management_create_class_invalid_course_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    payload = {
        "nome_turma": "Turma com Curso Inexistente",
        "curso_id": 999999,
        "ano": "1º Ano",
        "periodo": "Manhã",
        "ativo": True
    }

    resp = client.post("/api/v1/management/classes", json=payload, headers=headers_gestao)
    assert resp.status_code in (400, 404)

def test_management_can_edit_class():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)
    eletro = next((c for c in courses if c["sigla"] == "ELETRO"), None)
    assert ds is not None and eletro is not None

    # 1. Cria turma temporária
    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/classes", json={
        "nome_turma": f"Turma Temporária {unique_code}",
        "curso_id": ds["id"],
        "ano": "1º Ano",
        "periodo": "Manhã",
        "ativo": True
    }, headers=headers_gestao).json()

    class_id = created["id"]

    # 2. Edita turma
    edit_payload = {
        "nome_turma": f"Turma Atualizada {unique_code}",
        "curso_id": eletro["id"],
        "ano": "2º Ano",
        "periodo": "Noite",
        "ativo": False
    }
    edit_resp = client.put(f"/api/v1/management/classes/{class_id}", json=edit_payload, headers=headers_gestao)
    assert edit_resp.status_code == 200
    updated = edit_resp.json()
    assert updated["nome_turma"] == edit_payload["nome_turma"]
    assert updated["curso_id"] == eletro["id"]
    assert updated["curso"] == eletro["nome"]
    assert updated["ano"] == "2º Ano"
    assert updated["periodo"] == "Noite"
    assert updated["ativo"] is False

def test_management_can_delete_class_without_dependencies():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)

    # 1. Cria turma temporária sem alunos nem horários
    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/classes", json={
        "nome_turma": f"Turma para Deletar {unique_code}",
        "curso_id": ds["id"],
        "ano": "1º Ano",
        "periodo": "Manhã",
        "ativo": True
    }, headers=headers_gestao).json()

    class_id = created["id"]

    # 2. Deleta a turma
    del_resp = client.delete(f"/api/v1/management/classes/{class_id}", headers=headers_gestao)
    assert del_resp.status_code == 200
    assert "excluída" in del_resp.json()["mensagem"].lower()

    # 3. Confere se foi removida
    all_classes = client.get("/api/v1/management/classes", headers=headers_gestao).json()
    ids = [t["id"] for t in all_classes]
    assert class_id not in ids

def test_management_cannot_delete_class_with_linked_students_or_schedules():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Turma 3º C possui alunos e horários no seed
    classes = client.get("/api/v1/management/classes", headers=headers_gestao).json()
    turma_3c = next((t for t in classes if "3º C" in t["nome_turma"]), None)
    assert turma_3c is not None

    del_resp = client.delete(f"/api/v1/management/classes/{turma_3c['id']}", headers=headers_gestao)
    assert del_resp.status_code == 400
    detail = del_resp.json()["detail"].lower()
    assert "aluno(s)" in detail or "horário(s)" in detail

def test_rbac_courses_and_classes_forbidden_for_aluno_and_cantina():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    course_payload = {"nome": "Tentativa Curso", "sigla": "TENT", "ativo": True}
    class_payload = {"nome_turma": "Tentativa Turma", "curso_id": 1, "ativo": True}

    # Aluno
    assert client.get("/api/v1/management/courses", headers=headers_aluno).status_code == 403
    assert client.post("/api/v1/management/courses", json=course_payload, headers=headers_aluno).status_code == 403
    assert client.put("/api/v1/management/courses/1", json=course_payload, headers=headers_aluno).status_code == 403
    assert client.delete("/api/v1/management/courses/1", headers=headers_aluno).status_code == 403

    assert client.get("/api/v1/management/classes", headers=headers_aluno).status_code == 403
    assert client.post("/api/v1/management/classes", json=class_payload, headers=headers_aluno).status_code == 403
    assert client.put("/api/v1/management/classes/1", json=class_payload, headers=headers_aluno).status_code == 403
    assert client.delete("/api/v1/management/classes/1", headers=headers_aluno).status_code == 403

    # Cantina
    assert client.get("/api/v1/management/courses", headers=headers_cantina).status_code == 403
    assert client.post("/api/v1/management/courses", json=course_payload, headers=headers_cantina).status_code == 403
    assert client.put("/api/v1/management/courses/1", json=course_payload, headers=headers_cantina).status_code == 403
    assert client.delete("/api/v1/management/courses/1", headers=headers_cantina).status_code == 403

    assert client.get("/api/v1/management/classes", headers=headers_cantina).status_code == 403
    assert client.post("/api/v1/management/classes", json=class_payload, headers=headers_cantina).status_code == 403
    assert client.put("/api/v1/management/classes/1", json=class_payload, headers=headers_cantina).status_code == 403
    assert client.delete("/api/v1/management/classes/1", headers=headers_cantina).status_code == 403

    # Não autenticado
    assert client.get("/api/v1/management/courses").status_code in (401, 403)
    assert client.get("/api/v1/management/classes").status_code in (401, 403)


# ==========================================
# MILESTONE 3D: DISCIPLINAS & PROFESSORES
# ==========================================

def test_management_can_list_disciplines():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/disciplines", headers=headers_gestao)
    assert resp.status_code == 200
    disciplines = resp.json()
    assert isinstance(disciplines, list)
    assert len(disciplines) >= 8
    for d in disciplines:
        assert "id" in d
        assert "nome" in d
        assert "curso_id" in d
        assert "ativo" in d

def test_management_can_create_discipline():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)
    assert ds is not None

    unique_code = uuid.uuid4().hex[:4].upper()
    payload = {
        "nome": f"Inteligência Artificial {unique_code}",
        "sigla": f"IA{unique_code}",
        "curso_id": ds["id"],
        "ativo": True
    }

    resp = client.post("/api/v1/management/disciplines", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    disc = resp.json()
    assert disc["id"] is not None
    assert disc["nome"] == payload["nome"]
    assert disc["sigla"] == payload["sigla"]
    assert disc["curso_id"] == ds["id"]
    assert disc["ativo"] is True

def test_management_create_discipline_invalid_course_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    payload = {
        "nome": "Disciplina Curso Fantasma",
        "sigla": "DCF",
        "curso_id": 999999,
        "ativo": True
    }
    resp = client.post("/api/v1/management/disciplines", json=payload, headers=headers_gestao)
    assert resp.status_code in (400, 404)

def test_management_create_discipline_duplicate_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)

    # Cria primeira vez
    unique_code = uuid.uuid4().hex[:4].upper()
    name = f"Segurança Ofensiva {unique_code}"
    client.post("/api/v1/management/disciplines", json={"nome": name, "curso_id": ds["id"], "ativo": True}, headers=headers_gestao)

    # Tenta duplicar
    resp_dup = client.post("/api/v1/management/disciplines", json={"nome": name, "curso_id": ds["id"], "ativo": True}, headers=headers_gestao)
    assert resp_dup.status_code == 400
    assert "já existe" in resp_dup.json()["detail"].lower()

def test_management_can_edit_discipline():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)
    edif = next((c for c in courses if c["sigla"] == "EDIF"), None)

    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/disciplines", json={
        "nome": f"Disciplina Edit {unique_code}",
        "sigla": f"ED{unique_code}",
        "curso_id": ds["id"],
        "ativo": True
    }, headers=headers_gestao).json()

    # Edita nome, sigla, curso e ativo
    edit_payload = {
        "nome": f"Disciplina Atualizada {unique_code}",
        "sigla": f"EDA{unique_code}",
        "curso_id": edif["id"],
        "ativo": False
    }
    edit_resp = client.put(f"/api/v1/management/disciplines/{created['id']}", json=edit_payload, headers=headers_gestao)
    assert edit_resp.status_code == 200
    updated = edit_resp.json()
    assert updated["nome"] == edit_payload["nome"]
    assert updated["curso_id"] == edif["id"]
    assert updated["ativo"] is False

def test_management_can_toggle_discipline_active():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)

    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/disciplines", json={
        "nome": f"Disciplina Toggle {unique_code}",
        "curso_id": ds["id"],
        "ativo": True
    }, headers=headers_gestao).json()

    # Toggle -> inativo
    t1 = client.patch(f"/api/v1/management/disciplines/{created['id']}/toggle-active", headers=headers_gestao).json()
    assert t1["ativo"] is False

    # Toggle -> ativo
    t2 = client.patch(f"/api/v1/management/disciplines/{created['id']}/toggle-active", headers=headers_gestao).json()
    assert t2["ativo"] is True

def test_management_can_delete_discipline_without_dependencies():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    courses = client.get("/api/v1/management/courses", headers=headers_gestao).json()
    ds = next((c for c in courses if c["sigla"] == "DS"), None)

    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/disciplines", json={
        "nome": f"Disciplina Para Deletar {unique_code}",
        "curso_id": ds["id"],
        "ativo": True
    }, headers=headers_gestao).json()

    del_resp = client.delete(f"/api/v1/management/disciplines/{created['id']}", headers=headers_gestao)
    assert del_resp.status_code == 200
    assert "excluída" in del_resp.json()["mensagem"].lower()

def test_management_cannot_delete_discipline_used_in_schedules():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # "Desenvolvimento Web" está presente na grade horária do seed
    disciplines = client.get("/api/v1/management/disciplines", headers=headers_gestao).json()
    web_disc = next((d for d in disciplines if d["nome"] == "Desenvolvimento Web"), None)
    assert web_disc is not None

    del_resp = client.delete(f"/api/v1/management/disciplines/{web_disc['id']}", headers=headers_gestao)
    assert del_resp.status_code == 400
    assert "grade horária" in del_resp.json()["detail"].lower()

def test_management_can_list_professors():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/professors", headers=headers_gestao)
    assert resp.status_code == 200
    professores = resp.json()
    assert isinstance(professores, list)
    assert len(professores) >= 5
    for p in professores:
        assert "id" in p
        assert "nome" in p
        assert "ativo" in p

def test_management_can_create_professor():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:4].upper()
    payload = {
        "nome": f"Prof. Marcelo {unique_code}",
        "email": f"marcelo.{unique_code.lower()}@ceep.demo",
        "ativo": True
    }

    resp = client.post("/api/v1/management/professors", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    prof = resp.json()
    assert prof["id"] is not None
    assert prof["nome"] == payload["nome"]
    assert prof["email"] == payload["email"]
    assert prof["ativo"] is True

def test_management_create_professor_duplicate_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:4].upper()
    name = f"Prof. Cláudio {unique_code}"
    client.post("/api/v1/management/professors", json={"nome": name, "ativo": True}, headers=headers_gestao)

    resp_dup = client.post("/api/v1/management/professors", json={"nome": name, "ativo": True}, headers=headers_gestao)
    assert resp_dup.status_code == 400
    assert "já existe" in resp_dup.json()["detail"].lower()

def test_management_can_edit_professor():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/professors", json={
        "nome": f"Prof. Inicial {unique_code}",
        "email": f"inicial.{unique_code.lower()}@ceep.demo",
        "ativo": True
    }, headers=headers_gestao).json()

    edit_payload = {
        "nome": f"Prof. Modificado {unique_code}",
        "email": f"modificado.{unique_code.lower()}@ceep.demo",
        "ativo": False
    }
    edit_resp = client.put(f"/api/v1/management/professors/{created['id']}", json=edit_payload, headers=headers_gestao)
    assert edit_resp.status_code == 200
    updated = edit_resp.json()
    assert updated["nome"] == edit_payload["nome"]
    assert updated["email"] == edit_payload["email"]
    assert updated["ativo"] is False

def test_management_can_toggle_professor_active():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/professors", json={
        "nome": f"Prof. Toggle {unique_code}",
        "ativo": True
    }, headers=headers_gestao).json()

    t1 = client.patch(f"/api/v1/management/professors/{created['id']}/toggle-active", headers=headers_gestao).json()
    assert t1["ativo"] is False

    t2 = client.patch(f"/api/v1/management/professors/{created['id']}/toggle-active", headers=headers_gestao).json()
    assert t2["ativo"] is True

def test_management_can_delete_professor_without_dependencies():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:4].upper()
    created = client.post("/api/v1/management/professors", json={
        "nome": f"Prof. Deletável {unique_code}",
        "ativo": True
    }, headers=headers_gestao).json()

    del_resp = client.delete(f"/api/v1/management/professors/{created['id']}", headers=headers_gestao)
    assert del_resp.status_code == 200
    assert "excluído" in del_resp.json()["mensagem"].lower()

def test_management_cannot_delete_professor_with_schedules():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # "Prof. Carlos" possui aulas na grade do seed
    professores = client.get("/api/v1/management/professors", headers=headers_gestao).json()
    prof_carlos = next((p for p in professores if p["nome"] == "Prof. Carlos"), None)
    assert prof_carlos is not None

    del_resp = client.delete(f"/api/v1/management/professors/{prof_carlos['id']}", headers=headers_gestao)
    assert del_resp.status_code == 400
    assert "grade horária" in del_resp.json()["detail"].lower()

def test_rbac_disciplines_and_professors_forbidden_for_aluno_and_cantina():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    disc_payload = {"nome": "Tentativa Disc", "curso_id": 1, "ativo": True}
    prof_payload = {"nome": "Prof. Tentativa", "ativo": True}

    # Aluno
    assert client.get("/api/v1/management/disciplines", headers=headers_aluno).status_code == 403
    assert client.post("/api/v1/management/disciplines", json=disc_payload, headers=headers_aluno).status_code == 403
    assert client.put("/api/v1/management/disciplines/1", json=disc_payload, headers=headers_aluno).status_code == 403
    assert client.delete("/api/v1/management/disciplines/1", headers=headers_aluno).status_code == 403
    assert client.patch("/api/v1/management/disciplines/1/toggle-active", headers=headers_aluno).status_code == 403

    assert client.get("/api/v1/management/professors", headers=headers_aluno).status_code == 403
    assert client.post("/api/v1/management/professors", json=prof_payload, headers=headers_aluno).status_code == 403
    assert client.put("/api/v1/management/professors/1", json=prof_payload, headers=headers_aluno).status_code == 403
    assert client.delete("/api/v1/management/professors/1", headers=headers_aluno).status_code == 403
    assert client.patch("/api/v1/management/professors/1/toggle-active", headers=headers_aluno).status_code == 403

    # Cantina
    assert client.get("/api/v1/management/disciplines", headers=headers_cantina).status_code == 403
    assert client.post("/api/v1/management/disciplines", json=disc_payload, headers=headers_cantina).status_code == 403
    assert client.put("/api/v1/management/disciplines/1", json=disc_payload, headers=headers_cantina).status_code == 403
    assert client.delete("/api/v1/management/disciplines/1", headers=headers_cantina).status_code == 403
    assert client.patch("/api/v1/management/disciplines/1/toggle-active", headers=headers_cantina).status_code == 403

    assert client.get("/api/v1/management/professors", headers=headers_cantina).status_code == 403
    assert client.post("/api/v1/management/professors", json=prof_payload, headers=headers_cantina).status_code == 403
    assert client.put("/api/v1/management/professors/1", json=prof_payload, headers=headers_cantina).status_code == 403
    assert client.delete("/api/v1/management/professors/1", headers=headers_cantina).status_code == 403
    assert client.patch("/api/v1/management/professors/1/toggle-active", headers=headers_cantina).status_code == 403


# ============================================================================
# MILESTONE 3E: GESTÃO DA GRADE HORÁRIA SEMANAL
# ============================================================================

def test_management_can_list_schedules():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # List all
    resp = client.get("/api/v1/management/schedules", headers=headers_gestao)
    assert resp.status_code == 200
    schedules = resp.json()
    assert isinstance(schedules, list)
    assert len(schedules) > 0

    # Filter by turma_id
    resp_turma = client.get("/api/v1/management/schedules?turma_id=1", headers=headers_gestao)
    assert resp_turma.status_code == 200
    for s in resp_turma.json():
        assert s["turma_id"] == 1

    # Filter by dia_semana
    resp_dia = client.get("/api/v1/management/schedules?dia_semana=Segunda-feira", headers=headers_gestao)
    assert resp_dia.status_code == 200
    for s in resp_dia.json():
        assert s["dia_semana"] == "Segunda-feira"


def test_management_can_create_update_and_delete_schedule():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Get valid turma, disciplina, professor
    turmas = client.get("/api/v1/management/classes", headers=headers_gestao).json()
    disciplinas = client.get("/api/v1/management/disciplines", headers=headers_gestao).json()
    professores = client.get("/api/v1/management/professors", headers=headers_gestao).json()

    assert len(turmas) > 0
    assert len(disciplinas) > 0
    assert len(professores) > 0

    turma_id = turmas[0]["id"]
    disciplina_id = disciplinas[0]["id"]
    professor_id = professores[0]["id"]

    # 1. Create a schedule on Sábado to avoid conflicts with seed data
    create_payload = {
        "turma_id": turma_id,
        "disciplina_id": disciplina_id,
        "professor_id": professor_id,
        "dia_semana": "Sábado",
        "horario_inicio": "14:00",
        "horario_fim": "15:00",
        "ativo": True
    }
    create_resp = client.post("/api/v1/management/schedules", json=create_payload, headers=headers_gestao)
    assert create_resp.status_code == 201
    created = create_resp.json()
    schedule_id = created["id"]
    assert created["dia_semana"] == "Sábado"
    assert created["horario_inicio"] == "14:00"
    assert created["horario_fim"] == "15:00"
    assert created["disciplina_id"] == disciplina_id
    assert created["professor_id"] == professor_id

    # 2. Update schedule
    update_payload = {
        "turma_id": turma_id,
        "disciplina_id": disciplina_id,
        "professor_id": professor_id,
        "dia_semana": "Sábado",
        "horario_inicio": "15:00",
        "horario_fim": "16:00",
        "ativo": True
    }
    update_resp = client.put(f"/api/v1/management/schedules/{schedule_id}", json=update_payload, headers=headers_gestao)
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["horario_inicio"] == "15:00"
    assert updated["horario_fim"] == "16:00"

    # 3. Delete schedule
    del_resp = client.delete(f"/api/v1/management/schedules/{schedule_id}", headers=headers_gestao)
    assert del_resp.status_code == 200
    assert "exclu" in del_resp.json()["mensagem"].lower()

    # Verify deleted
    all_schedules = client.get(f"/api/v1/management/schedules?turma_id={turma_id}", headers=headers_gestao).json()
    assert not any(s["id"] == schedule_id for s in all_schedules)


def test_management_schedule_time_validation():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # horario_inicio >= horario_fim
    invalid_payload = {
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": "Sábado",
        "horario_inicio": "10:00",
        "horario_fim": "09:00"
    }
    resp = client.post("/api/v1/management/schedules", json=invalid_payload, headers=headers_gestao)
    assert resp.status_code == 400
    assert "anterior" in resp.json()["detail"].lower()

    # equal times
    equal_payload = {
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": "Sábado",
        "horario_inicio": "10:00",
        "horario_fim": "10:00"
    }
    resp_eq = client.post("/api/v1/management/schedules", json=equal_payload, headers=headers_gestao)
    assert resp_eq.status_code == 400


def test_management_schedule_conflict_turma_overlap():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Create first class on Domingo
    c1 = client.post("/api/v1/management/schedules", json={
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": "Domingo",
        "horario_inicio": "08:00",
        "horario_fim": "10:00"
    }, headers=headers_gestao)
    assert c1.status_code == 201
    id1 = c1.json()["id"]

    try:
        # Attempt to create conflicting class for same turma (09:00 to 11:00 overlaps 08:00-10:00)
        c2 = client.post("/api/v1/management/schedules", json={
            "turma_id": 1,
            "disciplina_id": 2,
            "professor_id": 2,
            "dia_semana": "Domingo",
            "horario_inicio": "09:00",
            "horario_fim": "11:00"
        }, headers=headers_gestao)
        assert c2.status_code == 400
        assert "conflito" in c2.json()["detail"].lower() or "turma" in c2.json()["detail"].lower()
    finally:
        client.delete(f"/api/v1/management/schedules/{id1}", headers=headers_gestao)


def test_management_schedule_conflict_professor_overlap():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Find two different turmas
    turmas = client.get("/api/v1/management/classes", headers=headers_gestao).json()
    assert len(turmas) >= 2
    t1_id = turmas[0]["id"]
    t2_id = turmas[1]["id"]

    # Professor 1 teaches turma 1 at 08:00-09:30 on Domingo
    c1 = client.post("/api/v1/management/schedules", json={
        "turma_id": t1_id,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": "Domingo",
        "horario_inicio": "08:00",
        "horario_fim": "09:30"
    }, headers=headers_gestao)
    assert c1.status_code == 201
    id1 = c1.json()["id"]

    try:
        # Same Professor 1 assigned to turma 2 at 09:00-10:00 on Domingo (conflict!)
        c2 = client.post("/api/v1/management/schedules", json={
            "turma_id": t2_id,
            "disciplina_id": 1,
            "professor_id": 1,
            "dia_semana": "Domingo",
            "horario_inicio": "09:00",
            "horario_fim": "10:00"
        }, headers=headers_gestao)
        assert c2.status_code == 400
        assert "professor" in c2.json()["detail"].lower()
    finally:
        client.delete(f"/api/v1/management/schedules/{id1}", headers=headers_gestao)


def test_rbac_schedules_forbidden_for_aluno_and_cantina():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    payload = {
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": "Segunda-feira",
        "horario_inicio": "07:30",
        "horario_fim": "08:20"
    }

    # Aluno
    assert client.get("/api/v1/management/schedules", headers=headers_aluno).status_code == 403
    assert client.post("/api/v1/management/schedules", json=payload, headers=headers_aluno).status_code == 403
    assert client.put("/api/v1/management/schedules/1", json=payload, headers=headers_aluno).status_code == 403
    assert client.delete("/api/v1/management/schedules/1", headers=headers_aluno).status_code == 403

    # Cantina
    assert client.get("/api/v1/management/schedules", headers=headers_cantina).status_code == 403
    assert client.post("/api/v1/management/schedules", json=payload, headers=headers_cantina).status_code == 403
    assert client.put("/api/v1/management/schedules/1", json=payload, headers=headers_cantina).status_code == 403
    assert client.delete("/api/v1/management/schedules/1", headers=headers_cantina).status_code == 403


def test_student_schedule_query_remains_functional():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    resp = client.get("/api/v1/schedules/1", headers=headers_aluno)
    assert resp.status_code == 200
    schedules = resp.json()
    assert isinstance(schedules, list)
    assert len(schedules) > 0
    for s in schedules:
        assert "disciplina" in s
        assert "professor" in s
        assert "horario_inicio" in s
        assert "horario_fim" in s
        assert "dia_semana" in s


# ============================================================================
# MILESTONE 3F: GESTÃO DA CANTINA (PEDIDOS E PRODUTOS)
# ============================================================================

def test_management_can_list_canteen_orders():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/canteen/orders", headers=headers_gestao)
    assert resp.status_code == 200
    orders = resp.json()
    assert isinstance(orders, list)
    if len(orders) > 0:
        o = orders[0]
        assert "id" in o
        assert "aluno_id" in o
        assert "aluno_nome" in o
        assert "aluno_email" in o
        assert "status" in o
        assert "valor_total" in o
        assert "itens" in o
        assert "created_at" in o


def test_management_can_filter_canteen_orders_by_status():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # 1. Filter PENDENTE_PAGAMENTO
    resp_pend = client.get("/api/v1/management/canteen/orders?status=PENDENTE_PAGAMENTO", headers=headers_gestao)
    assert resp_pend.status_code == 200
    for o in resp_pend.json():
        assert o["status"] == "PENDENTE_PAGAMENTO"

    # 2. Filter PAGO
    resp_pago = client.get("/api/v1/management/canteen/orders?status=PAGO", headers=headers_gestao)
    assert resp_pago.status_code == 200
    for o in resp_pago.json():
        assert o["status"] == "PAGO"

    # 3. Filter UTILIZADO
    resp_util = client.get("/api/v1/management/canteen/orders?status=UTILIZADO", headers=headers_gestao)
    assert resp_util.status_code == 200
    for o in resp_util.json():
        assert o["status"] == "UTILIZADO"


def test_management_can_get_canteen_order_detail():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # First get list of orders
    orders_resp = client.get("/api/v1/management/canteen/orders", headers=headers_gestao)
    orders = orders_resp.json()

    if len(orders) == 0:
        # Create an order via student to test
        token_aluno = get_auth_token("aluno@ceep.demo")
        create_resp = client.post(
            "/api/v1/canteen/order",
            json={"produto_id": 1, "quantidade": 1},
            headers={"Authorization": f"Bearer {token_aluno}"}
        )
        assert create_resp.status_code == 201
        order_id = create_resp.json()["id"]
    else:
        order_id = orders[0]["id"]

    detail_resp = client.get(f"/api/v1/management/canteen/orders/{order_id}", headers=headers_gestao)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == order_id
    assert "aluno_nome" in detail
    assert "aluno_email" in detail
    assert "valor_total" in detail
    assert "itens" in detail
    assert len(detail["itens"]) > 0
    assert "produto_nome" in detail["itens"][0]
    assert "subtotal" in detail["itens"][0]


def test_management_canteen_order_not_found():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/canteen/orders/999999", headers=headers_gestao)
    assert resp.status_code == 404
    assert "não encontrado" in resp.json()["detail"].lower()


def test_management_can_list_canteen_products():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/canteen/products", headers=headers_gestao)
    assert resp.status_code == 200
    products = resp.json()
    assert isinstance(products, list)
    assert len(products) > 0
    for p in products:
        assert "id" in p
        assert "nome" in p
        assert "preco" in p
        assert "ativo" in p


def test_management_can_create_update_and_toggle_canteen_product():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:6].upper()
    prod_name = f"Suco Natural {unique_code}"

    # 1. Create Product
    create_payload = {
        "nome": prod_name,
        "descricao": "Suco de laranja natural 300ml",
        "preco": 6.50,
        "ativo": True
    }
    create_resp = client.post("/api/v1/management/canteen/products", json=create_payload, headers=headers_gestao)
    assert create_resp.status_code == 201
    created = create_resp.json()
    product_id = created["id"]
    assert created["nome"] == prod_name
    assert created["preco"] == 6.50
    assert created["ativo"] is True

    # 2. Update Product
    update_payload = {
        "nome": f"{prod_name} Gelado",
        "preco": 7.00,
        "descricao": "Suco de laranja natural gelado 300ml",
        "ativo": True
    }
    update_resp = client.put(f"/api/v1/management/canteen/products/{product_id}", json=update_payload, headers=headers_gestao)
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["nome"] == f"{prod_name} Gelado"
    assert updated["preco"] == 7.00

    # 3. Toggle Active Status
    t1 = client.patch(f"/api/v1/management/canteen/products/{product_id}/toggle-active", headers=headers_gestao).json()
    assert t1["ativo"] is False

    t2 = client.patch(f"/api/v1/management/canteen/products/{product_id}/toggle-active", headers=headers_gestao).json()
    assert t2["ativo"] is True


def test_management_canteen_product_invalid_price_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Preço zero
    bad_zero = {
        "nome": f"Produto Zero {uuid.uuid4().hex[:4]}",
        "preco": 0.0,
        "ativo": True
    }
    resp1 = client.post("/api/v1/management/canteen/products", json=bad_zero, headers=headers_gestao)
    assert resp1.status_code in (400, 422)

    # Preço negativo
    bad_neg = {
        "nome": f"Produto Negativo {uuid.uuid4().hex[:4]}",
        "preco": -5.0,
        "ativo": True
    }
    resp2 = client.post("/api/v1/management/canteen/products", json=bad_neg, headers=headers_gestao)
    assert resp2.status_code in (400, 422)


def test_rbac_management_canteen_forbidden_for_aluno_and_cantina():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    product_payload = {"nome": "Tentativa Prod", "preco": 10.0, "ativo": True}

    # Aluno
    assert client.get("/api/v1/management/canteen/orders", headers=headers_aluno).status_code == 403
    assert client.get("/api/v1/management/canteen/orders/1", headers=headers_aluno).status_code == 403
    assert client.get("/api/v1/management/canteen/products", headers=headers_aluno).status_code == 403
    assert client.post("/api/v1/management/canteen/products", json=product_payload, headers=headers_aluno).status_code == 403
    assert client.put("/api/v1/management/canteen/products/1", json=product_payload, headers=headers_aluno).status_code == 403
    assert client.patch("/api/v1/management/canteen/products/1/toggle-active", headers=headers_aluno).status_code == 403

    # Cantina (perfil de atendente) não pode acessar o painel administrativo de gestão
    assert client.get("/api/v1/management/canteen/orders", headers=headers_cantina).status_code == 403
    assert client.get("/api/v1/management/canteen/orders/1", headers=headers_cantina).status_code == 403
    assert client.get("/api/v1/management/canteen/products", headers=headers_cantina).status_code == 403
    assert client.post("/api/v1/management/canteen/products", json=product_payload, headers=headers_cantina).status_code == 403
    assert client.put("/api/v1/management/canteen/products/1", json=product_payload, headers=headers_cantina).status_code == 403
    assert client.patch("/api/v1/management/canteen/products/1/toggle-active", headers=headers_cantina).status_code == 403


def test_historical_orders_cannot_be_deleted_via_management():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # Não existe rota de DELETE para pedidos (preserva histórico financeiro)
    resp = client.delete("/api/v1/management/canteen/orders/1", headers=headers_gestao)
    assert resp.status_code == 405  # Method Not Allowed


# ============================================================================
# MILESTONE 3G: INTEGRAÇÃO E REFINAMENTO DA GESTÃO
# ============================================================================

def test_integration_management_product_reflects_in_student_canteen():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    # 1. Gestão cria novo produto ativo
    unique_name = f"Bolo de Cenoura {uuid.uuid4().hex[:6]}"
    created = client.post("/api/v1/management/canteen/products", json={
        "nome": unique_name,
        "descricao": "Bolo caseiro com cobertura de chocolate",
        "preco": 5.50,
        "ativo": True
    }, headers=headers_gestao).json()
    prod_id = created["id"]

    # 2. Aluno consulta produtos ativos da cantina
    aluno_products = client.get("/api/v1/canteen/products", headers=headers_aluno).json()
    assert any(p["id"] == prod_id for p in aluno_products)

    # 3. Gestão desativa produto
    client.patch(f"/api/v1/management/canteen/products/{prod_id}/toggle-active", headers=headers_gestao)

    # 4. Aluno não deve mais ver o produto inativo
    aluno_products_after = client.get("/api/v1/canteen/products", headers=headers_aluno).json()
    assert not any(p["id"] == prod_id for p in aluno_products_after)


def test_integration_management_schedule_reflects_in_student_schedule():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    # 1. Gestão cadastra uma aula para a turma 1 (3º C)
    created = client.post("/api/v1/management/schedules", json={
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": "Sábado",
        "horario_inicio": "08:00",
        "horario_fim": "09:00",
        "ativo": True
    }, headers=headers_gestao).json()
    schedule_id = created["id"]

    try:
        # 2. Aluno consulta grade da sua turma (turma 1)
        student_schedules = client.get("/api/v1/schedules/1", headers=headers_aluno).json()
        matching = next((s for s in student_schedules if s["id"] == schedule_id), None)
        assert matching is not None
        assert matching["dia_semana"] == "Sábado"
        assert matching["horario_inicio"] == "08:00"
        assert matching["horario_fim"] == "09:00"
    finally:
        client.delete(f"/api/v1/management/schedules/{schedule_id}", headers=headers_gestao)


def test_integration_student_dashboard_dynamic_relations():
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    resp = client.get("/api/v1/student/dashboard", headers=headers_aluno)
    assert resp.status_code == 200
    data = resp.json()

    assert "saudacao" in data
    assert "aluno_nome" in data
    assert "turma_nome" in data
    assert "curso_nome" in data
    assert "tarefas_pendentes_count" in data

    if data.get("proxima_aula"):
        # Garante que não há sala/local na próxima aula
        assert data["proxima_aula"]["sala"] is None


def test_integration_management_overview_consistency():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    resp = client.get("/api/v1/management/overview", headers=headers_gestao)
    assert resp.status_code == 200
    overview = resp.json()

    assert overview["total_turmas"] >= 3
    assert overview["total_alunos"] >= 1
    assert overview["total_avisos"] >= 1
    assert "cantina_resumo" in overview
    assert overview["cantina_resumo"]["total_pedidos"] >= 0
    assert overview["cantina_resumo"]["receita_confirmada"] >= 0.0


# ============================================================================
# MILESTONE 4A: FLUXO COMPLETO E QA DE DEMONSTRAÇÃO (E2E)
# ============================================================================

def test_e2e_student_complete_journey():
    """Validação completa da jornada do Aluno: Login -> Dashboard -> Horários -> Tarefas -> Compra na Cantina -> PIX Simulado -> QR Code de Retirada."""
    # 1. Login Aluno
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers = {"Authorization": f"Bearer {token_aluno}"}

    # 2. Consulta ao Dashboard
    dash_resp = client.get("/api/v1/student/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash = dash_resp.json()
    assert dash["aluno_nome"] == "Aluno Demo"
    assert "3º C" in dash["turma_nome"]
    if dash.get("proxima_aula"):
        assert dash["proxima_aula"]["sala"] is None

    # 3. Consulta de Horários
    sched_resp = client.get("/api/v1/schedules/1", headers=headers)
    assert sched_resp.status_code == 200
    schedules = sched_resp.json()
    assert len(schedules) > 0
    for s in schedules:
        assert "disciplina" in s
        assert "horario_inicio" in s

    # 4. Ciclo de Vida de Tarefas (Criar -> Alternar Conclusão)
    task_resp = client.post("/api/v1/tasks/", json={
        "titulo": "Tarefa E2E Demo Aluno",
        "descricao": "Atividade criada para validação ponta a ponta",
        "prioridade": "ALTA"
    }, headers=headers)
    assert task_resp.status_code == 201
    task_id = task_resp.json()["id"]

    toggle_resp = client.patch(f"/api/v1/tasks/{task_id}/toggle", headers=headers)
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["status"] == "CONCLUIDA"

    # 5. Cantina: Listar produtos ativos
    prods_resp = client.get("/api/v1/canteen/products", headers=headers)
    assert prods_resp.status_code == 200
    prods = prods_resp.json()
    assert len(prods) > 0
    salgado = next(p for p in prods if p["nome"] == "Salgado")

    # 6. Cantina: Criar Pedido
    order_resp = client.post("/api/v1/canteen/orders", json={
        "produto_id": salgado["id"],
        "quantidade": 1
    }, headers=headers)
    assert order_resp.status_code == 201
    order = order_resp.json()
    order_id = order["id"]
    assert order["status"] == "PENDENTE_PAGAMENTO"
    assert "pix_code" in order

    # 7. Cantina: Simulação de Pagamento PIX
    pay_resp = client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers)
    assert pay_resp.status_code == 200
    paid_order = pay_resp.json()
    assert paid_order["status"] == "PAGO"

    # 8. Cantina: Obtenção do QR Code de Retirada
    qr_resp = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers)
    assert qr_resp.status_code == 200
    qr_data = qr_resp.json()
    assert qr_data["status"] == "PAGO"
    assert qr_data["pickup_code"].startswith("CEEPPLUS-PICKUP-")


def test_e2e_canteen_staff_validation_and_reuse_prevention():
    """Validação completa da Cantina: Leitura do QR -> Confirmação da Retirada -> Pedido UTILIZADO -> Bloqueio de reuso."""
    # 1. Aluno cria e paga um pedido
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    create_resp = client.post("/api/v1/canteen/orders", json={"produto_id": 1, "quantidade": 1}, headers=headers_aluno)
    order_id = create_resp.json()["id"]
    client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers_aluno)
    qr_data = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno).json()
    pickup_code = qr_data["pickup_code"]

    # 2. Atendente da Cantina autentica
    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    # 3. Terminal da cantina valida o QR Code lido
    val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert val_resp.status_code == 200
    validation = val_resp.json()
    assert validation["order_id"] == order_id
    assert validation["status"] == "PAGO"
    assert validation["status_validacao"] == "DISPONIVEL"

    # 4. Atendente confirma a entrega do salgado
    conf_resp = client.post(f"/api/v1/canteen/pickup/{order_id}/confirm", headers=headers_cantina)
    assert conf_resp.status_code == 200
    conf = conf_resp.json()
    assert conf["status"] == "UTILIZADO"
    assert "confirmada" in conf["mensagem"].lower()

    # 5. Tentativa de reutilização do mesmo QR Code pelo aluno deve ser bloqueada
    re_val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert re_val_resp.status_code == 400
    assert "já utilizado" in re_val_resp.json()["detail"].lower()

    # 6. QR Code inexistente/inválido deve retornar 404
    bad_val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": "CEEPPLUS-PICKUP-INVALID123"}, headers=headers_cantina)
    assert bad_val_resp.status_code == 404


def test_e2e_management_full_lifecycle_and_rbac():
    """Validação da Gestão: Dashboard -> Gestão de Cursos, Turmas, Disciplinas, Professores, Grade e Cantina."""
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    # 1. Visão Geral da Gestão
    overview = client.get("/api/v1/management/overview", headers=headers_gestao).json()
    assert overview["total_turmas"] >= 3
    assert overview["total_alunos"] >= 1

    # 2. Gestão cria produto na cantina
    unique_code = uuid.uuid4().hex[:4].upper()
    prod = client.post("/api/v1/management/canteen/products", json={
        "nome": f"Pão de Queijo {unique_code}",
        "preco": 4.50,
        "ativo": True
    }, headers=headers_gestao).json()
    assert prod["id"] is not None

    # 3. Gestão consulta pedidos
    orders = client.get("/api/v1/management/canteen/orders", headers=headers_gestao).json()
    assert isinstance(orders, list)

    # 4. RBAC: Aluno e Cantina bloqueados de acessar endpoints da Gestão
    token_aluno = get_auth_token("aluno@ceep.demo")
    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    for h in [headers_aluno, headers_cantina]:
        assert client.get("/api/v1/management/overview", headers=h).status_code == 403
        assert client.get("/api/v1/management/courses", headers=h).status_code == 403
        assert client.get("/api/v1/management/classes", headers=h).status_code == 403
        assert client.get("/api/v1/management/disciplines", headers=h).status_code == 403
        assert client.get("/api/v1/management/professors", headers=h).status_code == 403
        assert client.get("/api/v1/management/schedules", headers=h).status_code == 403
        assert client.get("/api/v1/management/canteen/orders", headers=h).status_code == 403

# ==========================================
# GESTÃO DE AVISOS — SUPORTE A IMAGENS & QA
# ==========================================

def test_management_can_create_notice_with_image_url():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:6]
    payload = {
        "titulo": f"Comunicado com Imagem URL {unique_code}",
        "descricao": "Este aviso possui uma imagem institucional vinculada.",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "ativo": True,
        "imagem_url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800"
    }

    resp = client.post("/api/v1/notices", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    data = resp.json()
    assert data["titulo"] == payload["titulo"]
    assert data["imagem_url"] == payload["imagem_url"]
    assert data["id"] is not None


def test_management_can_create_notice_with_base64_image():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:6]
    # Small 1x1 PNG data URI
    base64_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    payload = {
        "titulo": f"Comunicado Base64 {unique_code}",
        "descricao": "Aviso com upload direto em base64.",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "ativo": True,
        "imagem_url": base64_img
    }

    resp = client.post("/api/v1/notices", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    data = resp.json()
    assert data["imagem_url"] == base64_img


def test_management_can_create_notice_without_image():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:6]
    payload = {
        "titulo": f"Comunicado Sem Imagem {unique_code}",
        "descricao": "Aviso sem nenhuma imagem associada.",
        "prioridade": "BAIXA",
        "publico_alvo_tipo": "GERAL",
        "ativo": True,
        "imagem_url": None
    }

    resp = client.post("/api/v1/notices", json=payload, headers=headers_gestao)
    assert resp.status_code == 201
    data = resp.json()
    assert data["imagem_url"] is None


def test_management_can_update_and_remove_notice_image():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:6]
    created = client.post("/api/v1/notices", json={
        "titulo": f"Aviso Para Alterar Imagem {unique_code}",
        "descricao": "Texto original",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "ativo": True,
        "imagem_url": "https://example.com/initial.jpg"
    }, headers=headers_gestao).json()

    notice_id = created["id"]
    assert created["imagem_url"] == "https://example.com/initial.jpg"

    # Atualiza imagem
    upd_resp = client.put(f"/api/v1/notices/{notice_id}", json={
        "imagem_url": "https://example.com/updated.png"
    }, headers=headers_gestao)
    assert upd_resp.status_code == 200
    assert upd_resp.json()["imagem_url"] == "https://example.com/updated.png"

    # Remove imagem
    del_img_resp = client.put(f"/api/v1/notices/{notice_id}", json={
        "imagem_url": None
    }, headers=headers_gestao)
    assert del_img_resp.status_code == 200
    assert del_img_resp.json()["imagem_url"] is None


def test_student_receives_published_notice_with_image():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    unique_code = uuid.uuid4().hex[:6]
    img_url = "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800"
    client.post("/api/v1/notices", json={
        "titulo": f"Feira de Ciências e Tecnologia {unique_code}",
        "descricao": "Convidamos todos os estudantes a submeterem projetos inovadores para a feira anual de ciências e tecnologia.",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "ativo": True,
        "imagem_url": img_url
    }, headers=headers_gestao)

    # Aluno consulta o mural
    token_aluno = get_auth_token("aluno@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    notices_resp = client.get("/api/v1/notices", headers=headers_aluno)
    assert notices_resp.status_code == 200
    notices = notices_resp.json()
    matched = next((n for n in notices if unique_code in n["titulo"]), None)
    assert matched is not None
    assert matched["imagem_url"] == img_url
    assert matched["prioridade"] == "ALTA"


def test_invalid_image_payload_format_rejected():
    token_gestao = get_auth_token("gestao@ceep.demo")
    headers_gestao = {"Authorization": f"Bearer {token_gestao}"}

    payload = {
        "titulo": "Aviso com Payload Inválido",
        "descricao": "Tentando passar script ou string inválida no campo imagem_url",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "ativo": True,
        "imagem_url": "javascript:alert('xss')"
    }
    resp = client.post("/api/v1/notices", json=payload, headers=headers_gestao)
    assert resp.status_code == 422
    assert "imagem" in resp.json()["detail"].lower()










