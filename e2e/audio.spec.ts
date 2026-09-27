import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/audio.spec.ts — شاهدِ P5.12 (موتورِ صدا) و مورد ۱۰ِ نقشه‌ی راه (صداهای واقعیِ آزاد)
 *
 *  ۱. پیش از اولین لمس هیچ AudioContextی ساخته نمی‌شود (سیاستِ پخشِ خودکار؛ بدون هشدارِ کنسول).
 *  ۲. بعد از لمس: موتور «running»، لایه‌های محیط و موسیقی فعال، و خروجیِ واقعی (RMS) صفر نیست.
 *  ۳. پنل تنظیمات چهار اسلایدر دارد؛ خاموش کردنِ صدا خروجی را صفر می‌کند و بعد از بارگذاریِ دوباره می‌ماند.
 *  ۴. تبِ پنهان موتور را معلق می‌کند (باتری).
 *  ۵. صداهای واقعی بعد از لمس دانلود و رمزگشایی می‌شوند و سه‌تار و محیطِ ضبط‌شده جای سنتز را می‌گیرند.
 */

type AudioDebug = {
  engine: boolean;
  state: string | null;
  layers: { ambient: boolean; music: boolean; running: boolean; samples: number; ambience: string | null; pluck: string } | null;
  samplesTotal: number;
  level: number;
  settings: { on: boolean; master: number; music: number; sfx: number; ambient: number };
};
const audio = (page: Page) => page.evaluate(() => (window as unknown as { __game: { audio: () => AudioDebug } }).__game.audio());

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("farm_started", "1");
    localStorage.setItem("farm_onboard", "1");
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!(window as unknown as { __game?: { getState: () => unknown } }).__game?.getState());
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => { story: { shown: boolean; name: string }; weather: string; weatherLeft: number; time: number; seasonIndex: number }; setState: (s: unknown) => void } }).__game;
    const s = g.getState();
    s.story.shown = false;
    s.story.name = s.story.name || "امید";
    // شبِ تابستان: جیرجیرک + موسیقیِ شور
    Object.assign(s, { seasonIndex: 1, time: 10, weather: "clear", weatherLeft: 99999 });
    g.setState(s);
  });
}

test.describe("صدا (P5.12)", () => {
  test("تنظیمات: چهار اسلایدر، خاموش‌کردن می‌ماند", async ({ page }) => {
    await boot(page);
    await page.evaluate(() => (window as unknown as { __game: { openPanel: (p: string) => void } }).__game.openPanel("settings"));
    for (const name of ["حجم کل", "موسیقی", "جلوه‌های صوتی", "صدای محیط"]) await expect(page.getByLabel(name, { exact: true })).toBeVisible();
    await page.getByLabel("موسیقی", { exact: true }).fill("30");
    await page.getByLabel("روشن/خاموش کردن صدا").click();
    await expect.poll(async () => (await audio(page)).settings).toMatchObject({ on: false, music: 0.3 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => !!(window as unknown as { __game?: { audio?: unknown } }).__game?.audio);
    expect((await audio(page)).settings).toMatchObject({ on: false, music: 0.3 });
  });

  test.describe("موتور WebAudio", () => {
    // WebKitِ لینوکسیِ Playwright خروجیِ صوتی ندارد؛ موتور روی کروم اندروید سنجیده می‌شود
    test.skip(({ browserName }) => browserName !== "chromium", "WebKitِ Playwright روی لینوکس دستگاهِ صوتی ندارد");

    test("پیش از لمس خاموش، بعد از لمس زنده؛ بی‌صدا = صفر؛ تبِ پنهان = معلق", async ({ page }) => {
      const warnings: string[] = [];
      page.on("console", (m) => {
        if (/AudioContext/i.test(m.text())) warnings.push(m.text());
      });
      await boot(page);
      expect((await audio(page)).engine).toBe(false);

      await page.mouse.click(200, 420);
      await expect.poll(async () => (await audio(page)).state).toBe("running");
      const a = await audio(page);
      expect(a.layers).toMatchObject({ ambient: true, music: true, running: true });
      await expect.poll(async () => (await audio(page)).level, { timeout: 15_000 }).toBeGreaterThan(0.001);

      await page.evaluate(() => (window as unknown as { __game: { openPanel: (p: string) => void } }).__game.openPanel("settings"));
      await page.getByLabel("روشن/خاموش کردن صدا").click();
      await expect.poll(async () => (await audio(page)).level, { timeout: 10_000 }).toBeLessThan(0.0001);

      await page.getByLabel("روشن/خاموش کردن صدا").click();
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect.poll(async () => (await audio(page)).state).toBe("suspended");
      expect(warnings, warnings.join("\n")).toHaveLength(0);
    });

    test("صداهای واقعی: بعد از لمس همه رمزگشایی و سه‌تار و محیطِ ضبط‌شده جایگزینِ سنتز می‌شوند", async ({ page }) => {
      const failed: string[] = [];
      page.on("response", (r) => {
        if (r.url().includes("/audio/") && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
      });
      await boot(page);
      await page.mouse.click(200, 420);
      await expect.poll(async () => (await audio(page)).state).toBe("running");
      const total = (await audio(page)).samplesTotal;
      expect(total).toBeGreaterThan(70);
      await expect.poll(async () => (await audio(page)).layers?.samples ?? 0, { timeout: 30_000 }).toBe(total);
      await expect.poll(async () => (await audio(page)).layers?.ambience, { timeout: 5_000 }).toBe("samples");
      expect((await audio(page)).layers?.pluck).toBe("setar");
      await expect.poll(async () => (await audio(page)).level, { timeout: 15_000 }).toBeGreaterThan(0.001);
      expect(failed).toEqual([]);
    });
  });
});
