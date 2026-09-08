from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    nome: str
    email: str
    turma: Optional[str] = None

class DemoAccount(BaseModel):
    label: str
    email: str
    role: str
    descricao: str
    turma: Optional[str] = None
