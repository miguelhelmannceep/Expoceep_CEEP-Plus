import { request } from "./api";
import type {
  ManagementScheduleItem,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  PeriodItem,
  CreatePeriodPayload,
  AvailabilityItem,
  CreateAvailabilityPayload,
  DisciplineRuleItem,
  CreateDisciplineRulePayload,
  DisciplineBalanceItem,
} from "../types";

export const managementScheduleService = {
  // --- Aulas / Grade Horária ---
  async getSchedules(
    turmaId?: number,
    diaSemana?: string
  ): Promise<ManagementScheduleItem[]> {
    const params = new URLSearchParams();
    if (turmaId) params.append("turma_id", String(turmaId));
    if (diaSemana) params.append("dia_semana", diaSemana);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<ManagementScheduleItem[]>(`/management/schedules${queryString}`);
  },

  async createSchedule(payload: CreateSchedulePayload): Promise<ManagementScheduleItem> {
    return request<ManagementScheduleItem>("/management/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSchedule(
    scheduleId: number,
    payload: UpdateSchedulePayload
  ): Promise<ManagementScheduleItem> {
    return request<ManagementScheduleItem>(`/management/schedules/${scheduleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteSchedule(scheduleId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/schedules/${scheduleId}`, {
      method: "DELETE",
    });
  },

  // --- Períodos & Intervalos ---
  async getPeriods(turno?: string): Promise<PeriodItem[]> {
    const params = new URLSearchParams();
    if (turno) params.append("turno", turno);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<PeriodItem[]>(`/management/schedules/periods${queryString}`);
  },

  async createPeriod(payload: CreatePeriodPayload): Promise<PeriodItem> {
    return request<PeriodItem>("/management/schedules/periods", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deletePeriod(periodId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/schedules/periods/${periodId}`, {
      method: "DELETE",
    });
  },

  // --- Disponibilidades & Bloqueios ---
  async getAvailabilities(
    tipoRecurso?: string,
    identificador?: string,
    diaSemana?: string
  ): Promise<AvailabilityItem[]> {
    const params = new URLSearchParams();
    if (tipoRecurso) params.append("tipo_recurso", tipoRecurso);
    if (identificador) params.append("recurso_identificador", identificador);
    if (diaSemana) params.append("dia_semana", diaSemana);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<AvailabilityItem[]>(`/management/schedules/availabilities${queryString}`);
  },

  async createAvailability(payload: CreateAvailabilityPayload): Promise<AvailabilityItem> {
    return request<AvailabilityItem>("/management/schedules/availabilities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteAvailability(availabilityId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/schedules/availabilities/${availabilityId}`, {
      method: "DELETE",
    });
  },

  // --- Carga Semanal & Regras de Disciplina ---
  async getDisciplineBalance(turmaId: number): Promise<DisciplineBalanceItem[]> {
    return request<DisciplineBalanceItem[]>(`/management/schedules/discipline-rules/${turmaId}`);
  },

  async upsertDisciplineRule(payload: CreateDisciplineRulePayload): Promise<DisciplineRuleItem> {
    return request<DisciplineRuleItem>("/management/schedules/discipline-rules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- Salas / Espaços Físicos ---
  async getRooms(): Promise<string[]> {
    return request<string[]>("/management/schedules/rooms");
  },
};

