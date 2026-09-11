import { request } from "./api";
import type {
  ManagementOrderDetail,
  ManagementProductItem,
  CreateProductPayload,
  UpdateProductPayload,
} from "../types";

export const managementCanteenService = {
  // --- PEDIDOS DA CANTINA ---
  async getOrders(status?: string): Promise<ManagementOrderDetail[]> {
    const query = status && status !== "TODOS" ? `?status=${encodeURIComponent(status)}` : "";
    return request<ManagementOrderDetail[]>(`/management/canteen/orders${query}`);
  },

  async getOrderDetail(orderId: number): Promise<ManagementOrderDetail> {
    return request<ManagementOrderDetail>(`/management/canteen/orders/${orderId}`);
  },

  // --- PRODUTOS DA CANTINA ---
  async getProducts(): Promise<ManagementProductItem[]> {
    return request<ManagementProductItem[]>("/management/canteen/products");
  },

  async createProduct(payload: CreateProductPayload): Promise<ManagementProductItem> {
    return request<ManagementProductItem>("/management/canteen/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateProduct(
    productId: number,
    payload: UpdateProductPayload
  ): Promise<ManagementProductItem> {
    return request<ManagementProductItem>(`/management/canteen/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async toggleProductActive(productId: number): Promise<ManagementProductItem> {
    return request<ManagementProductItem>(`/management/canteen/products/${productId}/toggle-active`, {
      method: "PATCH",
    });
  },
};
