from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models.usuario import Usuario
from app.models.turma import Turma
from app.models.aviso import Aviso

router = APIRouter()

@router.get("/overview", summary="Visão geral e métricas do painel da Gestão")
def get_management_overview(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    total_turmas = db.query(Turma).count()
    total_avisos = db.query(Aviso).count()
    total_alunos = db.query(Usuario).filter(Usuario.perfil == "ALUNO").count()

    return {
        "gestor": current_user.nome,
        "total_turmas": total_turmas,
        "total_avisos": total_avisos,
        "total_alunos": total_alunos,
        "demanda_estimada_cantina": 42,
        "status_sistema": "Estável"
    }
