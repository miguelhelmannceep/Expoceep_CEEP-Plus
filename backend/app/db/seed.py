import json
import re
from pathlib import Path
from datetime import date, datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import get_password_hash
from app.models.turma import Curso, Turma
from app.models.disciplina import Disciplina
from app.models.professor import Professor
from app.models.usuario import Usuario
from app.models.horario import Horario, PeriodoHorario, DisponibilidadeRecurso, RegraDisciplina
from app.models.aviso import Aviso
from app.models.tarefa import Tarefa
from app.models.produto import Produto

def ensure_schema_migrations(db: Session) -> None:
    """Garante que colunas recém-adicionadas existam em bancos SQLite pré-existentes."""
    with engine.connect() as conn:
        # 1. Horários
        try:
            h_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(horarios)")).fetchall()]
            if h_cols:
                if "disciplina_id" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN disciplina_id INTEGER REFERENCES disciplinas(id)"))
                if "professor_id" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN professor_id INTEGER REFERENCES professores(id)"))
                if "ativo" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN ativo BOOLEAN DEFAULT 1"))
                if "duracao" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN duracao INTEGER DEFAULT 1"))
                if "periodo_ordem" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN periodo_ordem INTEGER"))
                if "grupo" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN grupo VARCHAR(50)"))
                if "horario_origem_id" not in h_cols:
                    conn.execute(text("ALTER TABLE horarios ADD COLUMN horario_origem_id INTEGER REFERENCES horarios(id)"))
                conn.commit()
        except Exception as e:
            print(f"Migration warning horarios: {e}")

        # 2. Avisos
        try:
            a_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(avisos)")).fetchall()]
            if a_cols and "imagem_url" not in a_cols:
                conn.execute(text("ALTER TABLE avisos ADD COLUMN imagem_url TEXT"))
                conn.commit()
        except Exception as e:
            print(f"Migration warning avisos: {e}")

        # 3. Usuários (Google OAuth)
        try:
            u_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(usuarios)")).fetchall()]
            if u_cols and "google_sub" not in u_cols:
                conn.execute(text("ALTER TABLE usuarios ADD COLUMN google_sub VARCHAR(255)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_google_sub ON usuarios (google_sub)"))
                conn.commit()
        except Exception as e:
            print(f"Migration warning usuarios: {e}")

        # 4. Tabela associativa cursos_disciplinas
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cursos_disciplinas (
                    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
                    disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
                    PRIMARY KEY (curso_id, disciplina_id)
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cursos_disciplinas_disciplina_id ON cursos_disciplinas (disciplina_id)"))
            conn.commit()
        except Exception as e:
            print(f"Migration warning cursos_disciplinas: {e}")

def init_db(db: Session) -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(db)

    # Backfill disciplina_id e professor_id para horários legados se existirem
    try:
        horarios_sem_fk = db.query(Horario).filter((Horario.disciplina_id == None) | (Horario.professor_id == None)).all()
        if horarios_sem_fk:
            discs = {d.nome.lower(): d.id for d in db.query(Disciplina).all()}
            profs = {p.nome.lower(): p.id for p in db.query(Professor).all()}
            for h in horarios_sem_fk:
                if h.disciplina_id is None and h.disciplina and h.disciplina.lower() in discs:
                    h.disciplina_id = discs[h.disciplina.lower()]
                if h.professor_id is None and h.professor and h.professor.lower() in profs:
                    h.professor_id = profs[h.professor.lower()]
                if h.ativo is None:
                    h.ativo = True
            db.commit()
    except Exception as e:
        print(f"Backfill warning: {e}")

    # Migra e-mails de alunos legados para @escola.pr.gov.br se existirem
    try:
        aluno_legado = db.query(Usuario).filter(Usuario.email == "aluno@ceep.demo").first()
        if aluno_legado:
            aluno_legado.email = "aluno@escola.pr.gov.br"
        outro_legado = db.query(Usuario).filter(Usuario.email == "outro.aluno@ceep.demo").first()
        if outro_legado:
            outro_legado.email = "outro.aluno@escola.pr.gov.br"
        db.commit()
    except Exception as e:
        print(f"Email migration warning: {e}")

OFFICIAL_PERIODS = [
    # Manhã
    {"ordem": 1, "nome": "1ª aula", "horario_inicio": "07:10", "horario_fim": "08:00", "turno": "Manhã", "is_intervalo": False, "ativo": True},
    {"ordem": 2, "nome": "2ª aula", "horario_inicio": "08:00", "horario_fim": "08:50", "turno": "Manhã", "is_intervalo": False, "ativo": True},
    {"ordem": 3, "nome": "3ª aula", "horario_inicio": "08:50", "horario_fim": "09:40", "turno": "Manhã", "is_intervalo": False, "ativo": True},
    {"ordem": 4, "nome": "Intervalo / Recreio", "horario_inicio": "09:40", "horario_fim": "09:55", "turno": "Manhã", "is_intervalo": True, "ativo": True},
    {"ordem": 5, "nome": "4ª aula", "horario_inicio": "09:55", "horario_fim": "10:45", "turno": "Manhã", "is_intervalo": False, "ativo": True},
    {"ordem": 6, "nome": "5ª aula", "horario_inicio": "10:45", "horario_fim": "11:35", "turno": "Manhã", "is_intervalo": False, "ativo": True},
    {"ordem": 7, "nome": "6ª aula", "horario_inicio": "11:35", "horario_fim": "12:25", "turno": "Manhã", "is_intervalo": False, "ativo": True},
    # Tarde
    {"ordem": 1, "nome": "1ª aula", "horario_inicio": "13:10", "horario_fim": "14:00", "turno": "Tarde", "is_intervalo": False, "ativo": True},
    {"ordem": 2, "nome": "2ª aula", "horario_inicio": "14:00", "horario_fim": "14:50", "turno": "Tarde", "is_intervalo": False, "ativo": True},
    {"ordem": 3, "nome": "3ª aula", "horario_inicio": "14:50", "horario_fim": "15:40", "turno": "Tarde", "is_intervalo": False, "ativo": True},
    {"ordem": 4, "nome": "Intervalo / Recreio", "horario_inicio": "15:40", "horario_fim": "15:55", "turno": "Tarde", "is_intervalo": True, "ativo": True},
    {"ordem": 5, "nome": "4ª aula", "horario_inicio": "15:55", "horario_fim": "16:45", "turno": "Tarde", "is_intervalo": False, "ativo": True},
    {"ordem": 6, "nome": "5ª aula", "horario_inicio": "16:45", "horario_fim": "17:35", "turno": "Tarde", "is_intervalo": False, "ativo": True},
    {"ordem": 7, "nome": "6ª aula", "horario_inicio": "17:35", "horario_fim": "18:25", "turno": "Tarde", "is_intervalo": False, "ativo": True},
]

def sync_official_periods(db: Session) -> None:
    try:
        existing = db.query(PeriodoHorario).all()
        needs_sync = False
        if len(existing) < 14:
            needs_sync = True
        elif any(p.horario_inicio in ["07:30", "09:10"] for p in existing):
            needs_sync = True

        if needs_sync:
            db.query(PeriodoHorario).delete()
            db.flush()
            for p_dict in OFFICIAL_PERIODS:
                db.add(PeriodoHorario(**p_dict))
            db.commit()
    except Exception as e:
        print(f"Periodos sync warning: {e}")

def sync_real_school_data(db: Session) -> None:
    try:
        data_path = Path(__file__).parent / "real_school_data.json"
        if not data_path.exists():
            return
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        curso_map = {}
        for cur in data["cursos"]:
            c_obj = db.query(Curso).filter(Curso.nome == cur["nome"]).first()
            if not c_obj:
                c_obj = Curso(nome=cur["nome"], sigla=cur["sigla"], ativo=True)
                db.add(c_obj)
                db.flush()
            curso_map[cur["nome"]] = c_obj.id

        turma_map = {}
        t1 = db.query(Turma).filter(Turma.id == 1).first()
        if t1 and t1.nome_turma != "3C DES. SISTEMAS":
            t1.nome_turma = "3C DES. SISTEMAS"
            t1.periodo = "Manhã"
            t1.ano = "3º Ano"
            db.flush()
            turma_map["3C DES. SISTEMAS"] = 1

        for t in data["turmas"]:
            t_name = t["nome_turma"]
            if t_name in turma_map:
                continue
            t_obj = db.query(Turma).filter(Turma.nome_turma == t_name).first()
            if not t_obj:
                cid = curso_map.get(t["curso_nome"], 1)
                t_obj = Turma(
                    nome_turma=t_name,
                    curso=t["curso_nome"],
                    periodo=t["periodo"],
                    ano=t["ano"],
                    curso_id=cid,
                    ativo=True
                )
                db.add(t_obj)
                db.flush()
            turma_map[t_name] = t_obj.id

        prof_map = {}
        for p_name in data["professores"]:
            p_obj = db.query(Professor).filter(Professor.nome == p_name).first()
            if not p_obj:
                clean_email = re.sub(r"[^a-z0-9]", "", p_name.lower()) + "@escola.pr.gov.br"
                p_obj = Professor(nome=p_name, email=clean_email, ativo=True)
                db.add(p_obj)
                db.flush()
            prof_map[p_name] = p_obj.id

        GERAL_DISCIPLINAS = {
            "Arte", "Biologia", "Ed. Dig. e Comp.", "Ed. Financeira", "Ed. Física",
            "Física", "Filosofia", "Geografia", "História", "Inglês",
            "Matemática", "Português", "Química", "Sociologia", "Proj. de Vida"
        }

        SHARED_DISCIPLINAS = {
            "Banco de Dados": ["DS", "JOGOS"],
            "Biossegurança": ["ENF", "ESTETICA"],
            "Ciências Dados": ["DS", "IA_DADOS"],
            "Eletricidade": ["ELETROMEC", "ELETRON"],
            "Eletrônica": ["ELETROMEC", "ELETRON"],
            "Inst. Elétricas": ["EDIF", "ELETROMEC"],
            "Lóg. Comp.": ["DS", "JOGOS"],
            "Máq. Elétricas": ["ELETROMEC", "ELETRON"],
            "Prog. Mobile": ["DS", "JOGOS"],
            "Seg. do Trabalho": ["ELETROMEC", "ELETRON"],
            "Sist. Hidr. Pneumát.": ["ELETROMEC", "ELETRON"],
        }

        turma_to_curso_id = {t["nome_turma"]: curso_map.get(t["curso_nome"]) for t in data["turmas"]}
        disc_cursos_inferred = {}
        for h in data["horarios"]:
            t_name = h.get("turma")
            c_id = turma_to_curso_id.get(t_name)
            if c_id:
                disc_cursos_inferred.setdefault(h["disciplina"], set()).add(c_id)

        disc_map = {}
        for d_name in data["disciplinas"]:
            d_obj = db.query(Disciplina).filter(Disciplina.nome == d_name).first()
            if not d_obj:
                words = re.sub(r"[^a-zA-Z0-9\s]", "", d_name).split()
                sigla = "".join(w[:2].upper() for w in words[:3]) if words else "DISC"
                if d_name in GERAL_DISCIPLINAS or d_name in SHARED_DISCIPLINAS:
                    cid = None
                else:
                    cids = disc_cursos_inferred.get(d_name, set())
                    cid = list(cids)[0] if len(cids) == 1 else None
                d_obj = Disciplina(nome=d_name, sigla=sigla, curso_id=cid, ativo=True)
                db.add(d_obj)
                db.flush()
            disc_map[d_name] = d_obj.id

        for d_name, siglas in SHARED_DISCIPLINAS.items():
            d_obj = db.query(Disciplina).filter(Disciplina.nome == d_name).first()
            if d_obj:
                for s in siglas:
                    c_obj = db.query(Curso).filter(Curso.sigla == s).first()
                    if c_obj:
                        assoc = db.execute(
                            text("SELECT 1 FROM cursos_disciplinas WHERE curso_id = :cid AND disciplina_id = :did"),
                            {"cid": c_obj.id, "did": d_obj.id}
                        ).first()
                        if not assoc:
                            db.execute(
                                text("INSERT INTO cursos_disciplinas (curso_id, disciplina_id) VALUES (:cid, :did)"),
                                {"cid": c_obj.id, "did": d_obj.id}
                            )
        db.flush()

        if db.query(Horario).count() < 100:
            for h in data["horarios"]:
                tid = turma_map.get(h["turma"])
                did = disc_map.get(h["disciplina"])
                prof_names = [p.strip() for p in h["professor"].split("/")]
                pid = prof_map.get(prof_names[0]) if prof_names else None

                h_obj = Horario(
                    dia_semana=h["dia_semana"],
                    horario_inicio=h["horario_inicio"],
                    horario_fim=h["horario_fim"],
                    disciplina=h["disciplina"],
                    professor=h["professor"],
                    turma_id=tid,
                    disciplina_id=did,
                    professor_id=pid,
                    duracao=h["duracao"],
                    periodo_ordem=h["periodo_ordem"],
                    ativo=True
                )
                db.add(h_obj)
            db.commit()
    except Exception as e:
        print(f"School data sync warning: {e}")

    # 0. Garante Períodos e Intervalos Oficiais da Escola (Milestone 5E)
    sync_official_periods(db)
    sync_real_school_data(db)

    # Garante usuários estruturais e essenciais para a operação do CEEP+
    senha_padrao = get_password_hash("demo123")
    essential_users = [
        {"nome": "Aluno Demo", "email": "aluno@escola.pr.gov.br", "perfil": "ALUNO", "turma_id": 1},
        {"nome": "Outro Aluno Demo", "email": "outro.aluno@escola.pr.gov.br", "perfil": "ALUNO", "turma_id": 2},
        {"nome": "Gestão Demo", "email": "gestao@ceep.demo", "perfil": "GESTAO", "turma_id": None},
        {"nome": "Cantina Demo", "email": "cantina@ceep.demo", "perfil": "CANTINA", "turma_id": None},
        {"nome": "Diretoria", "email": "diretoria@escola.pr.gov.br", "perfil": "ALUNO", "turma_id": 1},
        {"nome": "Miguel Helmann", "email": "miguel.helmann@escola.pr.gov.br", "perfil": "ALUNO", "turma_id": 1},
    ]
    for u_data in essential_users:
        if not db.query(Usuario).filter(Usuario.email == u_data["email"]).first():
            db.add(Usuario(
                nome=u_data["nome"],
                email=u_data["email"],
                senha_hash=senha_padrao,
                perfil=u_data["perfil"],
                turma_id=u_data["turma_id"],
                ativo=True
            ))

    # Garante item base da cantina
    if not db.query(Produto).filter(Produto.nome == "Salgado").first():
        db.add(Produto(
            nome="Salgado",
            descricao="Escolha seu salgado e retire na cantina após a confirmação do pedido.",
            preco=8.00,
            ativo=True
        ))
    db.commit()


def seed_test_fixtures(db: Session) -> None:
    """Fixtures específicas para execução da suite de testes automatizados (test_api.py)."""
    # 1. Curso ELETRO para testes legados de cursos
    if not db.query(Curso).filter(Curso.sigla == "ELETRO").first():
        db.add(Curso(nome="Eletrotécnica", sigla="ELETRO", ativo=True))
        db.flush()

    # 2. Disciplina Desenvolvimento Web e Professor Prof. Carlos com horário de teste
    c_ds = db.query(Curso).filter(Curso.sigla == "DS").first()
    c_id = c_ds.id if c_ds else 1

    dw = db.query(Disciplina).filter(Disciplina.nome == "Desenvolvimento Web").first()
    if not dw:
        dw = Disciplina(nome="Desenvolvimento Web", sigla="DW", curso_id=c_id, ativo=True)
        db.add(dw)
        db.flush()

    pc = db.query(Professor).filter(Professor.nome == "Prof. Carlos").first()
    if not pc:
        pc = Professor(nome="Prof. Carlos", email="carlos.docente@ceep.demo", ativo=True)
        db.add(pc)
        db.flush()

    if not db.query(Horario).filter(Horario.disciplina_id == dw.id).first():
        h_dw = Horario(
            dia_semana="Domingo",
            horario_inicio="20:00",
            horario_fim="20:50",
            disciplina="Desenvolvimento Web",
            professor="Prof. Carlos",
            turma_id=1,
            disciplina_id=dw.id,
            professor_id=pc.id,
            duracao=1,
            ativo=True
        )
        db.add(h_dw)
        db.flush()

    # 3. Avisos de teste
    gestao_user = db.query(Usuario).filter(Usuario.perfil == "GESTAO").first()
    autor_id = gestao_user.id if gestao_user else 3

    if db.query(Aviso).count() < 4:
        avisos_fixtures = [
            Aviso(
                titulo="Inscrições Abertas para a ExpoCEEP 2026",
                descricao="Estão abertas as inscrições de projetos para a tradicional feira técnica anual do CEEP.",
                prioridade="ALTA",
                publico_alvo_tipo="GERAL",
                status="PUBLICADO",
                autor_id=autor_id
            ),
            Aviso(
                titulo="Reunião de Pais e Mestres — 3º Ano Técnico",
                descricao="Convocação dos representantes de turma e responsáveis do 3º ano.",
                prioridade="URGENTE",
                publico_alvo_tipo="CURSO",
                publico_alvo_id=c_id,
                status="PUBLICADO",
                autor_id=autor_id
            ),
            Aviso(
                titulo="Horário Especial da Biblioteca no Recesso",
                descricao="Informamos que durante o recesso escolar a biblioteca estará aberta.",
                prioridade="MEDIA",
                publico_alvo_tipo="GERAL",
                status="PUBLICADO",
                autor_id=autor_id
            ),
            Aviso(
                titulo="Palestra sobre Mercado de Tecnologia e Estágios",
                descricao="Nesta quarta-feira às 10h, profissionais de TI apresentarão oportunidades de estágio.",
                prioridade="BAIXA",
                publico_alvo_tipo="CURSO",
                publico_alvo_id=c_id,
                status="PUBLICADO",
                autor_id=autor_id
            ),
        ]
        db.add_all(avisos_fixtures)

    # 4. Tarefas de teste
    aluno_user = db.query(Usuario).filter(Usuario.email == "aluno@escola.pr.gov.br").first()
    outro_user = db.query(Usuario).filter(Usuario.email == "outro.aluno@escola.pr.gov.br").first()

    if aluno_user and db.query(Tarefa).filter(Tarefa.aluno_id == aluno_user.id).count() < 3:
        tarefas_fixtures = [
            Tarefa(
                titulo="Trabalho de Banco de Dados",
                descricao="Modelagem relacional e normalização para o sistema escolar.",
                data_entrega=date(2026, 9, 15),
                status="PENDENTE",
                prioridade="ALTA",
                aluno_id=aluno_user.id
            ),
            Tarefa(
                titulo="Relatório de Desenvolvimento Web",
                descricao="Documentar a arquitetura REST e endpoints.",
                data_entrega=date(2026, 9, 18),
                status="EM_ANDAMENTO",
                prioridade="MEDIA",
                aluno_id=aluno_user.id
            ),
            Tarefa(
                titulo="Lista de Exercícios — Matemática Aplicada",
                descricao="Resolver os exercícios do capítulo 4.",
                data_entrega=date(2026, 9, 22),
                status="PENDENTE",
                prioridade="BAIXA",
                aluno_id=aluno_user.id
            ),
        ]
        db.add_all(tarefas_fixtures)

    if outro_user and not db.query(Tarefa).filter(Tarefa.aluno_id == outro_user.id).first():
        db.add(Tarefa(
            titulo="Maquete Estrutural — Edificações",
            descricao="Montagem da maquete em escala 1:50.",
            data_entrega=date(2026, 9, 30),
            status="PENDENTE",
            prioridade="ALTA",
            aluno_id=outro_user.id
        ))

    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    db.close()
