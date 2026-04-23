import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

export const TOKEN_STORAGE_KEY = "timetrack_token";

const ENV_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

function resolveBaseUrl(): string {
  if (ENV_BASE_URL && ENV_BASE_URL.length > 0) {
    return ENV_BASE_URL.replace(/\/+$/, "");
  }
  return "/api";
}

export const API_BASE_URL = resolveBaseUrl();

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setStoredToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Convenience wrappers (typed) for the endpoints that the app consumes.
// ---------------------------------------------------------------------------

export interface LoginResponse {
  token: string;
  user: { id: string | number; email: string; role: string; name?: string };
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password }).then((r) => r.data),
};

export const employeesApi = {
  list: () => apiClient.get("/employees").then((r) => r.data),
  byDocument: (document: string) =>
    apiClient.get(`/employees/${encodeURIComponent(document)}`).then((r) => r.data),
};

export const attendanceApi = {
  register: (payload: unknown) =>
    apiClient.post("/attendance/register", payload).then((r) => r.data),
  todaySummary: (document: string) =>
    apiClient
      .get(`/attendance/today-summary/${encodeURIComponent(document)}`)
      .then((r) => r.data),
};

export const dashboardApi = {
  summary: () => apiClient.get("/dashboard/summary").then((r) => r.data),
  attendanceTrends: () =>
    apiClient.get("/dashboard/attendance-trends").then((r) => r.data),
};

export const companiesApi = {
  list: () => apiClient.get("/companies").then((r) => r.data),
};

export const auditApi = {
  logs: () => apiClient.get("/audit/logs").then((r) => r.data),
};
