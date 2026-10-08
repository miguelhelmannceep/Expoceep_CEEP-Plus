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
    OrderItemCreate,
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
        "ambiente": getattr(pedido, "ambiente", "OFICIAL"),
        "is_demo": bool(getattr(pedido, "is_demo", False)),
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
    # 1. Normalização dos itens recebidos (carrinho múltiplo ou item único legado)
    itens_solicitados = []
    if payload.itens is not None:
        if len(payload.itens) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O carrinho está vazio. Adicione pelo menos 1 item."
            )
        itens_solicitados = payload.itens
    elif payload.produto_id is not None:
        qtd = payload.quantidade if payload.quantidade is not None else 1
        itens_solicitados = [OrderItemCreate(produto_id=payload.produto_id, quantidade=qtd)]
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nenhum item informado para o pedido."
        )

    # 2. Validação das quantidades e consolidação de produtos duplicados
    qtd_por_produto = {}
    for item in itens_solicitados:
        if item.quantidade <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A quantidade de cada produto deve ser de pelo menos 1 item."
            )
        qtd_por_produto[item.produto_id] = qtd_por_produto.get(item.produto_id, 0) + item.quantidade

    if not qtd_por_produto:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O carrinho não possui itens válidos."
        )

    # 3. Busca e validação dos produtos ativos no banco de dados
    produto_ids = list(qtd_por_produto.keys())
    produtos_db = db.query(Produto).filter(
        Produto.id.in_(produto_ids),
        Produto.ativo == True
    ).all()

    produtos_map = {p.id: p for p in produtos_db}

    for pid in produto_ids:
        if pid not in produtos_map:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto ID {pid} não encontrado ou indisponível no catálogo."
            )

    # 4. Cálculo oficial dos subtotais e valor total no backend (nunca confiar no frontend)
    itens_para_criar = []
    valor_total = 0.0

    for pid, qtd in qtd_por_produto.items():
        prod = produtos_map[pid]
        preco_unit = float(prod.preco)
        subtotal = round(preco_unit * qtd, 2)
        valor_total += subtotal
        itens_para_criar.append({
            "produto_id": pid,
            "quantidade": qtd,
            "preco_unitario": preco_unit
        })

    valor_total = round(valor_total, 2)
    token = secrets.token_hex(16)

    try:
        pedido = Pedido(
            usuario_id=current_user.id,
            status="PENDENTE_PAGAMENTO",
            valor_total=valor_total,
            pickup_token=token,
            ambiente=getattr(current_user, "ambiente", "OFICIAL"),
            is_demo=bool(getattr(current_user, "is_demo", False))
        )
        db.add(pedido)
        db.flush()

        for item_data in itens_para_criar:
            db.add(PedidoItem(
                pedido_id=pedido.id,
                produto_id=item_data["produto_id"],
                quantidade=item_data["quantidade"],
                preco_unitario=item_data["preco_unitario"]
            ))

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
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar transação do pedido: {str(e)}"
        )

