import { request } from "./api";
import type {
  Product,
  CanteenTerminalStatus,
  Order,
  CreateOrderPayload,
  PickupQRResponse,
  PickupValidationResponse,
  ConfirmPickupResponse
} from "../types";

export const canteenService = {
  async getProducts(): Promise<Product[]> {
    return request<Product[]>("/canteen/products");
  },

  async getTerminalStatus(): Promise<CanteenTerminalStatus> {
    return request<CanteenTerminalStatus>("/canteen/terminal-status");
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return request<Order>("/canteen/orders", {
      method: "POST",
      body: JSON.stringify({
        produto_id: payload.produto_id,
        quantidade: payload.quantidade ?? 1,
      }),
    });
  },

  async getOrders(): Promise<Order[]> {
    return request<Order[]>("/canteen/orders");
  },

  async getOrder(orderId: number): Promise<Order> {
    return request<Order>(`/canteen/orders/${orderId}`);
  },

  async simulatePayment(orderId: number): Promise<Order> {
    return request<Order>(`/canteen/orders/${orderId}/simulate-payment`, {
      method: "POST",
    });
  },

  async getPickupQR(orderId: number): Promise<PickupQRResponse> {
    return request<PickupQRResponse>(`/canteen/orders/${orderId}/pickup-qr`);
  },

  async validatePickup(pickupCode: string): Promise<PickupValidationResponse> {
    return request<PickupValidationResponse>("/canteen/pickup/validate", {
      method: "POST",
      body: JSON.stringify({ pickup_code: pickupCode }),
    });
  },

  async confirmPickup(orderId: number): Promise<ConfirmPickupResponse> {
    return request<ConfirmPickupResponse>(`/canteen/pickup/${orderId}/confirm`, {
      method: "POST",
    });
  },
};


