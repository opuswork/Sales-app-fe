"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { OwnerChip, PageHeader, Pill, Toast } from "@/components/ui";
import { UploadRecordingModal } from "@/components/upload-recording-modal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useApi, useStaff } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor } from "@/lib/utils";

export type Rec = {
  id: string;
  staffId: string;
  staff?: { id: string; name: string; rank: string };
  title: string;
  fileName: string;
  sizeBytes: number;
  durationSec: number | null;
  recordedAt: string;
  status: string;
  summary: string;
  error: string;
  createdAt: string;
  hasTranscript: boolean;
  draftCounts: { pending: number; applied: number; rejected: number };
};

export const STATUS: Record<string, { label: string; kind?: string }> = {
  QUEUED: { label: "받아쓰기 대기" },
  TRANSCRIBING: { label: "받아쓰는 중", kind: "warn" },
  ANALYZING: { label: "분석 중", kind: "warn" },
  READY: { label: "초안 검토 필요", kind: "warn" },
  APPLIED: { label: "반영 완료", kind: "good" },
  FAILED: { label: "실패", kind: "crit" },
};

function RecordingsInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const staff = useStaff();
  const [staffId, setStaffId] = useState(params.get("staffId") ?? "");
  const recs = useApi<Rec[]>(`/api/recordings${staffId && user?.isAdmin ? `?staffId=${staffId}` : ""}`, [staffId]);
  const status = useApi<{ aiAvailable: boolean; model: string }>("/api/recordings/status");
  const [upload, setUpload] = useState(false);
  const { message, toast } = useToast();
  const idx = (id: string) => staff.data?.findIndex((s) => s.id === id) ?? -1;

  // 처리 중인 건이 있으면 15초마다 갱신
  useEffect(() => {
    if (!recs.data?.some((r) => ["QUEUED", "TRANSCRIBING", "ANALYZING"].includes(r.status))) return;
    const t = setInterval(() => void recs.reload(), 15000);
    return () => clearInterval(t);
  }, [recs]);

  const retry = async (id: string) => {
    try {
      await api(`/api/recordings/${id}/retry`, { method: "POST" });
      toast("다시 처리합니다");
    } catch (e) {
      toast((e as Error).message);
    }
    void recs.reload();
  };
  const remove = async (id: string) => {
    if (!confirm("녹취와 초안을 삭제할까요? 이미 반영된 데이터는 남습니다.")) return;
    await api(`/api/recordings/${id}`, { method: "DELETE" });
    void recs.reload();
  };

  return (
    <div>
      <PageHeader
        title="음성녹음"
        desc="영업 미팅·통화 녹취(m4a)를 올리면 받아쓰기 → 분석을 거쳐 구역·거래처·방문 체크인·영업일정·행사·보고서 초안이 만들어집니다. 초안을 검토하고 「모두 반영」하면 데이터에 들어갑니다."
        actions={
          <button className="btn btn-primary" onClick={() => setUpload(true)}>
            녹취 업로드
          </button>
        }
      />
      {status.data && !status.data.aiAvailable && <div className="alert mb-3 border-crit text-sm">서버에 ANTHROPIC_API_KEY 가 설정되지 않아 분석이 실행되지 않습니다. 받아쓰기까지만 진행됩니다.</div>}
      {user?.isAdmin && (
        <div className="mb-3 flex items-center gap-2">
          <select className="input !w-auto" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">모든 담당</option>
            {(staff.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-3">{recs.data?.length ?? 0}건</span>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>녹음</th>
              <th>담당</th>
              <th>녹음일</th>
              <th>상태</th>
              <th>초안</th>
              <th>요약</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(recs.data ?? []).map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/recordings/${r.id}`} className="font-semibold hover:underline">
                    {r.title}
                  </Link>
                  <div className="text-xs text-ink-3">
                    {r.fileName} · {(r.sizeBytes / 1048576).toFixed(1)}MB{r.durationSec ? ` · ${Math.round(r.durationSec / 60)}분` : ""}
                  </div>
                </td>
                <td>
                  <OwnerChip name={r.staff?.name} color={colorFor(idx(r.staffId))} />
                </td>
                <td className="whitespace-nowrap">{r.recordedAt}</td>
                <td>
                  <Pill kind={STATUS[r.status]?.kind}>{STATUS[r.status]?.label ?? r.status}</Pill>
                  {r.error && <div className="max-w-[240px] text-xs text-crit">{r.error}</div>}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {r.draftCounts.pending > 0 && <Pill kind="warn">검토 {r.draftCounts.pending}</Pill>} {r.draftCounts.applied > 0 && <Pill kind="good">반영 {r.draftCounts.applied}</Pill>}
                </td>
                <td className="max-w-[360px] text-xs text-ink-2">{r.summary.slice(0, 140)}</td>
                <td className="whitespace-nowrap">
                  <Link href={`/recordings/${r.id}`} className="btn btn-sm">
                    {r.status === "READY" ? "초안 검토" : "열기"}
                  </Link>{" "}
                  {(r.status === "FAILED" || r.status === "QUEUED") && (
                    <button className="btn btn-sm" onClick={() => retry(r.id)}>
                      재시도
                    </button>
                  )}{" "}
                  <button className="btn btn-sm" onClick={() => remove(r.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {!recs.data?.length && (
              <tr>
                <td colSpan={7} className="text-ink-3">
                  올린 녹취가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs text-ink-3">
        받아쓰기는 사무실 PC의 STT 워커(faster-whisper, GPU)가 서버에서 작업을 가져가 처리합니다. 워커가 꺼져 있으면 「받아쓰기 대기」 상태로 남으니 워커를 켜 주세요. 녹취록이 이미 있으면 상세 화면에서 텍스트를 직접 붙여 넣어 바로 분석할 수 있습니다.
      </p>
      {upload && (
        <UploadRecordingModal
          staffId={user?.isAdmin ? staffId || undefined : undefined}
          onClose={() => setUpload(false)}
          onSaved={() => {
            setUpload(false);
            toast("녹취를 올렸습니다");
            void recs.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

export default function RecordingsPage() {
  return (
    <Suspense>
      <RecordingsInner />
    </Suspense>
  );
}
