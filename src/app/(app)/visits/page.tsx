"use client";

import { useState } from "react";

import { CheckinModal } from "@/components/checkin-modal";
import { OwnerChip, PageHeader, Pill, StagePill, Toast } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useApi, useStaff, Visit } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor } from "@/lib/utils";

const SOURCE: Record<string, string> = { kakao: "카톡", voice: "녹취", seed: "" };

export default function VisitsPage() {
  const { user } = useAuth();
  const staff = useStaff();
  const [staffId, setStaffId] = useState(user && !user.isAdmin ? user.id : "");
  const visits = useApi<Visit[]>(`/api/visits${staffId ? `?staffId=${staffId}` : ""}`, [staffId]);
  const [modal, setModal] = useState<{ visit?: Visit } | null>(null);
  const { message, toast } = useToast();
  const idx = (id: string) => staff.data?.findIndex((s) => s.id === id) ?? -1;

  return (
    <div>
      <PageHeader
        title="방문·체크인"
        desc="미팅보고서 양식(날짜·동행인·상담시간·구분·업체·상담내용·추가영업·이동수단)에 맞춰 활동을 기록합니다. 체크인하면 거래처의 최근 방문일과 진행 상태가 갱신됩니다. 카카오톡 채널로 보낸 보고도 여기에 쌓입니다."
        actions={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            체크인 기록
          </button>
        }
      />
      <div className="mb-3 flex items-center gap-2">
        <select className="input !w-auto" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">모든 담당</option>
          {(staff.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-3">{visits.data?.length ?? 0}건</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>업체</th>
              <th>담당 · 동행</th>
              <th>상담 내용</th>
              <th>추가 영업 / 차기</th>
              <th>제품</th>
              <th>이동</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(visits.data ?? []).map((v) => (
              <tr key={v.id}>
                <td className="whitespace-nowrap tabular-nums">
                  {v.date}
                  <div className="text-xs text-ink-3">{v.duration}</div>
                </td>
                <td>
                  <Pill kind={v.type === "관장님문의" ? "warn" : undefined}>{v.type}</Pill> {SOURCE[v.source] && <Pill kind="good">{SOURCE[v.source]}</Pill>}
                </td>
                <td>
                  <b>{v.account?.name ?? "(삭제된 거래처)"}</b>
                  <div className="text-xs text-ink-3">{v.account?.zone?.name}</div>
                </td>
                <td>
                  <OwnerChip name={v.staff?.name} color={colorFor(idx(v.staffId))} />
                  {v.companion && <div className="text-xs text-ink-3">+ {v.companion}</div>}
                </td>
                <td className="max-w-[320px] text-xs">
                  {v.content}
                  {v.stageAfter && (
                    <div>
                      → <StagePill stage={v.stageAfter} />
                    </div>
                  )}
                </td>
                <td className="text-xs">{v.followup}</td>
                <td className="text-xs">{v.products.join(", ")}</td>
                <td className="text-xs">{v.transport}</td>
                <td>
                  {(user?.isAdmin || v.staffId === user?.id) && (
                    <button className="btn btn-sm" onClick={() => setModal({ visit: v })}>
                      수정
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!visits.data?.length && (
              <tr>
                <td colSpan={9} className="text-ink-3">
                  기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && (
        <CheckinModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            toast("저장했습니다");
            void visits.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}
