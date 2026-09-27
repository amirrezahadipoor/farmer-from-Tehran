import type { NextConfig } from "next";

/**
 * همین کد دو جور منتشر می‌شود (نقشه‌ی راه، مورد ۲):
 *  • سرورِ کامل (next start یا Vercel): API ذخیره‌ی ابری + هدرها.
 *  • دموی ایستا روی GitHub Pages با NEXT_PUBLIC_STATIC=1: output "export" زیرِ مسیرِ پایه و بدونِ API؛
 *    بازی خودش آفلاین‌فِرست است و ذخیره روی دستگاه می‌ماند (src/game/base.ts).
 */
const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const serverHeaders: NextConfig["headers"] = async () => [
  {
    // Service Worker باید همیشه تازه بررسی شود و روی کل دامنه اجازه‌ی کنترل داشته باشد
    source: "/sw.js",
    headers: [
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" },
    ],
  },
  {
    source: "/manifest.json",
    headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
  },
  {
    source: "/fonts/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  },
];

const nextConfig: NextConfig = {
  ...(BASE ? { basePath: BASE } : {}),
  ...(STATIC
    ? { output: "export" as const, typescript: { tsconfigPath: "tsconfig.static.json" } }
    : { headers: serverHeaders }),
};

export default nextConfig;
