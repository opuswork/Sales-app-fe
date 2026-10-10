"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    router.replace(user ? (user.isAdmin ? "/dashboard" : "/me") : "/login");
  }, [user, loading, router]);
  return <div className="p-16 text-center text-ink-3">불러오는 중…</div>;
}
