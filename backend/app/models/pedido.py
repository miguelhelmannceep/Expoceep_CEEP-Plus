import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    status = Column(String(30), nullable=False, default="PENDENTE_PAGAMENTO") # PENDENTE_PAGAMENTO, PAGO, UTILIZADO
    valor_total = Column(Float, nullable=False)
    pickup_token = Column(String(64), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    used_at = Column(DateTime, nullable=True)

    usuario_rel = relationship("Usuario", back_populates="pedidos")
    itens = relationship("PedidoItem", back_populates="pedido_rel", cascade="all, delete-orphan")
    pagamentos = relationship("Pagamento", back_populates="pedido_rel", cascade="all, delete-orphan")

class PedidoItem(Base):
    __tablename__ = "pedidos_itens"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    preco_unitario = Column(Float, nullable=False)

    pedido_rel = relationship("Pedido", back_populates="itens")
    produto_rel = relationship("Produto")

class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    status = Column(String(30), nullable=False, default="PENDENTE") # PENDENTE, APROVADO
    metodo = Column(String(30), nullable=False, default="PIX_SIMULADO")
    valor = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    paid_at = Column(DateTime, nullable=True)

    pedido_rel = relationship("Pedido", back_populates="pagamentos")
