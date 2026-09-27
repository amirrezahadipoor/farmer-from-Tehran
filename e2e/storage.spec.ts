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
      const w = window as unknown as { __persistAsked: number };
      w.__persistAsked = 0;
      const st = navigator.storage;
      if (st?.persist) {
        const orig = st.persist.bind(st);
        Object.defineProperty(st, "persist", { configurable: true, value: () => (w.__persistAsked++, orig()) });
      }
    });
    await enterGame(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __persistAsked: number }).__persistAsked)).toBeGreaterThan(0);

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
    await b.getByRole("button", { name: "بله، جایگزین کن" }).tap();
    await expect(b.getByRole("button", { name: "منو" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => g(b)).toBe(coins);
    await other.close();
  });
});
