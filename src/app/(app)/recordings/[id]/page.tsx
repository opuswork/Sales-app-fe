"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Modal, PageHeader, Pill, Toast } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";

import { STATUS } from "../page";

type Draft = { id: string; kind: string; action: string; title: string; payload: Record<string, unknown>; confidence: number; evidence: string; status: string; appliedId: string };
type Rec = {
  id: string;
  title: string;
  fileName: string;
  recordedAt: string;
  status: string;
  transcript: string;
  summary: string;
  error: string;
  durationSec: number | null;
  staff: { id: string; name: string; rank: string };
  drafts: Draft[];
};

const KIND: Record<string, string> = { zone: "구역", assignment: "구역 배정", account: "거래처", visit: "방문 체크인", plan: "영업일정", event: "행사·일정", report: "보고서" };
const KIND_ORDER = ["zone", "assignment", "account", "visit", "plan", "event", "report"];
const HIDE = new Set(["confidence", "evidence", "accountId", "zoneId", "staffId", "action"]);

function PayloadView({ p }: { p: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {Object.entries(p)
        .filter(([k, v]) => !HIDE.has(k) && v !== null && v !== "" && !(Array.isArray(v) && !v.length))
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-3">{k}</dt>
            <dd className="whitespace-pre-wrap break-words">{k === "markdown" ? <pre className="report max-h-60 text-[11.5px]">{String(v)}</pre> : Array.isArray(v) ? v.join(", ") : String(v)}</dd>
          </div>
        ))}
    </dl>
  );
}

