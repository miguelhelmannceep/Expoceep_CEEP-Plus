# -*- coding: utf-8 -*-
"""
Testes Automatizados do Milestone 5O
Valida regras de conflito de subgrupos (A/B/NULL), invariante de professor e integridade pós-migração.
"""
import sqlite3
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.models.horario import Horario

client = TestClient(app)

def get_gestao_token() -> str:
    resp = client.post("/api/v1/auth/login", json={
        "email": "gestao@ceep.demo",
        "password": "demo123"
    })
    assert resp.status_code == 200, f"Falha no login da gestão: {resp.text}"
    return resp.json()["access_token"]


def test_database_metrics_post_migration_5o():
    """Valida as métricas globais da base oficial ceep_plus.db após a migração do Milestone 5O."""
    backend_dir = Path(__file__).resolve().parent.parent
    real_db = backend_dir / "ceep_plus.db"
    
    conn = sqlite3.connect(real_db.as_posix())
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM horarios;")
        total = cur.fetchone()[0]
        assert total == 1107, f"Esperado 1107 horários na base oficial, encontrado {total}"

        cur.execute("SELECT COUNT(*) FROM horarios WHERE grupo = 'A';")
        total_a = cur.fetchone()[0]
        assert total_a == 42, f"Esperado 42 Grupo A, encontrado {total_a}"

        cur.execute("SELECT COUNT(*) FROM horarios WHERE grupo = 'B';")
        total_b = cur.fetchone()[0]
        assert total_b == 42, f"Esperado 42 Grupo B, encontrado {total_b}"

        cur.execute("SELECT COUNT(*) FROM horarios WHERE grupo IS NULL;")
        total_null = cur.fetchone()[0]
        assert total_null == 1023, f"Esperado 1023 Grupo NULL, encontrado {total_null}"

        cur.execute("SELECT COUNT(*) FROM horarios WHERE horario_origem_id IS NOT NULL;")
        total_derivados = cur.fetchone()[0]
        assert total_derivados == 42, f"Esperado 42 com horario_origem_id, encontrado {total_derivados}"

        cur.execute("PRAGMA foreign_key_check;")
        fks = cur.fetchall()
        assert len(fks) == 0, f"Violações de FK encontradas: {fks}"

        # Preservação dos 7 casos de co-docência e 2 compostos
        co_doc_composta_ids = [452, 453, 458, 459, 581, 587, 593, 454, 580]
        for cid in co_doc_composta_ids:
            cur.execute("SELECT id, grupo FROM horarios WHERE id = ?;", (cid,))
            row = cur.fetchone()
            assert row is not None, f"Horário {cid} não encontrado"
            assert row[1] is None, f"Horário {cid} deveria ter grupo NULL, mas tem {row[1]}"
    finally:
        conn.close()


