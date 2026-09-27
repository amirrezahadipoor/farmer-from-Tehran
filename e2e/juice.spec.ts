import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/juice.spec.ts — V.3: لایه‌ی حس رضایت
 * کاغذرنگی سطح، سکه‌های پرنده به قرص سکه و لرزش دوربین در مرورگر واقعی.
 */

async function enterGame(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap();
  await page.waitForTimeout(1000);
  const nameInput = page.locator("input").first();
  await nameInput.tap({ timeout: 10_000 });
  await nameInput.fill("امید");
  const gate = page.getByRole("button", { name: "آغاز داستان" });
  if (await gate.count()) await gate.last().tap();
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { getState: () => { story: { shown: boolean } } | null; setState: (s: unknown) => void } };
    const g = w.__game;
    const st = g?.getState?.();
    if (st?.story) {
      st.story.shown = false;
      g?.setState(st);
    }
  });
  await page.waitForTimeout(500);
}

const juice = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __game?: { juice: () => { sfx: number; shake: number } } };
    return w.__game?.juice();
  });

test("کاغذرنگی سطح و سکه‌های پرنده و لرزش", async ({ page }) => {
  await enterGame(page);
  // کاغذرنگی
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { celebrate: (k: "level") => void } };
    w.__game?.celebrate("level");
  });
  let j = await juice(page);
  expect(j?.sfx).toBeGreaterThan(10);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "docs/shots/e2e-juice-confetti.png" });
  // سکه‌های پرنده به قرص سکه
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { coinsNow: (n: number) => void } };
    w.__game?.coinsNow(5);
  });
  j = await juice(page);
  expect(j?.sfx).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/shots/e2e-juice-coins.png" });
  // لرزش
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { shakeNow: () => void } };
    w.__game?.shakeNow();
  });
  j = await juice(page);
  expect(j?.shake).toBeGreaterThan(0);
});
