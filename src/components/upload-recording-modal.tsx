"use client";

import { useState } from "react";

import { Field, Modal } from "@/components/ui";
import { apiUpload } from "@/lib/api";
import { todayStr } from "@/lib/utils";

export function UploadRecordingModal({ staffId, onClose, onSaved }: { staffId?: string; onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [recordedAt, setRecordedAt] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!file) {
      setErr("m4a 파일을 선택하세요");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name.replace(/\.[^.]+$/, ""));
      fd.append("recordedAt", recordedAt);
      if (staffId) fd.append("staffId", staffId);
      await apiUpload("/api/recordings", fd);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="음성 녹취 업로드"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !file}>
            {busy ? "올리는 중…" : "업로드"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="녹취 파일 (m4a · mp3 · wav)" hint="카카오톡 통화 녹음, 휴대폰 녹음 파일 그대로 올리면 됩니다. 1시간 녹음은 받아쓰기에 약 5~10분(GPU) 걸립니다.">
          <input className="input" type="file" accept=".m4a,.mp3,.wav,.aac,.webm,.ogg,audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="제목 (선택)">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 다이클로 일광점 미팅" />
        </Field>
        <Field label="녹음일" hint="'어제', '다음 주' 같은 표현을 이 날짜 기준으로 환산합니다">
          <input className="input" type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
        </Field>
        <p className="rounded-lg bg-surface-2 p-2.5 text-xs text-ink-2">
          처리 순서: 받아쓰기(이 PC의 STT 워커) → 분석(Claude) → <b>초안 검토</b> 화면에서 항목별로 확인 후 「모두 반영」. 반영 전에는 데이터가 바뀌지 않습니다.
        </p>
        {err && <div className="text-sm text-crit">{err}</div>}
      </div>
    </Modal>
  );
}
