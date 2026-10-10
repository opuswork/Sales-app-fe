"use client";

import Link from "next/link";
import { useState } from "react";

import { Checks, Field, Modal, OwnerChip, PageHeader, Pill, Toast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useApi, useSettings, useStaff, Zone } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor } from "@/lib/utils";

const REGION: Record<string, string> = { 부산: "영남", 울산: "영남", 경남: "영남", "대구·경북": "영남", 서울: "수도권", 경기: "수도권", 인천: "수도권", "충북·대전": "충청", 충남: "충청", 전북: "호남", "광주·전남": "호남", 강원: "강원", 제주: "제주", "전국·온라인": "전국" };
const ORDER = ["영남", "수도권", "충청", "호남", "강원", "제주", "전국", "기타"];

export default function ZonesPage() {
  const { user } = useAuth();
  const zones = useApi<Zone[]>("/api/zones");
  const staff = useStaff();
  const settings = useSettings();
  const [edit, setEdit] = useState<Partial<Zone> | null>(null);
  const { message, toast } = useToast();
  const c = settings.data?.constants;
  const idx = (id: string | null) => staff.data?.findIndex((s) => s.id === id) ?? -1;
  const groups = new Map<string, Zone[]>();
  (zones.data ?? []).forEach((z) => {
    const g = REGION[z.sido] ?? "기타";
    groups.set(g, [...(groups.get(g) ?? []), z]);
  });

  return (
    <div>
      <PageHeader
        title="구역"
        desc="행정구역 기준 영업 구역입니다. 구역마다 주력 채널·난이도·필요 직급을 두고, 담당자는 자동 배정 또는 고정 배정으로 정합니다. 거래처 담당은 기본적으로 구역 담당을 따릅니다."
        actions={
          user?.isAdmin && (
            <>
              <Link href="/assign" className="btn">
                자동 배정 →
              </Link>
              <button className="btn btn-primary" onClick={() => setEdit({ sido: "부산", channel: c?.channels[0], channel2: "", difficulty: 3, reqRank: "대리", products: c?.products ?? [], lockOwner: false })}>
                구역 추가
              </button>
            </>
          )
        }
      />
      <div className="mb-2 flex flex-wrap gap-2.5 text-xs text-ink-2">
        {(staff.data ?? [])
          .filter((s) => s.field)
          .map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: colorFor(staff.data!.indexOf(s)) }} />
              {s.name}
              {i < 0 ? "" : ""}
            </span>
          ))}
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-line-strong" />
          미배정
        </span>
      </div>
      {ORDER.filter((g) => groups.has(g)).map((g) => (
        <div key={g}>
          <div className="mb-1.5 mt-3.5 text-xs font-semibold tracking-wide text-ink-3">
            {g} 권역 · {groups.get(g)!.length}구역
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {groups.get(g)!.map((z) => (
              <button
                key={z.id}
                className="relative min-h-[84px] overflow-hidden rounded-lg border border-line bg-surface p-2.5 pl-4 text-left hover:border-line-strong"
                onClick={() => user?.isAdmin && setEdit(z)}
              >
                <i className="absolute bottom-0 left-0 top-0 w-[5px]" style={{ background: colorFor(idx(z.ownerId)) }} />
                <div className="text-[13px] font-semibold">{z.name}</div>
                <div className="text-[11.5px] text-ink-3">
                  {z.channel} · 난이도 {z.difficulty} · {z.reqRank}↑
                </div>
                <div className="text-[11.5px] text-ink-3">
                  거래처 {z.accountCount}
                  {z.sCount ? ` · S ${z.sCount}` : ""}
                  {z.unvisited ? <span className="text-crit"> · 미방문 {z.unvisited}</span> : null}
                </div>
                <div className="mt-1.5">
                  <OwnerChip name={z.owner?.name} color={colorFor(idx(z.ownerId))} /> {z.lockOwner && <Pill>고정</Pill>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="card mt-4 overflow-x-auto">
        <h3 className="mb-2 font-bold">구역 목록</h3>
        <table className="table">
          <thead>
            <tr>
              <th>구역</th>
              <th>시도 · 세부</th>
              <th>주력 / 보조 채널</th>
              <th className="text-right">난이도</th>
              <th>필요 직급</th>
              <th>제품</th>
              <th>담당</th>
              <th className="text-right">거래처</th>
            </tr>
          </thead>
          <tbody>
            {(zones.data ?? []).map((z) => (
              <tr key={z.id}>
                <td>
                  <b>{z.name}</b>
                  <div className="text-xs text-ink-3">{z.note}</div>
                </td>
                <td>
                  {z.sido}
                  <div className="text-xs text-ink-3">{z.area}</div>
                </td>
                <td>
                  {z.channel}
                  <div className="text-xs text-ink-3">{z.channel2}</div>
                </td>
                <td className="text-right">{z.difficulty}</td>
                <td>{z.reqRank}</td>
                <td className="text-xs">{z.products.join(", ")}</td>
                <td>
                  <OwnerChip name={z.owner?.name} color={colorFor(idx(z.ownerId))} /> {z.lockOwner && <Pill>고정</Pill>}
                </td>
                <td className="text-right">{z.accountCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && c && (
        <ZoneForm
          init={edit}
          constants={c}
          staff={staff.data ?? []}
          onClose={() => setEdit(null)}
          onSaved={(m) => {
            setEdit(null);
            toast(m);
            void zones.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

function ZoneForm({ init, constants: c, staff, onClose, onSaved }: { init: Partial<Zone>; constants: NonNullable<ReturnType<typeof useSettings>["data"]>["constants"]; staff: { id: string; name: string; rank: string; field: boolean }[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState<Partial<Zone>>({ ...init });
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    try {
      const body = { name: f.name, sido: f.sido, area: f.area, channel: f.channel, channel2: f.channel2, difficulty: f.difficulty, reqRank: f.reqRank, products: f.products, note: f.note, ownerId: f.ownerId ?? "", lockOwner: !!f.lockOwner };
      if (init.id) await api(`/api/zones/${init.id}`, { method: "PATCH", json: body });
      else await api("/api/zones", { method: "POST", json: body });
      onSaved("저장했습니다");
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const remove = async () => {
    if (!confirm("구역을 삭제할까요? 소속 거래처는 구역 없음으로 남습니다.")) return;
    await api(`/api/zones/${init.id}`, { method: "DELETE" });
    onSaved("삭제했습니다");
  };
  return (
    <Modal
      title={init.id ? "구역 수정" : "구역 추가"}
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
        <Field label="구역명">
          <input className="input" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="시도">
          <select className="input" value={f.sido} onChange={(e) => set("sido", e.target.value)}>
            {c.sidos.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="세부 행정구역 / 동선" className="md:col-span-2">
          <input className="input" value={f.area ?? ""} onChange={(e) => set("area", e.target.value)} />
        </Field>
        <Field label="주력 채널">
          <select className="input" value={f.channel} onChange={(e) => set("channel", e.target.value)}>
            {c.channels.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="보조 채널">
          <select className="input" value={f.channel2 ?? ""} onChange={(e) => set("channel2", e.target.value)}>
            <option value="">없음</option>
            {c.channels.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="난이도 (1~5)" hint="5 = 대기업 본사·S급 밀집, 1 = 상회 주변 소매">
          <input className="input" type="number" min={1} max={5} value={f.difficulty ?? 3} onChange={(e) => set("difficulty", Number(e.target.value))} />
        </Field>
        <Field label="필요 직급 (이상)">
          <select className="input" value={f.reqRank} onChange={(e) => set("reqRank", e.target.value)}>
            {c.ranks.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="주력 제품" className="md:col-span-2">
          <Checks options={c.products} value={f.products ?? []} onChange={(v) => set("products", v)} />
        </Field>
        <Field label="담당자">
          <select className="input" value={f.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value)}>
            <option value="">미배정</option>
            {staff
              .filter((s) => s.field)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.rank}
                </option>
              ))}
          </select>
        </Field>
        <Field label="고정 배정">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.lockOwner} onChange={(e) => set("lockOwner", e.target.checked)} /> 자동 배정에서 변경하지 않음
          </label>
        </Field>
        <Field label="메모 (핵심 거래처·관장님 협의 사항)" className="md:col-span-2">
          <textarea className="input min-h-[60px]" value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </div>
      {err && <div className="mt-2 text-sm text-crit">{err}</div>}
    </Modal>
  );
}
