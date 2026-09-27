import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/storage.spec.ts — ماندگاریِ سیو و انتقال به دستگاهِ دیگر (نقشه‌ی راه، مورد ۳)
 *  ۱. سیو در IndexedDB هم نوشته می‌شود و اگر localStorage پاک شود، مزرعه از آن برمی‌گردد
 *  ۲. بعد از «آغاز» حافظه‌ی ماندگار درخواست می‌شود
 *  ۳. متنِ انتقالِ یک دستگاه در دستگاهِ دیگر (زمینه‌ی جدا) همان مزرعه را باز می‌کند
 */
type G = { getState: () => { coins: number; level: number }; give: (c: number) => unknown; save: () => Promise<void> };
const g = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.getState().coins);

async function enterGame(page: Page) {
  await page.addInitScript(() => {
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
}

const idbSave = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const r = indexedDB.open("golden-valley", 1);
        r.onsuccess = () => {
          try {
            const q = r.result.transaction("kv", "readonly").objectStore("kv").get("save");
            q.onsuccess = () => resolve(typeof q.result === "string" ? q.result : "");
            q.onerror = () => resolve("");
          } catch {
            resolve("");
          }
        };
        r.onerror = () => resolve("");
      }),
  );

async function openTransfer(page: Page) {
  await page.getByRole("button", { name: "منو" }).tap();
  await page.getByRole("button", { name: "انتقال و پشتیبان" }).tap();
}

test.describe("ماندگاریِ سیو و انتقال", () => {
  test("IndexedDB: پاک‌شدنِ localStorage مزرعه را از بین نمی‌برد؛ ماندگاری درخواست می‌شود", async ({ page }) => {
    await page.addInitScript(() => {
      // برنامه اول persisted() را می‌پرسد و فقط اگر هنوز ماندگار نبود persist() را صدا می‌زند
      const w = window as unknown as { __persistAsked: number; __persisted: boolean | null };
      w.__persistAsked = 0;
      w.__persisted = null;
      const st = navigator.storage;
      if (st?.persisted) {
        const was = st.persisted.bind(st);
        Object.defineProperty(st, "persisted", { configurable: true, value: async () => (w.__persisted = await was()) });
      }
      if (st?.persist) {
        const orig = st.persist.bind(st);
        Object.defineProperty(st, "persist", { configurable: true, value: () => (w.__persistAsked++, orig()) });
      }
    });
    await enterGame(page);
    // مرورگرِ بی‌navigator.storage.persist (مثلِ WebKitِ آزمون) را برنامه هم نادیده می‌گیرد
    if (await page.evaluate(() => typeof navigator.storage?.persist === "function")) {
      // یا مرورگر از قبل ماندگارش کرده، یا بازی درخواستش را داده است
      await expect
        .poll(() => page.evaluate(() => {
          const w = window as unknown as { __persistAsked: number; __persisted: boolean | null };
          return w.__persisted === true || w.__persistAsked > 0;
        }))
        .toBe(true);
    }

    await page.evaluate(async () => {
      const game = (window as unknown as { __game: G }).__game;
      game.give(123_456);
      await game.save();
    });
    const coins = await g(page);
    await expect.poll(async () => (await idbSave(page)).includes(`"coins":${coins}`), { timeout: 10_000 }).toBe(true);

    await page.evaluate(() => {
      localStorage.removeItem("farm_save");
      localStorage.removeItem("farm_save_bak");
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "منو" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => g(page)).toBe(coins);
  });

  test("متنِ انتقال: مزرعه‌ی دستگاهِ اول در دستگاهِ دوم باز می‌شود", async ({ page, browser }) => {
    await enterGame(page);
    await page.evaluate(async () => {
      const game = (window as unknown as { __game: G }).__game;
      game.give(777_777);
      await game.save();
    });
    const coins = await g(page);
    await openTransfer(page);
    await page.getByRole("button", { name: "ساختِ متنِ انتقال" }).tap();
    const text = await page.getByRole("textbox", { name: "متنِ انتقالِ این مزرعه" }).inputValue();
    expect(text).toMatch(/^GVF1\.[zj]\./);

    const use = test.info().project.use;
    const other = await browser.newContext({ baseURL: use.baseURL, viewport: use.viewport, userAgent: use.userAgent, deviceScaleFactor: use.deviceScaleFactor, hasTouch: true });
    const b = await other.newPage();
    await enterGame(b);
    expect(await g(b)).not.toBe(coins);
    await openTransfer(b);
    await b.getByRole("textbox", { name: "متنِ انتقال از دستگاهِ دیگر" }).fill(text);
    await b.getByRole("button", { name: "واردکردنِ متن" }).tap();
    await expect(b.getByRole("alertdialog", { name: "تأییدِ جایگزینیِ مزرعه" })).toBeVisible();
    await b.screenshot({ path: `docs/shots/transfer-${test.info().project.name}.png` });
    // جایگزینی صفحه را دوباره بارگذاری می‌کند؛ تا صفحه‌ی تازه بالا نیامده چیزی خوانده نشود
    const reloaded = b.waitForEvent("load");
    await b.getByRole("button", { name: "بله، جایگزین کن" }).tap();
    await reloaded;
    await expect(b.getByRole("button", { name: "منو" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => g(b)).toBe(coins);
    await other.close();
  });
});
