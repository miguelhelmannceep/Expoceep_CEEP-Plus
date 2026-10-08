"""
Testes do Milestone 5Z:
- Automação de Horários (Brasília / UTC-3):
  * Caso 1: Antes da 1ª aula (07:00 Segunda-feira)
  * Caso 2: Em aula (08:00 Segunda-feira)
  * Caso 3: Em aula segunda aula (09:00 Segunda-feira)
  * Caso 4: Intervalo / recreio entre aulas (09:45 Segunda-feira)
  * Caso 5: Quarta-feira 11:00
  * Caso 6: Quinta-feira 11:00
  * Caso 7: Sexta-feira 11:00 (última aula da semana -> próxima na Segunda-feira)
  * Caso 8: Após o encerramento do dia (18:30 Segunda-feira -> próxima aula no dia seguinte)
  * Caso 9: Fim de semana (Sábado e Domingo -> próxima aula na Segunda-feira)
  * Caso 10: Aluno sem turma vinculada (status SEM_TURMA)
  * Integração HTTP via endpoint /api/v1/student/dashboard
- Proteção Estrutural da Gestão Pública:
  * 403 Forbidden para gestao.publico@ceep.demo em Cursos, Turmas, Disciplinas, Professores, Horários, Períodos e Disponibilidades
- Catálogo Oficial da Cantina:
  * Exatamente 9 produtos ativos na base oficial
- Limpeza de Dados Transacionais:
  * 0 pedidos, 0 avisos, 0 tarefas na base oficial
"""

import sqlite3
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from main import app
from conftest import REAL_DB
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.core.security import create_access_token
from app.utils.schedule_detector import detect_student_schedules, BRASILIA_TZ

client = TestClient(app)


def get_user_token(email: str) -> str:
    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    assert user is not None, f"User {email} not found"
    return create_access_token(subject=str(user.id), role=user.perfil)


# =========================================================================
# 1. TESTES UNITÁRIOS E DE REGRAS: DETECTOR DE HORÁRIOS
# =========================================================================

