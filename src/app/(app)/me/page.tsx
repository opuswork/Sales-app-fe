"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CheckinModal } from "@/components/checkin-modal";
import { Bar, GradePill, Kpi, Modal, Pill, StagePill, Toast, VisitPill } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { addDays, DOW, GRADE_LABEL, parseD, shortD, todayStr, weekStartOf } from "@/lib/utils";

type MyPage = {
  staff: { id: string; name: string; rank: string; part: string; roleDesc: string; note: string; skills: Record<string, number>; capacity: number };
  target: { S: number; A: number; B: number; amount: number } | null;
  kpis: { accounts: number; zones: number; contracted: number; amount: number; weekVisits: number; unvisited: number; score: number; filled: number };
  grades: Record<string, number>;
  stageCounts: { stage: string; count: number }[];
  unvisited: { id: string; name: string; grade: string; overdue: number; lastVisit: string; nextAction: string; zoneName: string }[];
  nextActions: { id: string; name: string; stage: string; nextAction: string; nextDate: string }[];
  myZones: { id: string; name: string; channel: string; difficulty: number; accountCount: number }[];
  events: { id: string; date: string; kind: string; title: string; place: string; memo: string }[];
  recentVisits: { id: string; date: string; type: string; content: string; accountName: string }[];
};
type Week = {
  weekStart: string;
  weekEnd: string;
  plans: { staffId: string; items: { day: number; accountId: string; accountName: string; grade: string; zoneName: string; reason: string; done: boolean }[] }[];
  events: { id: string; date: string; kind: string; title: string; who: string; place: string }[];
};

