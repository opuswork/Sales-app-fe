"use client";

import { BarChart3, ClipboardCheck, FileText, LayoutGrid, LogOut, Map, Mic, Shuffle, Store, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/me", label: "내 화면", icon: User, staff: true },
  { href: "/dashboard", label: "대시보드", icon: LayoutGrid, staff: false },
  { href: "/staff", label: "담당자", icon: Users, staff: false },
  { href: "/zones", label: "구역", icon: Map, staff: true },
  { href: "/assign", label: "자동 배정", icon: Shuffle, staff: false },
  { href: "/accounts", label: "거래처", icon: Store, staff: true },
  { href: "/visits", label: "방문·체크인", icon: ClipboardCheck, staff: true },
  { href: "/schedule", label: "영업일정", icon: BarChart3, staff: true },
  { href: "/recordings", label: "음성녹음", icon: Mic, staff: true },
  { href: "/reports", label: "보고서", icon: FileText, staff: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="p-16 text-center text-ink-3">불러오는 중…</div>;
  }
  const items = NAV.filter((n) => user.isAdmin || n.staff);

  return (
    <div className="grid min-h-full grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 z-20 flex flex-row items-center gap-2 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:h-screen md:flex-col md:items-stretch md:gap-1.5 md:overflow-auto md:border-b-0 md:border-r md:px-3.5 md:py-4">
        <div className="shrink-0 pr-2 md:mb-3 md:px-2">
          <div className="hidden text-[11px] uppercase tracking-[.08em] text-ink-3 md:block">Shinangchon Sales</div>
          <h1 className="whitespace-nowrap text-[15px] font-bold md:text-xl">영업구역 배정</h1>
        </div>
        <nav className="flex flex-row gap-0.5 md:flex-col">
          {items.map((n) => {
            const on = pathname === n.href || pathname.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2 md:text-sm",
                  on && "bg-accent-soft font-semibold text-accent",
                )}
              >
                <Icon size={16} className="hidden md:block" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto shrink-0 md:mt-auto md:ml-0 md:border-t md:border-line md:pt-3">
          <div className="hidden text-xs text-ink-2 md:block">
            <b>{user.name}</b> {user.rank} · {user.isAdmin ? "관리자" : "담당자"}
          </div>
          <button className="btn btn-sm mt-0 md:mt-2" onClick={() => void logout().then(() => router.replace("/login"))}>
            <LogOut size={13} /> 로그아웃
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-12 pt-4 md:px-7 md:pt-6">{children}</main>
    </div>
  );
}