def test_schedule_detector_monday_before_first_class():
    """Segunda-feira 07:00: Antes da 1ª aula (07:10). Aula atual deve ser None, próxima aula deve ser 07:10."""
    db = SessionLocal()
    # 2026-10-12 é uma Segunda-feira
    dt = datetime(2026, 10, 12, 7, 0, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is None
    assert result["proxima_aula"] is not None
    assert result["proxima_aula"]["horario_inicio"] == "07:10"
    assert result["status_aulas"] == "ANTES_PRIMEIRA_AULA"
    assert result["is_dia_letivo"] is True
    assert result["dia_semana_atual"] == "Segunda-feira"


def test_schedule_detector_monday_during_first_class():
    """Segunda-feira 08:00: Durante a 1ª aula (07:10-08:50). Aula atual ativa e próxima aula definida (08:50)."""
    db = SessionLocal()
    dt = datetime(2026, 10, 12, 8, 0, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is not None
    assert result["aula_atual"]["horario_inicio"] == "07:10"
    assert result["aula_atual"]["horario_fim"] == "08:50"
    assert result["proxima_aula"] is not None
    assert result["proxima_aula"]["horario_inicio"] == "08:50"
    assert result["status_aulas"] == "EM_AULA"


def test_schedule_detector_monday_during_second_class():
    """Segunda-feira 09:00: Durante a 2ª aula (08:50-09:40). Aula atual ativa e próxima aula 09:55."""
    db = SessionLocal()
    dt = datetime(2026, 10, 12, 9, 0, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is not None
    assert result["aula_atual"]["horario_inicio"] == "08:50"
    assert result["aula_atual"]["horario_fim"] == "09:40"
    assert result["proxima_aula"] is not None
    assert result["proxima_aula"]["horario_inicio"] == "09:55"
    assert result["status_aulas"] == "EM_AULA"


def test_schedule_detector_interval_between_classes():
    """Segunda-feira 09:45: Recreio/intervalo (09:40-09:55). Sem aula atual, próxima às 09:55."""
    db = SessionLocal()
    dt = datetime(2026, 10, 12, 9, 45, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is None
    assert result["proxima_aula"] is not None
    assert result["proxima_aula"]["horario_inicio"] == "09:55"
    assert result["status_aulas"] == "INTERVALO_ENTRE_AULAS"


def test_schedule_detector_wednesday_11am():
    """Quarta-feira 11:00: Durante a 4ª aula (10:45-12:25 Banco de Dados)."""
    db = SessionLocal()
    # 2026-10-14 é Quarta-feira
    dt = datetime(2026, 10, 14, 11, 0, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is not None
    assert result["aula_atual"]["horario_inicio"] == "10:45"
    assert result["aula_atual"]["disciplina"] == "Banco de Dados"
    assert result["dia_semana_atual"] == "Quarta-feira"


def test_schedule_detector_thursday_11am():
    """Quinta-feira 11:00: Durante a 4ª aula (10:45-12:25 Português)."""
    db = SessionLocal()
    # 2026-10-15 é Quinta-feira
    dt = datetime(2026, 10, 15, 11, 0, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is not None
    assert result["aula_atual"]["horario_inicio"] == "10:45"
    assert result["dia_semana_atual"] == "Quinta-feira"


def test_schedule_detector_friday_11am_and_next_week_class():
    """Sexta-feira 11:00: Durante a última aula da semana (10:45-12:25 Prog. Mobile). Próxima aula na Segunda-feira."""
    db = SessionLocal()
    # 2026-10-16 é Sexta-feira
    dt = datetime(2026, 10, 16, 11, 0, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is not None
    assert result["aula_atual"]["horario_inicio"] == "10:45"
    assert result["status_aulas"] == "ULTIMA_AULA_EM_ANDAMENTO"
    # Como é a última aula da sexta, a próxima aula deve ser da Segunda-feira
    assert result["proxima_aula"] is not None
    assert result["proxima_aula"]["dia_semana"] == "Segunda-feira"
    assert result["proxima_aula"]["horario_inicio"] == "07:10"


def test_schedule_detector_after_school_hours():
    """Segunda-feira 18:30: Aulas encerradas hoje. Próxima aula deve ser na Terça-feira."""
    db = SessionLocal()
    dt = datetime(2026, 10, 12, 18, 30, tzinfo=BRASILIA_TZ)
    result = detect_student_schedules(db, turma_id=1, reference_dt=dt)
    db.close()

    assert result["aula_atual"] is None
    assert result["status_aulas"] == "ENCERRADO_HOJE"
    assert result["proxima_aula"] is not None
    assert result["proxima_aula"]["dia_semana"] == "Terça-feira"
    assert result["proxima_aula"]["horario_inicio"] == "07:10"


def test_schedule_detector_weekend_saturday_and_sunday():
    """Fim de semana: Sábado e Domingo não têm aula. Próxima aula na Segunda-feira."""
    db = SessionLocal()
    # 2026-10-17 é Sábado
    dt_sat = datetime(2026, 10, 17, 14, 0, tzinfo=BRASILIA_TZ)
    res_sat = detect_student_schedules(db, turma_id=1, reference_dt=dt_sat)

    # 2026-10-18 é Domingo
    dt_sun = datetime(2026, 10, 18, 10, 0, tzinfo=BRASILIA_TZ)
    res_sun = detect_student_schedules(db, turma_id=1, reference_dt=dt_sun)
    db.close()

    assert res_sat["aula_atual"] is None
    assert res_sat["status_aulas"] == "FIM_DE_SEMANA"
    assert res_sat["is_dia_letivo"] is False
    assert res_sat["proxima_aula"]["dia_semana"] == "Segunda-feira"

    assert res_sun["aula_atual"] is None
    assert res_sun["status_aulas"] == "FIM_DE_SEMANA"
    assert res_sun["is_dia_letivo"] is False
    assert res_sun["proxima_aula"]["dia_semana"] == "Segunda-feira"


def test_schedule_detector_student_without_class():
    """Aluno sem turma (turma_id=None) retorna status SEM_TURMA sem quebrar."""
    db = SessionLocal()
    result = detect_student_schedules(db, turma_id=None)
    db.close()

    assert result["aula_atual"] is None
    assert result["proxima_aula"] is None
    assert result["status_aulas"] == "SEM_TURMA"


# =========================================================================
# 2. TESTE DE INTEGRAÇÃO DO ENDPOINT /api/v1/student/dashboard
# =========================================================================

def test_student_dashboard_endpoint_schedule_integration(monkeypatch):
    """Garante que o endpoint /api/v1/student/dashboard utiliza o detector de horários com sucesso."""
    token = get_user_token("aluno@escola.pr.gov.br")

    # Garante que o aluno tenha turma vinculada para o teste
    db = SessionLocal()
    aluno = db.query(Usuario).filter(Usuario.email == "aluno@escola.pr.gov.br").first()
    aluno.turma_id = 1
    db.commit()
    db.close()

    # Simula Segunda-feira às 08:30 (em aula)
    fake_now = datetime(2026, 10, 12, 8, 30, tzinfo=BRASILIA_TZ)
    import app.api.v1.endpoints.student as student_ep
    monkeypatch.setattr(student_ep, "get_brasilia_now", lambda: fake_now)

    resp = client.get("/api/v1/student/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["aula_atual"] is not None
    assert data["aula_atual"]["horario_inicio"] == "07:10"
    assert data["proxima_aula"] is not None
    assert data["status_aulas"] == "EM_AULA"
    assert data["dia_semana_atual"] == "Segunda-feira"
    assert data["horario_atual"] == "08:30"


# =========================================================================
# 3. TESTES DE SEGURANÇA ESTRUTURAL DA GESTÃO PÚBLICA (HTTP 403)
# =========================================================================

def test_gestao_publica_structural_endpoints_return_403():
    """Garante bloqueio HTTP 403 absoluto para Gestão Pública em todas as operações estruturais."""
    token_pub = get_user_token("gestao.publico@ceep.demo")
    headers = {"Authorization": f"Bearer {token_pub}"}

    # Cursos
    assert client.post("/api/v1/management/courses", json={"nome": "Curso X", "sigla": "CX"}, headers=headers).status_code == 403
    assert client.put("/api/v1/management/courses/1", json={"nome": "Curso Modificado"}, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/courses/1", headers=headers).status_code == 403

    # Turmas
    assert client.post("/api/v1/management/classes", json={"nome_turma": "Turma X", "curso_id": 1, "periodo": "Manhã", "ano": "1º Ano"}, headers=headers).status_code == 403
    assert client.put("/api/v1/management/classes/1", json={"nome_turma": "Nova Turma"}, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/classes/1", headers=headers).status_code == 403

    # Disciplinas
    assert client.post("/api/v1/management/disciplines", json={"nome": "Disciplina X", "sigla": "DX", "curso_id": 1, "carga_horaria": 80}, headers=headers).status_code == 403
    assert client.put("/api/v1/management/disciplines/1", json={"nome": "Disciplina Modificada"}, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/disciplines/1", headers=headers).status_code == 403

    # Professores
    assert client.post("/api/v1/management/professors", json={"nome": "Professor X", "email": "prof.x@ceep.demo"}, headers=headers).status_code == 403
    assert client.put("/api/v1/management/professors/1", json={"nome": "Prof Modificado"}, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/professors/1", headers=headers).status_code == 403
    assert client.patch("/api/v1/management/professors/1/toggle-active", headers=headers).status_code == 403

    # Horários
    assert client.post("/api/v1/management/schedules", json={"turma_id": 1, "disciplina_id": 1, "professor_id": 1, "dia_semana": "Segunda-feira", "horario_inicio": "07:10", "horario_fim": "08:00"}, headers=headers).status_code == 403
    assert client.put("/api/v1/management/schedules/1", json={"dia_semana": "Terça-feira"}, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/schedules/1", headers=headers).status_code == 403

    # Períodos e Intervalos
    assert client.post("/api/v1/management/schedules/periods", json={"nome": "1ª Aula Teste", "ordem": 1, "horario_inicio": "07:10", "horario_fim": "08:00"}, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/schedules/periods/1", headers=headers).status_code == 403

    # Disponibilidades e Regras
    assert client.post("/api/v1/management/schedules/availabilities", json={
        "tipo_recurso": "PROFESSOR",
        "recurso_identificador": "Prof. Carlos",
        "dia_semana": "Segunda-feira",
        "horario_inicio": "07:10",
        "horario_fim": "08:00"
    }, headers=headers).status_code == 403
    assert client.delete("/api/v1/management/schedules/availabilities/1", headers=headers).status_code == 403
    assert client.post("/api/v1/management/schedules/discipline-rules", json={"turma_id": 1, "disciplina_id": 1, "aulas_semanais": 2}, headers=headers).status_code == 403


# =========================================================================
# 4. VALIDAÇÃO DO CATÁLOGO DA CANTINA E LIMPEZA DE DADOS (BASE OFICIAL)
# =========================================================================

def test_canteen_catalog_exactly_nine_active_products_in_official_db():
    """Valida que o catálogo da base oficial ceep_plus.db possui exatamente os 9 produtos especificados."""
    conn = sqlite3.connect(REAL_DB)
    c = conn.cursor()
    c.execute("SELECT nome, preco, ativo FROM produtos WHERE ativo = 1")
    produtos = c.fetchall()
    conn.close()

    assert len(produtos) == 9, f"Esperado exatamente 9 produtos ativos na base oficial, encontrado {len(produtos)}"
    nomes_precos = {p[0]: p[1] for p in produtos}

    expected = {
        "Achocolatado Chocomil 200ml": 3.00,
        "Alfajor": 4.00,
        "Água sem gás": 3.00,
        "Água com gás": 3.00,
        "Barra de cereal": 3.00,
        "Salgadinho Cegonha 50g": 3.00,
        "Geladinho": 1.00,
        "Salgado assado / Mini pizza": 8.00,
        "Suco": 5.00
    }

    for nome, preco in expected.items():
        assert nome in nomes_precos, f"Produto '{nome}' ausente no catálogo da cantina"
        assert nomes_precos[nome] == preco, f"Preço de '{nome}' divergente: {nomes_precos[nome]} != {preco}"


def test_transactional_data_cleaned_in_official_db():
    """Garante que a base oficial ceep_plus.db não possui lixo transacional demonstrativo."""
    conn = sqlite3.connect(REAL_DB)
    c = conn.cursor()
    c.execute("SELECT count(*) FROM pedidos")
    pedidos_count = c.fetchone()[0]
    c.execute("SELECT count(*) FROM avisos")
    avisos_count = c.fetchone()[0]
    c.execute("SELECT count(*) FROM tarefas")
    tarefas_count = c.fetchone()[0]
    conn.close()

    assert pedidos_count == 0, f"Esperado 0 pedidos na base oficial, encontrado {pedidos_count}"
    assert avisos_count == 0, f"Esperado 0 avisos na base oficial, encontrado {avisos_count}"
    assert tarefas_count == 0, f"Esperado 0 tarefas na base oficial, encontrado {tarefas_count}"
