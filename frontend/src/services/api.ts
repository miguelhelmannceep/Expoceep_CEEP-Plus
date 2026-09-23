const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("ceep_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }

      const message = errorData.detail || `Erro na requisição (${response.status})`;
      
      // Auto-logout se 401 não autorizado em rotas protegidas
      if (response.status === 401 && !endpoint.startsWith("/auth/")) {
        localStorage.removeItem("ceep_token");
        localStorage.removeItem("ceep_user");
        window.location.reload();
      }

      throw new ApiError(message, response.status, errorData);
    }

    // Se retorno vazio (ex: 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.", 0);
  }
}
