import { apiConfig } from "@/config/api.config";
import { ApiResponse } from "@/types/common";


type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

interface ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
}


/**
 * Construye URL con query params
 */
function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
  const url = new URL(`${apiConfig.baseUrl}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Obtiene el token de autenticación
 */
function getAuthToken(): string | null {
  if (typeof globalThis.window === "undefined") return null;
  
  try {
    const user = localStorage.getItem("tms_user");
    if (user) {
      const parsed = JSON.parse(user);
      return parsed.token || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Headers por defecto
 */
function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Crea un error tipado de API
 */
function createApiError(status: number, message: string, details?: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.details = details;
  return error;
}


/**
 * Cliente HTTP para comunicación con la API
 * 
 */
export const apiClient = {
  /**
   * Realiza una petición HTTP
   */
  async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = buildUrl(endpoint, options.params);
    
    const config: RequestInit = {
      method,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers,
      },
      signal: options.signal,
    };
    
    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, config);
      
      // Handle no content
      if (response.status === 204) {
        return undefined as T;
      }
      
      const json = await response.json();
      
      if (!response.ok) {
        throw createApiError(
          response.status,
          json.message || "Error en la solicitud",
          json.details
        );
      }
      
      // Si la respuesta tiene estructura ApiResponse, extraer data
      if (json && typeof json === "object" && "success" in json && "data" in json) {
        return (json as ApiResponse<T>).data;
      }
      
      return json as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw createApiError(0, "Solicitud cancelada");
      }
      
      if ((error as ApiError).status) {
        throw error;
      }
      
      throw createApiError(500, "Error de conexión con el servidor");
    }
  },
  
  /** GET request */
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, undefined, options);
  },
  
  /** POST request */
  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, data, options);
  },
  
  /** PUT request */
  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, data, options);
  },
  
  /** PATCH request */
  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, data, options);
  },
  
  /** DELETE request */
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, undefined, options);
  },
};

export default apiClient;
