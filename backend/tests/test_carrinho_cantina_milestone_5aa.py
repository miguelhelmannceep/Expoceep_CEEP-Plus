import pytest
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.models.produto import Produto
from app.models.pedido import Pedido, PedidoItem
from app.core.security import create_access_token

client = TestClient(app)

def get_auth_token(email: str) -> str:
    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    if user:
        return create_access_token(subject=str(user.id), role=user.perfil)
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "demo123"})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


def test_multi_item_cart_order_creation_success():
    """Milestone 5AA: Aluno compra múltiplos produtos em um único pedido com carrinho."""
    token_aluno = get_auth_token("aluno@escola.pr.gov.br")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    db = SessionLocal()
    chocomil = db.query(Produto).filter(Produto.nome.ilike("%chocomil%")).first()
    alfajor = db.query(Produto).filter(Produto.nome.ilike("%alfajor%")).first()
    geladinho = db.query(Produto).filter(Produto.nome.ilike("%geladinho%")).first()
    db.close()

    assert chocomil is not None
    assert alfajor is not None
    assert geladinho is not None

    payload = {
        "itens": [
            {"produto_id": chocomil.id, "quantidade": 2},   # 2 * 3.00 = 6.00
            {"produto_id": alfajor.id, "quantidade": 1},     # 1 * 4.00 = 4.00
            {"produto_id": geladinho.id, "quantidade": 3},   # 3 * 1.00 = 3.00
        ]
    }

    resp = client.post("/api/v1/canteen/orders", json=payload, headers=headers_aluno)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["status"] == "PENDENTE_PAGAMENTO"
    expected_total = (2 * chocomil.preco) + (1 * alfajor.preco) + (3 * geladinho.preco)
    assert abs(data["valor_total"] - expected_total) < 0.001
    assert len(data["itens"]) == 3
    assert data["pix_code"] is not None

    # Verifica os itens retornados
    items_by_prod = {it["produto_id"]: it for it in data["itens"]}
    assert items_by_prod[chocomil.id]["quantidade"] == 2
    assert items_by_prod[alfajor.id]["quantidade"] == 1
    assert items_by_prod[geladinho.id]["quantidade"] == 3


def test_cart_empty_items_validation_fails():
    """Milestone 5AA: Bloquear pedido com carrinho vazio."""
    token_aluno = get_auth_token("aluno@escola.pr.gov.br")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    # Itens vazio
    resp1 = client.post("/api/v1/canteen/orders", json={"itens": []}, headers=headers_aluno)
    assert resp1.status_code == 422

    # Objeto sem itens e sem produto_id
    resp2 = client.post("/api/v1/canteen/orders", json={}, headers=headers_aluno)
    assert resp2.status_code == 422


def test_cart_zero_or_negative_quantity_fails():
    """Milestone 5AA: Bloquear quantidades inválidas (<= 0)."""
    token_aluno = get_auth_token("aluno@escola.pr.gov.br")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    resp_zero = client.post("/api/v1/canteen/orders", json={
        "itens": [{"produto_id": 1, "quantidade": 0}]
    }, headers=headers_aluno)
    assert resp_zero.status_code == 422

    resp_neg = client.post("/api/v1/canteen/orders", json={
        "itens": [{"produto_id": 1, "quantidade": -1}]
    }, headers=headers_aluno)
    assert resp_neg.status_code == 422


def test_cart_nonexistent_product_fails():
    """Milestone 5AA: Rejeitar produto inexistente com 404."""
    token_aluno = get_auth_token("aluno@escola.pr.gov.br")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    resp = client.post("/api/v1/canteen/orders", json={
        "itens": [{"produto_id": 999999, "quantidade": 1}]
    }, headers=headers_aluno)
    assert resp.status_code == 404
    assert "não encontrado" in resp.text.lower()


