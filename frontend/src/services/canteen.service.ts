import { request } from "./api";
import type { Product, CanteenTerminalStatus } from "../types";

export const canteenService = {
  async getProducts(): Promise<Product[]> {
    return request<Product[]>("/canteen/products");
  },

  async getTerminalStatus(): Promise<CanteenTerminalStatus> {
    return request<CanteenTerminalStatus>("/canteen/terminal-status");
  },
};
