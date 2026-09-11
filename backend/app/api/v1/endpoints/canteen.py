import secrets
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_roles
from app.models.usuario import Usuario
from app.models.produto import Produto
from app.models.pedido import Pedido, PedidoItem, Pagamento
from app.schemas.produto import ProdutoOut
from app.schemas.pedido import (
    OrderCreateRequest,
    PedidoOut,
    PickupQRResponse,
    PickupValidateRequest,
    PickupValidationResponse,
    ConfirmPickupResponse
)

router = APIRouter()

def format_pedido_response(pedido: Pedido) -> dict:
    latest_pagamento = pedido.pagamentos[-1] if pedido.pagamentos else None
    pagamento_dict = None
    if latest_pagamento:
        pagamento_dict = {
            "id": latest_pagamento.id,
            "pedido_id": latest_pagamento.pedido_id,
            "status": latest_pagamento.status,
            "metodo": latest_pagamento.metodo,
            "valor": latest_pagamento.valor,
            "created_at": latest_pagamento.created_at,
            "paid_at": latest_pagamento.paid_at,
        }

    itens_list = []
    for item in pedido.itens:
        itens_list.append({
            "id": item.id,
            "produto_id": item.produto_id,
            "produto_nome": item.produto_rel.nome if item.produto_rel else "Produto",
            "quantidade": item.quantidade,
            "preco_unitario": item.preco_unitario,
        })

    pickup_code = f"CEEPPLUS-PICKUP-{pedido.pickup_token}" if pedido.pickup_token else None

    return {
        "id": pedido.id,
        "usuario_id": pedido.usuario_id,
        "status": pedido.status,
        "valor_total": pedido.valor_total,
        "pickup_token": pedido.pickup_token,
        "pickup_code": pickup_code,
        "created_at": pedido.created_at,
        "updated_at": pedido.updated_at,
        "used_at": pedido.used_at,
        "itens": itens_list,
        "pagamento": pagamento_dict,
        "pix_code": f"CEEPPLUS-DEMO-PAYMENT-{pedido.id:05d}",
    }

