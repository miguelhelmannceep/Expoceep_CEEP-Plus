from typing import Optional
from pydantic import BaseModel, ConfigDict

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
