import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

/** V.10 — حالتِ عکس: دکمه‌ی دوربین ← پیش‌نمایش با قابِ فصلی ← دانلودِ PNGِ واقعی در ≤ ۲ ثانیه */

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

test("حالت عکس: پنج قاب، دانلودِ PNGِ واقعی و ساخت در ≤ ۲ ثانیه", async ({ page }, testInfo) => {
  await enter(page);
  const cam = page.getByRole("button", { name: "حالت عکس" });
  await expect(cam).toBeVisible({ timeout: 10_000 });
  await cam.tap();

  const dlg = page.getByRole("dialog", { name: "حالت عکس" });
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  // پرده تمام‌صفحه است (نه محبوس در ستونِ دکمه‌ها)
  const box = await dlg.boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.width).toBeGreaterThan(vp.width * 0.95);
  // پیش‌نمایش واقعاً کشیده شده و قابِ پیش‌فرض همان فصلِ جاری است (روز ۱ = بهار)
  const preview = dlg.getByRole("img", { name: /پیش‌نمایشِ عکسِ مزرعه/ });
  await expect(preview).toBeVisible();
  await expect(dlg.getByRole("button", { name: "بهار", exact: true })).toHaveAttribute("aria-pressed", "true");
  const filled = await preview.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const x = c.getContext("2d")!;
    const d = x.getImageData(Math.floor(c.width / 2) - 30, Math.floor(c.height / 2) - 30, 60, 60).data;
    const colors = new Set<number>();
    for (let i = 0; i < d.length; i += 16) colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return colors.size;
  });
  expect(filled, "وسطِ عکس صحنه‌ی واقعی است، نه رنگِ خالی").toBeGreaterThan(20);

  // عکس با DPRِ کامل گرفته می‌شود، حتی اگر رزولوشنِ تطبیقیِ بازی روی CI پایین آمده باشد
  const dpr = await page.evaluate(() => Math.min(2, window.devicePixelRatio || 1));
  const wFramed = await preview.evaluate((el) => (el as HTMLCanvasElement).width);
  for (const f of ["تابستان", "پاییز", "زمستان", "بی‌قاب", "بهار"]) {
    const b = dlg.getByRole("button", { name: f, exact: true });
    await b.tap();
    await expect(b).toHaveAttribute("aria-pressed", "true");
    if (f === "بی‌قاب") {
      const w0 = await preview.evaluate((el) => (el as HTMLCanvasElement).width);
      expect(w0, "بی‌قاب = بومِ نقشه با DPRِ کامل").toBeGreaterThanOrEqual(Math.floor(vp.width * dpr * 0.95));
      expect(wFramed, "قاب حاشیه اضافه می‌کند").toBeGreaterThan(w0);
    }
  }
  await page.screenshot({ path: testInfo.outputPath("v10-photo-mode.png") });

  const [dl] = await Promise.all([page.waitForEvent("download"), dlg.getByRole("button", { name: "دانلود عکس" }).tap()]);
  expect(dl.suggestedFilename()).toMatch(/^golden-valley-day-\d+-(spring|summer|autumn|winter)\.png$/);
  const file = testInfo.outputPath(dl.suggestedFilename());
  await dl.saveAs(file);
  const buf = readFileSync(file);
  expect(buf.subarray(0, 8).toString("hex"), "امضای PNG").toBe("89504e470d0a1a0a");
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  // بومِ نقشه (CSS × DPR تا سقفِ ۲) + حاشیه‌های قاب
  expect(w).toBeGreaterThan(vp.width * dpr * 0.95);
  expect(h).toBeGreaterThan(vp.height * dpr * 0.8);

  await expect(dlg).toHaveAttribute("data-photo-ms", /^\d+$/);
  const ms = Number(await dlg.getAttribute("data-photo-ms"));
  const line = `[V.10] ${testInfo.project.name}: PNG ${w}x${h} (${Math.round(buf.length / 1024)} KB) at dpr ${dpr} in ${ms} ms`;
  console.log(line);
  testInfo.annotations.push({ type: "photo", description: line });
  expect(ms).toBeLessThanOrEqual(2_000);

  await dlg.getByRole("button", { name: "بستن حالت عکس" }).tap();
  await expect(dlg).toBeHidden();
  await expect(page.getByRole("button", { name: "منو" })).toBeVisible();
});
