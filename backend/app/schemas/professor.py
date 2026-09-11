from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

class ProfessorCreate(BaseModel):
    nome: str
    email: Optional[str] = None
    ativo: Optional[bool] = True

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O nome do professor é obrigatório e não pode ser vazio.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            return v if v else None
        return None

class ProfessorUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    ativo: Optional[bool] = None

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("O nome do professor não pode ser vazio.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            return v if v else None
        return None

class ProfessorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: Optional[str] = None
    ativo: bool = True
