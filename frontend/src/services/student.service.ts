import { request } from "./api";
import type { StudentDashboard, User } from "../types";

export const studentService = {
  async getDashboard(): Promise<StudentDashboard> {
    return request<StudentDashboard>("/student/dashboard");
  },

  async updateProfile(payload: { nome: string }): Promise<User> {
    return request<User>("/student/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

