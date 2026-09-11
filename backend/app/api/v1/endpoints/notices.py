from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api.deps import get_db, get_current_user, require_roles
from app.models.usuario import Usuario
from app.models.aviso import Aviso
from app.models.turma import Curso, Turma
from app.schemas.aviso import AvisoOut, AvisoCreate, AvisoUpdate

router = APIRouter()

def format_aviso_out(aviso: Aviso, db: Session) -> AvisoOut:
    target_name = None
    if aviso.publico_alvo_tipo == "CURSO" and aviso.publico_alvo_id:
        curso = db.query(Curso).filter(Curso.id == aviso.publico_alvo_id).first()
        target_name = curso.nome if curso else f"Curso #{aviso.publico_alvo_id}"
    elif aviso.publico_alvo_tipo == "TURMA" and aviso.publico_alvo_id:
        turma = db.query(Turma).filter(Turma.id == aviso.publico_alvo_id).first()
        target_name = turma.nome_turma if turma else f"Turma #{aviso.publico_alvo_id}"
    elif aviso.publico_alvo_tipo == "GERAL":
        target_name = "Toda a Escola (Geral)"

    return AvisoOut(
        id=aviso.id,
        titulo=aviso.titulo,
        descricao=aviso.descricao,
        prioridade=aviso.prioridade,
        publico_alvo_tipo=aviso.publico_alvo_tipo,
        publico_alvo_id=aviso.publico_alvo_id,
        publico_alvo_nome=target_name,
        status=getattr(aviso, "status", "PUBLICADO"),
        data_publicacao=aviso.data_publicacao,
        autor_nome=aviso.autor_rel.nome if aviso.autor_rel else "Coordenação"
    )

@router.get("/", response_model=List[AvisoOut], summary="Lista comunicados escolares destinados ao usuário autenticado")
def list_notices(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.perfil == "ALUNO":
        # Aluno só pode visualizar avisos com status PUBLICADO
        student_turma_id = current_user.turma_id
        student_curso_id = None
        if current_user.turma_rel and current_user.turma_rel.curso_id:
            student_curso_id = current_user.turma_rel.curso_id
        elif student_turma_id:
            turma_obj = db.query(Turma).filter(Turma.id == student_turma_id).first()
            if turma_obj and turma_obj.curso_id:
                student_curso_id = turma_obj.curso_id

        conditions = [
            Aviso.publico_alvo_tipo == "GERAL"
        ]
        if student_turma_id:
            conditions.append(
                (Aviso.publico_alvo_tipo == "TURMA") & (Aviso.publico_alvo_id == student_turma_id)
            )
        if student_curso_id:
            conditions.append(
                (Aviso.publico_alvo_tipo == "CURSO") & (Aviso.publico_alvo_id == student_curso_id)
            )

        avisos = db.query(Aviso).filter(
            Aviso.status == "PUBLICADO",
            or_(*conditions)
        ).order_by(Aviso.data_publicacao.desc()).all()
    else:
        # Gestão ou Cantina visualizando o mural
        avisos = db.query(Aviso).order_by(Aviso.data_publicacao.desc()).all()

    return [format_aviso_out(a, db) for a in avisos]

@router.get("/management/all", response_model=List[AvisoOut], summary="Lista todos os comunicados para painel de Gestão")
def list_all_notices_management(
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    avisos = db.query(Aviso).order_by(Aviso.data_publicacao.desc()).all()
    return [format_aviso_out(a, db) for a in avisos]

@router.post("/", response_model=AvisoOut, status_code=status.HTTP_201_CREATED, summary="Cria novo comunicado escolar")
def create_notice(
    payload: AvisoCreate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    titulo = payload.titulo.strip()
    descricao = payload.descricao.strip()

    if not titulo or not descricao:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Título e descrição são campos obrigatórios."
        )

    target_id = payload.publico_alvo_id
    if payload.publico_alvo_tipo == "CURSO":
        if not target_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="É necessário selecionar o curso para comunicados direcionados a CURSO."
            )
        curso = db.query(Curso).filter(Curso.id == target_id).first()
        if not curso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Curso selecionado não foi encontrado."
            )
    elif payload.publico_alvo_tipo == "TURMA":
        if not target_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="É necessário selecionar a turma para comunicados direcionados a TURMA."
            )
        turma = db.query(Turma).filter(Turma.id == target_id).first()
        if not turma:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Turma selecionada não foi encontrada."
            )
    else:
        target_id = None

    novo_aviso = Aviso(
        titulo=titulo,
        descricao=descricao,
        prioridade=payload.prioridade,
        publico_alvo_tipo=payload.publico_alvo_tipo,
        publico_alvo_id=target_id,
        status=payload.status,
        data_publicacao=datetime.now(timezone.utc),
        autor_id=current_user.id
    )
    db.add(novo_aviso)
    db.commit()
    db.refresh(novo_aviso)
    return format_aviso_out(novo_aviso, db)

@router.put("/{notice_id}", response_model=AvisoOut, summary="Edita comunicado existente")
def update_notice(
    notice_id: int,
    payload: AvisoUpdate,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    aviso = db.query(Aviso).filter(Aviso.id == notice_id).first()
    if not aviso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comunicado não encontrado."
        )

    if payload.titulo is not None:
        clean_titulo = payload.titulo.strip()
        if not clean_titulo:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Título não pode ser vazio.")
        aviso.titulo = clean_titulo

    if payload.descricao is not None:
        clean_desc = payload.descricao.strip()
        if not clean_desc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Descrição não pode ser vazia.")
        aviso.descricao = clean_desc

    if payload.prioridade is not None:
        aviso.prioridade = payload.prioridade

    if payload.publico_alvo_tipo is not None:
        target_type = payload.publico_alvo_tipo
        target_id = payload.publico_alvo_id if payload.publico_alvo_id is not None else aviso.publico_alvo_id

        if target_type == "CURSO":
            if not target_id:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Curso obrigatório.")
            curso = db.query(Curso).filter(Curso.id == target_id).first()
            if not curso:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso não encontrado.")
            aviso.publico_alvo_tipo = "CURSO"
            aviso.publico_alvo_id = target_id
        elif target_type == "TURMA":
            if not target_id:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Turma obrigatória.")
            turma = db.query(Turma).filter(Turma.id == target_id).first()
            if not turma:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")
            aviso.publico_alvo_tipo = "TURMA"
            aviso.publico_alvo_id = target_id
        else:
            aviso.publico_alvo_tipo = "GERAL"
            aviso.publico_alvo_id = None

    if payload.status is not None:
        aviso.status = payload.status

    db.commit()
    db.refresh(aviso)
    return format_aviso_out(aviso, db)

@router.patch("/{notice_id}/publish", response_model=AvisoOut, summary="Publica um comunicado que estava em rascunho")
def publish_notice(
    notice_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    aviso = db.query(Aviso).filter(Aviso.id == notice_id).first()
    if not aviso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comunicado não encontrado."
        )

    aviso.status = "PUBLICADO"
    aviso.data_publicacao = datetime.now(timezone.utc)
    db.commit()
    db.refresh(aviso)
    return format_aviso_out(aviso, db)

@router.delete("/{notice_id}", summary="Exclui um comunicado escolar")
def delete_notice(
    notice_id: int,
    current_user: Usuario = Depends(require_roles(["GESTAO"])),
    db: Session = Depends(get_db)
):
    aviso = db.query(Aviso).filter(Aviso.id == notice_id).first()
    if not aviso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comunicado não encontrado."
        )

    db.delete(aviso)
    db.commit()
    return {"mensagem": "Comunicado excluído com sucesso.", "id": notice_id}
