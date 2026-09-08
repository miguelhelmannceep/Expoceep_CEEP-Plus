from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_roles
from app.models.usuario import Usuario
from app.models.produto import Produto
from app.schemas.produto import ProdutoOut

router = APIRouter()

@router.get("/products", response_model=List[ProdutoOut], summary="Lista de produtos ativos da cantina")
def list_canteen_products(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    produtos = db.query(Produto).filter(Produto.ativo == True).all()
    return produtos

@router.get("/terminal-status", summary="Status do terminal da cantina")
def get_canteen_status(
    current_user: Usuario = Depends(require_roles(["CANTINA"])),
    db: Session = Depends(get_db)
):
    return {
        "status": "OPERACIONAL",
        "terminal": "Balcão Principal",
        "atendente": current_user.nome,
        "mensagem": "Leitor de QR Code será disponibilizado neste módulo."
    }
