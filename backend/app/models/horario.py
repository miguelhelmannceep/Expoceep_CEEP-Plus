from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    dia_semana = Column(String(20), nullable=False) # Segunda-feira, Terça-feira, etc.
    horario_inicio = Column(String(10), nullable=False) # Ex: "07:30"
    horario_fim = Column(String(10), nullable=False) # Ex: "08:20"
    disciplina = Column(String(100), nullable=False)
    professor = Column(String(100), nullable=False)
    sala = Column(String(50), nullable=True)
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=False)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id"), nullable=True)
    professor_id = Column(Integer, ForeignKey("professores.id"), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)

    turma_rel = relationship("Turma", back_populates="horarios")
    disciplina_rel = relationship("Disciplina")
    professor_rel = relationship("Professor")