@router.get("/orders", response_model=List[PedidoOut], summary="Lista pedidos do aluno logado")
def list_canteen_orders(
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")
    pedidos = db.query(Pedido).filter(
        Pedido.usuario_id == current_user.id,
        Pedido.ambiente == user_ambiente
    ).order_by(Pedido.created_at.desc()).all()
    return [format_pedido_response(p) for p in pedidos]

@router.get("/orders/{order_id}", response_model=PedidoOut, summary="Detalhes de um pedido específico")
def get_canteen_order(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")
    pedido = db.query(Pedido).filter(
        Pedido.id == order_id,
        Pedido.usuario_id == current_user.id,
        Pedido.ambiente == user_ambiente
    ).first()
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
    return format_pedido_response(pedido)

@router.post("/orders/{order_id}/simulate-payment", response_model=PedidoOut, summary="Simula confirmação de pagamento PIX")
def simulate_order_payment(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")
    pedido = db.query(Pedido).filter(
        Pedido.id == order_id,
        Pedido.usuario_id == current_user.id,
        Pedido.ambiente == user_ambiente
    ).first()
    if not pedido:
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
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")
    pedido = db.query(Pedido).filter(
        Pedido.id == order_id,
        Pedido.usuario_id == current_user.id,
        Pedido.ambiente == user_ambiente
    ).first()
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

    if pedido.status == "PENDENTE_PAGAMENTO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pagamento não aprovado. Realize o pagamento antes de gerar o QR de retirada.")

    if pedido.status == "UTILIZADO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este pedido já foi utilizado e retirado.")

    if not pedido.pickup_token:
        pedido.pickup_token = secrets.token_hex(16)
        db.commit()
        db.refresh(pedido)

    itens_list = []
    for it in pedido.itens:
        itens_list.append({
            "id": it.id,
            "produto_id": it.produto_id,
            "produto_nome": it.produto_rel.nome if it.produto_rel else "Produto",
            "quantidade": it.quantidade,
            "preco_unitario": it.preco_unitario,
        })

    if len(itens_list) == 1:
        prod_nome = itens_list[0]["produto_nome"]
        qtd = itens_list[0]["quantidade"]
    elif len(itens_list) > 1:
        prod_nome = ", ".join(f"{it['quantidade']}x {it['produto_nome']}" for it in itens_list)
        qtd = sum(it["quantidade"] for it in itens_list)
    else:
        prod_nome = "Pedido Cantina"
        qtd = 1

    return {
        "order_id": pedido.id,
        "pickup_token": pedido.pickup_token,
        "pickup_code": f"CEEPPLUS-PICKUP-{pedido.pickup_token}",
        "status": pedido.status,
        "produto_nome": prod_nome,
        "quantidade": qtd,
        "valor_total": pedido.valor_total,
        "itens": itens_list,
    }

@router.post("/pickup/validate", response_model=PickupValidationResponse, summary="Validação do QR Code pelo Terminal da Cantina")
def validate_pickup_qr(
    payload: PickupValidateRequest,
    current_user: Usuario = Depends(require_roles(["CANTINA"])),
    db: Session = Depends(get_db)
):
    raw_code = payload.pickup_code.strip()
    token = raw_code.replace("CEEPPLUS-PICKUP-", "").strip()
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")

    pedido = db.query(Pedido).filter(
        (Pedido.pickup_token == token) | (Pedido.pickup_token == raw_code),
        Pedido.ambiente == user_ambiente
    ).first()

    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR CODE INVÁLIDO")

    if pedido.status == "UTILIZADO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PEDIDO JÁ UTILIZADO")

    if pedido.status == "PENDENTE_PAGAMENTO":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PAGAMENTO NÃO APROVADO")

    itens_list = []
    for it in pedido.itens:
        itens_list.append({
            "id": it.id,
            "produto_id": it.produto_id,
            "produto_nome": it.produto_rel.nome if it.produto_rel else "Produto",
            "quantidade": it.quantidade,
            "preco_unitario": it.preco_unitario,
        })

    if len(itens_list) == 1:
        prod_nome = itens_list[0]["produto_nome"]
        qtd = itens_list[0]["quantidade"]
    elif len(itens_list) > 1:
        prod_nome = ", ".join(f"{it['quantidade']}x {it['produto_nome']}" for it in itens_list)
        qtd = sum(it["quantidade"] for it in itens_list)
    else:
        prod_nome = "Pedido Cantina"
        qtd = 1

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
        "itens": itens_list,
    }

@router.post("/pickup/{order_id}/confirm", response_model=ConfirmPickupResponse, summary="Confirmação da Retirada pelo Operador da Cantina")
def confirm_pickup_order(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["CANTINA"])),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")

    # Atualização atômica para prevenção absoluta de duplo uso / race conditions respeitando escopo de ambiente
    rows_updated = db.query(Pedido).filter(
        Pedido.id == order_id,
        Pedido.status == "PAGO",
        Pedido.ambiente == user_ambiente
    ).update({
        Pedido.status: "UTILIZADO",
        Pedido.used_at: now,
        Pedido.updated_at: now
    }, synchronize_session=False)

    db.commit()

    if rows_updated == 0:
        pedido = db.query(Pedido).filter(
            Pedido.id == order_id,
            Pedido.ambiente == user_ambiente
        ).first()
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
