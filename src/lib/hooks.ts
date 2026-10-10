"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "./api";

/** 간단한 GET 훅: path 가 바뀌면 다시 불러온다. reload() 로 수동 갱신 */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(!!path);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void reload();
  }, [reload, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading, reload, setData };
}

export type Constants = {
  channels: string[];
  products: string[];
  ranks: string[];
  parts: string[];
  grades: Record<string, { amount: number; target: number; visit: number; label: string }>;
  stages: string[];
  visitTypes: string[];
  transports: string[];
  sidos: string[];
};
export type Settings = { weights: Record<string, number>; visitsPerDay: number; workDays: number; constants: Constants };

export function useSettings() {
  return useApi<Settings>("/api/settings");
}

export type Staff = {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  name: string;
  rank: string;
  part: string;
  roleDesc: string;
  base: string;
  exp: number;
  skills: Record<string, number>;
  products: string[];
  field: boolean;
  zoneCap: number;
  capacity: number;
  note: string;
  phone: string;
  kakaoLinked?: boolean;
  zones?: { id: string; name: string }[];
  _count?: { recordings: number };
};

export function useStaff() {
  return useApi<Staff[]>("/api/users");
}

export type Zone = {
  id: string;
  name: string;
  sido: string;
  area: string;
  channel: string;
  channel2: string;
  difficulty: number;
  reqRank: string;
  products: string[];
  note: string;
  ownerId: string | null;
  owner?: { id: string; name: string; rank: string } | null;
  lockOwner: boolean;
  accountCount: number;
  sCount: number;
  unvisited: number;
};

export type Account = {
  id: string;
  name: string;
  zoneId: string | null;
  zone?: { id: string; name: string } | null;
  channel: string;
  grade: string;
  stage: string;
  ownerMode: string;
  ownerId: string | null;
  products: string[];
  phone: string;
  memo: string;
  nextAction: string;
  nextDate: string;
  lastVisit: string;
  registeredAt: string;
  resolvedOwnerId: string;
  resolvedOwnerName: string;
  overdue: number;
};

export type Visit = {
  id: string;
  date: string;
  accountId: string;
  staffId: string;
  type: string;
  companion: string;
  duration: string;
  content: string;
  followup: string;
  transport: string;
  products: string[];
  stageAfter: string;
  source: string;
  account?: { id: string; name: string; zone?: { name: string } | null };
  staff?: { id: string; name: string; rank: string };
};
