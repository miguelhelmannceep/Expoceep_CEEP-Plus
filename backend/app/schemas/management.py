from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.aviso import AvisoOut

class CanteenOverviewSummary(BaseModel):
    total_pedidos: int
    pedidos_pagos: int
    pedidos_utilizados: int
    pedidos_pendentes: int
    receita_confirmada: float

class ManagementOverviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    gestor: str
    total_turmas: int
    total_avisos: int
    total_alunos: int
    cantina_resumo: CanteenOverviewSummary
    avisos_recentes: List[AvisoOut] = []
    status_sistema: str = "Estável"

class ManagementOrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    produto_id: int
    produto_nome: str
    quantidade: int
    preco_unitario: float
    subtotal: float

class ManagementOrderDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aluno_id: int
    aluno_nome: str
    aluno_email: str
    status: str
    valor_total: float
    pickup_token: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    itens: List[ManagementOrderItemOut] = []
    pagamento_status: Optional[str] = None
    pagamento_metodo: Optional[str] = None
