from typing import Optional, List
from pydantic import BaseModel
from app.schemas.horario import HorarioOut
from app.schemas.aviso import AvisoOut
from app.schemas.tarefa import TarefaOut
from app.schemas.produto import ProdutoOut

class NextClassOut(BaseModel):
    horario_inicio: str
    horario_fim: str
    disciplina: str
    professor: str
    sala: Optional[str] = None
    dia_semana: Optional[str] = None

class StudentDashboardOut(BaseModel):
    saudacao: str
    aluno_nome: str
    turma_nome: Optional[str] = None
    curso_nome: Optional[str] = None
    aula_atual: Optional[NextClassOut] = None
    proxima_aula: Optional[NextClassOut] = None
    status_aulas: Optional[str] = None
    mensagem_aulas: Optional[str] = None
    dia_semana_atual: Optional[str] = None
    horario_atual: Optional[str] = None
    is_dia_letivo: Optional[bool] = None
    aviso_recente: Optional[AvisoOut] = None
    tarefas_pendentes_count: int
    tarefas_preview: List[TarefaOut] = []
    cantina_destaque: Optional[ProdutoOut] = None

class StudentProfileUpdate(BaseModel):
    nome: Optional[str] = None
    curso_id: Optional[int] = None
    turma_id: Optional[int] = None

