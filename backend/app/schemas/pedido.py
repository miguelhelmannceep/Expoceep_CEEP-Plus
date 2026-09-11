from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class OrderCreateRequest(BaseModel):
    produto_id: int
    quantidade: int = Field(default=1, ge=1)

class PagamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pedido_id: int
    status: str
    metodo: str
    valor: float
    created_at: datetime
    paid_at: Optional[datetime] = None

class PedidoItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    produto_id: int
    produto_nome: Optional[str] = None
    quantidade: int
    preco_unitario: float

class PedidoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    status: str
    valor_total: float
    pickup_token: Optional[str] = None
    pickup_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    itens: List[PedidoItemOut] = []
    pagamento: Optional[PagamentoOut] = None
    pix_code: Optional[str] = None

class PickupQRResponse(BaseModel):
    order_id: int
    pickup_token: str
    pickup_code: str
    status: str
    produto_nome: str
    quantidade: int
    valor_total: float

class PickupValidateRequest(BaseModel):
    pickup_code: str

class PickupValidationResponse(BaseModel):
    order_id: int
    status: str
    status_validacao: str
    aluno_nome: str
    produto_nome: str
    quantidade: int
    valor_total: float
    pago_em: Optional[datetime] = None

class ConfirmPickupResponse(BaseModel):
    order_id: int
    status: str
    mensagem: str
    used_at: datetime
