import { test, expect } from "@playwright/test";

/**
 * e2e-demo/demo.spec.ts — تستِ دود روی دموی عمومیِ GitHub Pages (نقشه‌ی راه، مورد ۲)
 *
 * همان مسیرِ بازیکنِ تازه، بی‌هیچ قلابِ تستی (نسخه‌ی منتشرشده قلاب ندارد):
 * دارایی‌ها زیرِ مسیرِ پایه ۲۰۰ می‌دهند، اسپلش می‌آید، نام، بستنِ داستان، ردِ آموزش و رسیدن به
 * بازی با نقشه‌ای که واقعاً کشیده شده؛ سرویس‌ورکر هم روی همان مسیرِ پایه ثبت می‌شود.
 */
test("دموی عمومی: دارایی‌ها، اسپلش، ورود به بازی و سرویس‌ورکر", async ({ page, request, baseURL }) => {
  const base = new URL(baseURL as string);
  for (const p of ["", "sw.js", "manifest.json", "images/logo_badge.webp", "images/bg_sky.webp", "fonts/Vazirmatn-Bold.woff2", "icons/icon-192.png"]) {
    const r = await request.get(new URL(p, base).href);
    expect(r.status(), `${p || "/"} باید ۲۰۰ باشد`).toBe(200);
  }

  const bad: string[] = [];
  page.on("response", (r) => {
    if (r.url().startsWith(base.origin) && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });

  await page.goto("./");
  const start = page.getByRole("button", { name: "آغاز داستان" });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.tap();

  const name = page.locator("input").first();
  await name.fill("آزمون");
  await page.getByRole("button", { name: "آغاز داستان" }).last().tap();
  await page.getByRole("button", { name: "بستن" }).first().tap({ timeout: 20_000 });
  const skipTour = page.getByRole("button", { name: "رد کردن آموزش" });
  if (await skipTour.isVisible().catch(() => false)) await skipTour.tap();

  await expect(page.getByRole("button", { name: "منو" })).toBeVisible({ timeout: 20_000 });
  // نقشه واقعاً کشیده شده: وسطِ بوم ده‌ها رنگِ متفاوت دارد، نه یک رنگِ خالی
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
          const x = c?.getContext("2d");
          if (!c || !x) return 0;
          const d = x.getImageData(Math.floor(c.width / 2) - 40, Math.floor(c.height / 2) - 40, 80, 80).data;
          const colors = new Set<number>();
          for (let i = 0; i < d.length; i += 16) colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
          return colors.size;
        }),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(20);

  const scope = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 15_000))]);
    return reg ? reg.scope : null;
  });
  expect(scope, "سرویس‌ورکر روی مسیرِ پایه").toBe(base.href);
  expect(bad, "درخواستِ شکست‌خورده زیرِ دامنه‌ی دمو").toEqual([]);
  await page.screenshot({ path: "docs/shots/demo-pages-412.png" });
});
