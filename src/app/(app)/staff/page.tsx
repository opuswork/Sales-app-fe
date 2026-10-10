"use client";

import { Mic, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Checks, Field, Modal, OwnerChip, PageHeader, Pill, Toast } from "@/components/ui";
import { UploadRecordingModal } from "@/components/upload-recording-modal";
import { api } from "@/lib/api";
import { Staff, useApi, useSettings, useStaff } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";
import { colorFor } from "@/lib/utils";

type Rec = { id: string; staffId: string; status: string; title: string; createdAt: string; draftCounts: { pending: number; applied: number } };

const expLevel = (y: number) => (y < 2 ? 1 : y < 4 ? 2 : y < 7 ? 3 : y < 11 ? 4 : 5);
const STATUS_KO: Record<string, string> = { QUEUED: "대기", TRANSCRIBING: "받아쓰는 중", ANALYZING: "분석 중", READY: "초안 검토", APPLIED: "반영됨", FAILED: "실패" };

export default function StaffPage() {
  const staff = useStaff();
  const recs = useApi<Rec[]>("/api/recordings");
  const settings = useSettings();
  const [edit, setEdit] = useState<Partial<Staff> | null>(null);
  const [upload, setUpload] = useState<string | null>(null);
  const { message, toast } = useToast();
  const c = settings.data?.constants;

  const recsOf = (id: string) => (recs.data ?? []).filter((r) => r.staffId === id);

  return (
    <div>
      <PageHeader
        title="담당자"
        desc="직급·Skill(채널 역량 0~5)·경험치(경력 연수)·거점·취급 제품은 자동 배정 점수에 반영됩니다. 음성녹음 칸에 녹취(m4a)를 올리면 구역·거래처·방문·일정·보고서 초안이 자동으로 만들어집니다."
        actions={
          <button className="btn btn-primary" onClick={() => setEdit({ rank: "대리", part: "필드영업", base: "부산", exp: 3, skills: {}, products: c?.products ?? [], field: true, zoneCap: 3, capacity: 4, role: "STAFF" })}>
            담당자 추가
          </button>
        }
      />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>담당</th>
              <th>직급</th>
              <th>파트 · 역할</th>
              <th>거점</th>
              <th className="text-right">경력</th>
              <th>Skill (급식·유통·특수·상권·박람회·온라인)</th>
              <th>음성녹음</th>
              <th>제품</th>
              <th className="text-right">구역/주간</th>
              <th>담당 구역</th>
              <th>로그인</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(staff.data ?? []).map((s, i) => {
              const rs = recsOf(s.id);
              const pending = rs.filter((r) => r.status === "READY").length;
              const busy = rs.filter((r) => ["QUEUED", "TRANSCRIBING", "ANALYZING"].includes(r.status)).length;
              return (
                <tr key={s.id}>
                  <td>
                    <OwnerChip name={s.name} color={colorFor(i)} /> {!s.field && <Pill>배정 제외</Pill>} {!s.active && <Pill kind="crit">비활성</Pill>}
                  </td>
                  <td>{s.rank}</td>
                  <td>
                    <b>{s.part}</b>
                    <div className="text-xs text-ink-3">{s.roleDesc}</div>
                  </td>
                  <td>{s.base}</td>
                  <td className="text-right tabular-nums">
                    {s.exp}년 <span className="text-xs text-ink-3">Lv{expLevel(s.exp)}</span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {(c?.channels ?? []).map((ch) => (
                        <Pill key={ch} kind={(s.skills?.[ch] ?? 0) >= 4 ? "S" : (s.skills?.[ch] ?? 0) >= 3 ? "A" : "B"}>
                          {s.skills?.[ch] ?? 0}
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-sm" onClick={() => setUpload(s.id)} title="녹취 업로드">
                        <Upload size={12} /> 업로드
                      </button>
                      <Link href={`/recordings?staffId=${s.id}`} className="text-xs text-ink-2 hover:underline">
                        <Mic size={12} className="inline" /> {rs.length}건
                        {pending > 0 && <Pill kind="warn" className="ml-1">초안 {pending}</Pill>}
                        {busy > 0 && <Pill className="ml-1">처리 중 {busy}</Pill>}
                      </Link>
                    </div>
                  </td>
                  <td className="text-xs">{s.products.join(", ")}</td>
                  <td className="text-right tabular-nums">
                    {s.zoneCap} / {s.capacity}
                  </td>
                  <td className="text-xs">{s.zones?.length ? s.zones.map((z) => z.name).join(", ") : <span className="text-ink-3">—</span>}</td>
                  <td>
                    <div className="text-xs">{s.email}</div>
                    {s.kakaoLinked ? <Pill kind="good">카톡 연결</Pill> : <Pill>카톡 미연결</Pill>}
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setEdit(s)}>
                      수정
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs text-ink-3">
        Skill 기준: 5 = 채널 전담 가능(레퍼런스 보유), 3 = 동행 없이 상담 가능, 1 = 교육 필요. 경험치 레벨: 0~1년 Lv1 · 2~3년 Lv2 · 4~6년 Lv3 · 7~10년 Lv4 · 11년+ Lv5. 구역 난이도가 레벨보다 높으면 감점됩니다.
      </p>
      {edit && c && (
        <StaffForm
          init={edit}
          constants={c}
          onClose={() => setEdit(null)}
          onSaved={(msg) => {
            setEdit(null);
            toast(msg);
            void staff.reload();
          }}
        />
      )}
      {upload && (
        <UploadRecordingModal
          staffId={upload}
          onClose={() => setUpload(null)}
          onSaved={() => {
            setUpload(null);
            toast("녹취를 올렸습니다. 받아쓰기 후 초안이 생성됩니다.");
            void recs.reload();
          }}
        />
      )}
      <Toast message={message} />
    </div>
  );
}

function StaffForm({ init, constants: c, onClose, onSaved }: { init: Partial<Staff>; constants: NonNullable<ReturnType<typeof useSettings>["data"]>["constants"]; onClose: () => void; onSaved: (msg: string) => void }) {
  const [f, setF] = useState<Partial<Staff> & { password?: string }>({ ...init, skills: { ...(init.skills ?? {}) } });
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const isNew = !init.id;
  const save = async () => {
    if (!f.name?.trim() || !f.email?.trim()) {
      setErr("이름과 이메일을 입력하세요");
      return;
    }
    try {
      const body = { ...f, zones: undefined, _count: undefined, kakaoLinked: undefined, id: undefined, createdAt: undefined, updatedAt: undefined, mustChangePw: undefined };
      if (isNew) {
        const r = await api<{ tempPassword?: string }>("/api/users", { method: "POST", json: body });
        onSaved(r.tempPassword ? `등록 완료. 임시 비밀번호: ${r.tempPassword}` : "등록했습니다");
      } else {
        await api(`/api/users/${init.id}`, { method: "PATCH", json: body });
        onSaved("저장했습니다");
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const reset = async () => {
    if (!confirm("임시 비밀번호를 새로 발급할까요? 기존 로그인은 모두 해제됩니다.")) return;
    const r = await api<{ tempPassword: string }>(`/api/users/${init.id}/reset-password`, { method: "POST" });
    alert(`임시 비밀번호: ${r.tempPassword}\n담당자에게 전달하세요. 첫 로그인 때 변경하게 됩니다.`);
  };
  const remove = async () => {
    if (!confirm("담당자를 삭제할까요? 방문 기록도 함께 삭제됩니다.")) return;
    await api(`/api/users/${init.id}`, { method: "DELETE" });
    onSaved("삭제했습니다");
  };
  return (
    <Modal
      title={isNew ? "담당자 추가" : "담당자 수정"}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && (
            <>
              <button className="btn btn-danger mr-auto" onClick={remove}>
                삭제
              </button>
              <button className="btn" onClick={reset}>
                비밀번호 초기화
              </button>
            </>
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
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="이름">
          <input className="input" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="로그인 이메일">
          <input className="input" type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label={isNew ? "초기 비밀번호 (비우면 임시 발급)" : "새 비밀번호 (변경 시만)"}>
          <input className="input" type="password" value={f.password ?? ""} onChange={(e) => set("password", e.target.value)} />
        </Field>
        <Field label="권한">
          <select className="input" value={f.role ?? "STAFF"} onChange={(e) => set("role", e.target.value)}>
            <option value="STAFF">담당자</option>
            <option value="ADMIN">관리자 (부장·총괄)</option>
          </select>
        </Field>
        <Field label="직급">
          <select className="input" value={f.rank} onChange={(e) => set("rank", e.target.value)}>
            {c.ranks.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="파트">
          <select className="input" value={f.part} onChange={(e) => set("part", e.target.value)}>
            {c.parts.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="역할 / 전담 채널" className="md:col-span-2">
          <input className="input" value={f.roleDesc ?? ""} onChange={(e) => set("roleDesc", e.target.value)} />
        </Field>
        <Field label="거점 (근무 지역)">
          <select className="input" value={f.base} onChange={(e) => set("base", e.target.value)}>
            {c.sidos.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="경험치 (경력 연수)" hint="계약 실적이 많으면 연수를 가산">
          <input className="input" type="number" min={0} max={40} value={f.exp ?? 0} onChange={(e) => set("exp", Number(e.target.value))} />
        </Field>
        <Field label="담당 가능 구역 수">
          <input className="input" type="number" min={0} max={10} value={f.zoneCap ?? 0} onChange={(e) => set("zoneCap", Number(e.target.value))} />
        </Field>
        <Field label="주간 활동 가능 건수">
          <input className="input" type="number" min={0} max={40} value={f.capacity ?? 0} onChange={(e) => set("capacity", Number(e.target.value))} />
        </Field>
        <Field label="Skill — 채널별 역량 (0~5)" className="md:col-span-3">
          {c.channels.map((ch) => (
            <div key={ch} className="grid grid-cols-[110px_1fr_28px] items-center gap-2.5 text-[12.5px]">
              <span>{ch}</span>
              <input type="range" min={0} max={5} step={1} value={f.skills?.[ch] ?? 0} onChange={(e) => set("skills", { ...(f.skills ?? {}), [ch]: Number(e.target.value) })} className="accent-accent" />
              <output className="text-right font-semibold tabular-nums">{f.skills?.[ch] ?? 0}</output>
            </div>
          ))}
        </Field>
        <Field label="취급 제품" className="md:col-span-2">
          <Checks options={c.products} value={f.products ?? []} onChange={(v) => set("products", v)} />
        </Field>
        <Field label="자동 배정 대상">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.field} onChange={(e) => set("field", e.target.checked)} /> 필드 배정 대상
          </label>
          <label className="mt-1 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.active ?? true} onChange={(e) => set("active", e.target.checked)} /> 활성 (로그인 가능)
          </label>
        </Field>
        <Field label="연락처">
          <input className="input" value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="메모" className="md:col-span-2">
          <textarea className="input min-h-[60px]" value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </div>
      {err && <div className="mt-2 text-sm text-crit">{err}</div>}
    </Modal>
  );
}
