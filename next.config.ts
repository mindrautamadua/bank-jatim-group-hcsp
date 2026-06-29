import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Catatan: script-src memakai 'unsafe-inline' karena Next
// menyuntik skrip bootstrap inline (tanpa nonce). Tetap bernilai sebagai pertahanan
// berlapis: membatasi skrip eksternal, melarang object/base, mengunci frame-ancestors
// & form-action. Di dev, Turbopack butuh 'unsafe-eval' + websocket HMR.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // 'upgrade-insecure-requests' sengaja tidak dipakai: akan memaksa HTTPS pada
  // subresource & merusak deployment HTTP internal. Tambahkan kembali bila sudah HTTPS.
].join("; ");

const nextConfig: NextConfig = {
  // Unggahan evidence kegiatan & dokumen (≤15 MB) lewat Server Action — naikkan
  // dari batas default 1 MB agar berkas tidak ditolak.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
