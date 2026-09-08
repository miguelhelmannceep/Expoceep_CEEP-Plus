import { request } from "./api";
import type { AuthResponse, DemoAccount, User } from "../types";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async getDemoAccounts(): Promise<DemoAccount[]> {
    return request<DemoAccount[]>("/auth/demo-accounts");
  },
};