@router.get("/products", response_model=List[ProdutoOut], summary="Lista de produtos ativos da cantina")
def list_canteen_products(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    produtos = db.query(Produto).filter(Produto.ativo == True).all()
    return produtos

@router.post("/orders", response_model=PedidoOut, status_code=status.HTTP_201_CREATED, summary="Cria novo pedido na cantina")
def create_canteen_order(
    payload: OrderCreateRequest,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    if payload.quantidade <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A quantidade deve ser de pelo menos 1 item.")

    produto = db.query(Produto).filter(Produto.id == payload.produto_id, Produto.ativo == True).first()
    if not produto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado ou indisponível.")

    valor_total = round(float(produto.preco) * payload.quantidade, 2)
    token = secrets.token_hex(16)

    try:
        pedido = Pedido(
            usuario_id=current_user.id,
            status="PENDENTE_PAGAMENTO",
            valor_total=valor_total,
            pickup_token=token
        )
        db.add(pedido)
        db.flush()

        item = PedidoItem(
            pedido_id=pedido.id,
            produto_id=produto.id,
            quantidade=payload.quantidade,
            preco_unitario=produto.preco
        )
        db.add(item)

        pagamento = Pagamento(
            pedido_id=pedido.id,
            status="PENDENTE",
            metodo="PIX_SIMULADO",
            valor=valor_total
        )
        db.add(pagamento)

        db.commit()
        db.refresh(pedido)
        return format_pedido_response(pedido)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao processar transação do pedido: {str(e)}")

@router.get("/orders", response_model=List[PedidoOut], summary="Lista pedidos do aluno logado")
def list_canteen_orders(
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    pedidos = db.query(Pedido).filter(Pedido.usuario_id == current_user.id).order_by(Pedido.created_at.desc()).all()
    return [format_pedido_response(p) for p in pedidos]

@router.get("/orders/{order_id}", response_model=PedidoOut, summary="Detalhes de um pedido específico")
def get_canteen_order(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    pedido = db.query(Pedido).filter(Pedido.id == order_id).first()
    if not pedido or pedido.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
    return format_pedido_response(pedido)

@router.post("/orders/{order_id}/simulate-payment", response_model=PedidoOut, summary="Simula confirmação de pagamento PIX")
def simulate_order_payment(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    pedido = db.query(Pedido).filter(Pedido.id == order_id).first()
    if not pedido or pedido.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

    if pedido.status == "PAGO":
        return format_pedido_response(pedido)
    
    if pedido.status == "UTILIZADO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pedido já foi utilizado.")

    now = datetime.now(timezone.utc)
    try:
        pedido.status = "PAGO"
        pedido.updated_at = now
        if not pedido.pickup_token:
            pedido.pickup_token = secrets.token_hex(16)

        for pag in pedido.pagamentos:
            if pag.status == "PENDENTE":
                pag.status = "APROVADO"
                pag.paid_at = now

        db.commit()
        db.refresh(pedido)
        return format_pedido_response(pedido)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao simular pagamento: {str(e)}")

# ==========================================
# MILESTONE 2B: RETIRADA & SCANNER ENDPOINTS
# ==========================================

@router.get("/orders/{order_id}/pickup-qr", response_model=PickupQRResponse, summary="Gera/retorna dados do QR Code de Retirada do Aluno")
def get_order_pickup_qr(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    pedido = db.query(Pedido).filter(Pedido.id == order_id).first()
    if not pedido or pedido.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

    if pedido.status == "PENDENTE_PAGAMENTO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pagamento não aprovado. Realize o pagamento antes de gerar o QR de retirada.")

    if pedido.status == "UTILIZADO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este pedido já foi utilizado e retirado.")

    if not pedido.pickup_token:
        pedido.pickup_token = secrets.token_hex(16)
        db.commit()
        db.refresh(pedido)

    item = pedido.itens[0] if pedido.itens else None
    prod_nome = item.produto_rel.nome if item and item.produto_rel else "Salgado"
    qtd = item.quantidade if item else 1

    return {
        "order_id": pedido.id,
        "pickup_token": pedido.pickup_token,
        "pickup_code": f"CEEPPLUS-PICKUP-{pedido.pickup_token}",
        "status": pedido.status,
        "produto_nome": prod_nome,
        "quantidade": qtd,
        "valor_total": pedido.valor_total,
    }

@router.post("/pickup/validate", response_model=PickupValidationResponse, summary="Validação do QR Code pelo Terminal da Cantina")
def validate_pickup_qr(
    payload: PickupValidateRequest,
    current_user: Usuario = Depends(require_roles(["CANTINA"])),
    db: Session = Depends(get_db)
):
    raw_code = payload.pickup_code.strip()
    token = raw_code.replace("CEEPPLUS-PICKUP-", "").strip()

    pedido = db.query(Pedido).filter(
        (Pedido.pickup_token == token) | (Pedido.pickup_token == raw_code)
    ).first()

    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR CODE INVÁLIDO")

    if pedido.status == "UTILIZADO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PEDIDO JÁ UTILIZADO")

    if pedido.status == "PENDENTE_PAGAMENTO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PAGAMENTO NÃO APROVADO")

    item = pedido.itens[0] if pedido.itens else None
    prod_nome = item.produto_rel.nome if item and item.produto_rel else "Salgado"
    qtd = item.quantidade if item else 1

    paid_at = None
    if pedido.pagamentos:
        for p in pedido.pagamentos:
            if p.status == "APROVADO":
                paid_at = p.paid_at
                break

    return {
        "order_id": pedido.id,
        "status": pedido.status,
        "status_validacao": "DISPONIVEL",
        "aluno_nome": pedido.usuario_rel.nome if pedido.usuario_rel else "Aluno",
        "produto_nome": prod_nome,
        "quantidade": qtd,
        "valor_total": pedido.valor_total,
        "pago_em": paid_at,
    }

@router.post("/pickup/{order_id}/confirm", response_model=ConfirmPickupResponse, summary="Confirmação da Retirada pelo Operador da Cantina")
def confirm_pickup_order(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["CANTINA"])),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)

    # Atualização atômica para prevenção absoluta de duplo uso / race conditions
    rows_updated = db.query(Pedido).filter(
        Pedido.id == order_id,
        Pedido.status == "PAGO"
    ).update({
        Pedido.status: "UTILIZADO",
        Pedido.used_at: now,
        Pedido.updated_at: now
    }, synchronize_session=False)

    db.commit()

    if rows_updated == 0:
        pedido = db.query(Pedido).filter(Pedido.id == order_id).first()
        if not pedido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
        if pedido.status == "UTILIZADO":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PEDIDO JÁ UTILIZADO")
        if pedido.status == "PENDENTE_PAGAMENTO":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PAGAMENTO NÃO APROVADO")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não foi possível confirmar a retirada.")

    return {
        "order_id": order_id,
        "status": "UTILIZADO",
        "mensagem": "Retirada confirmada com sucesso.",
        "used_at": now
    }

@router.get("/terminal-status", summary="Status do terminal da cantina")
def get_canteen_status(
    current_user: Usuario = Depends(require_roles(["CANTINA"])),
    db: Session = Depends(get_db)
):
    return {
        "status": "OPERACIONAL",
        "terminal": "Balcão Principal",
        "atendente": current_user.nome,
        "mensagem": "Scanner e validador de retiradas operacionais."
    }
