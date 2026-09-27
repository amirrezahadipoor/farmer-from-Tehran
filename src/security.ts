/**
 * src/security.ts — سیاستِ امنیتیِ پاسخ‌ها (نقشه‌ی راه، مورد ۶)
 *
 * یک منبع برای دو مسیرِ انتشار:
 *  • سرورِ کامل: هدرهای HTTP روی همه‌ی مسیرها (next.config.ts)
 *  • دموی ایستای GitHub Pages: همین CSP به‌صورتِ <meta> در layout.tsx، چون Pages هدرِ دلخواه نمی‌پذیرد
 *
 * چرا script-src هنوز 'unsafe-inline' دارد: صفحه از پیش و ایستا ساخته می‌شود (سرعتِ بارگذاری، P6.5) و
 * Next داده‌ی React را در اسکریپت‌های درون‌خطی می‌گذارد؛ nonce یعنی رندرِ پویا برای هر درخواست.
 * بقیه‌ی دستورها همچنان جلوی بیشترِ مسیرهای حمله را می‌گیرند: هیچ مبدأ بیرونی (اسکریپت، اتصال، تصویر،
 * فونت، رسانه) مجاز نیست، پس حتی کدِ تزریق‌شده هم نمی‌تواند داده‌ای به بیرون بفرستد؛ object و base و
 * قاب‌گرفتنِ صفحه در سایتِ دیگر بسته است.
 */
export function cspDirectives(opts: { dev?: boolean; meta?: boolean } = {}): string {
  const d: [string, string][] = [
    ["default-src", "'self'"],
    ["script-src", `'self' 'unsafe-inline'${opts.dev ? " 'unsafe-eval'" : ""}`],
    ["style-src", "'self' 'unsafe-inline'"],
    ["img-src", "'self' data: blob:"],
    ["font-src", "'self' data:"],
    ["connect-src", `'self'${opts.dev ? " ws: wss:" : ""}`],
    ["media-src", "'self' data: blob:"],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
  ];
  // frame-ancestors در <meta> پذیرفته نمی‌شود و فقط هشدارِ کنسول می‌سازد
  if (!opts.meta) d.push(["frame-ancestors", "'none'"]);
  return d.map(([k, v]) => `${k} ${v}`).join("; ");
}

/** فقط ویژگی‌هایی که مرورگرها می‌شناسند (ویژگیِ ناشناخته خطای کنسول می‌دهد) و بازی لازمشان ندارد */
export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()";

export const REFERRER_POLICY = "strict-origin-when-cross-origin";

export function securityHeaders(dev = false): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: cspDirectives({ dev }) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: REFERRER_POLICY },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}
