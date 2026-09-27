import { test, expect } from "@playwright/test";

/**
 * e2e/splash.spec.ts — شاهدِ پولیشِ P6.5 روی نخستین صفحه
 *
 *  ۱. کارتِ آغاز بالا-لنگر است؛ پس حتی وقتی HTML تکه‌تکه می‌رسد و مرورگر نیمه‌ی کارت را
 *     زودتر می‌کشد، چیزی جابه‌جا نمی‌شود (CLS ≈ ۰؛ پیش از P6.5: ۰٫۰۷ تا ۰٫۱۷).
 *  ۲. لوگوی WebPِ بُرش‌خورده (۲۵۶ پیکسل، پس‌زمینه‌ی شفاف) واقعاً بارگذاری و رسم می‌شود.
 *  ۳. دکمه‌ی «آغاز داستان» در ۳۲۰ و ۳۹۰ پیکسل در دسترس و لمس‌پذیر است و سرریزِ افقی نیست.
 *  ۴. تا پیش از آغاز فقط دو وزنِ لازمِ فونت (Bold و Black) گرفته می‌شود، نه Regular.
 *
 * بندهای ۱ و ۴ فقط در Chromium سنجیده می‌شوند: WebKit رویدادِ layout-shift ندارد و
 * زمان‌بندیِ دریافتِ فونتش با پیش‌بارگذاری فرق می‌کند.
 */

const SIZES = [
  { name: "320", width: 320, height: 568 },
  { name: "390", width: 390, height: 844 },
];

test.describe("اسپلش — بدونِ جابه‌جایی و خوانا در موبایل", () => {
  for (const vp of SIZES) {
    test(`اسپلش در ${vp.name}px: بدونِ جابه‌جایی، لوگو و دکمه‌ی آغاز`, async ({ page, browserName }, testInfo) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
              if (!e.hadRecentInput) w.__cls += e.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          /* WebKit: layout-shift پشتیبانی نمی‌شود */
        }
      });
      const fonts: string[] = [];
      page.on("request", (r) => {
        if (r.url().includes("/fonts/")) fonts.push(r.url().split("/").pop() || "");
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      const start = page.getByRole("button", { name: "آغاز داستان" });
      await expect(start).toBeEnabled({ timeout: 30_000 });

      const logo = page.locator('img[src*="logo_badge"]').first();
      await expect(logo).toBeVisible();
      expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), "لوگو رسم نشد").toBe(true);

      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeInViewport();
      const box = await start.boundingBox();
      expect(box?.height ?? 0, "ارتفاعِ دکمه‌ی آغاز").toBeGreaterThanOrEqual(44);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "سرریز افقی").toBeLessThanOrEqual(1);

      if (browserName === "chromium") {
        await page.waitForTimeout(500);
        const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
        expect(cls, "جابه‌جاییِ چیدمان در اسپلش").toBeLessThan(0.01);
        const extra = fonts.filter((f) => !/Black|Bold/.test(f));
        expect(extra, "فونتِ اضافه پیش از آغاز").toEqual([]);
      }

      if (testInfo.project.name === "mobile-chrome") {
        await page.screenshot({ path: `docs/shots/p6-5-splash-${vp.name}.png` });
      }
    });
  }
});
