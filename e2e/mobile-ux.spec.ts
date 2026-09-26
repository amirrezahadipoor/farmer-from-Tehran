import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/mobile-ux.spec.ts — شاهدِ فاز P4 (UI/UX مخصوص موبایل برای هر اندازه‌ی صفحه)
 *
 *  ۱. هر پنل = Bottom-Sheet با بستنِ کشیدنی (swipe-down) و دکمه‌ی لمس‌پذیر.
 *  ۲. همه‌ی هدف‌های لمسی ≥ ۴۴px در ۵ اندازه‌ی صفحه (استاندارد لمسی).
 *  ۳. مقیاس تایپوگرافی با صفحه بزرگ‌تر می‌شود (۳۲۰px < ۷۶۸px).
 *  ۴. حالت افقی (landscape) بدون سرریز و قابل بازی.
 *  ۵. بازخورد لمسی (vibrate) و بصری (toast) برای عمل بازیکن.
 *  ۶. «کاهش حرکت» سیستم رعایت می‌شود.
 *  ۷. آموزش اولین‌بار یک‌بار نشان داده می‌شود و دیگر برنمی‌گردد.
 */

const VIEWPORTS = [
  { name: "small-320", width: 320, height: 568 },
  { name: "iphone-13", width: 390, height: 844 },
  { name: "large-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "landscape-844", width: 844, height: 390 },
];

async function enterGame(page: Page, opts: { skipOnboarding?: boolean } = {}) {
  if (opts.skipOnboarding !== false) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("farm_onboard", "1");
      } catch {
        /* ignore */
      }
    });
  }
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap().catch(() => undefined);
  await page.waitForTimeout(1000);

  // دروازه‌ی نام (مسیر واقعی بازیکن)
  const nameInput = page.locator("input").first();
  if (await nameInput.count()) {
    await nameInput.fill("امید").catch(() => undefined);
    const gate = page.getByRole("button", { name: "آغاز داستان" });
    if (await gate.count()) await gate.last().tap().catch(() => undefined);
    await page.waitForTimeout(700);
  }

  // عبور از داستان تا نقشه‌ی بازی
  await page.evaluate(() => {
    const w = window as unknown as {
      __game?: { getState: () => { story?: { shown: boolean } } | null; setState: (s: unknown) => void };
    };
    const st = w.__game?.getState?.();
    if (st?.story) {
      st.story.shown = false;
      w.__game?.setState(st);
    }
  });
  await page.waitForTimeout(600);
}


