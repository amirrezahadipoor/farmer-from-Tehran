import { test, expect } from "@playwright/test";

/**
 * e2e/security.spec.ts — هدرهای امنیتی روی سرورِ واقعی و بازی زیرِ CSP (نقشه‌ی راه، مورد ۶)
 */
test.describe("هدرهای امنیتی و CSP", () => {
  test("هر پنج هدر روی صفحه، سرویس‌ورکر و API؛ بدونِ X-Powered-By", async ({ request }) => {
    for (const p of ["/", "/sw.js", "/api/health"]) {
      const h = (await request.get(p)).headers();
      expect(h["content-security-policy"], p).toContain("frame-ancestors 'none'");
      expect(h["content-security-policy"], p).toContain("object-src 'none'");
      expect(h["x-frame-options"], p).toBe("DENY");
      expect(h["x-content-type-options"], p).toBe("nosniff");
      expect(h["referrer-policy"], p).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"], p).toContain("camera=()");
      expect(h["x-powered-by"], p).toBeUndefined();
    }
  });

  test("بازی زیرِ CSP بدونِ هیچ نقضی بالا می‌آید", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __csp: string[] };
      w.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
      try {
        localStorage.setItem("farm_onboard", "1");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/");
    const start = page.getByRole("button", { name: "آغاز داستان" });
    await expect(start).toBeEnabled({ timeout: 30_000 });
    await start.tap();
    await page.locator("input").first().fill("امید");
    await page.getByRole("button", { name: "آغاز داستان" }).last().tap();
    await page.getByRole("button", { name: "بستن" }).first().tap({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "منو" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "منو" }).tap();
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
  });
});
