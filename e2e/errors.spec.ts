import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/errors.spec.ts — صفحه‌ی بازیابی به‌جای صفحه‌ی سفید و ثبتِ خطا (نقشه‌ی راه، مورد ۴)
 * sendBeacon خاموش می‌شود تا گزارش با fetch برود و پاسخِ ۲۰۴ِ سرور دیده شود.
 */
async function enterGame(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
    } catch {
      /* ignore */
    }
    Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true });
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

const logged = (page: Page) => page.waitForResponse((r) => r.url().endsWith("/api/log") && r.request().method() === "POST", { timeout: 15_000 });

test.describe("مرزِ خطا و ثبتِ خطا", () => {
  test("خطای رندر: صفحه‌ی بازیابی، گزارش به سرور و برگشت به بازی", async ({ page }) => {
    await enterGame(page);
    const res = logged(page);
    await page.evaluate(() => (window as unknown as { __game: { crash: () => void } }).__game.crash());
    await expect(page.getByRole("alert")).toContainText("بازی به خطا خورد");
    const r = await res;
    expect(r.status()).toBe(204);
    expect(r.request().postData()).toContain("آزمونِ مرزِ خطا");
    expect(await page.evaluate(() => localStorage.getItem("farm_errors"))).toContain("آزمونِ مرزِ خطا");
    await page.screenshot({ path: `docs/shots/recovery-${test.info().project.name}.png` });
    await page.getByRole("button", { name: "بارگذاریِ دوباره‌ی بازی" }).tap();
    await expect(page.getByRole("button", { name: "منو" })).toBeVisible({ timeout: 30_000 });
  });

  test("خطای بی‌صاحب (وعده‌ی ردشده) هم به سرور می‌رسد", async ({ page }) => {
    await enterGame(page);
    const res = logged(page);
    await page.evaluate(() => {
      void Promise.reject(new Error("E2E: وعده‌ی ردشده"));
    });
    const r = await res;
    expect(r.status()).toBe(204);
    expect(r.request().postData()).toContain("وعده‌ی ردشده");
  });
});
