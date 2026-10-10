"use client";

import { useState } from "react";

import { CheckinModal } from "@/components/checkin-modal";
import { Field, GradePill, Modal, OwnerChip, PageHeader, Pill, Toast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useApi, useStaff } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { addDays, colorFor, DOW, parseD, shortD, todayStr, weekStartOf } from "@/lib/utils";

type Week = {
  weekStart: string;
  weekEnd: string;
  plans: { id: string; staffId: string; items: { day: number; accountId: string; accountName: string; grade: string; zoneName: string; reason: string; done: boolean }[] }[];
  visits: { id: string; date: string; accountId: string; staffId: string; type: string }[];
  events: Ev[];
};
type Ev = { id: string; date: string; title: string; kind: string; place: string; who: string; memo: string };
const KINDS = ["행사", "교육", "회의", "박람회", "마감", "공동구매", "마케팅"];

export default function SchedulePage() {
  const { user } = useAuth();
  const staff = useStaff();
  const [ws, setWs] = useState(weekStartOf(todayStr()));
  const [staffId, setStaffId] = useState(user && !user.isAdmin ? user.id : "");
  const week = useApi<Week>(`/api/plans/week?weekStart=${ws}${staffId ? `&staffId=${staffId}` : ""}`, [ws, staffId]);
  const events = useApi<Ev[]>("/api/events");
  const [checkin, setCheckin] = useState<{ accountId: string; staffId: string; date: string } | null>(null);
  const [ev, setEv] = useState<Partial<Ev> | null>(null);
  const { message, toast } = useToast();
  const T = todayStr();
  const idx = (id: string) => staff.data?.findIndex((s) => s.id === id) ?? -1;
  const nameOf = (id: string) => staff.data?.find((s) => s.id === id)?.name ?? "";
  const w = week.data;
  const accountsAll = useApi<{ id: string; name: string }[]>("/api/accounts");

  const gen = async () => {
    if (staffId) {
      const r = await api<{ count: number }>("/api/plans/generate", { method: "POST", json: { staffId, weekStart: ws } });
      toast(`${r.count}건의 방문 일정을 생성했습니다`);
    } else {
      const r = await api<{ count: number }>("/api/plans/generate-all", { method: "POST", json: { weekStart: ws } });
      toast(`전 담당 ${r.count}건 일정 생성`);
    }
    void week.reload();
  };

  return (
    <div>
      <PageHeader
        title="영업일정"
        desc="담당별로 담당 거래처의 등급·미방문 기간·파이프라인 단계·차기 액션 일자를 점수화해 주간 방문 일정을 자동으로 짭니다. 같은 구역은 같은 요일에 묶어 동선을 줄입니다."
        actions={
          <>
            <button className="btn" onClick={() => setWs(addDays(ws, -7))}>
              ◀
            </button>
            <b className="tabular-nums">
              {ws} ~ {addDays(ws, 6)}
            </b>
            <button className="btn" onClick={() => setWs(addDays(ws, 7))}>
              ▶
            </button>
            <button className="btn" onClick={() => setWs(weekStartOf(T))}>
              이번 주
            </button>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="input !w-auto" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          {user?.isAdmin && <option value="">전체 담당 보기</option>}
          {(staff.data ?? [])
            .filter((s) => s.field && (user?.isAdmin || s.id === user?.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.rank}
              </option>
            ))}
        </select>
        <button className="btn btn-primary" onClick={gen}>
          {staffId ? `${nameOf(staffId)} 주간 일정 자동 생성` : "전 담당 일정 자동 생성"}
        </button>
        <button className="btn" onClick={() => setEv({ date: T, kind: "행사" })}>
          행사·교육 추가
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((d) => {
          const date = addDays(ws, d);
          const items = (w?.plans ?? []).flatMap((p) => p.items.filter((it) => it.day === d).map((it) => ({ ...it, staffId: p.staffId })));
          const evs = (w?.events ?? []).filter((e) => e.date === date);
          const done = (w?.visits ?? []).filter((v) => v.date === date);
          return (
            <div key={d} className="min-h-[120px] rounded-lg border border-line bg-surface p-2">
              <h4 className="mb-1.5 flex justify-between text-[12.5px] text-ink-2">
                <span>
                  {DOW[parseD(date).getDay()]} {shortD(date)} {date === T && <Pill kind="warn">오늘</Pill>}
                </span>
                <span className="text-ink-3">{items.length}</span>
              </h4>
              {evs.map((e) => (
                <div key={e.id} className="mb-1 rounded-md border-l-[3px] border-amber bg-amber-soft px-1.5 py-1 text-xs">
                  <b className="block">
                    {e.kind} · {e.title}
                  </b>
                  {e.who} {e.place && `@${e.place}`}
                </div>
              ))}
              {items.map((it) => {
                const isDone = done.some((v) => v.accountId === it.accountId && v.staffId === it.staffId);
                return (
                  <button
                    key={it.staffId + it.accountId}
                    className={`mb-1 block w-full rounded-md border-l-[3px] bg-surface-2 px-1.5 py-1 text-left text-xs ${isDone ? "opacity-60 line-through" : ""}`}
                    style={{ borderColor: colorFor(idx(it.staffId)) }}
                    onClick={() => !isDone && setCheckin({ accountId: it.accountId, staffId: it.staffId, date })}
                    title="클릭하면 체크인"
                  >
                    <b className="block">
                      <GradePill grade={it.grade} /> {it.accountName}
                    </b>
                    <span className="text-ink-3">
                      {!staffId && `${nameOf(it.staffId)} · `}
                      {it.zoneName}
                    </span>
                    <div className="text-ink-3">{it.reason}</div>
                  </button>
                );
              })}
              {done
                .filter((v) => !items.some((it) => it.accountId === v.accountId))
                .map((v) => (
                  <div key={v.id} className="mb-1 rounded-md border-l-[3px] bg-surface-2 px-1.5 py-1 text-xs opacity-70 line-through" style={{ borderColor: colorFor(idx(v.staffId)) }}>
                    <b className="block">{accountsAll.data?.find((a) => a.id === v.accountId)?.name ?? "?"}</b>
                    <span className="text-ink-3">
                      {v.type} · {nameOf(v.staffId)}
                    </span>
                  </div>
                ))}
              {!items.length && !evs.length && !done.length && <div className="text-xs text-ink-3">—</div>}
            </div>
          );
        })}
      </div>
      <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
        <div className="card overflow-x-auto">
          <h3 className="font-bold">행사·교육·마감 일정</h3>
          <div className="mb-2 text-xs text-ink-3">업무계획서·교육관련 시트 항목</div>
          <table className="table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>구분</th>
                <th>일정</th>
                <th>장소</th>
                <th>담당</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(events.data ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">
                    {e.date} <span className="text-xs text-ink-3">({DOW[parseD(e.date).getDay()]})</span>
                  </td>
                  <td>
                    <Pill>{e.kind}</Pill>
                  </td>
                  <td>
                    <b>{e.title}</b>
                    <div className="text-xs text-ink-3">{e.memo}</div>
                  </td>
                  <td className="text-xs">{e.place}</td>
                  <td className="text-xs">{e.who}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setEv(e)}>
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <h3 className="font-bold">담당별 이번 주 계획 요약</h3>
          <div className="mb-2 text-xs text-ink-3">계획 건수 · 완료 · 잔여</div>
          <table className="table">
            <thead>
              <tr>
                <th>담당</th>
                <th className="text-right">계획</th>
                <th className="text-right">완료</th>
                <th className="text-right">잔여</th>
                <th>구역</th>
              </tr>
            </thead>
            <tbody>
              {(staff.data ?? [])
                .filter((s) => s.field)
                .map((s) => {
                  const p = w?.plans.find((x) => x.staffId === s.id);
                  const its = p?.items ?? [];
                  const dn = its.filter((i) => i.done).length;
                  return (
                    <tr key={s.id}>
                      <td>
                        <OwnerChip name={s.name} color={colorFor(idx(s.id))} />
                      </td>
                      <td className="text-right">{its.length}</td>
                      <td className="text-right">{dn}</td>
                      <td className="text-right">{its.length - dn}</td>
                      <td className="text-xs">{[...new Set(its.map((i) => i.zoneName).filter(Boolean))].join(", ") || "—"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      {checkin && (
        <CheckinModal
          preset={checkin}
          onClose={() => setCheckin(null)}
          onSaved={() => {
            setCheckin(null);
            toast("체크인했습니다");
            void week.reload();
          }}
        />
      )}
      {ev && (
        <EventForm
          init={ev}
          onClose={() => setEv(null)}
          onSaved={(m) => {
            setEv(null);
            toast(m);
            void events.reload();
            void week.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

function EventForm({ init, onClose, onSaved }: { init: Partial<Ev>; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState<Partial<Ev>>({ ...init });
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.title?.trim() || !f.date) return;
    if (init.id) await api(`/api/events/${init.id}`, { method: "PATCH", json: { date: f.date, title: f.title, kind: f.kind, place: f.place, who: f.who, memo: f.memo } });
    else await api("/api/events", { method: "POST", json: { date: f.date, title: f.title, kind: f.kind, place: f.place, who: f.who, memo: f.memo } });
    onSaved("저장했습니다");
  };
  const remove = async () => {
    if (!confirm("일정을 삭제할까요?")) return;
    await api(`/api/events/${init.id}`, { method: "DELETE" });
    onSaved("삭제했습니다");
  };
  return (
    <Modal
      title={init.id ? "일정 수정" : "행사·교육 추가"}
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
          <button className="btn btn-primary" onClick={save}>
            저장
          </button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="날짜">
          <input className="input" type="date" value={f.date ?? ""} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="구분">
          <select className="input" value={f.kind ?? "행사"} onChange={(e) => set("kind", e.target.value)}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="일정명" className="md:col-span-2">
          <input className="input" value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="장소">
          <input className="input" value={f.place ?? ""} onChange={(e) => set("place", e.target.value)} />
        </Field>
        <Field label="담당 / 참석">
          <input className="input" value={f.who ?? ""} onChange={(e) => set("who", e.target.value)} />
        </Field>
        <Field label="메모 (준비서류·홍보방향)" className="md:col-span-2">
          <textarea className="input min-h-[60px]" value={f.memo ?? ""} onChange={(e) => set("memo", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
