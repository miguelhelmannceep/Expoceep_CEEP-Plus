from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.api.deps import get_db, require_roles
from app.models.usuario import Usuario
from app.models.turma import Curso, Turma
from app.models.disciplina import Disciplina
from app.models.professor import Professor
from app.models.aviso import Aviso
from app.models.horario import Horario, PeriodoHorario, DisponibilidadeRecurso, RegraDisciplina
from app.models.pedido import Pedido, PedidoItem, Pagamento
from app.models.produto import Produto
from app.schemas.management import (
    ManagementOverviewOut,
    CanteenOverviewSummary,
    ManagementOrderDetailOut,
    ManagementOrderItemOut
)
from app.schemas.aviso import AvisoOut
from app.schemas.turma import (
    CursoCreate,
    CursoUpdate,
    CursoOut,
    TurmaCreate,
    TurmaUpdate,
    TurmaOut
)
from app.schemas.disciplina import (
    DisciplinaCreate,
    DisciplinaUpdate,
    DisciplinaOut
)
from app.schemas.professor import (
    ProfessorCreate,
    ProfessorUpdate,
    ProfessorOut
)
from app.schemas.horario import (
    HorarioCreate,
    HorarioUpdate,
    HorarioOut,
    PeriodoHorarioCreate,
    PeriodoHorarioOut,
    DisponibilidadeRecursoCreate,
    DisponibilidadeRecursoOut,
    RegraDisciplinaCreate,
    RegraDisciplinaOut,
    RegraDisciplinaBalanceOut
)
from app.schemas.produto import (
    ProdutoCreate,
    ProdutoUpdate,
    ProdutoOut
)

router = APIRouter()

@router.get("/overview", response_model=ManagementOverviewOut, summary="Visão geral e métricas consolidadas da Gestão")
def get_management_overview(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    total_turmas = db.query(Turma).count()
    total_avisos = db.query(Aviso).count()
    total_alunos = db.query(Usuario).filter(Usuario.perfil == "ALUNO").count()

    # Métricas consolidadas da Cantina a partir do banco de dados
    total_pedidos = db.query(Pedido).count()
    pedidos_pagos = db.query(Pedido).filter(Pedido.status == "PAGO").count()
    pedidos_utilizados = db.query(Pedido).filter(Pedido.status == "UTILIZADO").count()
    pedidos_pendentes = db.query(Pedido).filter(Pedido.status == "PENDENTE_PAGAMENTO").count()

    receita_res = db.query(func.sum(Pedido.valor_total)).filter(
        Pedido.status.in_(["PAGO", "UTILIZADO"])
    ).scalar()
    receita_confirmada = float(receita_res) if receita_res else 0.0

    cantina_resumo = CanteenOverviewSummary(
        total_pedidos=total_pedidos,
        pedidos_pagos=pedidos_pagos,
        pedidos_utilizados=pedidos_utilizados,
        pedidos_pendentes=pedidos_pendentes,
        receita_confirmada=round(receita_confirmada, 2)
    )

    # Avisos recentes (ordenados por data de publicação decrescente)
    avisos_db = db.query(Aviso).order_by(Aviso.data_publicacao.desc()).limit(4).all()
    avisos_recentes = [
        AvisoOut(
            id=a.id,
            titulo=a.titulo,
            descricao=a.descricao,
            prioridade=a.prioridade,
            publico_alvo_tipo=a.publico_alvo_tipo,
            publico_alvo_id=a.publico_alvo_id,
            status=a.status,
            data_publicacao=a.data_publicacao,
            autor_nome=a.autor_rel.nome if a.autor_rel else "Coordenação"
        )
        for a in avisos_db
    ]

    return ManagementOverviewOut(
        gestor=current_user.nome,
        total_turmas=total_turmas,
        total_avisos=total_avisos,
        total_alunos=total_alunos,
        cantina_resumo=cantina_resumo,
        avisos_recentes=avisos_recentes,
        status_sistema="Estável"
    )


# ==========================================
# GESTÃO DE CURSOS (CURRICULUM / COURSES)
# ==========================================

@router.get("/courses", response_model=List[CursoOut], summary="Lista todos os cursos para a Gestão")
def list_management_courses(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    cursos = db.query(Curso).order_by(Curso.nome.asc()).all()
    result = []
    for c in cursos:
        total_t = db.query(Turma).filter(Turma.curso_id == c.id).count()
        result.append(
            CursoOut(
                id=c.id,
                nome=c.nome,
                sigla=c.sigla,
                ativo=c.ativo if c.ativo is not None else True,
                total_turmas=total_t
            )
        )
    return result


@router.post("/courses", response_model=CursoOut, status_code=status.HTTP_201_CREATED, summary="Cria um novo curso técnico")
def create_course(
    payload: CursoCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    nome_clean = payload.nome.strip()
    sigla_clean = payload.sigla.strip().upper()

    # Evita duplicação óbvia por nome ou sigla
    existing_nome = db.query(Curso).filter(func.lower(Curso.nome) == func.lower(nome_clean)).first()
    if existing_nome:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um curso cadastrado com o nome '{nome_clean}'."
        )

    existing_sigla = db.query(Curso).filter(func.lower(Curso.sigla) == func.lower(sigla_clean)).first()
    if existing_sigla:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um curso cadastrado com a sigla '{sigla_clean}'."
        )

    novo_curso = Curso(
        nome=nome_clean,
        sigla=sigla_clean,
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(novo_curso)
    db.commit()
    db.refresh(novo_curso)

    return CursoOut(
        id=novo_curso.id,
        nome=novo_curso.nome,
        sigla=novo_curso.sigla,
        ativo=novo_curso.ativo,
        total_turmas=0
    )


@router.put("/courses/{course_id}", response_model=CursoOut, summary="Edita um curso técnico existente")
def update_course(
    course_id: int,
    payload: CursoUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    curso = db.query(Curso).filter(Curso.id == course_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso não encontrado."
        )

    if payload.nome is not None:
        nome_clean = payload.nome.strip()
        dup = db.query(Curso).filter(
            func.lower(Curso.nome) == func.lower(nome_clean),
            Curso.id != course_id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro curso com o nome '{nome_clean}'."
            )
        curso.nome = nome_clean

    if payload.sigla is not None:
        sigla_clean = payload.sigla.strip().upper()
        dup_sigla = db.query(Curso).filter(
            func.lower(Curso.sigla) == func.lower(sigla_clean),
            Curso.id != course_id
        ).first()
        if dup_sigla:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro curso com a sigla '{sigla_clean}'."
            )
        curso.sigla = sigla_clean

    if payload.ativo is not None:
        curso.ativo = payload.ativo

    db.commit()
    db.refresh(curso)

    total_t = db.query(Turma).filter(Turma.curso_id == curso.id).count()
    return CursoOut(
        id=curso.id,
        nome=curso.nome,
        sigla=curso.sigla,
        ativo=curso.ativo,
        total_turmas=total_t
    )


@router.delete("/courses/{course_id}", summary="Exclui um curso técnico")
def delete_course(
    course_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    curso = db.query(Curso).filter(Curso.id == course_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso não encontrado."
        )

    # 1. Integridade: checa se há turmas vinculadas ao curso
    turmas_count = db.query(Turma).filter(Turma.curso_id == course_id).count()
    if turmas_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir o curso '{curso.nome}' pois existem {turmas_count} turma(s) vinculada(s) a ele."
        )

    # 2. Integridade: checa se há disciplinas vinculadas ao curso
    disciplinas_count = db.query(Disciplina).filter(Disciplina.curso_id == course_id).count()
    if disciplinas_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir o curso '{curso.nome}' pois existem {disciplinas_count} disciplina(s) vinculada(s) a ele."
        )

    # 3. Integridade: checa se há avisos direcionados especificamente a este curso
    avisos_count = db.query(Aviso).filter(
        Aviso.publico_alvo_tipo == "CURSO",
        Aviso.publico_alvo_id == course_id
    ).count()
    if avisos_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir o curso '{curso.nome}' pois existem comunicados direcionados a ele."
        )

    db.delete(curso)
    db.commit()
    return {"mensagem": f"Curso '{curso.nome}' excluído com sucesso.", "id": course_id}


