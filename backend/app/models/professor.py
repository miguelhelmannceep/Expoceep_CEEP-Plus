from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base

class Professor(Base):
    __tablename__ = "professores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
