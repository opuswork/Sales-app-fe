"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, AuthUser, clearSession, getAccessToken, getStoredUser, refreshSession, storeSession } from "./api";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const me = await api<AuthUser>("/api/auth/me");
      setUser(me);
      const cur = getStoredUser();
      storeSession({ accessToken: getAccessToken() ?? "", refreshToken: localStorage.getItem("sales-app-refresh") ?? "", user: { ...cur, ...me } });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = getStoredUser();
      if (stored) setUser(stored);
      if (getAccessToken() || localStorage.getItem("sales-app-refresh")) {
        if (!getAccessToken()) await refreshSession();
        await reload();
      }
      setLoading(false);
    })();
  }, [reload]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ accessToken: string; refreshToken: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      json: { email, password, device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "" },
    });
    storeSession(data);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem("sales-app-refresh");
    try {
      await api("/api/auth/logout", { method: "POST", json: { refreshToken: rt } });
    } catch {
      /* ignore */
    }
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, reload }), [user, loading, login, logout, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
