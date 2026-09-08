from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    data_entrega = Column(Date, nullable=True)
    status = Column(String(20), default="PENDENTE") # PENDENTE, EM_ANDAMENTO, CONCLUIDA
    prioridade = Column(String(20), default="MEDIA") # BAIXA, MEDIA, ALTA
    aluno_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    aluno_rel = relationship("Usuario", back_populates="tarefas")
