export type Role = "ALUNO" | "GESTAO" | "CANTINA";

export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: Role;
  turma_id?: number | null;
  turma_nome?: string | null;
  curso_nome?: string | null;
  avatar_url?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: Role;
  nome: string;
  email: string;
  turma?: string | null;
  avatar_url?: string | null;
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

export interface CourseOption {
  id: number;
  nome: string;
  sigla: string;
}

export interface Notice {
  id: number;
  titulo: string;
  descricao: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  publico_alvo_tipo: "GERAL" | "CURSO" | "TURMA";
  publico_alvo_id?: number | null;
  publico_alvo_nome?: string | null;
  status: "RASCUNHO" | "PUBLICADO";
  imagem_url?: string | null;
  data_publicacao: string;
  autor_nome?: string | null;
}

export interface CreateNoticePayload {
  titulo: string;
  descricao: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  publico_alvo_tipo: "GERAL" | "CURSO" | "TURMA";
  publico_alvo_id?: number | null;
  status: "RASCUNHO" | "PUBLICADO";
  imagem_url?: string | null;
}

export interface UpdateNoticePayload {
  titulo?: string;
  descricao?: string;
  prioridade?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  publico_alvo_tipo?: "GERAL" | "CURSO" | "TURMA";
  publico_alvo_id?: number | null;
  status?: "RASCUNHO" | "PUBLICADO";
  imagem_url?: string | null;
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

export interface CreateTaskPayload {
  titulo: string;
  descricao?: string | null;
  data_entrega?: string | null;
  prioridade?: "BAIXA" | "MEDIA" | "ALTA";
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

export interface CanteenOverviewSummary {
  total_pedidos: number;
  pedidos_pagos: number;
  pedidos_utilizados: number;
  pedidos_pendentes: number;
  receita_confirmada: number;
}

export interface ManagementOverview {
  gestor: string;
  total_turmas: number;
  total_avisos: number;
  total_alunos: number;
  cantina_resumo: CanteenOverviewSummary;
  avisos_recentes: Notice[];
  status_sistema: string;
}


export interface CanteenTerminalStatus {
  status: string;
  terminal: string;
  atendente: string;
  mensagem: string;
}

export interface OrderItem {
  id: number;
  produto_id: number;
  produto_nome?: string | null;
  quantidade: number;
  preco_unitario: number;
}

export interface Payment {
  id: number;
  pedido_id: number;
  status: "PENDENTE" | "APROVADO";
  metodo: string;
  valor: number;
  created_at: string;
  paid_at?: string | null;
}

export interface Order {
  id: number;
  usuario_id: number;
  status: "PENDENTE_PAGAMENTO" | "PAGO" | "UTILIZADO";
  valor_total: number;
  pickup_token?: string | null;
  pickup_code?: string | null;
  created_at: string;
  updated_at?: string | null;
  used_at?: string | null;
  itens: OrderItem[];
  pagamento?: Payment | null;
  pix_code?: string | null;
}

export interface CreateOrderPayload {
  produto_id: number;
  quantidade?: number;
}

export interface PickupQRResponse {
  order_id: number;
  pickup_token: string;
  pickup_code: string;
  status: "PAGO" | "UTILIZADO";
  produto_nome: string;
  quantidade: number;
  valor_total: number;
}

export interface PickupValidationResponse {
  order_id: number;
  status: "PAGO" | "UTILIZADO";
  status_validacao: "DISPONIVEL" | "UTILIZADO" | "NAO_PAGO";
  aluno_nome: string;
  produto_nome: string;
  quantidade: number;
  valor_total: number;
  pago_em?: string | null;
}

export interface ConfirmPickupResponse {
  order_id: number;
  status: "UTILIZADO";
  mensagem: string;
  used_at: string;
}

export interface CourseItem {
  id: number;
  nome: string;
  sigla: string;
  ativo: boolean;
  total_turmas?: number;
}

export interface CreateCoursePayload {
  nome: string;
  sigla: string;
  ativo?: boolean;
}

export interface UpdateCoursePayload {
  nome?: string;
  sigla?: string;
  ativo?: boolean;
}

export interface ClassItem {
  id: number;
  nome_turma: string;
  curso: string;
  curso_id?: number | null;
  ano?: string | null;
  periodo?: string | null;
  ativo: boolean;
  curso_sigla?: string | null;
}

export interface CreateClassPayload {
  nome_turma: string;
  curso_id: number;
  ano?: string;
  periodo?: string;
  ativo?: boolean;
}

export interface UpdateClassPayload {
  nome_turma?: string;
  curso_id?: number;
  ano?: string;
  periodo?: string;
  ativo?: boolean;
}

export interface DisciplineItem {
  id: number;
  nome: string;
  sigla?: string | null;
  curso_id: number;
  curso_nome?: string | null;
  curso_sigla?: string | null;
  ativo: boolean;
}

export interface CreateDisciplinePayload {
  nome: string;
  sigla?: string | null;
  curso_id: number;
  ativo?: boolean;
}

export interface UpdateDisciplinePayload {
  nome?: string;
  sigla?: string | null;
  curso_id?: number;
  ativo?: boolean;
}

export interface ProfessorItem {
  id: number;
  nome: string;
  email?: string | null;
  ativo: boolean;
}

export interface CreateProfessorPayload {
  nome: string;
  email?: string | null;
  ativo?: boolean;
}

export interface UpdateProfessorPayload {
  nome?: string;
  email?: string | null;
  ativo?: boolean;
}

export interface ManagementScheduleItem {
  id: number;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  professor: string;
  turma_id: number;
  disciplina_id?: number | null;
  professor_id?: number | null;
  turma_nome?: string | null;
  curso_nome?: string | null;
  ativo: boolean;
}

export interface CreateSchedulePayload {
  turma_id: number;
  disciplina_id?: number | null;
  disciplina?: string | null;
  professor_id?: number | null;
  professor?: string | null;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  ativo?: boolean;
}

export interface UpdateSchedulePayload {
  turma_id?: number;
  disciplina_id?: number | null;
  disciplina?: string | null;
  professor_id?: number | null;
  professor?: string | null;
  dia_semana?: string;
  horario_inicio?: string;
  horario_fim?: string;
  ativo?: boolean;
}

export interface ManagementOrderItem {
  id: number;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface ManagementOrderDetail {
  id: number;
  aluno_id: number;
  aluno_nome: string;
  aluno_email: string;
  status: "PENDENTE_PAGAMENTO" | "PAGO" | "UTILIZADO" | string;
  valor_total: number;
  pickup_token?: string | null;
  created_at: string;
  updated_at?: string | null;
  paid_at?: string | null;
  used_at?: string | null;
  itens: ManagementOrderItem[];
  pagamento_status?: string | null;
  pagamento_metodo?: string | null;
}

// Consolidação: ManagementProductItem compartilha a mesma estrutura de Product
export type ManagementProductItem = Product;

export interface CreateProductPayload {
  nome: string;
  descricao?: string | null;
  preco: number;
  ativo?: boolean;
}

export interface UpdateProductPayload {
  nome?: string;
  descricao?: string | null;
  preco?: number;
  ativo?: boolean;
}





