"use client";

import Link from "next/link";
import { useState } from "react";

import { CheckinModal } from "@/components/checkin-modal";
import { Bar, GradePill, Kpi, OwnerChip, PageHeader, Pill, Toast, VisitPill } from "@/components/ui";
import { useApi, useStaff } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor, DOW, GRADE_AMOUNT, GRADE_LABEL, parseD, shortD } from "@/lib/utils";

type Dash = {
  today: string;
  weekStart: string;
  weekEnd: string;
  counts: { accounts: number; zones: number; fieldStaff: number; weekVisits: number };
  grades: Record<string, number>;
  targets: Record<string, number>;
  monthly: number;
  stageCounts: { stage: string; count: number }[];
  unvisited: { id: string; name: string; grade: string; overdue: number; lastVisit: string; ownerName: string; zoneName: string; nextAction: string }[];
  unvisitedTotal: number;
  dupes: { type: string; account: { id: string; name: string; ownerName: string }; staff?: string[]; dupList?: { name: string; registeredAt: string; ownerName: string; zoneName: string }[] }[];
  unassignedZones: { id: string; name: string; accountCount: number }[];
  upcoming: { id: string; date: string; kind: string; title: string; who: string }[];
  load: { id: string; name: string; rank: string; zones: number; zoneCap: number; accounts: number; grades: Record<string, number>; weekVisits: number; capacity: number }[];
};

const CYCLE = [
  ["매일", "영업 일정표 입력 (방문·전화·미팅)", "필드영업 전원"],
  ["토요일", "파이프라인 리뷰 + 중복 리드 점검", "김혜경·최지예"],
  ["주 1회", "영업일지 작성 (영업앱)", "담당 전원"],
  ["월 1회", "축복일 2일 전 · 목표 대비 달성률 분석", "팀 전체"],
];

