from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CursoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    sigla: str

class TurmaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome_turma: str
    curso: str
    periodo: str
    curso_id: Optional[int] = None
