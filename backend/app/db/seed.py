from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import get_password_hash
from app.models.turma import Curso, Turma
from app.models.usuario import Usuario
from app.models.horario import Horario
from app.models.aviso import Aviso
from app.models.tarefa import Tarefa
from app.models.produto import Produto

def init_db(db: Session) -> None:
    Base.metadata.create_all(bind=engine)

    # Se já existirem dados, não duplica
    if db.query(Usuario).first():
        return

    print("Populando banco de dados com dados de demonstração do CEEP+...")

    # 1. Cursos
    ds = Curso(nome="Desenvolvimento de Sistemas", sigla="DS")
    edif = Curso(nome="Edificações", sigla="EDIF")
    eletro = Curso(nome="Eletrotécnica", sigla="ELETRO")
    db.add_all([ds, edif, eletro])
    db.flush()

    # 2. Turmas
    turma_3c = Turma(nome_turma="3º C — Desenvolvimento de Sistemas", curso="Desenvolvimento de Sistemas", periodo="Manhã", curso_id=ds.id)
    turma_2a = Turma(nome_turma="2º A — Desenvolvimento de Sistemas", curso="Desenvolvimento de Sistemas", periodo="Tarde", curso_id=ds.id)
    turma_1b = Turma(nome_turma="1º B — Edificações", curso="Edificações", periodo="Manhã", curso_id=edif.id)
    db.add_all([turma_3c, turma_2a, turma_1b])
    db.flush()

    # 3. Usuários Demo
    senha_hash_padrao = get_password_hash("demo123")

    aluno_demo = Usuario(
        nome="Aluno Demo",
        email="aluno@ceep.demo",
        senha_hash=senha_hash_padrao,
        perfil="ALUNO",
        turma_id=turma_3c.id,
        ativo=True
    )

    # Segundo aluno para testes de isolamento de tarefas
    aluno_outro = Usuario(
        nome="Outro Aluno Demo",
        email="outro.aluno@ceep.demo",
        senha_hash=senha_hash_padrao,
        perfil="ALUNO",
        turma_id=turma_2a.id,
        ativo=True
    )

    gestao_demo = Usuario(
        nome="Gestão Demo",
        email="gestao@ceep.demo",
        senha_hash=senha_hash_padrao,
        perfil="GESTAO",
        turma_id=None,
        ativo=True
    )

    cantina_demo = Usuario(
        nome="Cantina Demo",
        email="cantina@ceep.demo",
        senha_hash=senha_hash_padrao,
        perfil="CANTINA",
        turma_id=None,
        ativo=True
    )

    db.add_all([aluno_demo, aluno_outro, gestao_demo, cantina_demo])
    db.flush()

    # 4. Horários para 3º C (Manhã)
    horarios = [
        # 3º C - Segunda-feira
        Horario(dia_semana="Segunda-feira", horario_inicio="07:30", horario_fim="08:20", disciplina="Desenvolvimento Web", professor="Prof. Carlos", sala="Laboratório 02", turma_id=turma_3c.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="08:20", horario_fim="09:10", disciplina="Banco de Dados", professor="Prof. Ricardo", sala="Laboratório 03", turma_id=turma_3c.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="09:25", horario_fim="10:15", disciplina="Matemática Aplicada", professor="Profª. Ana", sala="Sala 14", turma_id=turma_3c.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="10:15", horario_fim="11:05", disciplina="Programação de Aplicativos", professor="Prof. Carlos", sala="Laboratório 02", turma_id=turma_3c.id),
        # 3º C - Terça-feira
        Horario(dia_semana="Terça-feira", horario_inicio="07:30", horario_fim="08:20", disciplina="Redes de Computadores", professor="Prof. Marcos", sala="Laboratório 01", turma_id=turma_3c.id),
        Horario(dia_semana="Terça-feira", horario_inicio="08:20", horario_fim="09:10", disciplina="Redes de Computadores", professor="Prof. Marcos", sala="Laboratório 01", turma_id=turma_3c.id),
        Horario(dia_semana="Terça-feira", horario_inicio="09:25", horario_fim="10:15", disciplina="Língua Portuguesa", professor="Profª. Juliana", sala="Sala 14", turma_id=turma_3c.id),
        Horario(dia_semana="Terça-feira", horario_inicio="10:15", horario_fim="11:05", disciplina="Segurança da Informação", professor="Prof. Ricardo", sala="Laboratório 03", turma_id=turma_3c.id),
        # 3º C - Quarta-feira
        Horario(dia_semana="Quarta-feira", horario_inicio="07:30", horario_fim="08:20", disciplina="Estrutura de Dados", professor="Prof. Carlos", sala="Laboratório 02", turma_id=turma_3c.id),
        Horario(dia_semana="Quarta-feira", horario_inicio="08:20", horario_fim="09:10", disciplina="Estrutura de Dados", professor="Prof. Carlos", sala="Laboratório 02", turma_id=turma_3c.id),
        Horario(dia_semana="Quarta-feira", horario_inicio="09:25", horario_fim="10:15", disciplina="Filosofia", professor="Prof. Paulo", sala="Sala 14", turma_id=turma_3c.id),
        Horario(dia_semana="Quarta-feira", horario_inicio="10:15", horario_fim="11:05", disciplina="Gestão de Projetos", professor="Profª. Mariana", sala="Sala 14", turma_id=turma_3c.id),
        # 3º C - Quinta-feira
        Horario(dia_semana="Quinta-feira", horario_inicio="07:30", horario_fim="08:20", disciplina="Engenharia de Software", professor="Prof. Ricardo", sala="Laboratório 03", turma_id=turma_3c.id),
        Horario(dia_semana="Quinta-feira", horario_inicio="08:20", horario_fim="09:10", disciplina="Engenharia de Software", professor="Prof. Ricardo", sala="Laboratório 03", turma_id=turma_3c.id),
        Horario(dia_semana="Quinta-feira", horario_inicio="09:25", horario_fim="10:15", disciplina="Inglês Técnico", professor="Profª. Fernanda", sala="Sala 14", turma_id=turma_3c.id),
        Horario(dia_semana="Quinta-feira", horario_inicio="10:15", horario_fim="11:05", disciplina="Física Aplicada", professor="Prof. Roberto", sala="Laboratório de Física", turma_id=turma_3c.id),
        # 3º C - Sexta-feira
        Horario(dia_semana="Sexta-feira", horario_inicio="07:30", horario_fim="08:20", disciplina="Prática Profissional", professor="Prof. Carlos", sala="Laboratório 02", turma_id=turma_3c.id),
        Horario(dia_semana="Sexta-feira", horario_inicio="08:20", horario_fim="09:10", disciplina="Prática Profissional", professor="Prof. Carlos", sala="Laboratório 02", turma_id=turma_3c.id),
        Horario(dia_semana="Sexta-feira", horario_inicio="09:25", horario_fim="10:15", disciplina="Empreendedorismo", professor="Profª. Mariana", sala="Sala 14", turma_id=turma_3c.id),
        Horario(dia_semana="Sexta-feira", horario_inicio="10:15", horario_fim="11:05", disciplina="Ética e Cidadania", professor="Prof. Paulo", sala="Sala 14", turma_id=turma_3c.id),

        # 2º A - Segunda-feira (Tarde)
        Horario(dia_semana="Segunda-feira", horario_inicio="13:15", horario_fim="14:05", disciplina="Lógica de Programação", professor="Prof. Carlos", sala="Laboratório 01", turma_id=turma_2a.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="14:05", horario_fim="14:55", disciplina="Modelagem de Dados", professor="Prof. Ricardo", sala="Laboratório 03", turma_id=turma_2a.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="15:10", horario_fim="16:00", disciplina="História", professor="Profª. Luciana", sala="Sala 10", turma_id=turma_2a.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="16:00", horario_fim="16:50", disciplina="Química", professor="Prof. Eduardo", sala="Lab Química", turma_id=turma_2a.id),

        # 1º B - Segunda-feira (Manhã)
        Horario(dia_semana="Segunda-feira", horario_inicio="07:30", horario_fim="08:20", disciplina="Desenho Arquitetônico", professor="Prof. Marcos", sala="Ateliê 01", turma_id=turma_1b.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="08:20", horario_fim="09:10", disciplina="Materiais de Construção", professor="Profª. Patrícia", sala="Sala 05", turma_id=turma_1b.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="09:25", horario_fim="10:15", disciplina="Topografia", professor="Prof. Henrique", sala="Lab Topo", turma_id=turma_1b.id),
        Horario(dia_semana="Segunda-feira", horario_inicio="10:15", horario_fim="11:05", disciplina="Geometria Descritiva", professor="Profª. Patrícia", sala="Ateliê 01", turma_id=turma_1b.id),
    ]
    db.add_all(horarios)

    # 5. Avisos
    avisos_demo = [
        Aviso(
            titulo="Inscrições Abertas para a ExpoCEEP 2026",
            descricao="Estão abertas as inscrições de projetos para a tradicional feira técnica anual do CEEP. Procure a coordenação do seu curso para registrar sua equipe até o dia 25/09.",
            prioridade="ALTA",
            publico_alvo_tipo="GERAL",
            autor_id=gestao_demo.id
        ),
        Aviso(
            titulo="Reunião de Pais e Mestres — 3º Ano Técnico",
            descricao="Convocação dos representantes de turma e responsáveis do 3º ano para alinhamento das bancas avaliativas finais nesta sexta-feira às 19h no auditório.",
            prioridade="URGENTE",
            publico_alvo_tipo="CURSO",
            publico_alvo_id=ds.id,
            autor_id=gestao_demo.id
        ),
        Aviso(
            titulo="Horário Especial da Biblioteca no Recesso",
            descricao="Informamos que durante o recesso escolar a biblioteca estará aberta das 08h às 14h para empréstimos, devoluções e pesquisas acadêmicas.",
            prioridade="MEDIA",
            publico_alvo_tipo="GERAL",
            autor_id=gestao_demo.id
        ),
        Aviso(
            titulo="Palestra sobre Mercado de Tecnologia e Estágios",
            descricao="Nesta quarta-feira às 10h, profissionais da área de TI apresentarão oportunidades de estágio e carreira para os estudantes do CEEP.",
            prioridade="BAIXA",
            publico_alvo_tipo="CURSO",
            publico_alvo_id=ds.id,
            autor_id=gestao_demo.id
        ),
    ]
    db.add_all(avisos_demo)

    # 6. Tarefas para Aluno Demo
    tarefas_demo = [
        Tarefa(
            titulo="Trabalho de Banco de Dados",
            descricao="Modelagem relacional e normalização da 1ª à 3ª forma normal para o sistema escolar.",
            data_entrega=date(2026, 9, 15),
            status="PENDENTE",
            prioridade="ALTA",
            aluno_id=aluno_demo.id
        ),
        Tarefa(
            titulo="Relatório de Desenvolvimento Web",
            descricao="Documentar a arquitetura REST, endpoints e padrões de integração entre frontend e backend.",
            data_entrega=date(2026, 9, 18),
            status="EM_ANDAMENTO",
            prioridade="MEDIA",
            aluno_id=aluno_demo.id
        ),
        Tarefa(
            titulo="Lista de Exercícios — Matemática Aplicada",
            descricao="Resolver os exercícios do capítulo 4 sobre matrizes e determinantes.",
            data_entrega=date(2026, 9, 22),
            status="PENDENTE",
            prioridade="BAIXA",
            aluno_id=aluno_demo.id
        ),
        Tarefa(
            titulo="Artigo sobre Ética e Inteligência Artificial",
            descricao="Resumo crítico de 2 páginas sobre os impactos éticos da IA na sociedade atual.",
            data_entrega=date(2026, 9, 28),
            status="CONCLUIDA",
            prioridade="MEDIA",
            aluno_id=aluno_demo.id
        ),
        # Tarefa pertencente ao outro aluno (para validar isolamento)
        Tarefa(
            titulo="Maquete Estrutural — Edificações",
            descricao="Montagem da maquete em escala 1:50.",
            data_entrega=date(2026, 9, 30),
            status="PENDENTE",
            prioridade="ALTA",
            aluno_id=aluno_outro.id
        ),
    ]
    db.add_all(tarefas_demo)

    # 7. Produto
    salgado = Produto(
        nome="Salgado",
        descricao="Escolha seu salgado e retire na cantina após a confirmação do pedido.",
        preco=8.00,
        ativo=True
    )
    db.add(salgado)

    db.commit()
    print("Banco de dados populado com sucesso!")

if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    db.close()
