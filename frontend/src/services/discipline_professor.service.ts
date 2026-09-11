import { request } from "./api";
import type {
  DisciplineItem,
  CreateDisciplinePayload,
  UpdateDisciplinePayload,
  ProfessorItem,
  CreateProfessorPayload,
  UpdateProfessorPayload,
} from "../types";

export const disciplineProfessorService = {
  // --- DISCIPLINAS ---
  async getDisciplines(cursoId?: number): Promise<DisciplineItem[]> {
    const query = cursoId ? `?curso_id=${cursoId}` : "";
    return request<DisciplineItem[]>(`/management/disciplines${query}`);
  },

  async createDiscipline(payload: CreateDisciplinePayload): Promise<DisciplineItem> {
    return request<DisciplineItem>("/management/disciplines", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateDiscipline(
    disciplineId: number,
    payload: UpdateDisciplinePayload
  ): Promise<DisciplineItem> {
    return request<DisciplineItem>(`/management/disciplines/${disciplineId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async toggleDisciplineActive(disciplineId: number): Promise<DisciplineItem> {
    return request<DisciplineItem>(`/management/disciplines/${disciplineId}/toggle-active`, {
      method: "PATCH",
    });
  },

  async deleteDiscipline(disciplineId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/disciplines/${disciplineId}`, {
      method: "DELETE",
    });
  },

  // --- PROFESSORES ---
  async getProfessors(): Promise<ProfessorItem[]> {
    return request<ProfessorItem[]>("/management/professors");
  },

  async createProfessor(payload: CreateProfessorPayload): Promise<ProfessorItem> {
    return request<ProfessorItem>("/management/professors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateProfessor(
    professorId: number,
    payload: UpdateProfessorPayload
  ): Promise<ProfessorItem> {
    return request<ProfessorItem>(`/management/professors/${professorId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async toggleProfessorActive(professorId: number): Promise<ProfessorItem> {
    return request<ProfessorItem>(`/management/professors/${professorId}/toggle-active`, {
      method: "PATCH",
    });
  },

  async deleteProfessor(professorId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/professors/${professorId}`, {
      method: "DELETE",
    });
  },
};
