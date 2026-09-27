import { test, expect } from "@playwright/test";

/** V.6 — مهمانِ سپاسگزار: پس از تحویل سفارش، walker مهمان با حبابِ دیالوگ می‌آید */

async function enter(page: import("@playwright/test").Page) {
  await page.addInitScript(() => { try { localStorage.setItem("farm_onboard", "1"); } catch {} });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap();
  await page.waitForTimeout(900);
  const nameInput = page.locator("input").first();
  await nameInput.tap({ timeout: 10_000 });
  await nameInput.fill("امید");
  const gate = page.getByRole("button", { name: "آغاز داستان" });
  if (await gate.count()) await gate.last().tap();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => { story: { shown: boolean } }; setState: (s: unknown) => void } }).__game;
    const st = g.getState();
    if (st?.story) { st.story.shown = false; g.setState(st); }
  });
  await page.waitForTimeout(600);
}

test("تحویل سفارش ← مهمانِ سپاسگزار با حبابِ دیالوگ", async ({ page }, testInfo) => {
  await enter(page);
  const res = await page.evaluate(() => {
    const g = (window as unknown as {
      __game: {
        getState: () => { inv: Record<string, number>; orders: { items: { id: string; n: number }[] }[] };
        setState: (s: unknown) => void;
        fulfill: (i: number) => { guests: number; say: string | null };
      };
    }).__game;
    const st = g.getState();
    for (const it of st.orders[0].items) st.inv[it.id] = (st.inv[it.id] || 0) + it.n;
    g.setState(st);
    return g.fulfill(0);
  });
  expect(res.guests).toBeGreaterThanOrEqual(1);
  expect(res.say).toBeTruthy();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `docs/shots/guest-${testInfo.project.name}.png` });
  // مهمان پس از ~۲۰ ثانیه راه می‌افتد و تا ~۳۲ ثانیه از نقشه بیرون می‌رود
  await page.waitForTimeout(22_000);
  const leaving = await page.evaluate(() =>
    (window as unknown as { __game: { guests: () => { leaving: boolean }[] } }).__game.guests().every((g) => g.leaving)
  );
  expect(leaving).toBe(true);
  await page.waitForTimeout(12_000);
  const left = await page.evaluate(() => (window as unknown as { __game: { guests: () => unknown[] } }).__game.guests().length);
  expect(left).toBe(0);
});
