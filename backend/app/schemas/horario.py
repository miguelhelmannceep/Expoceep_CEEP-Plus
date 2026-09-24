from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

class HorarioCreate(BaseModel):
    turma_id: int
    disciplina_id: Optional[int] = None
    disciplina: Optional[str] = None
    professor_id: Optional[int] = None
    professor: Optional[str] = None
    sala: Optional[str] = None
    dia_semana: str
    horario_inicio: str
    horario_fim: str
    ativo: Optional[bool] = True

    @field_validator("dia_semana")
    @classmethod
    def validate_dia(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Dia da semana é obrigatório.")
        return v

    @field_validator("horario_inicio", "horario_fim")
    @classmethod
    def validate_hora(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Horário é obrigatório.")
        return v

class HorarioUpdate(BaseModel):
    turma_id: Optional[int] = None
    disciplina_id: Optional[int] = None
    disciplina: Optional[str] = None
    professor_id: Optional[int] = None
    professor: Optional[str] = None
    sala: Optional[str] = None
    dia_semana: Optional[str] = None
    horario_inicio: Optional[str] = None
    horario_fim: Optional[str] = None
    ativo: Optional[bool] = None

class HorarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dia_semana: str
    horario_inicio: str
    horario_fim: str
    disciplina: str
    professor: str
    sala: Optional[str] = None
    turma_id: int
    disciplina_id: Optional[int] = None
    professor_id: Optional[int] = None
    turma_nome: Optional[str] = None
    curso_nome: Optional[str] = None
    ativo: bool = True

