"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Bar, OwnerChip, PageHeader, Pill, Toast } from "@/components/ui";
import { api } from "@/lib/api";
import { useSettings, useStaff } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor } from "@/lib/utils";

type Cand = { staffId: string; staffName: string; score: number; parts: Record<string, number>; full: boolean };
type Row = { zoneId: string; zoneName: string; currentOwnerId: string | null; locked: boolean; best: Cand | null; alts: Cand[]; accountCount: number };
type Result = { result: Row[]; load: Record<string, number> };

const WF: [string, string, string][] = [
  ["skill", "Skill 적합도", "구역 주력·보조 채널 역량"],
  ["exp", "경험치 vs 난이도", "레벨이 난이도보다 낮으면 감점"],
  ["rank", "직급 요건", "필요 직급 대비"],
  ["dist", "거점 거리", "같은 시도 1.0 · 같은 권역 0.65 · 타권역 0.2"],
  ["prod", "제품 취급", "구역 주력 제품 취급 여부"],
  ["load", "부하 균형", "담당 가능 구역 수 대비 여유"],
];
const PART_LABEL: Record<string, string> = { skill: "Skill", exp: "경험", rank: "직급", dist: "거리", prod: "제품", load: "부하" };
const expLevel = (y: number) => (y < 2 ? 1 : y < 4 ? 2 : y < 7 ? 3 : y < 11 ? 4 : 5);

