from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class AvisoCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=150)
    descricao: str = Field(..., min_length=1)
    prioridade: str = Field(default="MEDIA", pattern="^(BAIXA|MEDIA|ALTA|URGENTE)$")
    publico_alvo_tipo: str = Field(default="GERAL", pattern="^(GERAL|CURSO|TURMA)$")
    publico_alvo_id: Optional[int] = None
    status: str = Field(default="PUBLICADO", pattern="^(RASCUNHO|PUBLICADO)$")

class AvisoUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=150)
    descricao: Optional[str] = Field(None, min_length=1)
    prioridade: Optional[str] = Field(None, pattern="^(BAIXA|MEDIA|ALTA|URGENTE)$")
    publico_alvo_tipo: Optional[str] = Field(None, pattern="^(GERAL|CURSO|TURMA)$")
    publico_alvo_id: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(RASCUNHO|PUBLICADO)$")

class AvisoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    descricao: str
    prioridade: str
    publico_alvo_tipo: str
    publico_alvo_id: Optional[int] = None
    publico_alvo_nome: Optional[str] = None
    status: str = "PUBLICADO"
    data_publicacao: datetime
    autor_nome: Optional[str] = None
