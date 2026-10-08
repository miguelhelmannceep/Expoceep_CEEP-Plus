from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.api.deps import get_db, require_roles
from app.models.usuario import Usuario
from app.models.turma import Curso, Turma
from app.models.horario import Horario
from app.models.aviso import Aviso
from app.models.tarefa import Tarefa
from app.models.produto import Produto
from app.schemas.student import StudentDashboardOut, NextClassOut, StudentProfileUpdate
from app.schemas.aviso import AvisoOut
from app.schemas.tarefa import TarefaOut
from app.schemas.produto import ProdutoOut
from app.schemas.usuario import UsuarioOut


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

    turma_nome = current_user.turma_rel.nome_turma if current_user.turma_rel else None
    curso_nome = current_user.turma_rel.curso if current_user.turma_rel else None

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

    # Aviso recente publicado e segmentado para o aluno respeitando ambiente
    user_ambiente = getattr(current_user, "ambiente", "OFICIAL")
    curso_id = current_user.turma_rel.curso_id if current_user.turma_rel else None
    notice_targets = [Aviso.publico_alvo_tipo == "GERAL"]
    if curso_id is not None:
        notice_targets.append(
            and_(Aviso.publico_alvo_tipo == "CURSO", Aviso.publico_alvo_id == curso_id)
        )
    if current_user.turma_id is not None:
        notice_targets.append(
            and_(Aviso.publico_alvo_tipo == "TURMA", Aviso.publico_alvo_id == current_user.turma_id)
        )

    aviso_db = db.query(Aviso).filter(
        Aviso.status == "PUBLICADO",
        Aviso.ambiente == user_ambiente,
        or_(*notice_targets)
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
            status=getattr(aviso_db, "status", "PUBLICADO"),
            imagem_url=getattr(aviso_db, "imagem_url", None),
            ambiente=getattr(aviso_db, "ambiente", "OFICIAL"),
            is_demo=bool(getattr(aviso_db, "is_demo", False)),
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

@router.patch("/profile", response_model=UsuarioOut, summary="Atualiza o perfil acadêmico do aluno logado")
@router.put("/profile", response_model=UsuarioOut, summary="Atualiza o perfil acadêmico do aluno logado")
def update_student_profile(
    payload: StudentProfileUpdate,
    current_user: Usuario = Depends(require_roles(["ALUNO"])),
    db: Session = Depends(get_db)
):
    # 1. Trava do Aluno Visitante EXPOCEEP: nome não pode ser alterado
    is_visitor = current_user.email == "aluno.publico@ceep.demo" or (
        getattr(current_user, "ambiente", "OFICIAL") == "PUBLICO" and current_user.perfil == "ALUNO"
    )

    if payload.nome is not None:
        clean_name = payload.nome.strip()
        if is_visitor and clean_name != current_user.nome:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome do Aluno Visitante não pode ser alterado."
            )
        if not is_visitor:
            if len(clean_name) < 2 or len(clean_name) > 100:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="O nome deve conter entre 2 e 100 caracteres."
                )
            current_user.nome = clean_name

    # 2. Atualização de vínculo acadêmico (Curso -> Turma)
    if payload.turma_id is not None:
        turma = db.query(Turma).filter(Turma.id == payload.turma_id).first()
        if not turma:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Turma não encontrada."
            )
        if payload.curso_id is not None:
            curso = db.query(Curso).filter(Curso.id == payload.curso_id).first()
            if not curso:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Curso não encontrado."
                )
            if turma.curso_id != curso.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A turma selecionada não pertence ao curso informado."
                )
        current_user.turma_id = turma.id
    elif payload.curso_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Por favor, selecione uma turma pertencente ao curso escolhido."
        )

    db.commit()
    db.refresh(current_user)

    return UsuarioOut(
        id=current_user.id,
        nome=current_user.nome,
        email=current_user.email,
        perfil=current_user.perfil,
        turma_id=current_user.turma_id,
        turma_nome=current_user.turma_rel.nome_turma if current_user.turma_rel else None,
        curso_id=current_user.turma_rel.curso_id if current_user.turma_rel else None,
        curso_nome=current_user.turma_rel.curso if current_user.turma_rel else None,
        avatar_url=getattr(current_user, "avatar_url", None),
        ambiente=getattr(current_user, "ambiente", "OFICIAL"),
        is_demo=bool(getattr(current_user, "is_demo", False))
    )

