import { request } from "./api";
import type { AuthResponse, DemoAccount, User } from "../types";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async getDemoAccounts(): Promise<DemoAccount[]> {
    return request<DemoAccount[]>("/auth/demo-accounts");
  },
};
