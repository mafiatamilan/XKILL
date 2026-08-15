import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh-token`, {
          withCredentials: true,
        });
        setAccessToken(data.accessToken);
        if (original.headers) {
          original.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(original);
      } catch {
        setAccessToken(null);
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export type ApiListResponse<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type ApiError = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
};

export function isApiError(err: unknown): err is AxiosError<ApiError> {
  return axios.isAxiosError(err);
}

export function getApiErrorMessage(err: unknown): string {
  if (isApiError(err) && err.response?.data) {
    const d = err.response.data;
    return Array.isArray(d.message) ? d.message.join(", ") : d.message;
  }
  return "An unexpected error occurred";
}