# ==========================================
# GESTÃO DE TURMAS (CLASSES)
# ==========================================

@router.get("/classes", response_model=List[TurmaOut], summary="Lista todas as turmas para a Gestão")
def list_management_classes(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    turmas = db.query(Turma).order_by(Turma.nome_turma.asc()).all()
    result = []
    for t in turmas:
        result.append(
            TurmaOut(
                id=t.id,
                nome_turma=t.nome_turma,
                curso=t.curso,
                curso_id=t.curso_id,
                ano=t.ano or "3º Ano",
                periodo=t.periodo or "Manhã",
                ativo=t.ativo if t.ativo is not None else True,
                curso_sigla=t.curso_rel.sigla if t.curso_rel else None
            )
        )
    return result


@router.post("/classes", response_model=TurmaOut, status_code=status.HTTP_201_CREATED, summary="Cria uma nova turma vinculada a um curso")
def create_class(
    payload: TurmaCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    # Valida se o curso informado existe
    curso = db.query(Curso).filter(Curso.id == payload.curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso selecionado não foi encontrado."
        )

    nome_clean = payload.nome_turma.strip()

    # Evita turma com mesmo nome duplicada no mesmo curso
    dup = db.query(Turma).filter(
        func.lower(Turma.nome_turma) == func.lower(nome_clean),
        Turma.curso_id == payload.curso_id
    ).first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma turma '{nome_clean}' cadastrada para o curso {curso.nome}."
        )

    nova_turma = Turma(
        nome_turma=nome_clean,
        curso=curso.nome,
        curso_id=curso.id,
        ano=payload.ano.strip() if payload.ano else "3º Ano",
        periodo=payload.periodo.strip() if payload.periodo else "Manhã",
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(nova_turma)
    db.commit()
    db.refresh(nova_turma)

    return TurmaOut(
        id=nova_turma.id,
        nome_turma=nova_turma.nome_turma,
        curso=nova_turma.curso,
        curso_id=nova_turma.curso_id,
        ano=nova_turma.ano,
        periodo=nova_turma.periodo,
        ativo=nova_turma.ativo,
        curso_sigla=curso.sigla
    )


@router.put("/classes/{class_id}", response_model=TurmaOut, summary="Edita uma turma existente")
def update_class(
    class_id: int,
    payload: TurmaUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    turma = db.query(Turma).filter(Turma.id == class_id).first()
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
                detail="Novo curso selecionado não foi encontrado."
            )
        turma.curso_id = curso.id
        turma.curso = curso.nome

    if payload.nome_turma is not None:
        nome_clean = payload.nome_turma.strip()
        dup = db.query(Turma).filter(
            func.lower(Turma.nome_turma) == func.lower(nome_clean),
            Turma.curso_id == turma.curso_id,
            Turma.id != class_id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outra turma com o nome '{nome_clean}' neste curso."
            )
        turma.nome_turma = nome_clean

    if payload.ano is not None:
        turma.ano = payload.ano.strip()
    if payload.periodo is not None:
        turma.periodo = payload.periodo.strip()
    if payload.ativo is not None:
        turma.ativo = payload.ativo

    db.commit()
    db.refresh(turma)

    return TurmaOut(
        id=turma.id,
        nome_turma=turma.nome_turma,
        curso=turma.curso,
        curso_id=turma.curso_id,
        ano=turma.ano,
        periodo=turma.periodo,
        ativo=turma.ativo,
        curso_sigla=turma.curso_rel.sigla if turma.curso_rel else None
    )


@router.delete("/classes/{class_id}", summary="Exclui uma turma")
def delete_class(
    class_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    turma = db.query(Turma).filter(Turma.id == class_id).first()
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada."
        )

    # 1. Integridade: checa alunos vinculados
    alunos_count = db.query(Usuario).filter(Usuario.turma_id == class_id).count()
    if alunos_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir a turma '{turma.nome_turma}' pois existem {alunos_count} aluno(s) vinculados a ela."
        )

    # 2. Integridade: checa horários de aula vinculados
    horarios_count = db.query(Horario).filter(Horario.turma_id == class_id).count()
    if horarios_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir a turma '{turma.nome_turma}' pois existem {horarios_count} horário(s) de aula cadastrados para ela."
        )

    # 3. Integridade: checa comunicados direcionados à turma
    avisos_count = db.query(Aviso).filter(
        Aviso.publico_alvo_tipo == "TURMA",
        Aviso.publico_alvo_id == class_id
    ).count()
    if avisos_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir a turma '{turma.nome_turma}' pois existem comunicados direcionados a ela."
        )

    db.delete(turma)
    db.commit()
    return {"mensagem": f"Turma '{turma.nome_turma}' excluída com sucesso.", "id": class_id}


# ==========================================
# GESTÃO DE DISCIPLINAS (SUBJECTS)
# ==========================================

