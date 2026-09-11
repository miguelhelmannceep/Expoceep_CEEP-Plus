import { request } from "./api";
import type {
  CourseItem,
  CreateCoursePayload,
  UpdateCoursePayload,
  ClassItem,
  CreateClassPayload,
  UpdateClassPayload,
} from "../types";

export const courseClassService = {
  // --- CURSOS ---
  async getCourses(): Promise<CourseItem[]> {
    return request<CourseItem[]>("/management/courses");
  },

  async createCourse(payload: CreateCoursePayload): Promise<CourseItem> {
    return request<CourseItem>("/management/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCourse(courseId: number, payload: UpdateCoursePayload): Promise<CourseItem> {
    return request<CourseItem>(`/management/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteCourse(courseId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/courses/${courseId}`, {
      method: "DELETE",
    });
  },

  // --- TURMAS ---
  async getClasses(): Promise<ClassItem[]> {
    return request<ClassItem[]>("/management/classes");
  },

  async createClass(payload: CreateClassPayload): Promise<ClassItem> {
    return request<ClassItem>("/management/classes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateClass(classId: number, payload: UpdateClassPayload): Promise<ClassItem> {
    return request<ClassItem>(`/management/classes/${classId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteClass(classId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/management/classes/${classId}`, {
      method: "DELETE",
    });
  },
};
