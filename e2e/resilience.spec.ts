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
const BACKUP_KEY = "farm_save_bak";

/**
 * خراب‌کردنِ سیو «بیرون از بازی»: اگر روی صفحه‌ی بازی localStorage را دستکاری و
 * سپس reload کنیم، رویداد beforeunload بازی سیوِ سالمِ حافظه را دوباره می‌نویسد و
 * خرابی پاک می‌شود (تستِ قبلی دقیقاً به همین دلیل قرمز بود). پس اول از بازی خارج
 * می‌شویم (به یک صفحه‌ی بی‌بازیِ همان دامنه)، سیو را می‌نویسیم، بعد بازی را باز می‌کنیم.
 */
async function writeStorageOutsideGame(page: Page, entries: Record<string, string>) {
  await page.goto("/api/health", { waitUntil: "load" });
  await page.evaluate(async (e) => {
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
    // سناریوی سیوِ فقط-localStorage (بازیکنِ نسخه‌ی پیش از مورد ۳): نسخه‌ی سالمِ IndexedDB این‌جا عمداً نیست
    await new Promise<void>((resolve) => {
      const q = indexedDB.deleteDatabase("golden-valley");
      q.onsuccess = q.onerror = q.onblocked = () => resolve();
    });
  }, entries);
}

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
  test("سیوِ خراب → بازی بالا می‌آید، پشتیبانِ خودکار پیشرفت را برمی‌گرداند و هشدار صادق نشان داده می‌شود", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(String(e)));

    // ۱) یک بازی واقعی: سیوِ سالم بساز
    await enterGame(page);
    await page.evaluate(async () => {
      const w = window as unknown as { __game?: { save?: () => Promise<void> } };
      await w.__game?.save?.();
    });
    await page.waitForTimeout(700);

    // «پشتیبانِ خودکار» همان سیوِ قبلی است؛ با پولِ قابل‌تشخیص علامتش می‌زنیم
    const richSave = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const s = JSON.parse(raw) as Record<string, unknown>;
      s.coins = 987654;
      s.savedAt = Date.now();
      return JSON.stringify(s);
    }, SAVE_KEY);
    expect(richSave, "بازی باید سیوِ محلی بسازد").not.toBeNull();

    // ۲) گوشی وسط نوشتن خاموش شد: سیوِ اصلی نیمه‌کاره، پشتیبانِ چرخشی سالم
    const BROKEN = '{"v":5,"tiles":[{"k":"soil"';
    await writeStorageOutsideGame(page, { [SAVE_KEY]: BROKEN, [BACKUP_KEY]: richSave as string });

    // ۳) بازیکن برمی‌گردد: نه صفحه‌ی سفید، نه اسپلشِ قفل
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });

    // ۴) هشدار صادق + پیشرفت از پشتیبان برگشته (بدون هیچ کاری از طرف بازیکن)
    await expect(page.getByText("سیوِ قبلی سالم نبود"), "بازیکن باید صادقانه باخبر شود").toBeVisible({
      timeout: 15_000,
    });
    await expect.poll(() => coins(page), { message: "پولِ پشتیبان باید برگردد", timeout: 10_000 }).toBe(987654);

    // ۵) نسخه‌ی خراب برای بررسی قرنطینه شده است
    const quarantined = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { raw?: string }).raw ?? null : null;
    }, BROKEN_KEY);
    expect(quarantined, "سیوِ خراب باید قرنطینه شود").toBe(BROKEN);
    expect(problems, "هیچ خطای اجرایی در مرورگر نباید رخ دهد").toHaveLength(0);

    await page.screenshot({ path: `docs/shots/resilience-restored-${test.info().project.name}.png` });

    // ۶) بستن هشدار و ادامه‌ی بازی
    await page.getByRole("button", { name: "بستن هشدار سیو" }).tap();
    await expect(page.getByText("سیوِ قبلی سالم نبود")).toHaveCount(0);
  });

  test("سیوِ نیمه‌خرابِ شکل‌دار (NaN و market: null) بازی را از کار نمی‌اندازد", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(String(e)));

    await enterGame(page);
    await page.evaluate(async () => {
      const w = window as unknown as { __game?: { save?: () => Promise<void> } };
      await w.__game?.save?.();
    });
    const brokenJson = await page.evaluate((saveKey) => {
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
      return JSON.stringify(broken);
    }, SAVE_KEY);
    await writeStorageOutsideGame(page, { [SAVE_KEY]: brokenJson });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1200);

    expect(problems, "سیوِ شکل‌خراب نباید استثنا بدهد").toHaveLength(0);
    const st = await page.evaluate(() => {
      const w = window as unknown as {
        __game?: { getState: () => { coins: number; xp: number; market: unknown; techs: unknown[]; tiles: unknown[] } | null };
      };
      const s = w.__game?.getState?.();
      return s ? { coins: s.coins, xp: s.xp, market: typeof s.market, techs: s.techs, tiles: s.tiles.length } : null;
    });
    expect(st, "وضعیت بازی باید بالا بیاید").not.toBeNull();
    expect(Number.isFinite(st!.coins) && st!.coins >= 0, "پول باید عدد سالم باشد").toBe(true);
    expect(Number.isFinite(st!.xp), "XP باید عدد سالم باشد").toBe(true);
    expect(st!.market, "بازار باید بازسازی شود").toBe("object");
    expect(st!.techs, "فهرست تحقیقات باید پاک‌سازی شود").toEqual(["seeds1"]);
    expect(st!.tiles, "تعداد کاشی‌ها حفظ می‌شود").toBe(36 * 36);

    // بازی واقعاً بازی‌پذیر است: ضربه روی زمین خطا نمی‌دهد
    const box = await page.locator("canvas").boundingBox();
    await page.touchscreen.tap((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
    await page.waitForTimeout(600);
    expect(problems).toHaveLength(0);
  });
});
