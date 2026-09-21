from typing import List, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.usuario import Usuario
from app.models.turma import Turma
from app.schemas.auth import LoginRequest, Token, DemoAccount
from app.schemas.usuario import UsuarioOut

router = APIRouter()

AUTHORIZED_GESTAO_EMAILS: Set[str] = {
    "gestao@ceep.demo",
}

AUTHORIZED_CANTINA_EMAILS: Set[str] = {
    "cantina@ceep.demo",
}

@router.post("/login", response_model=Token, summary="Autenticação com e-mail e senha")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    
    # 1. Regra ALUNO: qualquer e-mail institucional @escola.pr.gov.br
    if email_clean.endswith("@escola.pr.gov.br"):
        user = db.query(Usuario).filter(Usuario.email == email_clean).first()
        if not user:
            # Provisiona dinamicamente ou associa à turma padrão (demo) para novo acesso institucional
            turma_padrao = db.query(Turma).filter(Turma.nome_turma.ilike("%3º C%")).first() or db.query(Turma).first()
            raw_name = email_clean.split("@")[0].replace(".", " ").title()
            user = Usuario(
                nome=raw_name,
                email=email_clean,
                senha_hash=get_password_hash(req.password if req.password else "demo123"),
                perfil="ALUNO",
                turma_id=turma_padrao.id if turma_padrao else None,
                ativo=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if user.perfil != "ALUNO":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="E-mail ou senha incorretos."
                )
            if not verify_password(req.password, user.senha_hash):
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

    # 2. Regra GESTÃO: somente e-mails previamente autorizados + senha correta
    elif email_clean in AUTHORIZED_GESTAO_EMAILS:
        user = db.query(Usuario).filter(Usuario.email == email_clean).first()
        if not user or user.perfil != "GESTAO" or not verify_password(req.password, user.senha_hash):
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
        return Token(
            access_token=token,
            role=user.perfil,
            nome=user.nome,
            email=user.email,
            turma=None
        )

    # 3. Regra CANTINA: somente e-mails previamente autorizados + senha correta
    elif email_clean in AUTHORIZED_CANTINA_EMAILS:
        user = db.query(Usuario).filter(Usuario.email == email_clean).first()
        if not user or user.perfil != "CANTINA" or not verify_password(req.password, user.senha_hash):
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
        return Token(
            access_token=token,
            role=user.perfil,
            nome=user.nome,
            email=user.email,
            turma=None
        )

    # 4. Qualquer outro e-mail não autorizado: recusado
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
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
