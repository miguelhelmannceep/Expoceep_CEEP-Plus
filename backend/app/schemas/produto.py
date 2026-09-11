from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ProdutoCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    descricao: Optional[str] = None
    preco: float = Field(..., gt=0, description="Preço do produto em reais")
    ativo: bool = True

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    descricao: Optional[str] = None
    preco: Optional[float] = Field(None, gt=0, description="Preço do produto em reais")
    ativo: Optional[bool] = None

class ProdutoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    descricao: Optional[str] = None
    preco: float
    ativo: bool
