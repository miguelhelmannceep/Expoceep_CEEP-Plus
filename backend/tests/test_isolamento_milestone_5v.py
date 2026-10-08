import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.models.produto import Produto
from app.models.pedido import Pedido, PedidoItem, Pagamento
from app.models.aviso import Aviso
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

def get_auth_token(email: str, password: str = "demo123") -> str:
    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    if user:
        return create_access_token(subject=str(user.id), role=user.perfil)
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


def test_notice_creation_and_visibility_isolation():
    """Verifica que avisos criados pela Gestão Pública só aparecem para Aluno Público, e vice-versa."""
    token_gestao_demo = get_auth_token("gestao.publico@ceep.demo")
    token_gestao_oficial = get_auth_token("gestao@ceep.demo")
    token_aluno_demo = get_auth_token("aluno.publico@ceep.demo")
    token_aluno_oficial = get_auth_token("aluno@escola.pr.gov.br")

    headers_g_demo = {"Authorization": f"Bearer {token_gestao_demo}"}
    headers_g_ofi = {"Authorization": f"Bearer {token_gestao_oficial}"}
    headers_a_demo = {"Authorization": f"Bearer {token_aluno_demo}"}
    headers_a_ofi = {"Authorization": f"Bearer {token_aluno_oficial}"}

    uid_demo = uuid.uuid4().hex[:6]
    uid_ofi = uuid.uuid4().hex[:6]

    # 1. Gestão Pública cria aviso
    resp_demo = client.post("/api/v1/notices/", json={
        "titulo": f"Aviso Demo {uid_demo}",
        "descricao": "Aviso exclusivo para visitantes da EXPOCEEP",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_g_demo)
    assert resp_demo.status_code == 201
    aviso_demo_data = resp_demo.json()
    assert aviso_demo_data["is_demo"] is True
    assert aviso_demo_data["ambiente"] == "PUBLICO"

    # 2. Gestão Oficial cria aviso
    resp_ofi = client.post("/api/v1/notices/", json={
        "titulo": f"Aviso Oficial {uid_ofi}",
        "descricao": "Aviso institucional oficial da escola",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_g_ofi)
    assert resp_ofi.status_code == 201
    aviso_ofi_data = resp_ofi.json()
    assert aviso_ofi_data["is_demo"] is False
    assert aviso_ofi_data["ambiente"] == "OFICIAL"

    # 3. Aluno Público lista avisos: DEVE ver o aviso demo, NÃO DEVE ver o aviso oficial
    notices_aluno_demo = client.get("/api/v1/notices/", headers=headers_a_demo).json()
    demo_titles = [n["titulo"] for n in notices_aluno_demo]
    assert f"Aviso Demo {uid_demo}" in demo_titles
    assert f"Aviso Oficial {uid_ofi}" not in demo_titles
    for n in notices_aluno_demo:
        assert n["is_demo"] is True
        assert n["ambiente"] == "PUBLICO"

    # 4. Aluno Oficial lista avisos: DEVE ver o aviso oficial, NÃO DEVE ver o aviso demo
    notices_aluno_ofi = client.get("/api/v1/notices/", headers=headers_a_ofi).json()
    ofi_titles = [n["titulo"] for n in notices_aluno_ofi]
    assert f"Aviso Oficial {uid_ofi}" in ofi_titles
    assert f"Aviso Demo {uid_demo}" not in ofi_titles
    for n in notices_aluno_ofi:
        assert n["is_demo"] is False
        assert n["ambiente"] == "OFICIAL"


def test_notice_management_cross_scope_modification_forbidden():
    """Gestão Pública não pode editar nem excluir aviso oficial, e vice-versa."""
    token_gestao_demo = get_auth_token("gestao.publico@ceep.demo")
    token_gestao_oficial = get_auth_token("gestao@ceep.demo")

    headers_g_demo = {"Authorization": f"Bearer {token_gestao_demo}"}
    headers_g_ofi = {"Authorization": f"Bearer {token_gestao_oficial}"}

    # Cria aviso oficial
    resp_ofi = client.post("/api/v1/notices/", json={
        "titulo": "Aviso Oficial Intocável",
        "descricao": "Apenas gestão oficial pode gerenciar",
        "prioridade": "MEDIA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_g_ofi)
    notice_id = resp_ofi.json()["id"]

    # Tentativa de edição por Gestão Pública -> 404 (isolamento não revela o aviso de outro ambiente)
    edit_resp = client.put(f"/api/v1/notices/{notice_id}", json={
        "titulo": "Tentativa de Alteração por Demo"
    }, headers=headers_g_demo)
    assert edit_resp.status_code == 404

    # Tentativa de exclusão por Gestão Pública -> 404
    del_resp = client.delete(f"/api/v1/notices/{notice_id}", headers=headers_g_demo)
    assert del_resp.status_code == 404


def test_canteen_orders_and_pickup_validation_isolation():
    """Garante isolamento absoluto de pedidos e QR codes entre Cantina Pública e Cantina Oficial."""
    token_aluno_demo = get_auth_token("aluno.publico@ceep.demo")
    token_aluno_oficial = get_auth_token("aluno@escola.pr.gov.br")
    token_cantina_demo = get_auth_token("cantina.publico@ceep.demo")
    token_cantina_oficial = get_auth_token("cantina@ceep.demo")

    headers_a_demo = {"Authorization": f"Bearer {token_aluno_demo}"}
    headers_a_ofi = {"Authorization": f"Bearer {token_aluno_oficial}"}
    headers_c_demo = {"Authorization": f"Bearer {token_cantina_demo}"}
    headers_c_ofi = {"Authorization": f"Bearer {token_cantina_oficial}"}

    # 1. Aluno Público cria pedido e paga
    order_demo = client.post("/api/v1/canteen/orders", json={"produto_id": 1, "quantidade": 1}, headers=headers_a_demo).json()
    assert order_demo["is_demo"] is True
    assert order_demo["ambiente"] == "PUBLICO"
    client.post(f"/api/v1/canteen/orders/{order_demo['id']}/simulate-payment", headers=headers_a_demo)
    qr_demo = client.get(f"/api/v1/canteen/orders/{order_demo['id']}/pickup-qr", headers=headers_a_demo).json()

    # 2. Aluno Oficial cria pedido e paga
    order_ofi = client.post("/api/v1/canteen/orders", json={"produto_id": 1, "quantidade": 1}, headers=headers_a_ofi).json()
    assert order_ofi["is_demo"] is False
    assert order_ofi["ambiente"] == "OFICIAL"
    client.post(f"/api/v1/canteen/orders/{order_ofi['id']}/simulate-payment", headers=headers_a_ofi)
    qr_ofi = client.get(f"/api/v1/canteen/orders/{order_ofi['id']}/pickup-qr", headers=headers_a_ofi).json()

    # 3. Cantina Pública tenta validar QR Code do aluno Oficial -> DEVE FALHAR (404)
    val_fail = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": qr_ofi["pickup_code"]}, headers=headers_c_demo)
    assert val_fail.status_code == 404
    assert "INVÁLIDO" in val_fail.json()["detail"]

    # 4. Cantina Oficial tenta validar QR Code do aluno Público -> DEVE FALHAR (404)
    val_fail2 = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": qr_demo["pickup_code"]}, headers=headers_c_ofi)
    assert val_fail2.status_code == 404
    assert "INVÁLIDO" in val_fail2.json()["detail"]

    # 5. Cantina Pública valida QR Code do aluno Público -> SUCESSO (200)
    val_ok = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": qr_demo["pickup_code"]}, headers=headers_c_demo)
    assert val_ok.status_code == 200
    assert val_ok.json()["status_validacao"] == "DISPONIVEL"

    # 6. Cantina Pública tenta confirmar retirada de pedido Oficial -> 404
    conf_fail = client.post(f"/api/v1/canteen/pickup/{order_ofi['id']}/confirm", headers=headers_c_demo)
    assert conf_fail.status_code == 404

    # 7. Cantina Pública confirma retirada do pedido Público -> SUCESSO (200)
    conf_ok = client.post(f"/api/v1/canteen/pickup/{order_demo['id']}/confirm", headers=headers_c_demo)
    assert conf_ok.status_code == 200
    assert conf_ok.json()["status"] == "UTILIZADO"


def test_management_overview_and_canteen_orders_isolation():
    """Overview e lista de pedidos na Gestão refletem exclusivamente o escopo do operador."""
    token_gestao_demo = get_auth_token("gestao.publico@ceep.demo")
    token_gestao_oficial = get_auth_token("gestao@ceep.demo")

    headers_g_demo = {"Authorization": f"Bearer {token_gestao_demo}"}
    headers_g_ofi = {"Authorization": f"Bearer {token_gestao_oficial}"}

    # 1. Overview para Gestão Pública
    ov_demo = client.get("/api/v1/management/overview", headers=headers_g_demo).json()
    assert ov_demo["total_alunos"] >= 1
    for av in ov_demo["avisos_recentes"]:
        assert av["is_demo"] is True
        assert av["ambiente"] == "PUBLICO"

    # 2. Overview para Gestão Oficial
    ov_ofi = client.get("/api/v1/management/overview", headers=headers_g_ofi).json()
    for av in ov_ofi["avisos_recentes"]:
        assert av["is_demo"] is False
        assert av["ambiente"] == "OFICIAL"

    # 3. Listagem de pedidos da Cantina para Gestão Pública
    orders_demo = client.get("/api/v1/management/canteen/orders", headers=headers_g_demo).json()
    for o in orders_demo:
        assert o["is_demo"] is True
        assert o["ambiente"] == "PUBLICO"

    # 4. Listagem de pedidos da Cantina para Gestão Oficial
    orders_ofi = client.get("/api/v1/management/canteen/orders", headers=headers_g_ofi).json()
    for o in orders_ofi:
        assert o["is_demo"] is False
        assert o["ambiente"] == "OFICIAL"