def test_conflict_matrix_group_rules():
    """Valida a matriz formal de conflitos de turma entre subgrupos (A/B) e aulas gerais (NULL)."""
    token = get_gestao_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Turma de teste: Turma 1 (1A ADM)
    # Horário de teste: Sábado (para não colidir com aulas regulares da semana)
    dia = "Sábado"
    h_ini = "07:10"
    h_fim = "08:00"

    # Criamos primeiro: Grupo A
    payload_a = {
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": dia,
        "horario_inicio": h_ini,
        "horario_fim": h_fim,
        "grupo": "A"
    }
    resp_a = client.post("/api/v1/management/schedules", json=payload_a, headers=headers)
    assert resp_a.status_code == 201, f"Falha ao criar Grupo A: {resp_a.text}"
    id_a = resp_a.json()["id"]

    try:
        # Caso 1: Grupo B no mesmo horário -> PERMITIDO (com professor diferente)
        payload_b = {
            "turma_id": 1,
            "disciplina_id": 2,
            "professor_id": 2,
            "dia_semana": dia,
            "horario_inicio": h_ini,
            "horario_fim": h_fim,
            "grupo": "B"
        }
        resp_b = client.post("/api/v1/management/schedules", json=payload_b, headers=headers)
        assert resp_b.status_code == 201, f"Grupo B deveria ser permitido no mesmo horário de Grupo A: {resp_b.text}"
        id_b = resp_b.json()["id"]

        try:
            # Caso 2: Outro Grupo A no mesmo horário -> CONFLITO BLOQUEANTE
            payload_a_dup = {
                "turma_id": 1,
                "disciplina_id": 3,
                "professor_id": 3,
                "dia_semana": dia,
                "horario_inicio": h_ini,
                "horario_fim": h_fim,
                "grupo": "A"
            }
            resp_a_dup = client.post("/api/v1/management/schedules", json=payload_a_dup, headers=headers)
            assert resp_a_dup.status_code == 400, "Grupo A duplicado deveria ser bloqueado!"
            assert "Conflito de horário" in resp_a_dup.text

            # Caso 3: Outro Grupo B no mesmo horário -> CONFLITO BLOQUEANTE
            payload_b_dup = {
                "turma_id": 1,
                "disciplina_id": 3,
                "professor_id": 3,
                "dia_semana": dia,
                "horario_inicio": h_ini,
                "horario_fim": h_fim,
                "grupo": "B"
            }
            resp_b_dup = client.post("/api/v1/management/schedules", json=payload_b_dup, headers=headers)
            assert resp_b_dup.status_code == 400, "Grupo B duplicado deveria ser bloqueado!"
            assert "Conflito de horário" in resp_b_dup.text

            # Caso 4: Aula geral (grupo = NULL) no mesmo horário -> CONFLITO BLOQUEANTE
            payload_null = {
                "turma_id": 1,
                "disciplina_id": 3,
                "professor_id": 3,
                "dia_semana": dia,
                "horario_inicio": h_ini,
                "horario_fim": h_fim,
                "grupo": None
            }
            resp_null = client.post("/api/v1/management/schedules", json=payload_null, headers=headers)
            assert resp_null.status_code == 400, "Aula geral não pode colidir com aula de subgrupo!"
            assert "Conflito de horário" in resp_null.text

        finally:
            # Cleanup do id_b
            client.delete(f"/api/v1/management/schedules/{id_b}", headers=headers)

    finally:
        # Cleanup do id_a
        client.delete(f"/api/v1/management/schedules/{id_a}", headers=headers)


def test_professor_conflict_global_invariant():
    """Valida que um professor nunca pode ter duas aulas simultâneas em turmas/grupos diferentes."""
    token = get_gestao_token()
    headers = {"Authorization": f"Bearer {token}"}

    dia = "Sábado"
    h_ini = "08:00"
    h_fim = "08:50"

    # Aloca Professor 1 na Turma 1 (Grupo A)
    payload_1 = {
        "turma_id": 1,
        "disciplina_id": 1,
        "professor_id": 1,
        "dia_semana": dia,
        "horario_inicio": h_ini,
        "horario_fim": h_fim,
        "grupo": "A"
    }
    resp_1 = client.post("/api/v1/management/schedules", json=payload_1, headers=headers)
    assert resp_1.status_code == 201
    id_1 = resp_1.json()["id"]

    try:
        # Tenta alocar o mesmo Professor 1 na Turma 2 no mesmo horário
        payload_2 = {
            "turma_id": 2,
            "disciplina_id": 2,
            "professor_id": 1,
            "dia_semana": dia,
            "horario_inicio": h_ini,
            "horario_fim": h_fim,
            "grupo": "B"
        }
        resp_2 = client.post("/api/v1/management/schedules", json=payload_2, headers=headers)
        assert resp_2.status_code == 400, "Professor com duas aulas simultâneas deve ser bloqueado!"
        assert "Conflito de horário para o professor" in resp_2.text

    finally:
        client.delete(f"/api/v1/management/schedules/{id_1}", headers=headers)
