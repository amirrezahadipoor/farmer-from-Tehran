import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSIONS_POLICY, cspDirectives, securityHeaders } from "../src/security";
import nextConfig from "../next.config";

/** tests/security.test.ts — هدرهای امنیتی و قلابِ تست (نقشه‌ی راه، مورد ۶) */
describe("هدرهای امنیتی", () => {
  it("CSPِ production: بی‌eval، بی‌مبدأِ بیرونی، object و base و قاب بسته", () => {
    const csp = cspDirectives();
    expect(csp).not.toContain("unsafe-eval");
    expect(csp, "هیچ مبدأ بیرونی یا ستاره‌ای").not.toMatch(/https?:|\*|ws:/);
    for (const d of ["default-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      expect(csp).toContain(d);
    }
  });

  it("نسخه‌ی meta (GitHub Pages) بدونِ frame-ancestors که در meta پذیرفته نمی‌شود", () => {
    const meta = cspDirectives({ meta: true });
    expect(meta).not.toContain("frame-ancestors");
    expect(meta).toContain("object-src 'none'");
  });

  it("فقط حالتِ توسعه eval و اتصالِ ws را برای بازسازیِ داغ باز می‌کند", () => {
    const dev = cspDirectives({ dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
  });

  it("پنج هدرِ لازم روی همه‌ی مسیرهای سرور و بدونِ X-Powered-By", async () => {
    const keys = securityHeaders().map((h) => h.key);
    for (const k of ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
      expect(keys).toContain(k);
    }
    expect(nextConfig.poweredByHeader).toBe(false);
    const all = (await nextConfig.headers?.()) ?? [];
    const global = all.find((h) => h.source === "/:path*");
    expect(global?.headers.map((h) => h.key)).toEqual(keys);
  });

  it("Permissions-Policy فقط ویژگی‌های شناخته‌شده را می‌بندد (ویژگیِ ناشناخته خطای کنسول می‌دهد)", () => {
    const known = new Set(["camera", "microphone", "geolocation", "payment", "usb", "magnetometer", "gyroscope", "accelerometer"]);
    for (const part of PERMISSIONS_POLICY.split(",")) expect(known.has(part.trim().replace(/=.*$/, ""))).toBe(true);
  });
});

describe("قلابِ تستِ خودکار", () => {
  it("window.__game فقط در توسعه و بیلدِ تست ساخته می‌شود و شرطش ثابتِ زمانِ build است", () => {
    const src = readFileSync(join(__dirname, "../src/game/Game.tsx"), "utf8");
    const guard = src.indexOf('if (process.env.GVF_TEST_HOOKS !== "1") return;');
    const hook = src.indexOf(".__game = {");
    expect(guard).toBeGreaterThan(0);
    expect(hook).toBeGreaterThan(guard);
    // در محیطِ تستِ واحد NODE_ENV برابرِ test است، پس قلاب روشن است؛ در بیلدِ production خاموش
    expect(nextConfig.env?.GVF_TEST_HOOKS).toBe(process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0");
  });
});
