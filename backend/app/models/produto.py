from sqlalchemy import Column, Integer, String, Text, Float, Boolean
from app.db.base import Base

class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    preco = Column(Float, nullable=False)
    ativo = Column(Boolean, default=True)
