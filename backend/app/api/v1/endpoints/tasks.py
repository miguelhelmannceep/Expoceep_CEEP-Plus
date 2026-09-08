from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa
from app.schemas.tarefa import TarefaOut

router = APIRouter()

@router.get("/", response_model=List[TarefaOut], summary="Tarefas e anotações do aluno logado")
def list_my_tasks(
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    tarefas = db.query(Tarefa).filter(Tarefa.aluno_id == current_user.id).order_by(Tarefa.data_entrega.asc()).all()
    return tarefas

@router.patch("/{task_id}/toggle", response_model=TarefaOut, summary="Alterna status da tarefa entre PENDENTE e CONCLUIDA")
def toggle_task_status(
    task_id: int,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    tarefa = db.query(Tarefa).filter(
        Tarefa.id == task_id,
        Tarefa.aluno_id == current_user.id
    ).first()

    if not tarefa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarefa não encontrada ou não pertence ao aluno autenticado."
        )

    # Alterna o status
    if tarefa.status == "CONCLUIDA":
        tarefa.status = "PENDENTE"
    else:
        tarefa.status = "CONCLUIDA"

    db.commit()
    db.refresh(tarefa)
    return tarefa
