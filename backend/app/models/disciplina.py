from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.base import Base

# Tabela associativa para disciplinas compartilhadas entre múltiplos cursos
curso_disciplina = Table(
    "cursos_disciplinas",
    Base.metadata,
    Column("curso_id", Integer, ForeignKey("cursos.id", ondelete="CASCADE"), primary_key=True),
    Column("disciplina_id", Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), primary_key=True),
)

class Disciplina(Base):
    __tablename__ = "disciplinas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    sigla = Column(String(20), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=True)

    curso_rel = relationship("Curso", back_populates="disciplinas", foreign_keys=[curso_id])
    cursos_compartilhados = relationship(
        "Curso",
        secondary=curso_disciplina,
        back_populates="disciplinas_compartilhadas"
    )
