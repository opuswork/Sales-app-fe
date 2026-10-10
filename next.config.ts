import type { NextConfig } from "next";

const backendBase = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3002"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    // /api/* 는 백엔드로 프록시 (로컬 개발·단일 도메인 운영용 안전망)
    return {
      fallback: [{ source: "/api/:path*", destination: `${backendBase}/api/:path*` }],
    };
  },
};

export default nextConfig;
