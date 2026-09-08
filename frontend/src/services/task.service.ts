import { request } from "./api";
import type { Task } from "../types";

export const taskService = {
  async getMyTasks(): Promise<Task[]> {
    return request<Task[]>("/tasks/");
  },

  async toggleTask(taskId: number): Promise<Task> {
    return request<Task>(`/tasks/${taskId}/toggle`, {
      method: "PATCH",
    });
  },
};