test.describe("UI/UX موبایل", () => {
  test("پنل‌ها شیت‌اند و با کشیدن به پایین بسته می‌شوند", async ({ page }) => {
    await enterGame(page);
    await page.getByRole("button", { name: "منو" }).first().tap();
    await page.getByRole("button", { name: "بازار" }).first().tap();
    await expect(page.getByText("بازار و انبار", { exact: false })).toBeVisible();

    // کشیدن *دستگیره‌ی* شیت به پایین (swipe-down) باید پنل را ببندد
    const handle = page.locator('div.shrink-0.touch-none.select-none').first();
    const box = await handle.boundingBox();
    expect(box, "دستگیره‌ی شیت باید وجود داشته باشد").not.toBeNull();
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 40, { steps: 4 });
    await page.mouse.move(x, y + 180, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByText("بازار و انبار", { exact: false })).toBeHidden({ timeout: 5_000 });
  });

  for (const vp of VIEWPORTS) {
    test(`هدف‌های لمسی ≥ ۴۴px و بدون سرریز در ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await enterGame(page);

      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollW, "سرریز افقی").toBeLessThanOrEqual(overflow.clientW + 1);

      const small = await page.evaluate(() =>
        [...document.querySelectorAll("button")]
          .map((b) => {
            const r = b.getBoundingClientRect();
            return { t: (b.getAttribute("aria-label") || b.textContent || "?").trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter((b) => b.w > 0 && b.h > 0 && (b.w < 44 || b.h < 44))
          .map((b) => `${b.t} → ${b.w}×${b.h}`)
      );
      expect(small, `هدف لمسی ریز: ${small.join(" ، ")}`).toHaveLength(0);
      await page.screenshot({ path: `docs/shots/ux-${vp.name}.png` });
    });
  }

  test("تایپوگرافی با بزرگ‌تر شدن صفحه بزرگ‌تر می‌شود", async ({ browser }) => {
    const sizeAt = async (width: number, height: number) => {
      // کانتکست مستقل: بدون setViewportSize تا شبیه‌سازی موبایل نشکند
      const ctx = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 2.6,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36",
      });
      const page = await ctx.newPage();
      await enterGame(page);
      const size = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "شخم");
        if (!btn) return 0;
        return parseFloat(getComputedStyle(btn.querySelector("span") ?? btn).fontSize);
      });
      await ctx.close();
      return size;
    };
    const small = await sizeAt(320, 568);
    const big = await sizeAt(768, 1024);
    expect(small, "اندازه‌ی متن در گوشی کوچک").toBeGreaterThanOrEqual(11);
    expect(big, `باید در تبلت بزرگ‌تر باشد (کوچک=${small}px بزرگ=${big}px)`).toBeGreaterThan(small);
  });

  test("بازخورد لمسی و بصری برای عمل بازیکن", async ({ page }) => {
    await enterGame(page);
    // شبیه‌سازی پشتیبانی لرزش تا فراخوانی‌ها ثبت شوند
    await page.evaluate(() => {
      const calls: number[][] = [];
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        value: (pattern: number | number[]) => {
          calls.push(Array.isArray(pattern) ? pattern : [pattern]);
          return true;
        },
      });
      (window as unknown as { __vibes: number[][] }).__vibes = calls;
    });

    await page.getByRole("button", { name: "شخم" }).first().tap();
    const box = await page.locator("canvas").boundingBox();
    await page.touchscreen.tap((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
    await page.waitForTimeout(600);

    const vibes = await page.evaluate(() => (window as unknown as { __vibes: number[][] }).__vibes.length);
    expect(vibes, "هر عمل باید لرزش لمسی کوتاه بدهد").toBeGreaterThan(0);

    // بازخورد بصری: افکت شناور روی نقشه یا توست
    const visual = await page.evaluate(
      () => document.querySelectorAll("div[class*='pointer-events-none'][class*='absolute']").length
    );
    expect(visual).toBeGreaterThan(0);
    await page.screenshot({ path: "docs/shots/ux-feedback.png" });
  });

  test("«کاهش حرکت» سیستم رعایت می‌شود (بدون ذره‌های هوا)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterGame(page);
    const reduced = await page.evaluate(
      () => (window as unknown as { __game?: { view?: () => { reduced?: boolean } } }).__game?.view?.()?.reduced
    );
    expect(reduced, "پرچم کاهش حرکت باید روشن باشد").toBe(true);
  });

  test("آموزش اولین‌بار یک‌بار می‌آید و ذخیره می‌شود", async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);
    const step = (n: string) => console.log("[onboarding]", n);
    step("۱ ورود به بازی");
    await enterGame(page, { skipOnboarding: false });
    step("۲ انتظار کارت آموزش");
    await expect(page.getByText("آموزش سریع")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "docs/shots/ux-onboarding.png" });

    step("۳ گام ۱ → ۲");
    await page.getByRole("button", { name: "بعدی" }).tap({ timeout: 15_000 });
    await expect(page.getByText("نگه‌داشتن انگشت = ۳×۳")).toBeVisible();
    step("۴ گام ۲ → ۳");
    await page.getByRole("button", { name: "بعدی" }).tap({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "بزن بریم!" })).toBeVisible();
    step("۵ پایان آموزش");
    await page.getByRole("button", { name: "بزن بریم!" }).tap({ timeout: 15_000 });
    await expect(page.getByText("آموزش سریع")).toBeHidden();

    step("۶ بازگذاری مجدد");
    // بعد از شروع بازی، networkidle هرگز آرام نمی‌شود (ذخیره‌ی خودکار هر ۱۲ ثانیه)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(4000);
    step("۷ بررسی تکرار‌نشدن");
    expect(await page.evaluate(() => localStorage.getItem("farm_onboard")), "پرچم آموزش باید ذخیره شده باشد").toBe("1");
    expect(await page.getByText("آموزش سریع").count(), "آموزش نباید دوباره بیاید").toBe(0);
  });
});
