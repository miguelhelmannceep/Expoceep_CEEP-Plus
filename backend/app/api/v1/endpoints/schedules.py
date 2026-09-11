from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.usuario import Usuario
from app.models.turma import Curso, Turma
from app.models.horario import Horario
from app.schemas.turma import CursoOut, TurmaOut
from app.schemas.horario import HorarioOut

router = APIRouter()

@router.get("/courses", response_model=List[CursoOut], summary="Lista todos os cursos técnicos")
def list_courses(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cursos = db.query(Curso).all()
    return cursos

@router.get("/classes", response_model=List[TurmaOut], summary="Lista todas as turmas disponíveis para consulta de horários")
def list_classes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    turmas = db.query(Turma).all()
    return turmas


@router.get("/{turma_id}", response_model=List[HorarioOut], summary="Horários da turma selecionada")
def get_schedules_by_class(
    turma_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")

    horarios = db.query(Horario).filter(
        Horario.turma_id == turma_id,
        (Horario.ativo == True) | (Horario.ativo == None)
    ).order_by(Horario.horario_inicio.asc()).all()

    result = []
    for h in horarios:
        disc_nome = h.disciplina_rel.nome if h.disciplina_rel else (h.disciplina or "Disciplina")
        prof_nome = h.professor_rel.nome if h.professor_rel else (h.professor or "Professor")
        result.append(HorarioOut(
            id=h.id,
            dia_semana=h.dia_semana,
            horario_inicio=h.horario_inicio,
            horario_fim=h.horario_fim,
            disciplina=disc_nome,
            professor=prof_nome,
            sala=h.sala,
            turma_id=h.turma_id,
            disciplina_id=h.disciplina_id,
            professor_id=h.professor_id,
            turma_nome=turma.nome_turma,
            curso_nome=turma.curso,
            ativo=h.ativo if h.ativo is not None else True
        ))
    return result
