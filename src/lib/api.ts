import axios from "axios";
import Cookies from "js-cookie";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 25000,
});

function clearAdminSession() {
  Cookies.remove("adminAccessToken");
  Cookies.remove("adminRefreshToken");
  localStorage.removeItem("adminUser");
  if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
    window.location.assign("/login");
  }
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return url.includes("/auth/refresh") || url.includes("/auth/admin/login") || url.includes("/auth/logout");
}

api.interceptors.request.use((config) => {
  const token = Cookies.get("adminAccessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry || isAuthEndpoint(original.url)) {
      if (status === 401 && !isAuthEndpoint(original?.url) && !Cookies.get("adminRefreshToken")) {
        clearAdminSession();
      }
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshToken = Cookies.get("adminRefreshToken");
    if (!refreshToken) {
      clearAdminSession();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      Cookies.set("adminAccessToken", data.data.accessToken, { expires: 1 });
      Cookies.set("adminRefreshToken", data.data.refreshToken, { expires: 30 });
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original);
    } catch {
      clearAdminSession();
      return Promise.reject(error);
    }
  },
);

export type ApiSuccess<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
};

export function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
