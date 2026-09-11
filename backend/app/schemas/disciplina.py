from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

class DisciplinaCreate(BaseModel):
    nome: str
    sigla: Optional[str] = None
    curso_id: int
    ativo: Optional[bool] = True

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O nome da disciplina é obrigatório e não pode ser vazio.")
        return v

    @field_validator("sigla")
    @classmethod
    def validate_sigla(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            return v if v else None
        return None

    @field_validator("curso_id")
    @classmethod
    def validate_curso_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("ID de curso inválido.")
        return v

class DisciplinaUpdate(BaseModel):
    nome: Optional[str] = None
    sigla: Optional[str] = None
    curso_id: Optional[int] = None
    ativo: Optional[bool] = None

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("O nome da disciplina não pode ser vazio.")
        return v

    @field_validator("sigla")
    @classmethod
    def validate_sigla(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            return v if v else None
        return None

class DisciplinaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    sigla: Optional[str] = None
    curso_id: int
    curso_nome: Optional[str] = None
    curso_sigla: Optional[str] = None
    ativo: bool = True
