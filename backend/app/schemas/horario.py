from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator

class HorarioCreate(BaseModel):
    turma_id: int
    disciplina_id: Optional[int] = None
    disciplina: Optional[str] = None
    professor_id: Optional[int] = None
    professor: Optional[str] = None
    sala: Optional[str] = None
    dia_semana: str
    horario_inicio: str
    horario_fim: str
    duracao: Optional[int] = 1 # 1 período, 2 para aula dupla
    periodo_ordem: Optional[int] = None
    grupo: Optional[str] = None
    ativo: Optional[bool] = True

    @field_validator("dia_semana")
    @classmethod
    def validate_dia(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Dia da semana é obrigatório.")
        return v

    @field_validator("horario_inicio", "horario_fim")
    @classmethod
    def validate_hora(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Horário é obrigatório.")
        return v

class HorarioUpdate(BaseModel):
    turma_id: Optional[int] = None
    disciplina_id: Optional[int] = None
    disciplina: Optional[str] = None
    professor_id: Optional[int] = None
    professor: Optional[str] = None
    sala: Optional[str] = None
    dia_semana: Optional[str] = None
    horario_inicio: Optional[str] = None
    horario_fim: Optional[str] = None
    duracao: Optional[int] = None
    periodo_ordem: Optional[int] = None
    grupo: Optional[str] = None
    ativo: Optional[bool] = None

class HorarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dia_semana: str
    horario_inicio: str
    horario_fim: str
    disciplina: str
    professor: str
    sala: Optional[str] = None
    turma_id: int
    disciplina_id: Optional[int] = None
    professor_id: Optional[int] = None
    duracao: int = 1
    periodo_ordem: Optional[int] = None
    grupo: Optional[str] = None
    turma_nome: Optional[str] = None
    curso_nome: Optional[str] = None
    ativo: bool = True


# ==========================================
# SCHEMAS: PERÍODOS & INTERVALOS
# ==========================================

class PeriodoHorarioCreate(BaseModel):
    ordem: int
    nome: str
    horario_inicio: str
    horario_fim: str
    turno: Optional[str] = "Manhã"
    is_intervalo: Optional[bool] = False
    ativo: Optional[bool] = True

class PeriodoHorarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordem: int
    nome: str
    horario_inicio: str
    horario_fim: str
    turno: str
    is_intervalo: bool
    ativo: bool


# ==========================================
# SCHEMAS: DISPONIBILIDADE DE RECURSOS
# ==========================================

class DisponibilidadeRecursoCreate(BaseModel):
    tipo_recurso: str # "PROFESSOR", "TURMA", "SALA"
    recurso_id: Optional[int] = None
    recurso_identificador: str
    dia_semana: str
    horario_inicio: str
    horario_fim: str
    periodo_ordem: Optional[int] = None
    tipo: Optional[str] = "INDISPONIVEL" # "INDISPONIVEL" ou "PREFERENCIA"
    motivo: Optional[str] = None
    ativo: Optional[bool] = True

class DisponibilidadeRecursoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo_recurso: str
    recurso_id: Optional[int] = None
    recurso_identificador: str
    dia_semana: str
    horario_inicio: str
    horario_fim: str
    periodo_ordem: Optional[int] = None
    tipo: str
    motivo: Optional[str] = None
    ativo: bool


# ==========================================
# SCHEMAS: REGRAS E BALANÇO DE CARGA HORÁRIA
# ==========================================

class RegraDisciplinaCreate(BaseModel):
    turma_id: int
    disciplina_id: int
    aulas_semanais: int
    max_aulas_dia: Optional[int] = 2
    permitir_aula_dupla: Optional[bool] = True
    sala_preferencial: Optional[str] = None

class RegraDisciplinaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    turma_id: int
    disciplina_id: int
    aulas_semanais: int
    max_aulas_dia: int
    permitir_aula_dupla: bool
    sala_preferencial: Optional[str] = None

class RegraDisciplinaBalanceOut(BaseModel):
    disciplina_id: int
    disciplina_nome: str
    disciplina_sigla: Optional[str] = None
    aulas_semanais_planejadas: int
    aulas_alocadas_na_grade: int
    balanco_status: str # "OK", "PENDENTE", "EXCEDENTE"
    sala_preferencial: Optional[str] = None


