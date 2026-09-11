import { request } from "./api";
import type { Task, CreateTaskPayload } from "../types";

export const taskService = {
  async getMyTasks(): Promise<Task[]> {
    return request<Task[]>("/tasks/");
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    return request<Task>("/tasks/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async toggleTask(taskId: number): Promise<Task> {
    return request<Task>(`/tasks/${taskId}/toggle`, {
      method: "PATCH",
    });
  },
};

