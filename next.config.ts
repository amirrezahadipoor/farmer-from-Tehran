import type { NextConfig } from "next";
import { securityHeaders } from "./src/security";

/**
 * همین کد دو جور منتشر می‌شود (نقشه‌ی راه، مورد ۲):
 *  • سرورِ کامل (next start یا Vercel): API ذخیره‌ی ابری + هدرها.
 *  • دموی ایستا روی GitHub Pages با NEXT_PUBLIC_STATIC=1: output "export" زیرِ مسیرِ پایه و بدونِ API؛
 *    بازی خودش آفلاین‌فِرست است و ذخیره روی دستگاه می‌ماند (src/game/base.ts).
 */
const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** هر مسیری جز فایل‌های ایستا (سند، sw.js، manifest، API) */
export const DOCUMENT_ROUTES = "/((?!_next/static|fonts/|images/|icons/|favicon\\.ico).*)";
export const STATIC_ROUTES = "/(_next/static|fonts|images|icons)/:path*";

const serverHeaders: NextConfig["headers"] = async () => [
  // مورد ۶: CSP، frame-ancestors، Referrer-Policy و Permissions-Policy روی سند، سرویس‌ورکر و API؛ فایل‌های
  // ایستا (چانک، فونت، تصویر) این‌ها را لازم ندارند و فقط nosniff می‌گیرند (هر پاسخِ ایستا ~۶۵۰ بایت سبک‌تر)
  { source: DOCUMENT_ROUTES, headers: securityHeaders(process.env.NODE_ENV === "development") },
  { source: STATIC_ROUTES, headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] },
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
  // مورد ۶: سرآیندِ X-Powered-By نسخه‌ی چارچوب را لو می‌داد
  poweredByHeader: false,
  // مورد ۶: قلابِ تستِ خودکار فقط در توسعه و بیلدِ تست (NEXT_PUBLIC_E2E=1). مقدار هنگامِ build در کد می‌نشیند،
  // پس در بیلدِ منتشرشده شرطِ Game.tsx ثابت است و کمینه‌ساز کلِ کدِ قلاب را حذف می‌کند.
  // GVF_BUILD: شناسه‌ی کامیت در گزارشِ خطا (مورد ۴)
  env: { GVF_BUILD: (process.env.GITHUB_SHA || "local").slice(0, 7), GVF_TEST_HOOKS: process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0" },
  ...(BASE ? { basePath: BASE } : {}),
  ...(STATIC
    ? { output: "export" as const, typescript: { tsconfigPath: "tsconfig.static.json" } }
    : { headers: serverHeaders }),
};

export default nextConfig;
