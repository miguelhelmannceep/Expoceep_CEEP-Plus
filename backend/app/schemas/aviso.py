from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AvisoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    descricao: str
    prioridade: str
    publico_alvo_tipo: str
    publico_alvo_id: Optional[int] = None
    data_publicacao: datetime
    autor_nome: Optional[str] = None
