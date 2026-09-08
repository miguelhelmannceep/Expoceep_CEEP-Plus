from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.usuario import Usuario
from app.models.aviso import Aviso
from app.schemas.aviso import AvisoOut

router = APIRouter()

@router.get("/", response_model=List[AvisoOut], summary="Lista de comunicados escolares")
def list_notices(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    avisos = db.query(Aviso).order_by(Aviso.data_publicacao.desc()).all()
    return [
        AvisoOut(
            id=a.id,
            titulo=a.titulo,
            descricao=a.descricao,
            prioridade=a.prioridade,
            publico_alvo_tipo=a.publico_alvo_tipo,
            publico_alvo_id=a.publico_alvo_id,
            data_publicacao=a.data_publicacao,
            autor_nome=a.autor_rel.nome if a.autor_rel else "Coordenação"
        )
        for a in avisos
    ]