export default function AssignPage() {
  const settings = useSettings();
  const staff = useStaff();
  const router = useRouter();
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const { message, toast } = useToast();
  const W = weights ?? settings.data?.weights ?? {};
  const idx = (id: string | null) => staff.data?.findIndex((s) => s.id === id) ?? -1;
  const field = (staff.data ?? []).filter((s) => s.field && s.zoneCap > 0);

  const saveW = async () => {
    await api("/api/settings", { method: "PATCH", json: { weights: W } });
    toast("가중치를 저장했습니다");
  };
  const run = async () => {
    setBusy(true);
    try {
      if (weights) await api("/api/settings", { method: "PATCH", json: { weights } });
      setRes(await api<Result>("/api/assignment/run", { method: "POST" }));
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!res) return;
    const rows = res.result.filter((r) => !r.locked && r.best).map((r) => ({ zoneId: r.zoneId, staffId: r.best!.staffId }));
    const r = await api<{ changed: number }>("/api/assignment/apply", { method: "POST", json: { rows } });
    toast(`구역 ${r.changed}곳의 담당을 변경했습니다`);
    router.push("/zones");
  };

  return (
    <div>
      <PageHeader
        title="자동 배정"
        desc="구역별로 (Skill 적합도 · 경험치 · 직급 · 거리 · 제품 · 부하)를 가중 합산해 최적 담당을 추천합니다. 난이도와 S급이 많은 구역부터 채우고, 담당 가능 구역 수를 넘기지 않습니다. 고정 배정 구역은 그대로 둡니다."
        actions={
          <>
            <button className="btn btn-primary" onClick={run} disabled={busy}>
              {busy ? "계산 중…" : "배정 실행"}
            </button>
            {res && (
              <button className="btn" onClick={apply}>
                결과 적용
              </button>
            )}
          </>
        }
      />
      <div className="mb-4 grid gap-3.5 md:grid-cols-2">
        <div className="card">
          <h3 className="font-bold">가중치</h3>
          <div className="mb-2 text-xs text-ink-3">합계 기준으로 정규화됩니다</div>
          {WF.map(([k, l, h]) => (
            <div key={k} className="grid grid-cols-[130px_1fr_34px] items-center gap-2.5 text-[12.5px]">
              <span title={h}>{l}</span>
              <input type="range" min={0} max={50} value={W[k] ?? 0} onChange={(e) => setWeights({ ...W, [k]: Number(e.target.value) })} className="accent-accent" />
              <output className="text-right font-semibold tabular-nums">{W[k] ?? 0}</output>
            </div>
          ))}
          <div className="mt-2 flex justify-end">
            <button className="btn btn-sm" onClick={saveW}>
              가중치 저장
            </button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold">배정 대상</h3>
          <div className="mb-2 text-xs text-ink-3">필드 배정 대상 담당자와 가능 구역 수</div>
          <table className="table">
            <thead>
              <tr>
                <th>담당</th>
                <th>직급·경험</th>
                <th>거점</th>
                <th className="text-right">가능 구역</th>
                <th className="text-right">추천 결과</th>
              </tr>
            </thead>
            <tbody>
              {field.map((s) => (
                <tr key={s.id}>
                  <td>
                    <OwnerChip name={s.name} color={colorFor(idx(s.id))} />
                  </td>
                  <td>
                    {s.rank} · Lv{expLevel(s.exp)}
                  </td>
                  <td>{s.base}</td>
                  <td className="text-right">{s.zoneCap}</td>
                  <td className="text-right">{res ? res.load[s.id] ?? 0 : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-ink-3">가능 구역 합계 {field.reduce((t, s) => t + s.zoneCap, 0)}. 구역 수보다 작으면 일부 구역이 공백으로 남습니다.</div>
        </div>
      </div>
      {res ? (
        <div className="card overflow-x-auto">
          <h3 className="font-bold">추천 결과</h3>
          <div className="mb-2 text-xs text-ink-3">점수 100 만점 · 2순위는 인수인계·동행 후보</div>
          <table className="table">
            <thead>
              <tr>
                <th>구역</th>
                <th>현재 담당</th>
                <th>추천 담당</th>
                <th className="text-right">점수</th>
                <th>근거</th>
                <th>2순위</th>
              </tr>
            </thead>
            <tbody>
              {res.result.map((r) => {
                const cur = staff.data?.find((s) => s.id === r.currentOwnerId);
                const changed = r.best && r.currentOwnerId !== r.best.staffId;
                return (
                  <tr key={r.zoneId}>
                    <td>
                      <b>{r.zoneName}</b>
                      <div className="text-xs text-ink-3">거래처 {r.accountCount}</div>
                    </td>
                    <td>
                      <OwnerChip name={cur?.name} color={colorFor(idx(r.currentOwnerId))} />
                    </td>
                    <td>
                      {r.locked ? (
                        <>
                          <OwnerChip name={cur?.name} color={colorFor(idx(r.currentOwnerId))} /> <Pill>고정</Pill>
                        </>
                      ) : r.best ? (
                        <>
                          <OwnerChip name={r.best.staffName} color={colorFor(idx(r.best.staffId))} /> {changed ? <Pill kind="warn">변경</Pill> : <Pill kind="good">유지</Pill>} {r.best.full && <Pill kind="crit">초과</Pill>}
                        </>
                      ) : (
                        <Pill kind="crit">후보 없음</Pill>
                      )}
                    </td>
                    <td className="text-right font-bold tabular-nums">{r.best && !r.locked ? Math.round(r.best.score) : "—"}</td>
                    <td className="min-w-[200px]">
                      {r.best && !r.locked && (
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0.5 text-[11.5px]">
                          {Object.entries(r.best.parts).map(([k, v]) => (
                            <>
                              <span key={k + "l"}>{PART_LABEL[k] ?? k}</span>
                              <span key={k + "b"} className="w-full">
                                <Bar pct={v * 100} />
                              </span>
                              <span key={k + "v"}>{Math.round(v * 100)}</span>
                            </>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="text-xs">{r.alts.map((a) => `${a.staffName} ${Math.round(a.score)}`).join(" / ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong p-8 text-center text-ink-3">「배정 실행」을 누르면 구역별 추천 담당과 근거가 표시됩니다.</div>
      )}
      <Toast message={message} />
    </div>
  );
}