function MeInner() {
  const { user, reload } = useAuth();
  const params = useSearchParams();
  const { message, toast } = useToast();
  const [staffId, setStaffId] = useState<string>("");
  const sid = staffId || user?.id || "";
  const page = useApi<MyPage>(sid ? `/api/me/page?staffId=${sid}` : null, [sid]);
  const ws = weekStartOf(todayStr());
  const week = useApi<Week>(sid ? `/api/plans/week?weekStart=${ws}&staffId=${sid}` : null, [sid]);
  const staffList = useApi<{ id: string; name: string; rank: string; field: boolean }[]>(user?.isAdmin ? "/api/users" : null);
  const [checkin, setCheckin] = useState<{ accountId?: string; date?: string } | null>(null);
  const [pwOpen, setPwOpen] = useState(params.get("changePw") === "1" || !!user?.mustChangePw);
  const [kakao, setKakao] = useState<{ code: string; expiresAt: string } | null>(null);

  useEffect(() => {
    if (user?.mustChangePw) setPwOpen(true);
  }, [user]);

  const p = page.data;
  const plan = week.data?.plans[0];
  const T = todayStr();

  const gen = async () => {
    const r = await api<{ count: number }>("/api/plans/generate", { method: "POST", json: { staffId: sid, weekStart: ws } });
    toast(`${r.count}건의 방문 일정을 생성했습니다`);
    void week.reload();
  };
  const linkKakao = async () => {
    const r = await api<{ code: string; expiresAt: string }>("/api/users/me/kakao-link-code", { method: "POST" });
    setKakao(r);
  };

  if (!p) return <div className="p-10 text-center text-ink-3">{page.error || "불러오는 중…"}</div>;
  const s = p.staff;
  const forMe = week.data?.events ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-ink">{s.name.slice(0, 1)}</span>
          <div>
            <h2 className="text-lg font-bold">
              {s.name} <span className="font-sans text-xs font-normal text-ink-3">{s.rank} · {s.part}</span>
            </h2>
            <p className="text-ink-2">{s.roleDesc}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.isAdmin && staffList.data && (
            <select className="input !w-auto" value={sid} onChange={(e) => setStaffId(e.target.value)}>
              {staffList.data.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} {x.rank}
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setCheckin({})}>
            방문 체크인
          </button>
          <button className="btn" onClick={linkKakao}>
            {user?.kakaoLinked && sid === user.id ? "카카오톡 재연결" : "카카오톡 연결"}
          </button>
          <button className="btn" onClick={() => setPwOpen(true)}>
            비밀번호 변경
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="담당 거래처" value={p.kpis.accounts} sub={`구역 ${p.kpis.zones}곳`} />
        <Kpi label="계약 이상" value={p.kpis.contracted} tone="good" sub={`환산 월 ${p.kpis.amount.toLocaleString()}만${p.target ? ` / 목표 ${p.target.amount.toLocaleString()}만` : ""}`} />
        <Kpi label="이번 주 활동" value={<>{p.kpis.weekVisits}<span className="text-xs text-ink-3"> / {s.capacity}</span></>} sub={`${ws.slice(5)} ~ ${addDays(ws, 6).slice(5)}`} />
        <Kpi label="미방문 경고" value={p.kpis.unvisited} tone={p.kpis.unvisited ? "warn" : "good"} sub="등급 기준 초과" />
        <Kpi label="이번 달 평가" value={<>{p.kpis.score}<span className="text-xs text-ink-3"> 점</span></>} sub={`기입률 ${Math.round(p.kpis.filled * 100)}%`} />
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="card">
          <h3 className="font-bold">이번 주 일정</h3>
          <div className="mb-2 text-xs text-ink-3">
            {ws} ~ {addDays(ws, 6)} · 계획 {plan?.items.length ?? 0}건 · 완료 {plan?.items.filter((i) => i.done).length ?? 0}건
          </div>
          {[0, 1, 2, 3, 4, 5].map((d) => {
            const date = addDays(ws, d);
            const its = plan?.items.filter((i) => i.day === d) ?? [];
            const evs = forMe.filter((e) => e.date === date && (/전원|전체/.test(e.who || "") || (e.who || "").includes(s.name)));
            if (!its.length && !evs.length && date !== T) return null;
            return (
              <div key={d} className="border-t border-line py-2 first:border-t-0">
                <h4 className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold">
                  {DOW[parseD(date).getDay()]} {shortD(date)} {date === T && <Pill kind="warn">오늘</Pill>}
                  <span className="text-xs font-normal text-ink-3">{its.length}건</span>
                </h4>
                {evs.map((e) => (
                  <div key={e.id} className="me-it !bg-amber-soft">
                    <div className="min-w-0 flex-1">
                      <b className="block">{e.kind} · {e.title}</b>
                      <span className="text-xs text-ink-2">{e.place}</span>
                    </div>
                  </div>
                ))}
                {its.map((it) => (
                  <div key={it.accountId} className={`me-it ${it.done ? "opacity-60" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <b className={`block ${it.done ? "line-through" : ""}`}>
                        <GradePill grade={it.grade} /> {it.accountName}
                      </b>
                      <span className="text-xs text-ink-2">
                        {it.zoneName} · {it.reason}
                      </span>
                    </div>
                    {it.done ? <Pill kind="good">완료</Pill> : <button className="btn btn-sm btn-primary" onClick={() => setCheckin({ accountId: it.accountId, date: date <= T ? date : T })}>체크인</button>}
                  </div>
                ))}
                {!its.length && !evs.length && <div className="text-xs text-ink-3">예정 없음</div>}
              </div>
            );
          })}
          {!plan?.items.length && <div className="text-ink-3">이번 주 계획이 없습니다.</div>}
          <div className="mt-2.5 flex gap-2">
            <button className="btn" onClick={gen}>
              {plan?.items.length ? "일정 다시 생성" : "이번 주 일정 자동 생성"}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold">내 영업실적</h3>
          <div className="mb-2 text-xs text-ink-3">계약 이상 단계 기준{p.target ? " · 12개월 목표 배분안 대비" : ""}</div>
          {(["S", "A", "B"] as const).map((k) => {
            const t = p.target ? p.target[k] : 0;
            return (
              <div key={k} className="mb-2.5">
                <div className="flex justify-between">
                  <span>
                    <GradePill grade={k} /> {GRADE_LABEL[k]}
                  </span>
                  <b className="tabular-nums">
                    {p.grades[k]}
                    {t ? ` / ${t}곳` : "곳"}
                  </b>
                </div>
                {t > 0 && <Bar pct={(p.grades[k] / t) * 100} tone={k === "A" ? "amber" : k === "B" ? "good" : undefined} />}
              </div>
            );
          })}
          <div className="stage-strip mt-3">
            {p.stageCounts.map((st) => (
              <div key={st.stage}>
                <div className="font-display text-xl font-bold tabular-nums">{st.count}</div>
                <div className="text-[11px] text-ink-3">{st.stage}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold">미방문·차기 액션</h3>
          <div className="mb-2 text-xs text-ink-3">먼저 챙길 거래처</div>
          {p.unvisited.map((a) => (
            <div key={a.id} className="me-it">
              <div className="min-w-0 flex-1">
                <b className="block">
                  <GradePill grade={a.grade} /> {a.name} <VisitPill lastVisit={a.lastVisit} overdue={a.overdue} />
                </b>
                <span className="text-xs text-ink-2">{a.nextAction || "차기 액션 미기입"}</span>
              </div>
              <button className="btn btn-sm" onClick={() => setCheckin({ accountId: a.id })}>
                체크인
              </button>
            </div>
          ))}
          {p.nextActions.map((a) => (
            <div key={a.id} className="me-it">
              <div className="min-w-0 flex-1">
                <b className="block">{a.name}</b>
                <span className="text-xs text-ink-2">
                  {a.nextDate ? shortD(a.nextDate) + " · " : ""}
                  {a.nextAction}
                </span>
              </div>
              <StagePill stage={a.stage} />
            </div>
          ))}
          {!p.unvisited.length && !p.nextActions.length && <div className="text-ink-3">챙길 항목이 없습니다.</div>}
        </div>

        <div className="card">
          <h3 className="font-bold">내 역할·구역</h3>
          <div className="mb-2 text-xs text-ink-3">{s.note}</div>
          {p.myZones.map((z) => (
            <div key={z.id} className="me-it">
              <div>
                <b className="block">{z.name}</b>
                <span className="text-xs text-ink-2">
                  {z.channel} · 난이도 {z.difficulty} · 거래처 {z.accountCount}곳
                </span>
              </div>
            </div>
          ))}
          {!p.myZones.length && <div className="text-ink-3">배정된 구역이 없습니다.</div>}
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(s.skills ?? {}).map(([c, v]) => (
              <Pill key={c} kind={v >= 4 ? "S" : v >= 3 ? "A" : "B"}>
                {c} {v}
              </Pill>
            ))}
          </div>
          {p.events.length > 0 && (
            <>
              <h3 className="mt-3.5 font-bold">다가오는 행사·회의</h3>
              {p.events.map((e) => (
                <div key={e.id} className="text-xs">
                  <b className="tabular-nums">
                    {shortD(e.date)} ({DOW[parseD(e.date).getDay()]})
                  </b>{" "}
                  <Pill>{e.kind}</Pill> {e.title}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card md:col-span-2">
          <h3 className="font-bold">최근 내 활동</h3>
          {p.recentVisits.map((v) => (
            <div key={v.id} className="border-t border-line py-1.5 text-xs first:border-t-0">
              <b>
                {shortD(v.date)} [{v.type}] {v.accountName}
              </b>
              <div className="text-ink-3">{v.content}</div>
            </div>
          ))}
          {!p.recentVisits.length && <div className="text-ink-3">기록이 없습니다.</div>}
        </div>
      </div>

      {checkin && (
        <CheckinModal
          preset={{ accountId: checkin.accountId, date: checkin.date, staffId: sid }}
          onClose={() => setCheckin(null)}
          onSaved={() => {
            setCheckin(null);
            toast("체크인했습니다");
            void page.reload();
            void week.reload();
          }}
        />
      )}
      {kakao && (
        <Modal title="카카오톡 채널 연결" onClose={() => setKakao(null)}>
          <p className="text-sm">카카오톡에서 영업 채널 채팅방을 열고 아래 메시지를 10분 안에 보내세요.</p>
          <div className="my-3 rounded-lg bg-surface-2 p-4 text-center font-display text-2xl font-bold tracking-widest">연결 {kakao.code}</div>
          <p className="text-xs text-ink-2">연결 후에는 "다이클로 일광점 방문. 물류 일괄입고 협의, 다음주 견적서 송부" 처럼 보내면 자동으로 체크인됩니다. "일정", "실적" 도 물어볼 수 있습니다.</p>
        </Modal>
      )}
      {pwOpen && (
        <ChangePwModal
          onClose={() => setPwOpen(false)}
          onDone={() => {
            setPwOpen(false);
            toast("비밀번호를 변경했습니다");
            void reload();
          }}
          forced={!!user?.mustChangePw}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

function ChangePwModal({ onClose, onDone, forced }: { onClose: () => void; onDone: () => void; forced: boolean }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const save = async () => {
    try {
      await api("/api/auth/change-password", { method: "POST", json: { currentPassword: cur, newPassword: next } });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal
      title={forced ? "비밀번호를 먼저 변경해 주세요" : "비밀번호 변경"}
      onClose={onClose}
      footer={
        <>
          {!forced && (
            <button className="btn" onClick={onClose}>
              취소
            </button>
          )}
          <button className="btn btn-primary" onClick={save} disabled={next.length < 8}>
            변경
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">현재 비밀번호 (임시 비밀번호)</label>
          <input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </div>
        <div>
          <label className="label">새 비밀번호 (8자 이상)</label>
          <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        {err && <div className="text-sm text-crit">{err}</div>}
      </div>
    </Modal>
  );
}

export default function MePage() {
  return (
    <Suspense>
      <MeInner />
    </Suspense>
  );
}
