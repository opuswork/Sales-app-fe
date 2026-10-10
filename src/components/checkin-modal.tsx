"use client";

import { useEffect, useState } from "react";

import { Checks, Field, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Account, Staff, useApi, useSettings, Visit } from "@/lib/hooks";
import { todayStr } from "@/lib/utils";

type Warn = { ownerMismatch: { ownerId: string; ownerName: string } | null; recentOthers: { staffName: string; date: string }[] };

export function CheckinModal({
  preset,
  visit,
  onClose,
  onSaved,
}: {
  preset?: { accountId?: string; date?: string; staffId?: string };
  visit?: Visit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const settings = useSettings();
  const accounts = useApi<Account[]>("/api/accounts");
  const staff = useApi<Staff[]>(user?.isAdmin ? "/api/users" : null);
  const [form, setForm] = useState({
    date: visit?.date ?? preset?.date ?? todayStr(),
    accountId: visit?.accountId ?? preset?.accountId ?? "",
    staffId: visit?.staffId ?? preset?.staffId ?? user?.id ?? "",
    type: visit?.type ?? "방문",
    companion: visit?.companion ?? "",
    duration: visit?.duration ?? "",
    content: visit?.content ?? "",
    followup: visit?.followup ?? "",
    transport: visit?.transport ?? "자차",
    products: visit?.products ?? ["간장", "런(발효유)"],
    stageAfter: visit?.stageAfter ?? "",
  });
  const [warn, setWarn] = useState<Warn | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const c = settings.data?.constants;

  useEffect(() => {
    if (!form.accountId && accounts.data?.length) setForm((f) => ({ ...f, accountId: accounts.data![0].id }));
  }, [accounts.data, form.accountId]);

  useEffect(() => {
    if (!form.accountId) return;
    api<Warn>(`/api/visits/warnings?accountId=${form.accountId}&staffId=${form.staffId}${visit ? `&excludeVisitId=${visit.id}` : ""}`)
      .then(setWarn)
      .catch(() => setWarn(null));
  }, [form.accountId, form.staffId, visit]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.content.trim()) {
      setErr("상담 내용을 입력하세요");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      if (visit) await api(`/api/visits/${visit.id}`, { method: "PATCH", json: form });
      else await api("/api/visits", { method: "POST", json: form });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!visit || !confirm("활동 기록을 삭제할까요?")) return;
    await api(`/api/visits/${visit.id}`, { method: "DELETE" });
    onSaved();
  };

  return (
    <Modal
      title={visit ? "활동 수정" : "체크인 기록"}
      onClose={onClose}
      footer={
        <>
          {visit && (
            <button className="btn btn-danger mr-auto" onClick={remove}>
              삭제
            </button>
          )}
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            저장
          </button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="날짜">
          <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="구분">
          <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {(c?.visitTypes ?? ["방문", "전화", "미팅", "마케팅·행사", "관장님문의"]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="업체" className="md:col-span-2">
          <select className="input" value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>
            {(accounts.data ?? [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "ko"))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.zone?.name ?? ""} · {a.resolvedOwnerName || "미배정"}
                </option>
              ))}
          </select>
          {warn && (
            <div className="mt-2 space-y-1 text-[12.5px]">
              {warn.ownerMismatch && (
                <div className="rounded-lg bg-crit-soft p-2 text-crit">
                  ⚠ 담당 불일치 — 이 거래처의 담당은 {warn.ownerMismatch.ownerName}입니다. 진행 중이면 인사 후 철수, 홍보 수준만 진행하세요. (구분을 「관장님문의」로 기록 권장)
                </div>
              )}
              {warn.recentOthers.length > 0 && (
                <div className="rounded-lg bg-crit-soft p-2 text-crit">⚠ 7일 내 타 담당 접촉 {warn.recentOthers.length}건 — {warn.recentOthers.map((r) => `${r.staffName} ${r.date.slice(5)}`).join(", ")}</div>
              )}
              {!warn.ownerMismatch && !warn.recentOthers.length && <div className="rounded-lg bg-good-soft p-2 text-good">✓ 담당 일치 · 최근 7일 중복 접촉 없음</div>}
            </div>
          )}
        </Field>
        {user?.isAdmin && (
          <Field label="담당 (성명)">
            <select className="input" value={form.staffId} onChange={(e) => set("staffId", e.target.value)}>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.rank}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="동행인">
          <input className="input" value={form.companion} onChange={(e) => set("companion", e.target.value)} />
        </Field>
        <Field label="상담 시간">
          <input className="input" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="예: 1.5h" />
        </Field>
        <Field label="이동 수단">
          <select className="input" value={form.transport} onChange={(e) => set("transport", e.target.value)}>
            {(c?.transports ?? ["자차", "대중교통", "동행", "비대면"]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="미팅·상담 내용" className="md:col-span-2">
          <textarea className="input min-h-[90px]" value={form.content} onChange={(e) => set("content", e.target.value)} />
        </Field>
        <Field label="추가 영업 / 차기 액션" className="md:col-span-2">
          <input className="input" value={form.followup} onChange={(e) => set("followup", e.target.value)} />
        </Field>
        <Field label="미팅 사용 품목" className="md:col-span-2">
          <Checks options={c?.products ?? ["간장", "런(발효유)", "양재", "메리야스", "두부"]} value={form.products} onChange={(v) => set("products", v)} />
        </Field>
        <Field label="이 활동 후 진행 상태">
          <select className="input" value={form.stageAfter} onChange={(e) => set("stageAfter", e.target.value)}>
            <option value="">변경 없음</option>
            {(c?.stages ?? []).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      {err && <div className="mt-2 text-sm text-crit">{err}</div>}
    </Modal>
  );
}
