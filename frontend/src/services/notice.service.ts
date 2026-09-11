import { request } from "./api";
import type { Notice, CreateNoticePayload, UpdateNoticePayload } from "../types";

export const noticeService = {
  async getNotices(): Promise<Notice[]> {
    return request<Notice[]>("/notices/");
  },

  async getAllNoticesManagement(): Promise<Notice[]> {
    return request<Notice[]>("/notices/management/all");
  },

  async createNotice(payload: CreateNoticePayload): Promise<Notice> {
    return request<Notice>("/notices/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateNotice(noticeId: number, payload: UpdateNoticePayload): Promise<Notice> {
    return request<Notice>(`/notices/${noticeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async publishNotice(noticeId: number): Promise<Notice> {
    return request<Notice>(`/notices/${noticeId}/publish`, {
      method: "PATCH",
    });
  },

  async deleteNotice(noticeId: number): Promise<{ mensagem: string; id: number }> {
    return request<{ mensagem: string; id: number }>(`/notices/${noticeId}`, {
      method: "DELETE",
    });
  },
};

