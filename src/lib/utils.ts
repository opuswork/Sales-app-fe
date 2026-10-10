import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const pad = (n: number) => String(n).padStart(2, "0");
export function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
export function parseD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function fmtD(dt: Date) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
export function addDays(s: string, n: number) {
  const dt = parseD(s);
  dt.setDate(dt.getDate() + n);
  return fmtD(dt);
}
export function weekStartOf(s: string) {
  const dt = parseD(s);
  const dow = dt.getDay();
  dt.setDate(dt.getDate() - ((dow + 6) % 7));
  return fmtD(dt);
}
export function shortD(s?: string) {
  if (!s) return "—";
  const [, m, d] = s.split("-");
  return `${m}/${d}`;
}
export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)", "var(--c7)", "var(--c8)", "var(--c9)"];
export function colorFor(index: number) {
  return index < 0 ? "var(--line-strong)" : COLORS[index % COLORS.length];
}

export const STAGES = ["접촉", "상담", "제안서 발송", "견적·단가 협의", "계약", "정기납품"];
export const GRADE_LABEL: Record<string, string> = { S: "S급 Key Account", A: "A급", B: "B급" };
export const GRADE_TARGET: Record<string, number> = { S: 8, A: 12, B: 25 };
export const GRADE_AMOUNT: Record<string, number> = { S: 500, A: 200, B: 80 };
