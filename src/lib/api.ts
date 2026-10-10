"use client";

const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL = (configured && configured.length > 0 ? configured : "http://localhost:3002").replace(/\/+$/, "");

const ACCESS_KEY = "sales-app-access";
const REFRESH_KEY = "sales-app-refresh";
const USER_KEY = "sales-app-user";

export type Role = "SYSADMIN" | "ADMIN" | "STAFF";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  rank: string;
  part: string;
  role: Role;
  isAdmin: boolean;
  isSysadmin?: boolean;
  mustChangePw?: boolean;
  kakaoLinked?: boolean;
  capacity?: number;
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getAccessToken() {
  return read(ACCESS_KEY);
}
export function getStoredUser(): AuthUser | null {
  const raw = read(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
export function storeSession(s: { accessToken: string; refreshToken: string; user: AuthUser }) {
  write(ACCESS_KEY, s.accessToken);
  write(REFRESH_KEY, s.refreshToken);
  write(USER_KEY, JSON.stringify(s.user));
}
export function clearSession() {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
  write(USER_KEY, null);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let refreshing: Promise<boolean> | null = null;
/** 리프레시 토큰으로 새 액세스 토큰 발급 (로그인 유지) */
export async function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = read(REFRESH_KEY);
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        clearSession();
        return false;
      }
      const data = await res.json();
      storeSession(data);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function parseError(res: Response) {
  let data: unknown = null;
  let message = `${res.status} ${res.statusText}`;
  try {
    data = await res.json();
    const m = (data as { message?: string | string[] })?.message;
    if (Array.isArray(m)) message = m.join(", ");
    else if (typeof m === "string") message = m;
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, message, data);
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: (() => {
        const h = new Headers(headers);
        const t = getAccessToken();
        if (t) h.set("Authorization", `Bearer ${t}`);
        return h;
      })(),
      body,
    });
  let res = await doFetch();
  if (res.status === 401 && token && !path.startsWith("/api/auth/")) {
    const ok = await refreshSession();
    if (ok) res = await doFetch();
    else if (typeof window !== "undefined") {
      clearSession();
      window.location.replace("/login?reason=expired");
    }
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  return api<T>(path, { method: "POST", body: form });
}
