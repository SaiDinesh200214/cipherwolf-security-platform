const DEFAULT_API_BASE_URL = import.meta.env.DEV ? "/api" : "https://pcipherwolf-backend.onrender.com/api";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
const CSRF_KEY = "cipherwolf_csrf_token";
const LEGACY_TOKEN_KEY = "cipherwolf_admin_token";

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

export function getAdminToken(): string | null {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  return sessionStorage.getItem(CSRF_KEY);
}

export function setAdminToken(token: string) {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.setItem(CSRF_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_KEY);
}

export function getRealtimeUrl(): string {
  const explicitBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const origin = explicitBase || window.location.origin;
  const url = new URL(origin);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/realtime";
  url.hash = "";

  return url.toString();
}

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isUnsafeMethod(method?: string) {
  return !["GET", "HEAD", "OPTIONS"].includes((method || "GET").toUpperCase());
}

async function refreshSession() {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Session refresh failed.");
  if (typeof data.csrfToken === "string") setAdminToken(data.csrfToken);
  return data;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  let csrfToken = getAdminToken();
  if (options.auth && isUnsafeMethod(options.method) && !csrfToken) {
    await refreshSession();
    csrfToken = getAdminToken();
  }
  if (options.auth && isUnsafeMethod(options.method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (options.auth && response.status === 401 && !retried) {
      await refreshSession();
      return apiRequest<T>(path, options, true);
    }
    throw new Error(data.message || "Request failed.");
  }

  return data as T;
}
