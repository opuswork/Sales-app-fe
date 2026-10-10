"use client";

import { useState } from "react";

import { Bar, OwnerChip, PageHeader, Toast } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi, useStaff } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor } from "@/lib/utils";

type Report = {
  kind: string;
  period: string;
  from: string;
  to: string;
  markdown: string;
  activityCount: number;
  aiAvailable: boolean;
  perStaff: { id: string; name: string; rank: string; field: boolean; visits: number; byType: number[]; owned: number; contracts: number; regular: number; amount: number; filled: number; score: number }[];
  stats: { channels: { channel: string; accounts: number; contracted: number; activity: number }[]; products: { product: string; count: number }[]; total: number; stageCounts: { stage: string; count: number }[] };
};
type Saved = { id: string; kind: string; period: string; title: string; markdown: string; createdAt: string };

const TABS = [
  ["weekly", "주간 영업 리포트"],
  ["marketing", "마케팅 보고서"],
  ["eval", "담당별 평가"],
];
const PERIODS = [
  ["thisWeek", "이번 주"],
  ["lastWeek", "지난 주"],
  ["thisMonth", "이번 달"],
  ["lastMonth", "지난 달"],
];

export default function ReportsPage() {
  const [kind, setKind] = useState("weekly");
  const [period, setPeriod] = useState("thisWeek");
  const rep = useApi<Report>(`/api/reports?kind=${kind}&period=${period}`, [kind, period]);
  const saved = useApi<Saved[]>("/api/reports/saved");
  const staff = useStaff();
  const [ai, setAi] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [view, setView] = useState<Saved | null>(null);
  const { message, toast } = useToast();
  const r = rep.data;
  const idx = (id: string) => staff.data?.findIndex((s) => s.id === id) ?? -1;

  const copy = async () => {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(r.markdown);
      toast("보고서를 복사했습니다");
    } catch {
      toast("복사에 실패했습니다. 텍스트를 직접 선택해 복사하세요.");
    }
  };
  const save = async () => {
    if (!r) return;
    await api("/api/reports/save", { method: "POST", json: { kind, period, title: `${TABS.find((t) => t[0] === kind)?.[1]} ${r.from}~${r.to}`, markdown: r.markdown } });
    toast("보관함에 저장했습니다");
    void saved.reload();
  };
  const summarize = async () => {
    setAiBusy(true);
    setAi("생각 중…");
    try {
      const res = await api<{ text: string }>("/api/reports/summarize", { method: "POST", json: { kind, period } });
      setAi(res.text);
    } catch (e) {
      setAi((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="보고서"
        desc="주간 영업 리포트·마케팅 보고서·담당별 평가를 현재 데이터로 자동 정리합니다. 녹취 분석에서 만들어진 보고서는 보관함에 쌓입니다."
        actions={
          <>
            <select className="input !w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <button className="btn" onClick={copy}>
              복사
            </button>
            <button className="btn" onClick={save}>
              보관함에 저장
            </button>
            {r?.aiAvailable && (
              <button className="btn btn-primary" onClick={summarize} disabled={aiBusy}>
                AI 요약·코멘트
              </button>
            )}
          </>
        }
      />
      <div className="mb-3.5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} className={`-mb-px border-b-2 px-3 py-2 font-medium ${kind === k ? "border-accent text-accent" : "border-transparent text-ink-2"}`} onClick={() => setKind(k)}>
            {l}
          </button>
        ))}
      </div>
      {r && (
        <div className="grid gap-3.5 md:grid-cols-2">
          <div className="card">
            <h3 className="font-bold">{TABS.find((t) => t[0] === kind)?.[1]}</h3>
            <div className="mb-2 text-xs text-ink-3">
              {r.from} ~ {r.to} · 활동 {r.activityCount}건
            </div>
            <pre className="report font-sans">{r.markdown}</pre>
          </div>
          <div className="space-y-3.5">
            {kind === "eval" ? (
              <div className="card">
                <h3 className="font-bold">종합 점수</h3>
                <div className="mb-2 text-xs text-ink-3">신규계약 40 · 금액/정기납품 30 · 활동량 20 · 기입 성실도 10</div>
                {r.perStaff
                  .filter((p) => p.field)
                  .sort((a, b) => b.score - a.score)
                  .map((p) => (
                    <div key={p.id} className="mb-2.5">
                      <div className="flex justify-between">
                        <span>
                          <OwnerChip name={p.name} color={colorFor(idx(p.id))} /> <span className="text-xs text-ink-3">{p.rank}</span>
                        </span>
                        <b>{p.score}</b>
                      </div>
                      <Bar pct={p.score} tone={p.score >= 70 ? "good" : p.score >= 40 ? "amber" : undefined} />
                    </div>
                  ))}
              </div>
            ) : kind === "marketing" ? (
              <div className="card">
                <h3 className="font-bold">채널별 거래처</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>채널</th>
                      <th className="text-right">거래처</th>
                      <th className="text-right">계약 이상</th>
                      <th className="text-right">기간 활동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.stats.channels.map((c) => (
                      <tr key={c.channel}>
                        <td>{c.channel}</td>
                        <td className="text-right">{c.accounts}</td>
                        <td className="text-right">{c.contracted}</td>
                        <td className="text-right">{c.activity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h3 className="mt-3.5 font-bold">제품별 접촉</h3>
                {r.stats.products.map((p) => (
                  <div key={p.product} className="mb-1.5 flex items-center gap-2.5">
                    <span className="w-20">{p.product}</span>
                    <span className="flex-1">
                      <Bar pct={r.stats.total ? (p.count / r.stats.total) * 100 : 0} />
                    </span>
                    <b>{p.count}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card">
                <h3 className="font-bold">담당별 활동</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>담당</th>
                      <th className="text-right">방문</th>
                      <th className="text-right">전화</th>
                      <th className="text-right">미팅</th>
                      <th className="text-right">마케팅</th>
                      <th className="text-right">계약↑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.perStaff
                      .filter((p) => p.field)
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <OwnerChip name={p.name} color={colorFor(idx(p.id))} />
                          </td>
                          <td className="text-right">{p.byType[0]}</td>
                          <td className="text-right">{p.byType[1]}</td>
                          <td className="text-right">{p.byType[2]}</td>
                          <td className="text-right">{p.byType[3]}</td>
                          <td className="text-right">{p.contracts}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="stage-strip mt-3">
                  {r.stats.stageCounts.map((s) => (
                    <div key={s.stage}>
                      <div className="font-display text-xl font-bold tabular-nums">{s.count}</div>
                      <div className="text-[11px] text-ink-3">{s.stage}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(r.aiAvailable || ai) && (
              <div className="card">
                <h3 className="font-bold">AI 요약·코멘트</h3>
                <div className="mb-2 text-xs text-ink-3">핵심 3줄 · 리스크 2가지 · 다음 주 담당별 권고 액션</div>
                <pre className="report max-h-80 font-sans">{ai || "「AI 요약·코멘트」 버튼을 누르세요."}</pre>
              </div>
            )}
            <div className="card">
              <h3 className="font-bold">보관함</h3>
              <div className="mb-2 text-xs text-ink-3">저장한 보고서 · 녹취 분석 보고서</div>
              {(saved.data ?? []).map((s) => (
                <button key={s.id} className="flex w-full justify-between gap-2 border-t border-line py-1.5 text-left text-sm first:border-t-0 hover:bg-surface-2" onClick={() => setView(s)}>
                  <span>
                    <span className="mr-1 rounded bg-surface-2 px-1.5 text-[11px] text-ink-3">{s.kind === "voice" ? "녹취" : s.kind}</span>
                    {s.title}
                  </span>
                  <span className="text-xs text-ink-3">{s.createdAt.slice(0, 10)}</span>
                </button>
              ))}
              {!saved.data?.length && <div className="text-ink-3">저장된 보고서가 없습니다.</div>}
            </div>
          </div>
        </div>
      )}
      {view && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-3 pt-[4vh]" onClick={(e) => e.target === e.currentTarget && setView(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">{view.title}</h3>
              <button className="btn btn-sm" onClick={() => setView(null)}>
                닫기
              </button>
            </div>
            <pre className="report max-h-[75vh] font-sans">{view.markdown}</pre>
          </div>
        </div>
      )}
      <Toast message={message} />
    </div>
  );
}
