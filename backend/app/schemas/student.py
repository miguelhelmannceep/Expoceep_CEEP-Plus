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

class StudentDashboardOut(BaseModel):
    saudacao: str
    aluno_nome: str
    turma_nome: str
    curso_nome: str
    proxima_aula: Optional[NextClassOut] = None
    aviso_recente: Optional[AvisoOut] = None
    tarefas_pendentes_count: int
    tarefas_preview: List[TarefaOut] = []
    cantina_destaque: Optional[ProdutoOut] = None

class StudentProfileUpdate(BaseModel):
    nome: str

