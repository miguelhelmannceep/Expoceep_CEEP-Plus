from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Curso(Base):
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    sigla = Column(String(20), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)

    turmas = relationship("Turma", back_populates="curso_rel")
    disciplinas = relationship("Disciplina", back_populates="curso_rel")


class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, index=True)
    nome_turma = Column(String(100), nullable=False)
    curso = Column(String(100), nullable=False)
    periodo = Column(String(20), default="Manhã")
    ano = Column(String(20), default="3º Ano", nullable=True)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)

    curso_rel = relationship("Curso", back_populates="turmas")
    usuarios = relationship("Usuario", back_populates="turma_rel")
    horarios = relationship("Horario", back_populates="turma_rel")

