"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(email.trim(), password);
      router.replace(u.mustChangePw ? "/me?changePw=1" : u.isAdmin ? "/dashboard" : "/me");
    } catch (err) {
      setError((err as Error).message || "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <div className="text-[11px] uppercase tracking-[.08em] text-ink-3">Shinangchon Sales</div>
          <h1 className="text-xl font-bold">영업구역 배정 로그인</h1>
          <p className="mt-1 text-xs text-ink-2">한 번 로그인하면 이 기기에서 90일간 로그인이 유지됩니다.</p>
        </div>
        {reason === "expired" && <div className="alert border-crit text-sm">로그인이 만료되었습니다. 다시 로그인해 주세요.</div>}
        <div>
          <label className="label" htmlFor="email">
            이메일
          </label>
          <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="text-sm text-crit">{error}</div>}
        <button className="btn btn-primary w-full justify-center py-2.5" disabled={busy}>
          {busy ? "확인 중…" : "로그인"}
        </button>
        <p className="text-center text-[11.5px] text-ink-3">계정이 없으면 부장(관리자)에게 등록을 요청하세요.</p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
