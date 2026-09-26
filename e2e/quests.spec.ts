import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/quests.spec.ts — شاهدِ P6.2 «۳ هدف روزانه با پاداش»
 *  منو → «اهداف روزانه» → سه کارت با نوارِ پیشرفت؛ کاملِ یکی → «دریافت» → سکه زیاد می‌شود،
 *  کارت «گرفته شد» می‌شود و دوباره دریافت نمی‌شود؛ نشانِ منو شمارِ آماده‌ها را نشان می‌دهد.
 */
type G = { getState: () => Record<string, unknown> & { coins: number; stats: Record<string, number>; quests?: { daily: { stat: string; base: number; target: number; claimed: boolean }[] }; story: { shown: boolean; name: string } }; setState: (s: unknown) => void };
const g = (page: Page) => page.evaluate(() => !!(window as unknown as { __game?: G }).__game?.getState()?.quests);

test("اهداف روزانه: سه هدف، دریافتِ یک‌باره‌ی پاداش", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("farm_started", "1");
    localStorage.setItem("farm_onboard", "1");
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => g(page), { timeout: 15_000 }).toBe(true);
  // اولین هدف را کامل کن
  await page.evaluate(() => {
    const game = (window as unknown as { __game: G }).__game;
    const s = game.getState();
    s.story.shown = false;
    s.story.name = s.story.name || "امید";
    const e = s.quests!.daily[0];
    s.stats[e.stat] = e.base + e.target;
    game.setState(s);
  });
  await page.getByRole("button", { name: "منو" }).click();
  await page.getByRole("button", { name: "اهداف روزانه" }).click();
  await expect(page.getByRole("progressbar")).toHaveCount(4); // ۳ روزانه + ۱ هفتگی
  const coins0 = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState().coins);
  const claim = page.getByRole("button", { name: /^دریافت پاداش:/ }).first();
  await expect(claim).toBeEnabled();
  await claim.click();
  await expect(page.getByText("گرفته شد").first()).toBeVisible();
  const after = await page.evaluate(() => {
    const s = (window as unknown as { __game: G }).__game.getState();
    return { coins: s.coins, claimed: s.quests!.daily[0].claimed };
  });
  expect(after.claimed).toBe(true);
  expect(after.coins).toBeGreaterThan(coins0);
  // هدف‌های ناتمام دکمه‌ی فعال ندارند
  for (const b of await page.getByRole("button", { name: /^دریافت پاداش:/ }).all()) await expect(b).toBeDisabled();
});