@router.get("/disciplines", response_model=List[DisciplinaOut], summary="Lista todas as disciplinas para a Gestão")
def list_management_disciplines(
    curso_id: Optional[int] = None,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    query = db.query(Disciplina)
    if curso_id:
        query = query.filter(Disciplina.curso_id == curso_id)
    disciplinas = query.order_by(Disciplina.nome.asc()).all()
    
    result = []
    for d in disciplinas:
        result.append(
            DisciplinaOut(
                id=d.id,
                nome=d.nome,
                sigla=d.sigla,
                curso_id=d.curso_id,
                curso_nome=d.curso_rel.nome if d.curso_rel else None,
                curso_sigla=d.curso_rel.sigla if d.curso_rel else None,
                ativo=d.ativo if d.ativo is not None else True
            )
        )
    return result


@router.post("/disciplines", response_model=DisciplinaOut, status_code=status.HTTP_201_CREATED, summary="Cria uma nova disciplina")
def create_discipline(
    payload: DisciplinaCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    curso = db.query(Curso).filter(Curso.id == payload.curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso selecionado não foi encontrado."
        )

    nome_clean = payload.nome.strip()
    dup = db.query(Disciplina).filter(
        func.lower(Disciplina.nome) == func.lower(nome_clean),
        Disciplina.curso_id == payload.curso_id
    ).first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma disciplina '{nome_clean}' cadastrada para o curso {curso.nome}."
        )

    nova_disciplina = Disciplina(
        nome=nome_clean,
        sigla=payload.sigla.strip().upper() if payload.sigla else None,
        curso_id=curso.id,
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(nova_disciplina)
    db.commit()
    db.refresh(nova_disciplina)

    return DisciplinaOut(
        id=nova_disciplina.id,
        nome=nova_disciplina.nome,
        sigla=nova_disciplina.sigla,
        curso_id=nova_disciplina.curso_id,
        curso_nome=curso.nome,
        curso_sigla=curso.sigla,
        ativo=nova_disciplina.ativo
    )


@router.put("/disciplines/{discipline_id}", response_model=DisciplinaOut, summary="Edita uma disciplina existente")
def update_discipline(
    discipline_id: int,
    payload: DisciplinaUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    disciplina = db.query(Disciplina).filter(Disciplina.id == discipline_id).first()
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada."
        )

    if payload.curso_id is not None:
        curso = db.query(Curso).filter(Curso.id == payload.curso_id).first()
        if not curso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Novo curso selecionado não foi encontrado."
            )
        disciplina.curso_id = curso.id

    if payload.nome is not None:
        nome_clean = payload.nome.strip()
        dup = db.query(Disciplina).filter(
            func.lower(Disciplina.nome) == func.lower(nome_clean),
            Disciplina.curso_id == disciplina.curso_id,
            Disciplina.id != discipline_id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outra disciplina com o nome '{nome_clean}' neste curso."
            )
        disciplina.nome = nome_clean

    if payload.sigla is not None:
        disciplina.sigla = payload.sigla.strip().upper() if payload.sigla else None

    if payload.ativo is not None:
        disciplina.ativo = payload.ativo

    db.commit()
    db.refresh(disciplina)

    return DisciplinaOut(
        id=disciplina.id,
        nome=disciplina.nome,
        sigla=disciplina.sigla,
        curso_id=disciplina.curso_id,
        curso_nome=disciplina.curso_rel.nome if disciplina.curso_rel else None,
        curso_sigla=disciplina.curso_rel.sigla if disciplina.curso_rel else None,
        ativo=disciplina.ativo
    )


@router.patch("/disciplines/{discipline_id}/toggle-active", response_model=DisciplinaOut, summary="Ativa ou desativa uma disciplina")
def toggle_discipline_active(
    discipline_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    disciplina = db.query(Disciplina).filter(Disciplina.id == discipline_id).first()
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada."
        )

    disciplina.ativo = not disciplina.ativo
    db.commit()
    db.refresh(disciplina)

    return DisciplinaOut(
        id=disciplina.id,
        nome=disciplina.nome,
        sigla=disciplina.sigla,
        curso_id=disciplina.curso_id,
        curso_nome=disciplina.curso_rel.nome if disciplina.curso_rel else None,
        curso_sigla=disciplina.curso_rel.sigla if disciplina.curso_rel else None,
        ativo=disciplina.ativo
    )


@router.delete("/disciplines/{discipline_id}", summary="Exclui uma disciplina")
def delete_discipline(
    discipline_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    disciplina = db.query(Disciplina).filter(Disciplina.id == discipline_id).first()
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada."
        )

    # Integridade: checa se há aulas na grade usando esta disciplina
    horarios_count = db.query(Horario).filter(
        func.lower(Horario.disciplina) == func.lower(disciplina.nome)
    ).count()
    if horarios_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir a disciplina '{disciplina.nome}' pois existem {horarios_count} aula(s) vinculada(s) a ela na grade horária."
        )

    db.delete(disciplina)
    db.commit()
    return {"mensagem": f"Disciplina '{disciplina.nome}' excluída com sucesso.", "id": discipline_id}


# ==========================================
# GESTÃO DE PROFESSORES (TEACHERS)
# ==========================================

