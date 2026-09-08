# CEEP+ — Portal & Aplicação Escolar

Aplicação web progressiva (PWA) responsiva e mobile-first projetada para a comunidade escolar do **Centro Estadual de Educação Profissional Pedro Boaretto Neto (CEEP Cascavel)**.

---

## 🚀 Arquitetura e Tecnologias

- **Frontend**: React 18 / 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons (PWA Mobile-First)
- **Backend**: Python 3.13 + FastAPI + SQLAlchemy 2.0 + Pydantic v2 + JWT / Bcrypt
- **Banco de Dados**: SQLite (desenvolvimento / demo portátil) e compatível com PostgreSQL

---

## 🔑 Contas de Demonstração (ExpoCEEP)

Para testar os 3 perfis da aplicação, utilize as credenciais pré-configuradas (ou clique nos botões de atalho na tela de login):

| Perfil | E-mail Demo | Senha | Descrição |
| :--- | :--- | :--- | :--- |
| **Aluno** | `aluno@ceep.demo` | `demo123` | Dashboard, Horários da Turma (3º C DS), Avisos, Tarefas, Cantina e Perfil. |
| **Gestão** | `gestao@ceep.demo` | `demo123` | Painel administrativo com KPIs, Avisos, Turmas e Relatórios de Demanda. |
| **Cantina** | `cantina@ceep.demo` | `demo123` | Terminal simplificado de atendimento e validação rápida no balcão. |

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Python 3.10+
- Node.js 18+ e NPM

### 1. Iniciar o Backend

```bash
# Navegar até a pasta backend
cd backend

# Instalar dependências Python
pip install -r requirements.txt

# Iniciar o servidor FastAPI (com auto-seed do banco na primeira execução)
python main.py
```
> O backend estará acessível em `http://localhost:8000`.
> Documentação OpenAPI Swagger disponível em: `http://localhost:8000/docs`.

### 2. Iniciar o Frontend

```bash
# Em outro terminal, navegar até a pasta frontend
cd frontend

# Instalar dependências Node
npm install

# Iniciar o servidor de desenvolvimento Vite
npm run dev
```
> O frontend estará acessível em `http://localhost:5173`.

---

## 🧪 Testes Automatizados

### Backend
```bash
cd backend
pytest
```

### Frontend (Build & Typecheck)
```bash
cd frontend
npm run build
```

---

## 🌐 Principais Endpoints da API

- `GET /api/v1/status/health` — Verificação de saúde da API
- `POST /api/v1/auth/login` — Autenticação com e-mail e senha
- `GET /api/v1/auth/me` — Dados do usuário logado (requer Bearer token)
- `GET /api/v1/auth/demo-accounts` — Lista de contas demonstrativas
- `GET /api/v1/student/dashboard` — Dashboard consolidado do aluno (*perfil ALUNO*)
- `GET /api/v1/schedules/classes` — Lista de turmas para consulta de horários
- `GET /api/v1/schedules/{turma_id}` — Grade semanal de horários da turma
- `GET /api/v1/notices/` — Feed de comunicados escolares
- `GET /api/v1/tasks/` — Tarefas pessoais do aluno (*perfil ALUNO*)
- `GET /api/v1/canteen/products` — Lista de produtos da cantina (Salgado)
- `GET /api/v1/canteen/terminal-status` — Status do terminal (*perfil CANTINA*)
- `GET /api/v1/management/overview` — Visão geral e métricas (*perfil GESTAO*)

---

## 📁 Estrutura do Projeto

```text
Expoceep_CEEP-Plus/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints REST e injeção de dependências RBAC
│   │   ├── core/         # Configurações, segurança, JWT e hashing
│   │   ├── db/           # SQLAlchemy Session, Base e scripts de Seed
│   │   ├── models/       # Modelos ORM (Usuario, Turma, Horario, Aviso, Tarefa, Produto)
│   │   ├── schemas/      # Schemas Pydantic de validação e DTOs
│   │   └── services/     # Regras de negócio desacopladas
│   ├── tests/            # Testes automatizados com pytest e httpx
│   ├── main.py           # Ponto de entrada FastAPI com lifespan e CORS
│   └── requirements.txt  # Dependências Python
├── frontend/
│   ├── public/           # Manifest PWA e ícones
│   ├── src/
│   │   ├── components/   # Componentes UI reutilizáveis e layouts por perfil
│   │   ├── contexts/     # AuthContext (sessão, token, RBAC)
│   │   ├── pages/        # Telas (Aluno, Gestão, Cantina, Login)
│   │   ├── services/     # Clientes tipados para a API REST
│   │   └── types/        # Definições TypeScript compartilhadas
│   ├── package.json
│   └── vite.config.ts
├── bd/                   # Scripts SQL de referência inicial
└── README.md
```
