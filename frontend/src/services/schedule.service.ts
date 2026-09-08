import { request } from "./api";
import type { ClassOption, ScheduleItem } from "../types";

export const scheduleService = {
  async getClasses(): Promise<ClassOption[]> {
    return request<ClassOption[]>("/schedules/classes");
  },

  async getSchedulesByClass(turmaId: number): Promise<ScheduleItem[]> {
    return request<ScheduleItem[]>(`/schedules/${turmaId}`);
  },
};
