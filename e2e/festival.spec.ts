import { test, expect } from "@playwright/test";

/** V.5 — فستیوال فصلی دهکده: روز اول فصل پرده‌ی انتخاب باز می‌شود و با انتخاب بسته می‌شود */

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
  await page.waitForTimeout(800);
}

test("روز اول فصل ← پرده‌ی فستیوال با سه انتخاب", async ({ page }, testInfo) => {
  await enter(page);
  const modal = page.getByTestId("festival-modal");
  await expect(modal).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("festival-invest")).toBeVisible();
  await expect(page.getByTestId("festival-feast")).toBeVisible();
  await expect(page.getByTestId("festival-rest")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("v5-festival.png") });

  // انتخاب «آرامش مزرعه» (رایگان) ← پرده بسته می‌شود و انتخاب ثبت می‌شود
  await page.getByTestId("festival-rest").tap();
  await expect(modal).toBeHidden({ timeout: 5_000 });
  const choice = await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => { fest?: { choice: string | null; idx: number } } } }).__game;
    return g.getState().fest?.choice;
  });
  expect(choice).toBe("rest");
});