export default function RecordingDetail() {
  const { id } = useParams<{ id: string }>();
  const rec = useApi<Rec>(`/api/recordings/${id}`);
  const { message, toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [tx, setTx] = useState("");
  const [showTx, setShowTx] = useState(false);
  const r = rec.data;

  useEffect(() => {
    if (!r || !["QUEUED", "TRANSCRIBING", "ANALYZING"].includes(r.status)) return;
    const t = setInterval(() => void rec.reload(), 10000);
    return () => clearInterval(t);
  }, [r, rec]);

  if (!r) return <div className="p-10 text-center text-ink-3">{rec.error || "불러오는 중…"}</div>;
  const pending = r.drafts.filter((d) => d.status === "PENDING");
  const groups = KIND_ORDER.map((k) => ({ kind: k, items: r.drafts.filter((d) => d.kind === k) })).filter((g) => g.items.length);

  const applyAll = async (ids?: string[]) => {
    setBusy(true);
    try {
      const res = await api<{ applied: number; failed: { id: string; message: string }[]; pending: number }>(`/api/recordings/${id}/apply`, { method: "POST", json: { draftIds: ids } });
      toast(`${res.applied}건 반영${res.failed.length ? `, ${res.failed.length}건 실패` : ""}`);
      if (res.failed.length) alert(res.failed.map((f) => `- ${f.message}`).join("\n"));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      void rec.reload();
    }
  };
  const reject = async (d: Draft) => {
    await api(`/api/recordings/${id}/drafts/${d.id}/reject`, { method: "POST" });
    void rec.reload();
  };
  const submitTx = async () => {
    setBusy(true);
    try {
      await api(`/api/recordings/${id}/transcript`, { method: "POST", json: { transcript: tx } });
      toast("분석을 시작했습니다");
      setShowTx(false);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      void rec.reload();
    }
  };
  const retry = async () => {
    try {
      await api(`/api/recordings/${id}/retry`, { method: "POST" });
      toast("다시 처리합니다");
    } catch (e) {
      toast((e as Error).message);
    }
    void rec.reload();
  };

  return (
    <div>
      <PageHeader
        title={r.title}
        desc={`${r.staff.name} ${r.staff.rank} · 녹음일 ${r.recordedAt} · ${r.fileName}${r.durationSec ? ` · ${Math.round(r.durationSec / 60)}분` : ""}`}
        actions={
          <>
            <Link href="/recordings" className="btn">
              ← 목록
            </Link>
            <Pill kind={STATUS[r.status]?.kind}>{STATUS[r.status]?.label ?? r.status}</Pill>
            {(r.status === "FAILED" || r.status === "QUEUED") && (
              <button className="btn" onClick={retry}>
                재시도
              </button>
            )}
            {!r.transcript && (
              <button className="btn" onClick={() => setShowTx(true)}>
                녹취록 직접 입력
              </button>
            )}
            {pending.length > 0 && (
              <button className="btn btn-primary" onClick={() => applyAll()} disabled={busy}>
                모두 반영 ({pending.length})
              </button>
            )}
          </>
        }
      />
      {r.error && <div className="alert mb-3 border-crit text-sm">{r.error}</div>}
      {["QUEUED", "TRANSCRIBING", "ANALYZING"].includes(r.status) && (
        <div className="alert mb-3 text-sm">
          {r.status === "QUEUED" ? "STT 워커가 작업을 가져가길 기다리는 중입니다. 사무실 PC의 워커가 켜져 있는지 확인하세요." : r.status === "TRANSCRIBING" ? "받아쓰는 중입니다. 1시간 녹음 기준 GPU 5~10분." : "Claude 가 녹취록을 분석해 초안을 만드는 중입니다 (1~3분)."}
        </div>
      )}
      <div className="grid gap-3.5 md:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {r.summary && (
            <div className="card">
              <h3 className="font-bold">요약</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">{r.summary}</p>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.kind} className="card">
              <h3 className="font-bold">
                {KIND[g.kind]} <span className="text-xs font-normal text-ink-3">{g.items.length}건</span>
              </h3>
              <div className="mt-2 space-y-2">
                {g.items.map((d) => (
                  <div key={d.id} className={`rounded-lg border p-2.5 ${d.status === "APPLIED" ? "border-good bg-good-soft/40" : d.status === "REJECTED" ? "border-line opacity-50" : "border-line bg-surface-2"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">
                        {d.title}{" "}
                        <Pill kind={d.confidence >= 0.8 ? "good" : d.confidence >= 0.5 ? "warn" : "crit"}>신뢰도 {Math.round(d.confidence * 100)}%</Pill>{" "}
                        {d.status === "APPLIED" && <Pill kind="good">반영됨</Pill>}
                        {d.status === "REJECTED" && <Pill>제외</Pill>}
                      </div>
                      {d.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button className="btn btn-sm" onClick={() => setEditing(d)}>
                            수정
                          </button>
                          <button className="btn btn-sm" onClick={() => reject(d)}>
                            제외
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => applyAll([d.id])} disabled={busy}>
                            반영
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <PayloadView p={d.payload} />
                    </div>
                    {d.evidence && <div className="mt-1.5 border-l-2 border-line-strong pl-2 text-xs italic text-ink-3">“{d.evidence}”</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!r.drafts.length && r.status === "READY" && <div className="card text-ink-3">분석 결과 반영할 항목이 없습니다.</div>}
        </div>
        <div className="card self-start">
          <h3 className="font-bold">녹취록</h3>
          {r.transcript ? (
            <pre className="report mt-2 max-h-[70vh] font-sans">{r.transcript}</pre>
          ) : (
            <div className="mt-2 text-sm text-ink-3">아직 받아쓰기 전입니다.</div>
          )}
          {r.transcript && r.status !== "ANALYZING" && (
            <button className="btn btn-sm mt-2" onClick={retry}>
              다시 분석
            </button>
          )}
        </div>
      </div>
      {showTx && (
        <Modal
          title="녹취록 직접 입력"
          onClose={() => setShowTx(false)}
          footer={
            <>
              <button className="btn" onClick={() => setShowTx(false)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={submitTx} disabled={busy || tx.trim().length < 20}>
                분석 시작
              </button>
            </>
          }
        >
          <p className="mb-2 text-xs text-ink-2">다른 도구로 받아쓴 텍스트가 있으면 붙여 넣으세요. STT 없이 바로 분석합니다.</p>
          <textarea className="input min-h-[260px]" value={tx} onChange={(e) => setTx(e.target.value)} />
        </Modal>
      )}
      {editing && (
        <DraftEdit
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void rec.reload();
          }}
          recId={id}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

function DraftEdit({ draft, recId, onClose, onSaved }: { draft: Draft; recId: string; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState(JSON.stringify(draft.payload, null, 2));
  const [err, setErr] = useState("");
  const save = async () => {
    try {
      const payload = JSON.parse(text);
      await api(`/api/recordings/${recId}/drafts/${draft.id}`, { method: "PATCH", json: { payload } });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal
      title={`초안 수정 — ${draft.title}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={save}>
            저장
          </button>
        </>
      }
    >
      <p className="mb-2 text-xs text-ink-2">값을 고친 뒤 저장하고 「반영」을 누르세요. (JSON 형식)</p>
      <textarea className="input min-h-[300px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      {err && <div className="mt-2 text-sm text-crit">{err}</div>}
    </Modal>
  );
}
