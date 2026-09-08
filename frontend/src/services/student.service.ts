import { request } from "./api";
import type { StudentDashboard } from "../types";

export const studentService = {
  async getDashboard(): Promise<StudentDashboard> {
    return request<StudentDashboard>("/student/dashboard");
  },
};
