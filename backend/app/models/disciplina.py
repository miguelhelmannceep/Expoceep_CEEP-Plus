from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Disciplina(Base):
    __tablename__ = "disciplinas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    sigla = Column(String(20), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)

    curso_rel = relationship("Curso", back_populates="disciplinas")