export default function DashboardPage() {
  const dash = useApi<Dash>("/api/dashboard");
  const staff = useStaff();
  const [checkin, setCheckin] = useState<string | null>(null);
  const { message, toast } = useToast();
  const d = dash.data;
  if (!d) return <div className="p-10 text-center text-ink-3">{dash.error || "불러오는 중…"}</div>;
  const total = Object.values(d.grades).reduce((a, b) => a + b, 0);
  const idx = (id: string) => staff.data?.findIndex((s) => s.id === id) ?? -1;

  return (
    <div>
      <PageHeader
        title="영업 대시보드"
        desc={`${d.today} (${DOW[parseD(d.today).getDay()]}) · 채널 전담제 + 구역 관리 · 선등록 원칙으로 중복 방문·공백 구역을 차단합니다.`}
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setCheckin("")}>
              방문 체크인
            </button>
            <Link className="btn" href="/assign">
              자동 배정
            </Link>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="거래처" value={d.counts.accounts} sub={`구역 ${d.counts.zones}곳 · 담당 ${d.counts.fieldStaff}명`} />
        <Kpi label="계약 이상 거래처" value={<>{total}<span className="text-xs text-ink-3"> / 45</span></>} tone="good" sub={`환산 월 ${d.monthly.toLocaleString()}만 (목표 8,333만)`} />
        <Kpi label="이번 주 활동" value={d.counts.weekVisits} sub={`${d.weekStart.slice(5)} ~ ${d.weekEnd.slice(5)}`} />
        <Kpi label="미방문 경고" value={d.unvisitedTotal} tone={d.unvisitedTotal ? "warn" : "good"} sub="S 14일 · A 30일 · B 45일" />
        <Kpi label="중복 리드" value={d.dupes.length} tone={d.dupes.length ? "crit" : "good"} sub="7일 내 2인 접촉 / 동일 업체명" />
        <Kpi label="공백 구역" value={d.unassignedZones.length} tone={d.unassignedZones.length ? "warn" : "good"} sub="담당 미배정 구역" />
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="card">
          <h3 className="font-bold">등급별 확보 현황 (10억 목표 환산)</h3>
          <div className="mb-2 text-xs text-ink-3">S 500만·8곳 / A 200만·12곳 / B 80만·25곳 → 월 8,400만</div>
          {(["S", "A", "B"] as const).map((k) => (
            <div key={k} className="mb-2.5">
              <div className="flex justify-between">
                <span>
                  <GradePill grade={k} /> {GRADE_LABEL[k]} <span className="text-xs text-ink-3">월 {GRADE_AMOUNT[k]}만</span>
                </span>
                <b className="tabular-nums">
                  {d.grades[k]} / {d.targets[k]}곳
                </b>
              </div>
              <Bar pct={(d.grades[k] / d.targets[k]) * 100} tone={k === "A" ? "amber" : k === "B" ? "good" : undefined} />
            </div>
          ))}
          <div className="stage-strip mt-3">
            {d.stageCounts.map((s) => (
              <div key={s.stage}>
                <div className="font-display text-xl font-bold tabular-nums">{s.count}</div>
                <div className="text-[11px] text-ink-3">{s.stage}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold">알림</h3>
          <div className="mb-2 text-xs text-ink-3">중복 방지 프로토콜 · 미방문 알림</div>
          <div className="space-y-2">
            {d.dupes.map((x, i) => (
              <div key={i} className="alert border-crit">
                <div className="min-w-0 flex-1 text-sm">
                  {x.type === "name" ? (
                    <>
                      <b className="block">동일 업체명 중복 등록 — {x.account.name}</b>
                      {x.dupList?.map((a) => `${a.registeredAt || "?"} 등록 · ${a.ownerName} · ${a.zoneName}`).join(" / ")} → 선등록 담당이 우선
                    </>
                  ) : (
                    <>
                      <b className="block">7일 내 2인 이상 접촉 — {x.account.name}</b>
                      {x.staff?.join(", ")} · 담당 {x.account.ownerName} 외에는 인사 후 철수
                    </>
                  )}
                </div>
              </div>
            ))}
            {d.unassignedZones.map((z) => (
              <div key={z.id} className="alert">
                <div className="text-sm">
                  <b className="block">공백 구역 — {z.name}</b>거래처 {z.accountCount}곳 담당 없음 · 자동 배정 실행 권장
                </div>
              </div>
            ))}
            {d.unvisited.slice(0, 6).map((a) => (
              <div key={a.id} className={`alert ${a.overdue > 14 ? "border-crit" : ""}`}>
                <div className="min-w-0 flex-1 text-sm">
                  <b className="block">
                    <GradePill grade={a.grade} /> {a.name} <VisitPill lastVisit={a.lastVisit} overdue={a.overdue} />
                  </b>
                  담당 {a.ownerName} · {a.zoneName} · {a.nextAction || "차기 액션 미기입"}
                </div>
                <button className="btn btn-sm" onClick={() => setCheckin(a.id)}>
                  체크인
                </button>
              </div>
            ))}
            {d.unvisitedTotal > 6 && <div className="text-xs text-ink-3">외 {d.unvisitedTotal - 6}건 — 거래처 화면에서 확인</div>}
            {!d.dupes.length && !d.unvisitedTotal && !d.unassignedZones.length && (
              <div className="alert border-good text-sm">
                <b>이상 없음</b> — 중복·미방문·공백 구역이 없습니다.
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold">다가오는 일정</h3>
          <div className="mb-2 text-xs text-ink-3">행사·교육·마감</div>
          {d.upcoming.map((e) => (
            <div key={e.id} className="flex justify-between gap-2 py-0.5 text-sm">
              <span>
                <b className="tabular-nums">
                  {shortD(e.date)} ({DOW[parseD(e.date).getDay()]})
                </b>{" "}
                <Pill>{e.kind}</Pill> {e.title}
              </span>
              <span className="text-xs text-ink-3">{e.who}</span>
            </div>
          ))}
          {!d.upcoming.length && <div className="text-ink-3">등록된 일정이 없습니다.</div>}
          <h3 className="mt-4 font-bold">회의·보고 사이클</h3>
          <table className="table mt-1">
            <tbody>
              {CYCLE.map((c) => (
                <tr key={c[0]}>
                  <td className="whitespace-nowrap font-semibold">{c[0]}</td>
                  <td>{c[1]}</td>
                  <td className="text-xs text-ink-3">{c[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-bold">담당별 부하</h3>
          <div className="mb-2 text-xs text-ink-3">담당 구역 수 / 가능 구역 · 거래처 수 · 이번 주 활동</div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>담당</th>
                  <th className="text-right">구역</th>
                  <th className="text-right">거래처</th>
                  <th className="text-right">S/A/B</th>
                  <th className="text-right">주간 활동</th>
                </tr>
              </thead>
              <tbody>
                {d.load.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <OwnerChip name={s.name} color={colorFor(idx(s.id))} /> <span className="text-xs text-ink-3">{s.rank}</span>
                    </td>
                    <td className="text-right tabular-nums">
                      {s.zones} / {s.zoneCap}
                    </td>
                    <td className="text-right tabular-nums">{s.accounts}</td>
                    <td className="text-right tabular-nums">
                      {s.grades.S}/{s.grades.A}/{s.grades.B}
                    </td>
                    <td className="text-right tabular-nums">
                      {s.weekVisits} / {s.capacity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {checkin !== null && (
        <CheckinModal
          preset={{ accountId: checkin || undefined }}
          onClose={() => setCheckin(null)}
          onSaved={() => {
            setCheckin(null);
            toast("체크인했습니다");
            void dash.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}
