import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/resilience.spec.ts — شاهدِ «قفل ابدی وجود ندارد» (P5.1)
 *
 * سناریوی واقعی بازیکن:
 *  ۱. یک سیوِ خراب (JSON ناقص) در حافظه‌ی دستگاه می‌نشیند — مثلاً بعد از خاموش‌شدن
 *     ناگهانی گوشی وسط نوشتن.
 *  ۲. بازی باید بالا بیاید (نه صفحه‌ی سفید، نه اسپلشِ قفل) و به بازیکن گزارش بدهد.
 *  ۳. پیشرفت قبلی باید از «پشتیبانِ قرنطینه» قابل بازیابی باشد.
 *  ۴. مغز متفکرِ بازی (منطق) هم با سیوِ نیمه‌خراب (NaN، market: null، کاشی خراب)
 *     نباید پرتاب استثنا کند.
 */

const SAVE_KEY = "farm_save";
const BROKEN_KEY = "farm_save_broken";

async function enterGame(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });

  // اسپلش ممکن است رد شده باشد (اگر قبلاً شروع کرده‌ایم) — پس فقط اگر هست، بزن
  const splash = page.getByRole("button", { name: "آغاز داستان" }).first();
  if (await splash.count()) await splash.tap({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(900);

  const nameInput = page.locator("input").first();
  if (await nameInput.count()) {
    await nameInput.fill("امید").catch(() => undefined);
    const gate = page.getByRole("button", { name: "آغاز داستان" });
    if (await gate.count()) await gate.last().tap().catch(() => undefined);
    await page.waitForTimeout(600);
  }
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

const coins = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __game?: { getState: () => { coins: number } | null } };
    return w.__game?.getState?.()?.coins ?? -1;
  });

test.describe("تاب‌آوری سیو — هیچ سیوِ خرابی بازی را قفل نمی‌کند", () => {
  test("سیوِ خراب → بازی بالا می‌آید، هشدار صادق نشان داده می‌شود و پشتیبان قابل بازیابی است", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(String(e)));

    // ۱) یک بازی واقعی: سیوِ سالم بساز و پولِ فعلی را نگه دار
    await enterGame(page);
    await page.evaluate(async () => {
      const w = window as unknown as { __game?: { save?: () => Promise<void> } };
      await w.__game?.save?.();
    });
    await page.waitForTimeout(700);

    const richSave = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const s = JSON.parse(raw) as Record<string, unknown>;
      s.coins = 987654; // «پشتیبانِ» قابل تشخیص
      s.savedAt = Date.now();
      return JSON.stringify(s);
    }, SAVE_KEY);
    expect(richSave, "بازی باید سیوِ محلی بسازد").not.toBeNull();

    // ۲) بازیکن با سیوِ خراب و یک پشتیبانِ سالم برمی‌گردد
    await page.evaluate(
      ([saveKey, brokenKey, backup]) => {
        localStorage.setItem(saveKey, '{"v":5,"tiles":[{"k":"soil"'); // JSON نیمه‌نوشته
        localStorage.setItem(brokenKey, JSON.stringify({ at: Date.now(), raw: backup }));
      },
      [SAVE_KEY, BROKEN_KEY, richSave as string]
    );

    await page.reload({ waitUntil: "load" });

    // ۳) قفل ابدی؟ نه — نقشه بالا می‌آید و بازی قابل ادامه است (سیوِ ابری نسخه‌ی تازه‌تری دارد)
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await enterGame(page);
    expect(problems, "هیچ خطای اجرایی در مرورگر نباید رخ دهد").toHaveLength(0);

    // ۴) سیوِ خراب از چرخه بیرون رفته ولی پشتیبانش نگه داشته شده
    const after = await page.evaluate(
      ([saveKey, brokenKey]) => ({
        bad: localStorage.getItem(saveKey),
        backup: localStorage.getItem(brokenKey),
      }),
      [SAVE_KEY, BROKEN_KEY]
    );
    expect(after.backup, "پشتیبانِ قرنطینه‌شده باید باقی بماند").not.toBeNull();

    // ۵) بنر بازیابی باید دیده شود و دکمه‌اش پیشرفتِ پشتیبان را برگرداند
    await expect(page.getByText("سیوِ قبلی سالم نبود"), "بازیکن باید صادقانه باخبر شود").toBeVisible({
      timeout: 15_000,
    });
    const restore = page.getByRole("button", { name: "بازیابی از پشتیبان" });
    await expect(restore, "پشتیبان باید قابل بازیابی باشد (نه فقط هشدار)").toBeVisible();
    await restore.first().tap();
    await page.waitForTimeout(1000);
    expect(await coins(page), "پولِ پشتیبان باید برگردد").toBe(987654);
  });

  test("سیوِ نیمه‌خرابِ شکل‌دار (NaN و market: null) بازی را از کار نمی‌اندازد", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(String(e)));

    await enterGame(page);
    await page.evaluate(
      ([saveKey]) => {
        const raw = localStorage.getItem(saveKey);
        const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
        const broken = {
          ...(base ?? {}),
          coins: null, // ← جای عدد
          xp: "خیلی زیاد", // ← رشته به‌جای عدد
          market: null, // ← شیء نیست (قبلاً همین باعث استثنا می‌شد)
          techs: ["seeds1", 42, null],
          chunks: [true],
          tiles: Array.isArray(base?.tiles) ? [...(base?.tiles as unknown[])] : [],
          savedAt: Date.now(),
        };
        if (Array.isArray(broken.tiles) && broken.tiles.length > 3) {
          broken.tiles[2] = null;
          broken.tiles[3] = { ک: "زرافه" };
        }
        localStorage.setItem(saveKey, JSON.stringify(broken));
      },
      [SAVE_KEY]
    );

    await page.reload({ waitUntil: "load" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await enterGame(page);

    expect(problems, "سیوِ شکل‌خراب نباید استثنا بدهد").toHaveLength(0);
    expect(await coins(page), "پول باید عدد سالم باشد").toBeGreaterThanOrEqual(0);

    // بازی واقعاً بازی‌پذیر است: یک زمین شخم بخورد
    const box = await page.locator("canvas").boundingBox();
    await page.touchscreen.tap((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
    await page.waitForTimeout(600);
  });
});
