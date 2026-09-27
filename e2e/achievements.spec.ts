import { test, expect } from "@playwright/test";

/** V.8 — دیوار مدال‌ها: مدال گرفته‌شده تاریخ روز دارد و مدال نگرفته نوار پیشرفت زنده */

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
  // V.5: روز اول فصل پرده‌ی فستیوال باز است — اول انتخاب کن تا بازی آزاد شود
  const fest = page.getByTestId("festival-modal");
  if (await fest.isVisible().catch(() => false)) {
    await page.getByTestId("festival-rest").tap();
    await expect(fest).toBeHidden({ timeout: 5_000 });
  }
}

test("دیوار مدال‌ها: تاریخ روز برای گرفته‌شده و نوار پیشرفت برای نگرفته", async ({ page }, testInfo) => {
  await enter(page);
  // یک مدالِ گرفته‌شده با تاریخ تزریق می‌شود
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => { achievements: Record<string, unknown> }; setState: (s: unknown) => void } }).__game;
    const st = g.getState();
    st.achievements = { first_harvest: 2 };
    g.setState(st);
  });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "منو" }).tap();
  await page.getByRole("button", { name: "دستاوردها" }).tap();
  const got = page.getByTestId("medal-first_harvest");
  await expect(got).toBeVisible({ timeout: 10_000 });
  await expect(got).toContainText("روز ۲");
  const pending = page.getByTestId("medal-rich1");
  await expect(pending).toBeVisible();
  await expect(pending.locator('[role="progressbar"]')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("v8-medals.png") });
});
