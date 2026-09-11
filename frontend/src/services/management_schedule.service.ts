import { request } from "./api";
import type {
  ManagementScheduleItem,
  CreateSchedulePayload,
  UpdateSchedulePayload,
} from "../types";

export const managementScheduleService = {
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
};
