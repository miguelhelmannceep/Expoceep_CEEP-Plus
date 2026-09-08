from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Curso(Base):
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    sigla = Column(String(20), nullable=False)

    turmas = relationship("Turma", back_populates="curso_rel")


class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, index=True)
    nome_turma = Column(String(50), nullable=False)
    curso = Column(String(100), nullable=False)
    periodo = Column(String(20), default="Manhã")
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=True)

    curso_rel = relationship("Curso", back_populates="turmas")
    usuarios = relationship("Usuario", back_populates="turma_rel")
    horarios = relationship("Horario", back_populates="turma_rel")
