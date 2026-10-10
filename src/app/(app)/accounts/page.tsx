"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CheckinModal } from "@/components/checkin-modal";
import { Checks, Field, GradePill, Modal, OwnerChip, PageHeader, Pill, StagePill, Toast, VisitPill } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Account, useApi, useSettings, useStaff, Zone } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor, shortD } from "@/lib/utils";

type Dupe = { id: string; name: string; zoneName: string; ownerName: string; registeredAt: string; stage: string };

function AccountsInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const accounts = useApi<Account[]>("/api/accounts");
  const zones = useApi<Zone[]>("/api/zones");
  const staff = useStaff();
  const settings = useSettings();
  const [f, setF] = useState({ q: "", zone: "", owner: params.get("ownerId") ?? (user && !user.isAdmin ? user.id : ""), grade: "", stage: "" });
  const [edit, setEdit] = useState<Partial<Account> | null>(null);
  const [checkin, setCheckin] = useState<string | null>(null);
  const { message, toast } = useToast();
  const c = settings.data?.constants;
  const idx = (id: string) => staff.data?.findIndex((s) => s.id === id) ?? -1;

  let list = accounts.data ?? [];
  if (f.zone) list = list.filter((a) => a.zoneId === f.zone);
  if (f.owner) list = list.filter((a) => a.resolvedOwnerId === f.owner);
  if (f.grade) list = list.filter((a) => a.grade === f.grade);
  if (f.stage) list = list.filter((a) => a.stage === f.stage);
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter((a) => (a.name + a.memo + a.channel).toLowerCase().includes(q));
  }
  const gOrder: Record<string, number> = { S: 0, A: 1, B: 2 };
  list = list.slice().sort((a, b) => gOrder[a.grade] - gOrder[b.grade] || b.overdue - a.overdue);

  return (
    <div>
      <PageHeader
        title="거래처"
        desc="거래처 마스터. 등록 시 동일·유사 업체명을 즉시 검사해 선등록 담당을 알려줍니다. 담당은 구역을 따르거나(기본) Key Account처럼 고정할 수 있습니다."
        actions={
          <button className="btn btn-primary" onClick={() => setEdit({ zoneId: zones.data?.[0]?.id ?? "", channel: c?.channels[0], grade: "B", stage: "접촉", ownerMode: "zone", products: ["간장", "런(발효유)"] })}>
            거래처 등록
          </button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input !w-44" placeholder="업체명·메모 검색" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="input !w-auto" value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>
          <option value="">모든 구역</option>
          {(zones.data ?? []).map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select className="input !w-auto" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
          <option value="">모든 담당</option>
          {(staff.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="input !w-auto" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
          <option value="">등급</option>
          {["S", "A", "B"].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select className="input !w-auto" value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>
          <option value="">단계</option>
          {(c?.stages ?? []).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-ink-3">{list.length}곳</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>업체명</th>
              <th>구역</th>
              <th>채널</th>
              <th>등급</th>
              <th>단계</th>
              <th>담당</th>
              <th>최근 방문</th>
              <th>차기 액션</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  <b>{a.name}</b>
                  <div className="text-xs text-ink-3">
                    {a.products.join(" · ")}
                    {a.memo ? ` — ${a.memo.slice(0, 60)}` : ""}
                  </div>
                </td>
                <td className="text-xs">{a.zone?.name ?? "—"}</td>
                <td className="text-xs">{a.channel}</td>
                <td>
                  <GradePill grade={a.grade} />
                </td>
                <td>
                  <StagePill stage={a.stage} />
                </td>
                <td>
                  <OwnerChip name={a.resolvedOwnerName} color={colorFor(idx(a.resolvedOwnerId))} /> {a.ownerMode === "fixed" && <Pill>고정</Pill>}
                </td>
                <td>
                  <VisitPill lastVisit={a.lastVisit} overdue={a.overdue} />
                </td>
                <td className="text-xs">
                  {a.nextAction}
                  {a.nextDate && <div className="text-ink-3">{shortD(a.nextDate)}</div>}
                </td>
                <td className="whitespace-nowrap">
                  <button className="btn btn-sm" onClick={() => setCheckin(a.id)}>
                    체크인
                  </button>{" "}
                  <button className="btn btn-sm" onClick={() => setEdit(a)}>
                    수정
                  </button>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={9} className="text-ink-3">
                  조건에 맞는 거래처가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {edit && c && (
        <AccountForm
          init={edit}
          constants={c}
          zones={zones.data ?? []}
          staff={staff.data ?? []}
          onClose={() => setEdit(null)}
          onSaved={(m) => {
            setEdit(null);
            toast(m);
            void accounts.reload();
          }}
        />
      )}
      {checkin && (
        <CheckinModal
          preset={{ accountId: checkin }}
          onClose={() => setCheckin(null)}
          onSaved={() => {
            setCheckin(null);
            toast("체크인했습니다");
            void accounts.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

function AccountForm({ init, constants: c, zones, staff, onClose, onSaved }: { init: Partial<Account>; constants: NonNullable<ReturnType<typeof useSettings>["data"]>["constants"]; zones: Zone[]; staff: { id: string; name: string; rank: string }[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState<Partial<Account>>({ ...init });
  const [dupes, setDupes] = useState<Dupe[] | null>(null);
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    const n = (f.name ?? "").trim();
    if (n.length < 2) {
      setDupes(null);
      return;
    }
    const t = setTimeout(() => {
      api<Dupe[]>(`/api/accounts/dupes?name=${encodeURIComponent(n)}${init.id ? `&excludeId=${init.id}` : ""}`)
        .then(setDupes)
        .catch(() => setDupes(null));
    }, 250);
    return () => clearTimeout(t);
  }, [f.name, init.id]);

  const body = (force = false) => ({
    name: f.name,
    zoneId: f.zoneId ?? "",
    channel: f.channel,
    grade: f.grade,
    stage: f.stage,
    ownerMode: f.ownerMode,
    ownerId: f.ownerMode === "fixed" ? f.ownerId ?? "" : "",
    products: f.products,
    phone: f.phone,
    memo: f.memo,
    nextAction: f.nextAction,
    nextDate: f.nextDate,
    lastVisit: f.lastVisit,
    force: force ? "true" : undefined,
  });
  const save = async (force = false) => {
    try {
      if (init.id) await api(`/api/accounts/${init.id}`, { method: "PATCH", json: body() });
      else await api("/api/accounts", { method: "POST", json: body(force) });
      onSaved("저장했습니다");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        if (confirm(`${e.message}\n그래도 등록할까요?`)) return save(true);
        return;
      }
      setErr((e as Error).message);
    }
  };
  const remove = async () => {
    if (!confirm("거래처를 삭제할까요? 방문 기록도 함께 삭제됩니다.")) return;
    await api(`/api/accounts/${init.id}`, { method: "DELETE" });
    onSaved("삭제했습니다");
  };
  return (
    <Modal
      title={init.id ? "거래처 수정" : "거래처 등록"}
      onClose={onClose}
      footer={
        <>
          {init.id && (
            <button className="btn btn-danger mr-auto" onClick={remove}>
              삭제
            </button>
          )}
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={() => save()}>
            저장
          </button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="업체명" className="md:col-span-2">
          <input className="input" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
          {dupes && (
            <div className={`mt-2 rounded-lg p-2.5 text-[12.5px] ${dupes.length ? "bg-crit-soft text-crit" : "bg-good-soft text-good"}`}>
              {dupes.length ? (
                <>
                  <b>⚠ 중복 가능성 {dupes.length}건</b> — {dupes.map((d) => `${d.name} (${d.zoneName} · 담당 ${d.ownerName || "미배정"} · ${d.registeredAt} 등록 · ${d.stage})`).join(", ")}
                  <br />
                  진행 중인 곳은 정중히 인사 후 철수, 제품 홍보 수준만 진행합니다.
                </>
              ) : (
                "✓ 동일·유사 업체명 없음 — 신규 등록 가능"
              )}
            </div>
          )}
        </Field>
        <Field label="구역">
          <select className="input" value={f.zoneId ?? ""} onChange={(e) => set("zoneId", e.target.value)}>
            <option value="">구역 없음</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="채널">
          <select className="input" value={f.channel} onChange={(e) => set("channel", e.target.value)}>
            {c.channels.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="등급">
          <select className="input" value={f.grade} onChange={(e) => set("grade", e.target.value)}>
            {Object.entries(c.grades).map(([g, v]) => (
              <option key={g} value={g}>
                {v.label} (월 {v.amount}만)
              </option>
            ))}
          </select>
        </Field>
        <Field label="진행 상태">
          <select className="input" value={f.stage} onChange={(e) => set("stage", e.target.value)}>
            {c.stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="담당 방식">
          <select className="input" value={f.ownerMode ?? "zone"} onChange={(e) => set("ownerMode", e.target.value)}>
            <option value="zone">구역 담당을 따름</option>
            <option value="fixed">고정 담당 (Key Account)</option>
          </select>
        </Field>
        <Field label="고정 담당자">
          <select className="input" value={f.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value)} disabled={f.ownerMode !== "fixed"}>
            <option value="">—</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.rank}
              </option>
            ))}
          </select>
        </Field>
        <Field label="제품" className="md:col-span-2">
          <Checks options={c.products} value={f.products ?? []} onChange={(v) => set("products", v)} />
        </Field>
        <Field label="연락처">
          <input className="input" value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="최근 방문일">
          <input className="input" type="date" value={f.lastVisit ?? ""} onChange={(e) => set("lastVisit", e.target.value)} />
        </Field>
        <Field label="차기 액션">
          <input className="input" value={f.nextAction ?? ""} onChange={(e) => set("nextAction", e.target.value)} />
        </Field>
        <Field label="차기 액션 일자">
          <input className="input" type="date" value={f.nextDate ?? ""} onChange={(e) => set("nextDate", e.target.value)} />
        </Field>
        <Field label="메모 (담당자·요청사항·관장님 협의)" className="md:col-span-2">
          <textarea className="input min-h-[70px]" value={f.memo ?? ""} onChange={(e) => set("memo", e.target.value)} />
        </Field>
        {init.registeredAt && <div className="text-xs text-ink-3 md:col-span-2">등록일 {init.registeredAt} · 선등록 원칙: 먼저 등록한 담당에게 우선권</div>}
      </div>
      {err && <div className="mt-2 text-sm text-crit">{err}</div>}
    </Modal>
  );
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsInner />
    </Suspense>
  );
}
