import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.core.security import create_access_token

client = TestClient(app)

def get_auth_token(email: str, password: str = "demo123") -> str:
    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    if user:
        return create_access_token(subject=str(user.id), role=user.perfil)
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


def test_quick_login_demo_accounts_endpoint():
    """Valida que o endpoint /demo-accounts retorna exclusivamente as 3 contas públicas sem expor credenciais oficiais."""
    resp = client.get("/api/v1/auth/demo-accounts")
    assert resp.status_code == 200
    accounts = resp.json()
    assert len(accounts) == 3
    emails = [a["email"] for a in accounts]
    assert "aluno.publico@ceep.demo" in emails
    assert "gestao.publico@ceep.demo" in emails
    assert "cantina.publico@ceep.demo" in emails
    # Não deve expor contas oficiais no Quick Login
    assert "aluno@escola.pr.gov.br" not in emails
    assert "gestao@ceep.demo" not in emails
    assert "cantina@ceep.demo" not in emails


def test_structural_protection_gestao_publica_forbidden():
    """Garante que a Gestão Pública recebe 403 Forbidden ao tentar modificar qualquer dado estrutural da escola."""
    token_pub = get_auth_token("gestao.publico@ceep.demo")
    headers_pub = {"Authorization": f"Bearer {token_pub}"}

    # 1. Cursos
    r = client.post("/api/v1/management/courses", json={"nome": "Curso Hack", "sigla": "HCK"}, headers=headers_pub)
    assert r.status_code == 403
    assert "dados estruturais oficiais da escola são protegidos" in r.json()["detail"]

    r = client.put("/api/v1/management/courses/1", json={"nome": "Alterado"}, headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/courses/1", headers=headers_pub)
    assert r.status_code == 403

    # 2. Turmas
    r = client.post("/api/v1/management/classes", json={"nome_turma": "Turma X", "curso": "DS", "periodo": "Manhã", "ano": "1º Ano", "curso_id": 1}, headers=headers_pub)
    assert r.status_code == 403

    r = client.put("/api/v1/management/classes/1", json={"nome_turma": "Nova Turma"}, headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/classes/1", headers=headers_pub)
    assert r.status_code == 403

    # 3. Disciplinas
    r = client.post("/api/v1/management/disciplines", json={"nome": "Disc Hack", "sigla": "DH", "curso_id": 1}, headers=headers_pub)
    assert r.status_code == 403

    r = client.put("/api/v1/management/disciplines/1", json={"nome": "Disc Alterada"}, headers=headers_pub)
    assert r.status_code == 403

    r = client.patch("/api/v1/management/disciplines/1/toggle-active", headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/disciplines/1", headers=headers_pub)
    assert r.status_code == 403

    # 4. Professores
    r = client.post("/api/v1/management/professors", json={"nome": "Prof Hack", "email": "prof.hack@escola.pr.gov.br"}, headers=headers_pub)
    assert r.status_code == 403

    r = client.put("/api/v1/management/professors/1", json={"nome": "Prof Alterado"}, headers=headers_pub)
    assert r.status_code == 403

    r = client.patch("/api/v1/management/professors/1/toggle-active", headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/professors/1", headers=headers_pub)
    assert r.status_code == 403

    # 5. Horários
    r = client.post("/api/v1/management/schedules", json={
        "dia_semana": "Segunda-feira",
        "horario_inicio": "07:10",
        "horario_fim": "08:00",
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1
    }, headers=headers_pub)
    assert r.status_code == 403

    r = client.put("/api/v1/management/schedules/1", json={"horario_inicio": "08:00"}, headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/schedules/1", headers=headers_pub)
    assert r.status_code == 403

    # 6. Períodos
    r = client.post("/api/v1/management/schedules/periods", json={"ordem": 99, "nome": "Extra", "horario_inicio": "19:00", "horario_fim": "19:50", "turno": "Noite", "is_intervalo": False}, headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/schedules/periods/1", headers=headers_pub)
    assert r.status_code == 403

    # 7. Disponibilidades
    r = client.post("/api/v1/management/schedules/availabilities", json={
        "tipo_recurso": "PROFESSOR",
        "recurso_id": 1,
        "recurso_identificador": "Prof. Carlos",
        "dia_semana": "Segunda-feira",
        "horario_inicio": "07:10",
        "horario_fim": "08:00",
        "tipo": "INDISPONIVEL"
    }, headers=headers_pub)
    assert r.status_code == 403

    r = client.delete("/api/v1/management/schedules/availabilities/1", headers=headers_pub)
    assert r.status_code == 403

    # 8. Regras de Disciplina
    r = client.post("/api/v1/management/schedules/discipline-rules", json={"turma_id": 1, "disciplina_id": 1, "aulas_semanais": 2}, headers=headers_pub)
    assert r.status_code == 403

    # 9. Produtos da cantina
    r = client.post("/api/v1/management/canteen/products", json={"nome": "Produto Hack", "preco": 10.0, "ativo": True}, headers=headers_pub)
    assert r.status_code == 403

    r = client.put("/api/v1/management/canteen/products/1", json={"nome": "Alterado", "preco": 12.0}, headers=headers_pub)
    assert r.status_code == 403

    r = client.patch("/api/v1/management/canteen/products/1/toggle-active", headers=headers_pub)
    assert r.status_code == 403


def test_student_dashboard_recent_notice_isolation():
    """Garante que a dashboard do aluno exibe apenas avisos do seu ambiente correspondente."""
    token_gestao_pub = get_auth_token("gestao.publico@ceep.demo")
    token_gestao_ofi = get_auth_token("gestao@ceep.demo")
    token_aluno_pub = get_auth_token("aluno.publico@ceep.demo")
    token_aluno_ofi = get_auth_token("aluno@escola.pr.gov.br")

    headers_g_pub = {"Authorization": f"Bearer {token_gestao_pub}"}
    headers_g_ofi = {"Authorization": f"Bearer {token_gestao_ofi}"}
    headers_a_pub = {"Authorization": f"Bearer {token_aluno_pub}"}
    headers_a_ofi = {"Authorization": f"Bearer {token_aluno_ofi}"}

    uid = uuid.uuid4().hex[:6]
    title_pub = f"Aviso Recente Publico {uid}"
    title_ofi = f"Aviso Recente Oficial {uid}"

    # Cria aviso público
    client.post("/api/v1/notices/", json={
        "titulo": title_pub,
        "descricao": "Desc pública",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_g_pub)

    # Cria aviso oficial
    client.post("/api/v1/notices/", json={
        "titulo": title_ofi,
        "descricao": "Desc oficial",
        "prioridade": "ALTA",
        "publico_alvo_tipo": "GERAL",
        "status": "PUBLICADO"
    }, headers=headers_g_ofi)

    # Dashboard do Aluno Público
    dash_pub = client.get("/api/v1/student/dashboard", headers=headers_a_pub).json()
    if dash_pub.get("aviso_recente"):
        assert dash_pub["aviso_recente"]["ambiente"] == "PUBLICO"
        assert dash_pub["aviso_recente"]["is_demo"] is True

    # Dashboard do Aluno Oficial
    dash_ofi = client.get("/api/v1/student/dashboard", headers=headers_a_ofi).json()
    if dash_ofi.get("aviso_recente"):
        assert dash_ofi["aviso_recente"]["ambiente"] == "OFICIAL"
        assert dash_ofi["aviso_recente"]["is_demo"] is False
