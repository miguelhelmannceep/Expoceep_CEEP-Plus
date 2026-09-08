from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class TarefaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    descricao: Optional[str] = None
    data_entrega: Optional[date] = None
    status: str
    prioridade: str
    criado_em: datetime
