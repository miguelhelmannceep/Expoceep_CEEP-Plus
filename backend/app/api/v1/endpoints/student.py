from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.api.deps import get_db, require_roles
from app.models.usuario import Usuario
from app.models.horario import Horario
from app.models.aviso import Aviso
from app.models.tarefa import Tarefa
from app.models.produto import Produto
from app.schemas.student import StudentDashboardOut, NextClassOut
from app.schemas.aviso import AvisoOut
from app.schemas.tarefa import TarefaOut
from app.schemas.produto import ProdutoOut

router = APIRouter()

@router.get("/dashboard", response_model=StudentDashboardOut, summary="Dashboard consolidado do Aluno")
def get_student_dashboard(
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    # Saudação de acordo com o turno
    hora = datetime.now().hour
    if 5 <= hora < 12:
        saudacao = "Bom dia"
    elif 12 <= hora < 18:
        saudacao = "Boa tarde"
    else:
        saudacao = "Boa noite"

    turma_nome = current_user.turma_rel.nome_turma if current_user.turma_rel else "Sem Turma"
    curso_nome = current_user.turma_rel.curso if current_user.turma_rel else "CEEP"

    # Próxima aula dinâmica baseada nos horários cadastrados da turma
    proxima_aula = None
    if current_user.turma_id:
        horario = db.query(Horario).filter(
            Horario.turma_id == current_user.turma_id,
            (Horario.ativo == True) | (Horario.ativo == None)
        ).order_by(Horario.horario_inicio.asc()).first()
        if horario:
            disc_nome = horario.disciplina_rel.nome if horario.disciplina_rel else (horario.disciplina or "Disciplina")
            prof_nome = horario.professor_rel.nome if horario.professor_rel else (horario.professor or "Professor")
            proxima_aula = NextClassOut(
                horario_inicio=horario.horario_inicio,
                horario_fim=horario.horario_fim,
                disciplina=disc_nome,
                professor=prof_nome,
                sala=None
            )

    # Aviso recente publicado e segmentado para o aluno
    curso_id = current_user.turma_rel.curso_id if current_user.turma_rel else None
    aviso_db = db.query(Aviso).filter(
        Aviso.status == "PUBLICADO",
        or_(
            Aviso.publico_alvo_tipo == "GERAL",
            and_(
                Aviso.publico_alvo_tipo == "CURSO",
                Aviso.publico_alvo_id == curso_id
            ),
            and_(
                Aviso.publico_alvo_tipo == "TURMA",
                Aviso.publico_alvo_id == current_user.turma_id
            )
        )
    ).order_by(Aviso.data_publicacao.desc()).first()

    aviso_recente = None
    if aviso_db:
        aviso_recente = AvisoOut(
            id=aviso_db.id,
            titulo=aviso_db.titulo,
            descricao=aviso_db.descricao,
            prioridade=aviso_db.prioridade,
            publico_alvo_tipo=aviso_db.publico_alvo_tipo,
            publico_alvo_id=aviso_db.publico_alvo_id,
            data_publicacao=aviso_db.data_publicacao,
            autor_nome=aviso_db.autor_rel.nome if aviso_db.autor_rel else "Coordenação"
        )

    # Tarefas pendentes
    tarefas_db = db.query(Tarefa).filter(
        Tarefa.aluno_id == current_user.id,
        Tarefa.status != "CONCLUIDA"
    ).all()

    tarefas_preview = [
        TarefaOut.model_validate(t) for t in tarefas_db[:3]
    ]

    # Produto destaque da cantina
    prod_db = db.query(Produto).filter(Produto.ativo == True).first()
    cantina_destaque = ProdutoOut.model_validate(prod_db) if prod_db else None

    return StudentDashboardOut(
        saudacao=saudacao,
        aluno_nome=current_user.nome,
        turma_nome=turma_nome,
        curso_nome=curso_nome,
        proxima_aula=proxima_aula,
        aviso_recente=aviso_recente,
        tarefas_pendentes_count=len(tarefas_db),
        tarefas_preview=tarefas_preview,
        cantina_destaque=cantina_destaque
    )
