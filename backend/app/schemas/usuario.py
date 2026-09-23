from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    perfil: str
    turma_id: Optional[int] = None
    turma_nome: Optional[str] = None
    curso_nome: Optional[str] = None
    avatar_url: Optional[str] = None
