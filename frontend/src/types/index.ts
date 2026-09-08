export type Role = "ALUNO" | "GESTAO" | "CANTINA";

export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: Role;
  turma_id?: number | null;
  turma_nome?: string | null;
  curso_nome?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: Role;
  nome: string;
  email: string;
  turma?: string | null;
}

export interface DemoAccount {
  label: string;
  email: string;
  role: Role;
  descricao: string;
  turma?: string | null;
}

export interface NextClass {
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  professor: string;
  sala: string;
}

export interface Notice {
  id: number;
  titulo: string;
  descricao: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  publico_alvo_tipo: "GERAL" | "CURSO" | "TURMA";
  publico_alvo_id?: number | null;
  data_publicacao: string;
  autor_nome?: string | null;
}

export interface Task {
  id: number;
  titulo: string;
  descricao?: string | null;
  data_entrega?: string | null;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA";
  prioridade: "BAIXA" | "MEDIA" | "ALTA";
  criado_em: string;
}

export interface Product {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  ativo: boolean;
}

export interface StudentDashboard {
  saudacao: string;
  aluno_nome: string;
  turma_nome: string;
  curso_nome: string;
  proxima_aula?: NextClass | null;
  aviso_recente?: Notice | null;
  tarefas_pendentes_count: number;
  tarefas_preview: Task[];
  cantina_destaque?: Product | null;
}

export interface ClassOption {
  id: number;
  nome_turma: string;
  curso: string;
  periodo: string;
  curso_id?: number | null;
}

export interface ScheduleItem {
  id: number;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  professor: string;
  sala?: string | null;
  turma_id: number;
}

export interface ManagementOverview {
  gestor: string;
  total_turmas: number;
  total_avisos: number;
  total_alunos: number;
  demanda_estimada_cantina: number;
  status_sistema: string;
}

export interface CanteenTerminalStatus {
  status: string;
  terminal: string;
  atendente: string;
  mensagem: string;
}
