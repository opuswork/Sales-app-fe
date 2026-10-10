"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

export function Pill({ kind, children, className }: { kind?: string; children: React.ReactNode; className?: string }) {
  return <span className={cn("pill", kind ? `pill-${kind}` : "pill-ghost", className)}>{children}</span>;
}

export function GradePill({ grade }: { grade: string }) {
  return <Pill kind={grade}>{grade}</Pill>;
}

export function StagePill({ stage }: { stage: string }) {
  const i = ["접촉", "상담", "제안서 발송", "견적·단가 협의", "계약", "정기납품"].indexOf(stage);
  return <Pill kind={i >= 4 ? "good" : i >= 2 ? "warn" : undefined}>{stage || "—"}</Pill>;
}

export function VisitPill({ lastVisit, overdue }: { lastVisit?: string; overdue: number }) {
  if (!lastVisit) return <Pill kind="crit">방문 없음</Pill>;
  if (overdue > 0) return <Pill kind={overdue > 14 ? "crit" : "warn"}>+{overdue}일 초과</Pill>;
  const [, m, d] = lastVisit.split("-");
  return <Pill kind="good">{m}/{d}</Pill>;
}

export function OwnerChip({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="chip bg-surface-2 !text-ink-3">미배정</span>;
  return (
    <span className="chip" style={{ background: color ?? "var(--line-strong)" }}>
      {name}
    </span>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "good" | "warn" | "crit" }) {
  return (
    <div className="card">
      <div className="text-xs tracking-wide text-ink-3">{label}</div>
      <div className={cn("kpi-num", tone === "good" && "text-good", tone === "warn" && "text-warn", tone === "crit" && "text-crit")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

export function Bar({ pct, tone }: { pct: number; tone?: "amber" | "good" }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone === "amber" ? "var(--amber)" : tone === "good" ? "var(--good)" : undefined }} />
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-3 pt-[4vh]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn("w-full rounded-2xl border border-line bg-surface shadow-xl", wide ? "max-w-4xl" : "max-w-2xl")} role="dialog" aria-label={title}>
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[15px] font-bold">{title}</h3>
          <button className="btn btn-sm" onClick={onClose} aria-label="닫기">
            <X size={14} />
          </button>
        </header>
        <div className="p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="mt-1 text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

export function Checks({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[12.5px]">
          <input type="checkbox" checked={value.includes(o)} onChange={(e) => onChange(e.target.checked ? [...value, o] : value.filter((x) => x !== o))} />
          {o}
        </label>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line-strong p-8 text-center text-ink-3">{children}</div>;
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] text-ground shadow-lg">{message}</div>;
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {desc && <p className="mt-1 max-w-[65ch] text-ink-2">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
