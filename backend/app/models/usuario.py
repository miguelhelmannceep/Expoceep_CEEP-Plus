from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    perfil = Column(String(20), nullable=False) # ALUNO, GESTAO, CANTINA
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    turma_rel = relationship("Turma", back_populates="usuarios")
    tarefas = relationship("Tarefa", back_populates="aluno_rel")
    avisos_publicados = relationship("Aviso", back_populates="autor_rel")
