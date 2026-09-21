from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Aviso(Base):
    __tablename__ = "avisos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=False)
    prioridade = Column(String(20), default="MEDIA") # BAIXA, MEDIA, ALTA, URGENTE
    publico_alvo_tipo = Column(String(20), default="GERAL") # GERAL, CURSO, TURMA
    publico_alvo_id = Column(Integer, nullable=True)
    status = Column(String(20), default="PUBLICADO", nullable=False) # RASCUNHO, PUBLICADO
    imagem_url = Column(Text, nullable=True)
    data_publicacao = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    autor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    autor_rel = relationship("Usuario", back_populates="avisos_publicados")

