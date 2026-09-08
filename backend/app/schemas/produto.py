from typing import Optional
from pydantic import BaseModel, ConfigDict

class ProdutoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    descricao: Optional[str] = None
    preco: float
    ativo: bool
