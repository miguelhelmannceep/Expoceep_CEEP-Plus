from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, Token, DemoAccount
from app.schemas.usuario import UsuarioOut

router = APIRouter()

@router.post("/login", response_model=Token, summary="Autenticação com e-mail e senha")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )
    
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de usuário inativa."
        )

    token = create_access_token(subject=str(user.id), role=user.perfil)
    turma_nome = user.turma_rel.nome_turma if user.turma_rel else None

    return Token(
        access_token=token,
        role=user.perfil,
        nome=user.nome,
        email=user.email,
        turma=turma_nome
    )

@router.get("/me", response_model=UsuarioOut, summary="Dados do usuário logado")
def get_me(current_user: Usuario = Depends(get_current_user)):
    return UsuarioOut(
        id=current_user.id,
        nome=current_user.nome,
        email=current_user.email,
        perfil=current_user.perfil,
        turma_id=current_user.turma_id,
        turma_nome=current_user.turma_rel.nome_turma if current_user.turma_rel else None,
        curso_nome=current_user.turma_rel.curso if current_user.turma_rel else None
    )

@router.get("/demo-accounts", response_model=List[DemoAccount], summary="Contas de demonstração disponíveis")
def get_demo_accounts():
    return [
        DemoAccount(
            label="Aluno Demo",
            email="aluno@ceep.demo",
            role="ALUNO",
            descricao="Acesso de aluno com horários, avisos, tarefas e cantina.",
            turma="3º C — Desenvolvimento de Sistemas"
        ),
        DemoAccount(
            label="Gestão Demo",
            email="gestao@ceep.demo",
            role="GESTAO",
            descricao="Acesso administrativo da coordenação e direção escolar.",
            turma=None
        ),
        DemoAccount(
            label="Cantina Demo",
            email="cantina@ceep.demo",
            role="CANTINA",
            descricao="Terminal simplificado para controle e entrega de pedidos.",
            turma=None
        ),
    ]