@router.get("/professors", response_model=List[ProfessorOut], summary="Lista todos os professores para a Gestão")
def list_management_professors(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    professores = db.query(Professor).order_by(Professor.nome.asc()).all()
    return [
        ProfessorOut(
            id=p.id,
            nome=p.nome,
            email=p.email,
            ativo=p.ativo if p.ativo is not None else True
        )
        for p in professores
    ]


@router.post("/professors", response_model=ProfessorOut, status_code=status.HTTP_201_CREATED, summary="Cadastra um novo professor")
def create_professor(
    payload: ProfessorCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    nome_clean = payload.nome.strip()
    dup = db.query(Professor).filter(
        func.lower(Professor.nome) == func.lower(nome_clean)
    ).first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um professor cadastrado com o nome '{nome_clean}'."
        )

    novo_professor = Professor(
        nome=nome_clean,
        email=payload.email.strip().lower() if payload.email else None,
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(novo_professor)
    db.commit()
    db.refresh(novo_professor)

    return ProfessorOut(
        id=novo_professor.id,
        nome=novo_professor.nome,
        email=novo_professor.email,
        ativo=novo_professor.ativo
    )


@router.put("/professors/{professor_id}", response_model=ProfessorOut, summary="Edita um professor existente")
def update_professor(
    professor_id: int,
    payload: ProfessorUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado."
        )

    if payload.nome is not None:
        nome_clean = payload.nome.strip()
        dup = db.query(Professor).filter(
            func.lower(Professor.nome) == func.lower(nome_clean),
            Professor.id != professor_id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro professor cadastrado com o nome '{nome_clean}'."
            )
        professor.nome = nome_clean

    if payload.email is not None:
        professor.email = payload.email.strip().lower() if payload.email else None

    if payload.ativo is not None:
        professor.ativo = payload.ativo

    db.commit()
    db.refresh(professor)

    return ProfessorOut(
        id=professor.id,
        nome=professor.nome,
        email=professor.email,
        ativo=professor.ativo
    )


@router.patch("/professors/{professor_id}/toggle-active", response_model=ProfessorOut, summary="Ativa ou desativa um professor")
def toggle_professor_active(
    professor_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado."
        )

    professor.ativo = not professor.ativo
    db.commit()
    db.refresh(professor)

    return ProfessorOut(
        id=professor.id,
        nome=professor.nome,
        email=professor.email,
        ativo=professor.ativo
    )


@router.delete("/professors/{professor_id}", summary="Exclui um professor")
def delete_professor(
    professor_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado."
        )

    # Integridade: checa se há aulas na grade com este professor
    horarios_count = db.query(Horario).filter(
        func.lower(Horario.professor) == func.lower(professor.nome)
    ).count()
    if horarios_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir o professor '{professor.nome}' pois existem {horarios_count} aula(s) vinculada(s) a ele na grade horária."
        )

    db.delete(professor)
    db.commit()
    return {"mensagem": f"Professor '{professor.nome}' excluído com sucesso.", "id": professor_id}


# ==========================================
# GESTÃO DA GRADE HORÁRIA (SCHEDULES)
# ==========================================

def validate_and_check_conflicts(
    db: Session,
    dia_semana: str,
    horario_inicio: str,
    horario_fim: str,
    turma_id: int,
    professor_nome: str,
    professor_id: Optional[int] = None,
    sala: Optional[str] = None,
    exclude_id: Optional[int] = None
) -> None:
    # 1. Validação de ordem cronológica do intervalo
    if horario_inicio >= horario_fim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Horário de início deve ser anterior ao horário de término."
        )

    # 2. Restrição de Intervalo / Recreio (PeriodoHorario com is_intervalo == True nos dias letivos)
    dias_letivos = [
        "segunda", "segunda-feira",
        "terça", "terca", "terça-feira", "terca-feira",
        "quarta", "quarta-feira",
        "quinta", "quinta-feira",
        "sexta", "sexta-feira",
        "sábado", "sabado"
    ]
    if dia_semana.lower().strip() in dias_letivos:
        intervalo_conflict = db.query(PeriodoHorario).filter(
            PeriodoHorario.is_intervalo == True,
            PeriodoHorario.ativo == True,
            PeriodoHorario.horario_inicio < horario_fim,
            PeriodoHorario.horario_fim > horario_inicio
        ).first()
        if intervalo_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é permitido agendar aulas no período de intervalo/recreio ({intervalo_conflict.nome}: {intervalo_conflict.horario_inicio} às {intervalo_conflict.horario_fim})."
            )

    # 3. Conflito de Turma no mesmo intervalo (overlap: existing_inicio < new_fim AND existing_fim > new_inicio)
    turma_conflict_query = db.query(Horario).filter(
        Horario.turma_id == turma_id,
        func.lower(Horario.dia_semana) == func.lower(dia_semana),
        Horario.horario_inicio < horario_fim,
        Horario.horario_fim > horario_inicio,
        (Horario.ativo == True) | (Horario.ativo == None)
    )
    if exclude_id:
        turma_conflict_query = turma_conflict_query.filter(Horario.id != exclude_id)
    turma_conf = turma_conflict_query.first()
    if turma_conf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conflito de horário para a turma: já existe aula de '{turma_conf.disciplina}' ({turma_conf.horario_inicio} às {turma_conf.horario_fim}) no mesmo intervalo."
        )

    # 4. Conflito de Professor no mesmo intervalo
    prof_filters = [func.lower(Horario.professor) == func.lower(professor_nome)]
    if professor_id:
        prof_filters.append(Horario.professor_id == professor_id)

    prof_conflict_query = db.query(Horario).filter(
        func.lower(Horario.dia_semana) == func.lower(dia_semana),
        or_(*prof_filters),
        Horario.horario_inicio < horario_fim,
        Horario.horario_fim > horario_inicio,
        (Horario.ativo == True) | (Horario.ativo == None)
    )
    if exclude_id:
        prof_conflict_query = prof_conflict_query.filter(Horario.id != exclude_id)
    prof_conf = prof_conflict_query.first()
    if prof_conf:
        turma_desc = prof_conf.turma_rel.nome_turma if prof_conf.turma_rel else f"Turma #{prof_conf.turma_id}"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conflito de horário para o professor '{professor_nome}': já possui aula na turma '{turma_desc}' ({prof_conf.horario_inicio} às {prof_conf.horario_fim}) no mesmo intervalo."
        )

    # 5. Conflito de Espaço Físico / Sala
    if sala and sala.strip():
        sala_clean = sala.strip()
        sala_conflict_query = db.query(Horario).filter(
            func.lower(Horario.sala) == func.lower(sala_clean),
            func.lower(Horario.dia_semana) == func.lower(dia_semana),
            Horario.horario_inicio < horario_fim,
            Horario.horario_fim > horario_inicio,
            (Horario.ativo == True) | (Horario.ativo == None)
        )
        if exclude_id:
            sala_conflict_query = sala_conflict_query.filter(Horario.id != exclude_id)
        sala_conf = sala_conflict_query.first()
        if sala_conf:
            conf_turma = sala_conf.turma_rel.nome_turma if sala_conf.turma_rel else f"Turma #{sala_conf.turma_id}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Conflito de espaço físico: a sala '{sala_clean}' já está ocupada pela turma '{conf_turma}' ({sala_conf.disciplina}, {sala_conf.horario_inicio} às {sala_conf.horario_fim})."
            )

    # 6. Bloqueio de Indisponibilidade de Professor
    prof_disp_query = db.query(DisponibilidadeRecurso).filter(
        DisponibilidadeRecurso.tipo_recurso == "PROFESSOR",
        DisponibilidadeRecurso.tipo == "INDISPONIVEL",
        DisponibilidadeRecurso.ativo == True,
        func.lower(DisponibilidadeRecurso.dia_semana) == func.lower(dia_semana),
        DisponibilidadeRecurso.horario_inicio < horario_fim,
        DisponibilidadeRecurso.horario_fim > horario_inicio
    )
    if professor_id:
        prof_disp_query = prof_disp_query.filter(
            or_(
                DisponibilidadeRecurso.recurso_id == professor_id,
                func.lower(DisponibilidadeRecurso.recurso_identificador) == func.lower(professor_nome)
            )
        )
    else:
        prof_disp_query = prof_disp_query.filter(
            func.lower(DisponibilidadeRecurso.recurso_identificador) == func.lower(professor_nome)
        )
    prof_disp = prof_disp_query.first()
    if prof_disp:
        motivo_str = f" Motivo: {prof_disp.motivo}." if prof_disp.motivo else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bloqueio de indisponibilidade: o professor '{professor_nome}' possui restrição neste horário ({prof_disp.horario_inicio} às {prof_disp.horario_fim}).{motivo_str}"
        )

    # 7. Bloqueio de Indisponibilidade de Turma
    turma_disp = db.query(DisponibilidadeRecurso).filter(
        DisponibilidadeRecurso.tipo_recurso == "TURMA",
        DisponibilidadeRecurso.tipo == "INDISPONIVEL",
        DisponibilidadeRecurso.ativo == True,
        func.lower(DisponibilidadeRecurso.dia_semana) == func.lower(dia_semana),
        DisponibilidadeRecurso.horario_inicio < horario_fim,
        DisponibilidadeRecurso.horario_fim > horario_inicio,
        or_(
            DisponibilidadeRecurso.recurso_id == turma_id,
            func.lower(DisponibilidadeRecurso.recurso_identificador) == func.lower(str(turma_id))
        )
    ).first()
    if turma_disp:
        motivo_str = f" Motivo: {turma_disp.motivo}." if turma_disp.motivo else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bloqueio de indisponibilidade: a turma possui restrição de horário agendada ({turma_disp.horario_inicio} às {turma_disp.horario_fim}).{motivo_str}"
        )

    # 8. Bloqueio de Indisponibilidade de Sala
    if sala and sala.strip():
        sala_clean = sala.strip()
        sala_disp = db.query(DisponibilidadeRecurso).filter(
            DisponibilidadeRecurso.tipo_recurso == "SALA",
            DisponibilidadeRecurso.tipo == "INDISPONIVEL",
            DisponibilidadeRecurso.ativo == True,
            func.lower(DisponibilidadeRecurso.dia_semana) == func.lower(dia_semana),
            DisponibilidadeRecurso.horario_inicio < horario_fim,
            DisponibilidadeRecurso.horario_fim > horario_inicio,
            func.lower(DisponibilidadeRecurso.recurso_identificador) == func.lower(sala_clean)
        ).first()
        if sala_disp:
            motivo_str = f" Motivo: {sala_disp.motivo}." if sala_disp.motivo else ""
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bloqueio de indisponibilidade: a sala '{sala_clean}' está indisponível neste horário ({sala_disp.horario_inicio} às {sala_disp.horario_fim}).{motivo_str}"
            )


