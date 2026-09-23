import secrets
from typing import List, Set, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google.auth.exceptions import GoogleAuthError
from app.api.deps import get_db, get_current_user, security
from app.core.config import settings
from app.core.security import verify_password, create_access_token, decode_access_token, get_password_hash
from app.models.usuario import Usuario
from app.models.turma import Turma
from app.schemas.auth import LoginRequest, GoogleLoginRequest, Token, DemoAccount
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

@router.post("/google", response_model=Token, summary="Autenticação com Google ID Token para ALUNO")
def login_google(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not req.credential or not req.credential.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token Google não fornecido."
        )

    # 1. Validação criptográfica do ID Token com o Google Identity Services
    try:
        expected_audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
        idinfo = id_token.verify_oauth2_token(
            req.credential.strip(),
            google_requests.Request(),
            audience=expected_audience
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token Google inválido ou expirado: {str(e)}"
        )
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha na validação do token Google: {str(e)}"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não foi possível autenticar o token Google."
        )

    # 2. Validações de claims
    # Emissor (iss)
    iss = idinfo.get("iss")
    if iss not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Emissor (iss) do token Google inválido."
        )

    # Audiência (aud) explícita quando GOOGLE_CLIENT_ID estiver configurado
    if settings.GOOGLE_CLIENT_ID:
        token_aud = idinfo.get("aud")
        if token_aud != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Audiência (aud) do token Google não corresponde à aplicação."
            )

    # E-mail verificado
    if idinfo.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail da conta Google não foi verificado."
        )

    # Sub (identificador único da conta Google)
    sub = idinfo.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identificador único (sub) não encontrado no token Google."
        )

    # E-mail
    email_raw = idinfo.get("email", "")
    email_clean = email_raw.lower().strip()
    if not email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail ausente no token Google."
        )

    # 3. Restrição obrigatória do domínio institucional: @escola.pr.gov.br
    if not email_clean.endswith("@escola.pr.gov.br"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso exclusivo para contas institucionais (@escola.pr.gov.br). Contas pessoais não são permitidas."
        )

    # 4. Localizar ou provisionar o usuário ALUNO
    # Busca 1: por google_sub
    user = db.query(Usuario).filter(Usuario.google_sub == sub).first()

    # Busca 2: por e-mail institucional já cadastrado
    if not user:
        user = db.query(Usuario).filter(Usuario.email == email_clean).first()
        if user:
            # Vincula o sub do Google à conta existente
            user.google_sub = sub
            db.commit()
            db.refresh(user)

    # Provisionamento automático de novo aluno institucional
    if not user:
        turma_padrao = db.query(Turma).filter(Turma.nome_turma.ilike("%3º C%")).first() or db.query(Turma).first()
        google_name = idinfo.get("name")
        if not google_name or not str(google_name).strip():
            google_name = email_clean.split("@")[0].replace(".", " ").title()

        user = Usuario(
            nome=str(google_name).strip(),
            email=email_clean,
            senha_hash=get_password_hash(secrets.token_urlsafe(24)),
            perfil="ALUNO",
            turma_id=turma_padrao.id if turma_padrao else None,
            ativo=True,
            google_sub=sub
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Validação de perfil e status
        if user.perfil != "ALUNO":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este perfil de usuário não é autorizado para login de aluno com Google."
            )
        if not user.ativo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta de usuário inativa."
            )

    # 5. Extração segura da foto de perfil fornecida pelo Google (se existir)
    picture_raw = idinfo.get("picture")
    google_picture: Optional[str] = None
    if picture_raw and isinstance(picture_raw, str):
        cleaned_pic = picture_raw.strip()
        if cleaned_pic.startswith("https://"):
            google_picture = cleaned_pic

    # 6. Emissão do JWT interno do CEEP+ com a foto de perfil segura
    token = create_access_token(
        subject=str(user.id),
        role=user.perfil,
        picture=google_picture
    )
    turma_nome = user.turma_rel.nome_turma if user.turma_rel else None

    return Token(
        access_token=token,
        role=user.perfil,
        nome=user.nome,
        email=user.email,
        turma=turma_nome,
        avatar_url=google_picture
    )

@router.get("/me", response_model=UsuarioOut, summary="Dados do usuário logado")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: Usuario = Depends(get_current_user)
):
    token_payload = decode_access_token(credentials.credentials) or {}
    avatar_url = token_payload.get("picture")
    return UsuarioOut(
        id=current_user.id,
        nome=current_user.nome,
        email=current_user.email,
        perfil=current_user.perfil,
        turma_id=current_user.turma_id,
        turma_nome=current_user.turma_rel.nome_turma if current_user.turma_rel else None,
        curso_nome=current_user.turma_rel.curso if current_user.turma_rel else None,
        avatar_url=avatar_url
    )

@router.get("/demo-accounts", response_model=List[DemoAccount], summary="Contas de demonstração disponíveis")
def get_demo_accounts():
    return [
        DemoAccount(
            label="Aluno Demo",
            email="aluno@escola.pr.gov.br",
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
