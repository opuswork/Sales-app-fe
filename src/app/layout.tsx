import type { Metadata, Viewport } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";

import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { AuthProvider } from "@/lib/auth-context";

const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const gowun = Gowun_Batang({
  variable: "--font-gowun",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "영업구역 배정",
  description: "신앙촌 영업부 구역 배정·체크인·일정·보고서",
  applicationName: "영업구역 배정",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "영업앱", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7a3a1c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${plex.variable} ${gowun.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
