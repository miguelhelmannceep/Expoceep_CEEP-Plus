from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator

class CursoCreate(BaseModel):
    nome: str
    sigla: str
    ativo: Optional[bool] = True

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O nome do curso é obrigatório e não pode ser vazio.")
        return v

    @field_validator("sigla")
    @classmethod
    def validate_sigla(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("A sigla do curso é obrigatória e não pode ser vazia.")
        return v

class CursoUpdate(BaseModel):
    nome: Optional[str] = None
    sigla: Optional[str] = None
    ativo: Optional[bool] = None

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("O nome do curso não pode ser vazio.")
        return v

    @field_validator("sigla")
    @classmethod
    def validate_sigla(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("A sigla do curso não pode ser vazia.")
        return v

class CursoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    sigla: str
    ativo: bool = True
    total_turmas: Optional[int] = 0

class TurmaCreate(BaseModel):
    nome_turma: str
    curso_id: int
    ano: Optional[str] = "3º Ano"
    periodo: Optional[str] = "Manhã"
    ativo: Optional[bool] = True

    @field_validator("nome_turma")
    @classmethod
    def validate_nome_turma(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O nome da turma é obrigatório e não pode ser vazio.")
        return v

    @field_validator("curso_id")
    @classmethod
    def validate_curso_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("ID do curso inválido.")
        return v

class TurmaUpdate(BaseModel):
    nome_turma: Optional[str] = None
    curso_id: Optional[int] = None
    ano: Optional[str] = None
    periodo: Optional[str] = None
    ativo: Optional[bool] = None

    @field_validator("nome_turma")
    @classmethod
    def validate_nome_turma(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("O nome da turma não pode ser vazio.")
        return v

class TurmaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome_turma: str
    curso: str
    curso_id: Optional[int] = None
    ano: Optional[str] = None
    periodo: Optional[str] = "Manhã"
    ativo: bool = True
    curso_sigla: Optional[str] = None

