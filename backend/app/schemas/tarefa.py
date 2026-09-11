from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class TarefaCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=150)
    descricao: Optional[str] = None
    data_entrega: Optional[date] = None
    prioridade: Optional[str] = Field(default="MEDIA", pattern="^(BAIXA|MEDIA|ALTA)$")

class TarefaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    descricao: Optional[str] = None
    data_entrega: Optional[date] = None
    status: str
    prioridade: str
    criado_em: datetime

