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
    duracao = Column(Integer, default=1, nullable=False) # Quantidade de períodos ocupados (1 = aula normal, 2 = aula dupla)
    periodo_ordem = Column(Integer, nullable=True) # Ordem do período inicial (1ª, 2ª aula...)
    grupo = Column(String(50), nullable=True) # Preparado para divisões de grupo (null = Turma toda, "Grupo A", "Grupo B")
    ativo = Column(Boolean, default=True, nullable=False)

    turma_rel = relationship("Turma", back_populates="horarios")
    disciplina_rel = relationship("Disciplina")
    professor_rel = relationship("Professor")


class PeriodoHorario(Base):
    """Representa a grade de períodos diários e intervalos/recreios configuráveis pela Gestão."""
    __tablename__ = "periodos_horario"

    id = Column(Integer, primary_key=True, index=True)
    ordem = Column(Integer, nullable=False) # 1, 2, 3, etc.
    nome = Column(String(50), nullable=False) # "1ª aula", "Recreio", "2ª aula", etc.
    horario_inicio = Column(String(10), nullable=False) # "07:30"
    horario_fim = Column(String(10), nullable=False) # "08:20"
    turno = Column(String(20), default="Manhã", nullable=False) # "Manhã", "Tarde", "Noite"
    is_intervalo = Column(Boolean, default=False, nullable=False) # True = Recreio / intervalo onde não pode haver aula
    ativo = Column(Boolean, default=True, nullable=False)


class DisponibilidadeRecurso(Base):
    """Registra restrições e preferências de horário para Professores, Turmas e Salas."""
    __tablename__ = "disponibilidades_recurso"

    id = Column(Integer, primary_key=True, index=True)
    tipo_recurso = Column(String(20), nullable=False) # "PROFESSOR", "TURMA", "SALA"
    recurso_id = Column(Integer, nullable=True) # ID do professor ou turma (se aplicável)
    recurso_identificador = Column(String(100), nullable=False) # Nome do professor, turma ou sala
    dia_semana = Column(String(20), nullable=False) # "Segunda-feira", etc.
    horario_inicio = Column(String(10), nullable=False) # "07:30"
    horario_fim = Column(String(10), nullable=False) # "08:20"
    periodo_ordem = Column(Integer, nullable=True) # Período opcional correspondente
    tipo = Column(String(20), default="INDISPONIVEL", nullable=False) # "INDISPONIVEL" (bloqueio obrigatório) ou "PREFERENCIA"
    motivo = Column(String(200), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)


class RegraDisciplina(Base):
    """Carga horária semanal planejada por disciplina e turma (base para contagem e verificação)."""
    __tablename__ = "regras_disciplina"

    id = Column(Integer, primary_key=True, index=True)
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=False)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id"), nullable=False)
    aulas_semanais = Column(Integer, default=2, nullable=False) # Quantidade de aulas planejadas por semana
    max_aulas_dia = Column(Integer, default=2, nullable=False) # Limite de aulas no mesmo dia
    permitir_aula_dupla = Column(Boolean, default=True, nullable=False)
    sala_preferencial = Column(String(50), nullable=True)

    turma_rel = relationship("Turma")
    disciplina_rel = relationship("Disciplina")


