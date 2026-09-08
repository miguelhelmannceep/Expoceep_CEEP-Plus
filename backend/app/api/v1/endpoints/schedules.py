from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.usuario import Usuario
from app.models.turma import Turma
from app.models.horario import Horario
from app.schemas.turma import TurmaOut
from app.schemas.horario import HorarioOut

router = APIRouter()

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
    horarios = db.query(Horario).filter(Horario.turma_id == turma_id).all()
    return horarios
