import { test, expect } from "@playwright/test";

/**
 * e2e/gender.spec.ts — انتخابِ خطاب کنارِ نام (نقشه‌ی راه، مورد ۷)
 * بازیکنی که «زن» را انتخاب می‌کند در پیش‌پرده «دخترم» می‌شنود و هیچ‌جا «پسرم».
 */
test("دروازه‌ی نام: انتخابِ «زن» خطابِ داستان را عوض می‌کند", async ({ page }) => {
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

  const group = page.getByRole("radiogroup", { name: "خطاب" });
  await expect(group.getByRole("radio")).toHaveCount(3);
  await expect(group.getByRole("radio", { name: "ترجیح می‌دهم نگویم" })).toHaveAttribute("aria-checked", "true");
  await group.getByRole("radio", { name: "زن" }).tap();
  await expect(group.getByRole("radio", { name: "زن" })).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: `docs/shots/gender-gate-${test.info().project.name}.png` });

  await page.locator("input").first().fill("مریم");
  await page.getByRole("button", { name: "آغاز داستان" }).last().tap();
  expect(await page.evaluate(() => (window as unknown as { __game: { getState: () => { story: { gender: string } } } }).__game.getState().story.gender)).toBe("f");

  // پیش‌پرده را با ضربه جلو می‌بریم تا جمله‌ی خطاب برسد
  const vw = page.viewportSize() ?? { width: 390, height: 844 };
  let found = false;
  for (let i = 0; i < 16 && !found; i++) {
    found = (await page.getByText(/دخترم/).count()) > 0;
    if (!found) {
      await page.touchscreen.tap(Math.round(vw.width / 2), Math.round(vw.height * 0.3));
      await page.waitForTimeout(350);
    }
  }
  expect(found, "خطابِ «دخترم» در پیش‌پرده").toBe(true);
  expect(await page.getByText(/پسرم/).count()).toBe(0);
});