@router.get("/schedules", response_model=List[HorarioOut], summary="Lista todas as aulas da grade horária para a Gestão")
def list_management_schedules(
    turma_id: Optional[int] = None,
    dia_semana: Optional[str] = None,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    query = db.query(Horario)
    if turma_id:
        query = query.filter(Horario.turma_id == turma_id)
    if dia_semana:
        query = query.filter(func.lower(Horario.dia_semana) == func.lower(dia_semana))

    horarios = query.order_by(Horario.dia_semana.asc(), Horario.horario_inicio.asc()).all()

    return [
        HorarioOut(
            id=h.id,
            dia_semana=h.dia_semana,
            horario_inicio=h.horario_inicio,
            horario_fim=h.horario_fim,
            disciplina=h.disciplina,
            professor=h.professor,
            sala=h.sala,
            turma_id=h.turma_id,
            disciplina_id=h.disciplina_id,
            professor_id=h.professor_id,
            duracao=h.duracao if h.duracao is not None else 1,
            periodo_ordem=h.periodo_ordem,
            grupo=h.grupo,
            turma_nome=h.turma_rel.nome_turma if h.turma_rel else None,
            curso_nome=h.turma_rel.curso if h.turma_rel else None,
            ativo=h.ativo if h.ativo is not None else True
        )
        for h in horarios
    ]


@router.post("/schedules", response_model=HorarioOut, status_code=status.HTTP_201_CREATED, summary="Cadastra uma nova aula na grade horária")
def create_schedule(
    payload: HorarioCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    # 1. Valida existência da Turma
    turma = db.query(Turma).filter(Turma.id == payload.turma_id).first()
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma selecionada não foi encontrada."
        )

    # 2. Valida e resolve Disciplina
    disciplina_obj = None
    disciplina_nome = payload.disciplina.strip() if payload.disciplina else None
    if payload.disciplina_id:
        disciplina_obj = db.query(Disciplina).filter(Disciplina.id == payload.disciplina_id).first()
        if not disciplina_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disciplina selecionada não foi encontrada."
            )
        disciplina_nome = disciplina_obj.nome
    elif disciplina_nome:
        disciplina_obj = db.query(Disciplina).filter(
            func.lower(Disciplina.nome) == func.lower(disciplina_nome)
        ).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="É obrigatório informar a disciplina."
        )

    # 3. Valida e resolve Professor
    professor_obj = None
    professor_nome = payload.professor.strip() if payload.professor else None
    if payload.professor_id:
        professor_obj = db.query(Professor).filter(Professor.id == payload.professor_id).first()
        if not professor_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professor selecionado não foi encontrado."
            )
        professor_nome = professor_obj.nome
    elif professor_nome:
        professor_obj = db.query(Professor).filter(
            func.lower(Professor.nome) == func.lower(professor_nome)
        ).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="É obrigatório informar o professor."
        )

    sala_clean = payload.sala.strip() if payload.sala else None

    # 4. Checa conflitos de horários e valida intervalos
    validate_and_check_conflicts(
        db=db,
        dia_semana=payload.dia_semana.strip(),
        horario_inicio=payload.horario_inicio.strip(),
        horario_fim=payload.horario_fim.strip(),
        turma_id=turma.id,
        professor_nome=professor_nome,
        professor_id=professor_obj.id if professor_obj else None,
        sala=sala_clean
    )

    novo_horario = Horario(
        dia_semana=payload.dia_semana.strip(),
        horario_inicio=payload.horario_inicio.strip(),
        horario_fim=payload.horario_fim.strip(),
        disciplina=disciplina_nome,
        professor=professor_nome,
        sala=sala_clean,
        turma_id=turma.id,
        disciplina_id=disciplina_obj.id if disciplina_obj else None,
        professor_id=professor_obj.id if professor_obj else None,
        duracao=payload.duracao if payload.duracao is not None else 1,
        periodo_ordem=payload.periodo_ordem,
        grupo=payload.grupo.strip() if payload.grupo else None,
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(novo_horario)
    db.commit()
    db.refresh(novo_horario)

    return HorarioOut(
        id=novo_horario.id,
        dia_semana=novo_horario.dia_semana,
        horario_inicio=novo_horario.horario_inicio,
        horario_fim=novo_horario.horario_fim,
        disciplina=novo_horario.disciplina,
        professor=novo_horario.professor,
        sala=novo_horario.sala,
        turma_id=novo_horario.turma_id,
        disciplina_id=novo_horario.disciplina_id,
        professor_id=novo_horario.professor_id,
        duracao=novo_horario.duracao if novo_horario.duracao is not None else 1,
        periodo_ordem=novo_horario.periodo_ordem,
        grupo=novo_horario.grupo,
        turma_nome=turma.nome_turma,
        curso_nome=turma.curso,
        ativo=novo_horario.ativo
    )


@router.put("/schedules/{schedule_id}", response_model=HorarioOut, summary="Edita uma aula existente na grade horária")
def update_schedule(
    schedule_id: int,
    payload: HorarioUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    horario = db.query(Horario).filter(Horario.id == schedule_id).first()
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário de aula não encontrado."
        )

    # 1. Turma
    turma_id = payload.turma_id if payload.turma_id is not None else horario.turma_id
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma informada não foi encontrada."
        )

    # 2. Disciplina
    disciplina_id = payload.disciplina_id if payload.disciplina_id is not None else horario.disciplina_id
    disciplina_nome = payload.disciplina.strip() if payload.disciplina is not None else horario.disciplina
    disciplina_obj = None
    if disciplina_id:
        disciplina_obj = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()
        if not disciplina_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disciplina informada não foi encontrada."
            )
        disciplina_nome = disciplina_obj.nome

    # 3. Professor
    professor_id = payload.professor_id if payload.professor_id is not None else horario.professor_id
    professor_nome = payload.professor.strip() if payload.professor is not None else horario.professor
    professor_obj = None
    if professor_id:
        professor_obj = db.query(Professor).filter(Professor.id == professor_id).first()
        if not professor_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professor informado não foi encontrado."
            )
        professor_nome = professor_obj.nome

    # 4. Dia e horários
    dia_semana = payload.dia_semana.strip() if payload.dia_semana is not None else horario.dia_semana
    horario_inicio = payload.horario_inicio.strip() if payload.horario_inicio is not None else horario.horario_inicio
    horario_fim = payload.horario_fim.strip() if payload.horario_fim is not None else horario.horario_fim
    sala = payload.sala.strip() if payload.sala is not None else horario.sala

    # 5. Validação de intervalos e conflitos
    validate_and_check_conflicts(
        db=db,
        dia_semana=dia_semana,
        horario_inicio=horario_inicio,
        horario_fim=horario_fim,
        turma_id=turma_id,
        professor_nome=professor_nome,
        professor_id=professor_id,
        sala=sala,
        exclude_id=schedule_id
    )

    horario.turma_id = turma_id
    horario.disciplina_id = disciplina_id
    horario.disciplina = disciplina_nome
    horario.professor_id = professor_id
    horario.professor = professor_nome
    horario.dia_semana = dia_semana
    horario.horario_inicio = horario_inicio
    horario.horario_fim = horario_fim
    if payload.sala is not None:
        horario.sala = payload.sala.strip() if payload.sala else None
    if payload.duracao is not None:
        horario.duracao = payload.duracao
    if payload.periodo_ordem is not None:
        horario.periodo_ordem = payload.periodo_ordem
    if payload.grupo is not None:
        horario.grupo = payload.grupo.strip() if payload.grupo else None
    if payload.ativo is not None:
        horario.ativo = payload.ativo

    db.commit()
    db.refresh(horario)

    return HorarioOut(
        id=horario.id,
        dia_semana=horario.dia_semana,
        horario_inicio=horario.horario_inicio,
        horario_fim=horario.horario_fim,
        disciplina=horario.disciplina,
        professor=horario.professor,
        sala=horario.sala,
        turma_id=horario.turma_id,
        disciplina_id=horario.disciplina_id,
        professor_id=horario.professor_id,
        duracao=horario.duracao if horario.duracao is not None else 1,
        periodo_ordem=horario.periodo_ordem,
        grupo=horario.grupo,
        turma_nome=turma.nome_turma,
        curso_nome=turma.curso,
        ativo=horario.ativo
    )


