import { request } from "./api";
import type { ManagementOverview } from "../types";

export const managementService = {
  async getOverview(): Promise<ManagementOverview> {
    return request<ManagementOverview>("/management/overview");
  },
};
