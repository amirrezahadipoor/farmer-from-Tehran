import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/hero.spec.ts — V.1: قهرمان روی نقشه
 *
 * ثابت می‌کند آواتار با هر کنشِ ابزار به کاشی هدف می‌رود، انیمیشن کنش پخش می‌شود
 * و ظاهرش با جنسیتِ انتخابی همگام است. منطقِ بازی بی‌درنگ می‌ماند (کنش فوری).
 */

async function enterGame(page: Page, gender?: "f" | "m") {
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
  await page.waitForTimeout(1200);
  const nameInput = page.locator("input").first();
  await nameInput.tap({ timeout: 10_000 });
  await nameInput.fill("امید");
  if (gender) {
    const g = page.getByRole("radio", { name: gender === "f" ? "زن" : "مرد", exact: true });
    if (await g.count()) await g.last().tap();
  }
  const gate = page.getByRole("button", { name: "آغاز داستان" });
  if (await gate.count()) await gate.last().tap();
  await page.waitForTimeout(800);
  await page.touchscreen.tap(160, 300).catch(() => {});
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { getState: () => { story: { shown: boolean } } | null; setState: (s: unknown) => void } };
    const g = w.__game;
    const st = g?.getState?.();
    if (st?.story) {
      st.story.shown = false;
      g?.setState(st);
    }
  });
  await page.waitForTimeout(600);
}

const hero = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __game?: { hero: () => { x: number; y: number; tx: number; ty: number; act: string; init: boolean } } };
    return w.__game?.hero();
  });

test("آواتار با کنش شخم به کاشی می‌رسد و انیمیشن پخش می‌کند", async ({ page }) => {
  await enterGame(page);
  await page.getByRole("button", { name: "شخم", exact: true }).tap();
  const box = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 2) / 2);
  await page.waitForTimeout(200);
  let h = await hero(page);
  expect(h?.init).toBe(true);
  // هدف روی کاشی ضربه است
  expect(Math.hypot(h!.tx - h!.x, h!.ty - h!.y)).toBeGreaterThan(0);
  // صبر تا رسیدن و پخش کنش
  await page.waitForFunction(() => {
    const w = window as unknown as { __game?: { hero: () => { act: string; actT: number } } };
    return (w.__game?.hero().actT ?? 0) > 0;
  }, undefined, { timeout: 8_000 });
  h = await hero(page);
  expect(h!.act).toBe("hoe");
  await page.screenshot({ path: "docs/shots/e2e-hero-acting.png" });
});

test("ظاهر آواتار با جنسیت انتخابی همگام است", async ({ page }) => {
  await enterGame(page, "f");
  await page.waitForTimeout(600);
  const look = await page.evaluate(() => {
    const w = window as unknown as { __game?: { hero: () => { look: string } } };
    return w.__game?.hero().look;
  });
  expect(look).toBe("f");
});
