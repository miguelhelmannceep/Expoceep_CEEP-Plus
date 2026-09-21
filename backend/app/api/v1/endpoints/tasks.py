from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa
from app.schemas.tarefa import TarefaOut, TarefaCreate

router = APIRouter()

@router.get("/", response_model=List[TarefaOut], summary="Tarefas e anotações do aluno logado")
def list_my_tasks(
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    tarefas = db.query(Tarefa).filter(Tarefa.aluno_id == current_user.id).order_by(Tarefa.data_entrega.asc().nulls_last(), Tarefa.id.desc()).all()
    return tarefas


@router.post("/", response_model=TarefaOut, status_code=status.HTTP_201_CREATED, summary="Cria uma nova tarefa para o aluno logado")
def create_task(
    payload: TarefaCreate,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    titulo = payload.titulo.strip()
    if not titulo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O título da tarefa é obrigatório."
        )

    nova_tarefa = Tarefa(
        titulo=titulo,
        descricao=payload.descricao.strip() if payload.descricao else None,
        data_entrega=payload.data_entrega,
        prioridade=payload.prioridade or "MEDIA",
        status="PENDENTE",
        aluno_id=current_user.id
    )
    db.add(nova_tarefa)
    db.commit()
    db.refresh(nova_tarefa)
    return nova_tarefa


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


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Exclui uma tarefa pertencente ao aluno logado")
def delete_task(
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

    db.delete(tarefa)
    db.commit()
    return None

