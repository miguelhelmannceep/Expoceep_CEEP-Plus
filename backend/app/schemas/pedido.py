from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class OrderItemCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(default=1, ge=1)

class OrderCreateRequest(BaseModel):
    # Suporte a carrinho de compras com múltiplos itens (Milestone 5AA)
    itens: Optional[List[OrderItemCreate]] = None
    # Retrocompatibilidade com pedidos de item único legado
    produto_id: Optional[int] = None
    quantidade: Optional[int] = Field(default=None, ge=1)

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
    ambiente: str = "OFICIAL"
    is_demo: bool = False
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
    itens: List[PedidoItemOut] = []

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
    itens: List[PedidoItemOut] = []

class ConfirmPickupResponse(BaseModel):
    order_id: int
    status: str
    mensagem: str
    used_at: datetime