def test_multi_item_full_lifecycle_payment_and_pickup():
    """Milestone 5AA: Fluxo completo de pedido multi-item: criação, PIX, validação do QR e confirmação no terminal."""
    token_aluno = get_auth_token("aluno@escola.pr.gov.br")
    token_cantina = get_auth_token("cantina@ceep.demo")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}
    headers_cantina = {"Authorization": f"Bearer {token_cantina}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome.ilike("%salgado%")).first()
    suco = db.query(Produto).filter(Produto.nome.ilike("%suco%")).first()
    db.close()

    assert salgado is not None
    assert suco is not None

    # 1. Criação do pedido com 2 produtos distintos
    order_resp = client.post("/api/v1/canteen/orders", json={
        "itens": [
            {"produto_id": salgado.id, "quantidade": 1},
            {"produto_id": suco.id, "quantidade": 2},
        ]
    }, headers=headers_aluno)
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    order_id = order_data["id"]
    expected_total = salgado.preco + (2 * suco.preco)
    assert abs(order_data["valor_total"] - expected_total) < 0.001

    # 2. Aluno não consegue pegar QR de retirada antes de pagar
    qr_before_pay = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno)
    assert qr_before_pay.status_code == 400

    # 3. Pagamento simulado único
    pay_resp = client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers_aluno)
    assert pay_resp.status_code == 200
    assert pay_resp.json()["status"] == "PAGO"

    # 4. Aluno consulta QR de retirada único com discriminação dos itens
    qr_resp = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_aluno)
    assert qr_resp.status_code == 200
    qr_data = qr_resp.json()
    pickup_code = qr_data["pickup_code"]
    assert pickup_code.startswith("CEEPPLUS-PICKUP-")
    assert len(qr_data["itens"]) == 2
    assert qr_data["quantidade"] == 3  # 1 salgado + 2 sucos

    # 5. Operador da cantina valida QR Code no terminal
    val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["order_id"] == order_id
    assert len(val_data["itens"]) == 2
    assert val_data["quantidade"] == 3
    assert abs(val_data["valor_total"] - expected_total) < 0.001

    # 6. Operador confirma a entrega no terminal
    conf_resp = client.post(f"/api/v1/canteen/pickup/{order_id}/confirm", headers=headers_cantina)
    assert conf_resp.status_code == 200
    assert conf_resp.json()["status"] == "UTILIZADO"

    # 7. Prevenção de reuso (QR Code não pode ser reutilizado)
    conf_again = client.post(f"/api/v1/canteen/pickup/{order_id}/confirm", headers=headers_cantina)
    assert conf_again.status_code == 400
    assert "PEDIDO JÁ UTILIZADO" in conf_again.text

    val_again = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_cantina)
    assert val_again.status_code == 400
    assert "PEDIDO JÁ UTILIZADO" in val_again.text


def test_legacy_single_item_backward_compatibility():
    """Milestone 5AA: Preservar retrocompatibilidade com chamadas legadas com produto_id e quantidade."""
    token_aluno = get_auth_token("aluno@escola.pr.gov.br")
    headers_aluno = {"Authorization": f"Bearer {token_aluno}"}

    db = SessionLocal()
    salgado = db.query(Produto).filter(Produto.nome.ilike("%salgado%")).first()
    db.close()

    assert salgado is not None

    resp = client.post("/api/v1/canteen/orders", json={
        "produto_id": salgado.id,
        "quantidade": 2
    }, headers=headers_aluno)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "PENDENTE_PAGAMENTO"
    assert abs(data["valor_total"] - (2 * salgado.preco)) < 0.001
    assert len(data["itens"]) == 1
    assert data["itens"][0]["quantidade"] == 2


def test_canteen_environment_isolation_pickup():
    """Milestone 5AA: Isolamento de ambiente na cantina (Publico vs Oficial)."""
    token_aluno_demo = get_auth_token("aluno.publico@ceep.demo")
    token_cantina_oficial = get_auth_token("cantina@ceep.demo")  # Oficial
    headers_a_demo = {"Authorization": f"Bearer {token_aluno_demo}"}
    headers_c_ofi = {"Authorization": f"Bearer {token_cantina_oficial}"}

    db = SessionLocal()
    prod = db.query(Produto).filter(Produto.ativo == True).first()
    db.close()

    # Pedido criado no ambiente PUBLICO
    order_resp = client.post("/api/v1/canteen/orders", json={
        "itens": [{"produto_id": prod.id, "quantidade": 1}]
    }, headers=headers_a_demo)
    assert order_resp.status_code == 201
    order_id = order_resp.json()["id"]

    # Simula pagamento no público
    pay_resp = client.post(f"/api/v1/canteen/orders/{order_id}/simulate-payment", headers=headers_a_demo)
    assert pay_resp.status_code == 200

    # Obtém QR code no público
    qr_data = client.get(f"/api/v1/canteen/orders/{order_id}/pickup-qr", headers=headers_a_demo).json()
    pickup_code = qr_data["pickup_code"]

    # Operador no ambiente OFICIAL tenta validar QR do público -> deve falhar com 404
    val_resp = client.post("/api/v1/canteen/pickup/validate", json={"pickup_code": pickup_code}, headers=headers_c_ofi)
    assert val_resp.status_code == 404
