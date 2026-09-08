import { request } from "./api";
import type { Notice } from "../types";

export const noticeService = {
  async getNotices(): Promise<Notice[]> {
    return request<Notice[]>("/notices/");
  },
};