@router.delete("/schedules/{schedule_id}", summary="Exclui uma aula da grade horária")
def delete_schedule(
    schedule_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    horario = db.query(Horario).filter(Horario.id == schedule_id).first()
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horário de aula não encontrado."
        )

    db.delete(horario)
    db.commit()
    return {"mensagem": "Horário de aula excluído com sucesso.", "id": schedule_id}


# ==========================================
# GESTÃO DE HORÁRIOS: PERÍODOS & INTERVALOS
# ==========================================

@router.get("/schedules/periods", response_model=List[PeriodoHorarioOut], summary="Lista períodos e intervalos cadastrados")
def list_periods(
    turno: Optional[str] = None,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    query = db.query(PeriodoHorario)
    if turno:
        query = query.filter(func.lower(PeriodoHorario.turno) == func.lower(turno))
    periodos = query.order_by(PeriodoHorario.ordem.asc(), PeriodoHorario.horario_inicio.asc()).all()
    return periodos


@router.post("/schedules/periods", response_model=PeriodoHorarioOut, status_code=status.HTTP_201_CREATED, summary="Cadastra um novo período ou intervalo")
def create_period(
    payload: PeriodoHorarioCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    if payload.horario_inicio.strip() >= payload.horario_fim.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Horário de início deve ser anterior ao horário de término."
        )
    novo_p = PeriodoHorario(
        ordem=payload.ordem,
        nome=payload.nome.strip(),
        horario_inicio=payload.horario_inicio.strip(),
        horario_fim=payload.horario_fim.strip(),
        turno=payload.turno.strip() if payload.turno else "Manhã",
        is_intervalo=bool(payload.is_intervalo),
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(novo_p)
    db.commit()
    db.refresh(novo_p)
    return novo_p


@router.delete("/schedules/periods/{period_id}", summary="Exclui um período ou intervalo")
def delete_period(
    period_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    periodo = db.query(PeriodoHorario).filter(PeriodoHorario.id == period_id).first()
    if not periodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Período não encontrado."
        )
    db.delete(periodo)
    db.commit()
    return {"mensagem": "Período removido com sucesso.", "id": period_id}


# ==========================================
# GESTÃO DE HORÁRIOS: DISPONIBILIDADE & BLOQUEIOS
# ==========================================

@router.get("/schedules/availabilities", response_model=List[DisponibilidadeRecursoOut], summary="Lista regras de disponibilidade e bloqueios")
def list_availabilities(
    tipo_recurso: Optional[str] = None,
    recurso_identificador: Optional[str] = None,
    dia_semana: Optional[str] = None,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    query = db.query(DisponibilidadeRecurso)
    if tipo_recurso:
        query = query.filter(func.upper(DisponibilidadeRecurso.tipo_recurso) == func.upper(tipo_recurso.strip()))
    if recurso_identificador:
        query = query.filter(func.lower(DisponibilidadeRecurso.recurso_identificador) == func.lower(recurso_identificador.strip()))
    if dia_semana:
        query = query.filter(func.lower(DisponibilidadeRecurso.dia_semana) == func.lower(dia_semana.strip()))
    
    return query.order_by(DisponibilidadeRecurso.dia_semana.asc(), DisponibilidadeRecurso.horario_inicio.asc()).all()


@router.post("/schedules/availabilities", response_model=DisponibilidadeRecursoOut, status_code=status.HTTP_201_CREATED, summary="Registra bloqueio ou preferência de recurso")
def create_availability(
    payload: DisponibilidadeRecursoCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    if payload.horario_inicio.strip() >= payload.horario_fim.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Horário de início deve ser anterior ao horário de término."
        )
    disp = DisponibilidadeRecurso(
        tipo_recurso=payload.tipo_recurso.strip().upper(),
        recurso_id=payload.recurso_id,
        recurso_identificador=payload.recurso_identificador.strip(),
        dia_semana=payload.dia_semana.strip(),
        horario_inicio=payload.horario_inicio.strip(),
        horario_fim=payload.horario_fim.strip(),
        periodo_ordem=payload.periodo_ordem,
        tipo=payload.tipo.strip().upper() if payload.tipo else "INDISPONIVEL",
        motivo=payload.motivo.strip() if payload.motivo else None,
        ativo=payload.ativo if payload.ativo is not None else True
    )
    db.add(disp)
    db.commit()
    db.refresh(disp)
    return disp


@router.delete("/schedules/availabilities/{availability_id}", summary="Remove um bloqueio ou preferência")
def delete_availability(
    availability_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    disp = db.query(DisponibilidadeRecurso).filter(DisponibilidadeRecurso.id == availability_id).first()
    if not disp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de disponibilidade não encontrado."
        )
    db.delete(disp)
    db.commit()
    return {"mensagem": "Bloqueio de disponibilidade removido com sucesso.", "id": availability_id}


# ==========================================
# GESTÃO DE HORÁRIOS: CARGA SEMANAL & REGRAS DE DISCIPLINA
# ==========================================

@router.get("/schedules/discipline-rules/{turma_id}", response_model=List[RegraDisciplinaBalanceOut], summary="Balanço pedagógico de carga horária da turma")
def get_turma_discipline_balance(
    turma_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

    regras = db.query(RegraDisciplina).filter(RegraDisciplina.turma_id == turma_id).all()
    regras_map = {r.disciplina_id: r for r in regras}

    horarios = db.query(Horario).filter(
        Horario.turma_id == turma_id,
        (Horario.ativo == True) | (Horario.ativo == None)
    ).all()

    alocadas_por_disciplina = {}
    for h in horarios:
        dur = h.duracao if h.duracao is not None else 1
        if h.disciplina_id:
            alocadas_por_disciplina[h.disciplina_id] = alocadas_por_disciplina.get(h.disciplina_id, 0) + dur

    todas_disc = db.query(Disciplina).filter(Disciplina.ativo == True).order_by(Disciplina.nome.asc()).all()

    balanco = []
    for disc in todas_disc:
        regra = regras_map.get(disc.id)
        planejadas = regra.aulas_semanais if regra else 0
        alocadas = alocadas_por_disciplina.get(disc.id, 0)

        if regra or alocadas > 0:
            if alocadas == planejadas:
                b_status = "OK"
            elif alocadas < planejadas:
                b_status = "PENDENTE"
            else:
                b_status = "EXCEDENTE"

            balanco.append(RegraDisciplinaBalanceOut(
                disciplina_id=disc.id,
                disciplina_nome=disc.nome,
                disciplina_sigla=disc.sigla,
                aulas_semanais_planejadas=planejadas,
                aulas_alocadas_na_grade=alocadas,
                balanco_status=b_status,
                sala_preferencial=regra.sala_preferencial if regra else None
            ))

    return balanco


@router.post("/schedules/discipline-rules", response_model=RegraDisciplinaOut, status_code=status.HTTP_201_CREATED, summary="Cadastra ou atualiza regra de disciplina para a turma")
def upsert_discipline_rule(
    payload: RegraDisciplinaCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    turma = db.query(Turma).filter(Turma.id == payload.turma_id).first()
    if not turma:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

    disciplina = db.query(Disciplina).filter(Disciplina.id == payload.disciplina_id).first()
    if not disciplina:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

    regra = db.query(RegraDisciplina).filter(
        RegraDisciplina.turma_id == payload.turma_id,
        RegraDisciplina.disciplina_id == payload.disciplina_id
    ).first()

    if regra:
        regra.aulas_semanais = payload.aulas_semanais
        regra.max_aulas_dia = payload.max_aulas_dia or 2
        regra.permitir_aula_dupla = payload.permitir_aula_dupla if payload.permitir_aula_dupla is not None else True
        regra.sala_preferencial = payload.sala_preferencial.strip() if payload.sala_preferencial else None
    else:
        regra = RegraDisciplina(
            turma_id=payload.turma_id,
            disciplina_id=payload.disciplina_id,
            aulas_semanais=payload.aulas_semanais,
            max_aulas_dia=payload.max_aulas_dia or 2,
            permitir_aula_dupla=payload.permitir_aula_dupla if payload.permitir_aula_dupla is not None else True,
            sala_preferencial=payload.sala_preferencial.strip() if payload.sala_preferencial else None
        )
        db.add(regra)

    db.commit()
    db.refresh(regra)
    return regra


# ==========================================
# GESTÃO DE HORÁRIOS: SALAS E ESPAÇOS FÍSICOS
# ==========================================

@router.get("/schedules/rooms", response_model=List[str], summary="Lista de salas e espaços físicos cadastrados ou em uso")
def list_schedule_rooms(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    salas_padrao = [
        "Auditório",
        "Lab Informática 1",
        "Lab Informática 2",
        "Lab Maker",
        "Lab Redes",
        "Quadra Poliesportiva",
        "Sala 101",
        "Sala 102",
        "Sala 103",
        "Sala 201",
        "Sala 202"
    ]
    db_salas = db.query(Horario.sala).filter(Horario.sala.isnot(None), Horario.sala != "").distinct().all()
    for s in db_salas:
        if s[0] and s[0].strip() and s[0].strip() not in salas_padrao:
            salas_padrao.append(s[0].strip())
    return sorted(list(set(salas_padrao)))


# ============================================================================
# GESTÃO DA CANTINA: PEDIDOS E PRODUTOS (MILESTONE 3F)
# ============================================================================

@router.get(
    "/canteen/orders",
    response_model=List[ManagementOrderDetailOut],
    summary="Lista pedidos da cantina com filtro opcional por status"
)
def list_canteen_orders(
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por status: PENDENTE_PAGAMENTO, PAGO, UTILIZADO"),
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    query = db.query(Pedido)
    if status_filter:
        s_upper = status_filter.strip().upper()
        if s_upper:
            query = query.filter(Pedido.status == s_upper)

    pedidos = query.order_by(Pedido.created_at.desc()).all()
    result: List[ManagementOrderDetailOut] = []

    for p in pedidos:
        itens_out = []
        for it in p.itens:
            prod_name = it.produto_rel.nome if it.produto_rel else f"Produto #{it.produto_id}"
            itens_out.append(ManagementOrderItemOut(
                id=it.id,
                produto_id=it.produto_id,
                produto_nome=prod_name,
                quantidade=it.quantidade,
                preco_unitario=it.preco_unitario,
                subtotal=round(it.quantidade * it.preco_unitario, 2)
            ))

        pag = p.pagamentos[0] if p.pagamentos else None
        paid_at = pag.paid_at if pag else None
        pag_status = pag.status if pag else None
        pag_metodo = pag.metodo if pag else None

        aluno_nome = p.usuario_rel.nome if p.usuario_rel else "Aluno"
        aluno_email = p.usuario_rel.email if p.usuario_rel else ""

        result.append(ManagementOrderDetailOut(
            id=p.id,
            aluno_id=p.usuario_id,
            aluno_nome=aluno_nome,
            aluno_email=aluno_email,
            status=p.status,
            valor_total=p.valor_total,
            pickup_token=p.pickup_token,
            created_at=p.created_at,
            updated_at=p.updated_at,
            paid_at=paid_at,
            used_at=p.used_at,
            itens=itens_out,
            pagamento_status=pag_status,
            pagamento_metodo=pag_metodo
        ))

    return result


@router.get(
    "/canteen/orders/{order_id}",
    response_model=ManagementOrderDetailOut,
    summary="Obtém detalhes completos de um pedido específico da cantina"
)
def get_canteen_order_detail(
    order_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    p = db.query(Pedido).filter(Pedido.id == order_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )

    itens_out = []
    for it in p.itens:
        prod_name = it.produto_rel.nome if it.produto_rel else f"Produto #{it.produto_id}"
        itens_out.append(ManagementOrderItemOut(
            id=it.id,
            produto_id=it.produto_id,
            produto_nome=prod_name,
            quantidade=it.quantidade,
            preco_unitario=it.preco_unitario,
            subtotal=round(it.quantidade * it.preco_unitario, 2)
        ))

    pag = p.pagamentos[0] if p.pagamentos else None
    paid_at = pag.paid_at if pag else None
    pag_status = pag.status if pag else None
    pag_metodo = pag.metodo if pag else None

    aluno_nome = p.usuario_rel.nome if p.usuario_rel else "Aluno"
    aluno_email = p.usuario_rel.email if p.usuario_rel else ""

    return ManagementOrderDetailOut(
        id=p.id,
        aluno_id=p.usuario_id,
        aluno_nome=aluno_nome,
        aluno_email=aluno_email,
        status=p.status,
        valor_total=p.valor_total,
        pickup_token=p.pickup_token,
        created_at=p.created_at,
        updated_at=p.updated_at,
        paid_at=paid_at,
        used_at=p.used_at,
        itens=itens_out,
        pagamento_status=pag_status,
        pagamento_metodo=pag_metodo
    )


@router.get(
    "/canteen/products",
    response_model=List[ProdutoOut],
    summary="Lista produtos cadastrados na cantina"
)
def list_canteen_products(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    return db.query(Produto).order_by(Produto.id.asc()).all()


@router.post(
    "/canteen/products",
    response_model=ProdutoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra novo produto na cantina"
)
def create_canteen_product(
    payload: ProdutoCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    nome_clean = payload.nome.strip()
    if not nome_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome do produto é obrigatório."
        )
    if payload.preco <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O preço do produto deve ser maior que zero."
        )

    # Verifica duplicidade de nome
    existente = db.query(Produto).filter(func.lower(Produto.nome) == nome_clean.lower()).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um produto cadastrado com o nome '{nome_clean}'."
        )

    produto = Produto(
        nome=nome_clean,
        descricao=payload.descricao.strip() if payload.descricao else None,
        preco=payload.preco,
        ativo=payload.ativo
    )
    db.add(produto)
    db.commit()
    db.refresh(produto)
    return produto


@router.put(
    "/canteen/products/{product_id}",
    response_model=ProdutoOut,
    summary="Edita dados de um produto da cantina"
)
def update_canteen_product(
    product_id: int,
    payload: ProdutoUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    produto = db.query(Produto).filter(Produto.id == product_id).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado."
        )

    if payload.nome is not None:
        nome_clean = payload.nome.strip()
        if not nome_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome do produto não pode ser vazio."
            )
        # Verificar duplicidade se mudou o nome
        existente = db.query(Produto).filter(
            func.lower(Produto.nome) == nome_clean.lower(),
            Produto.id != product_id
        ).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro produto cadastrado com o nome '{nome_clean}'."
            )
        produto.nome = nome_clean

    if payload.preco is not None:
        if payload.preco <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O preço do produto deve ser maior que zero."
            )
        produto.preco = payload.preco

    if payload.descricao is not None:
        produto.descricao = payload.descricao.strip() if payload.descricao else None

    if payload.ativo is not None:
        produto.ativo = payload.ativo

    db.commit()
    db.refresh(produto)
    return produto


@router.patch(
    "/canteen/products/{product_id}/toggle-active",
    response_model=ProdutoOut,
    summary="Alterna status ativo/inativo de um produto"
)
def toggle_canteen_product_active(
    product_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    produto = db.query(Produto).filter(Produto.id == product_id).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado."
        )

    produto.ativo = not produto.ativo
    db.commit()
    db.refresh(produto)
    return produto




