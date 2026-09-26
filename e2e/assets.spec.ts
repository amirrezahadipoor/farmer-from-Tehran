import { test, expect } from "@playwright/test";

/**
 * e2e/assets.spec.ts — شاهدِ «صفر دارایی ۴۰۴» (P5.2)
 *
 * ریویو ۷ تصویر ۴۰۴ و یک لوگوی شکسته گزارش کرده بود. این تست، فهرست دارایی‌ها را
 * از منبع حقیقتِ خودِ اپ (پیش‌کشِ `public/sw.js`) برمی‌دارد و یکی‌یکی از سرور
 * می‌گیرد؛ پس نه مسیر گم‌شده‌ای جا می‌ماند و نه فهرستِ دستی‌ای که کهنه شود.
 */

test.describe("دارایی‌ها — هیچ تصویر/آیکون/فونتی ۴۰۴ نیست", () => {
  test("همه‌ی دارایی‌های پیش‌کش‌شده و آیکون‌های PWA با ۲۰۰ برمی‌گردند", async ({ page, request }) => {
    const res = await request.get("/sw.js");
    expect(res.status(), "sw.js باید سرو شود").toBe(200);
    const sw = await res.text();

    // مسیرهای پیش‌کش از خود سرویس‌ورکر استخراج می‌شوند
    const listed = [...sw.matchAll(/["'](\/(?:images|icons|fonts)\/[A-Za-z0-9._-]+)["']/g)].map((m) => m[1]);
    const paths = [...new Set(listed)];
    expect(paths.length, "سرویس‌ورکر باید دارایی‌های اصلی را پیش‌کش کند").toBeGreaterThan(15);

    // لوگو، آسمان پس‌زمینه و آیکون‌ها حتماً باید در فهرست باشند
    for (const must of ["/images/logo_badge.png", "/images/bg_sky.webp", "/icons/icon-192.png", "/icons/maskable-512.png"]) {
      expect(paths, `دارایی حیاتی ${must} در پیش‌کش نیست`).toContain(must);
    }

    const bad: string[] = [];
    for (const p of paths) {
      const r = await request.get(p);
      if (r.status() !== 200) bad.push(`${p} → ${r.status()}`);
      else if (!(r.headers()["content-type"] || "").match(/image|font|png|webp|woff/i)) bad.push(`${p} → نوع نامعتبر`);
    }
    expect(bad, "دارایی‌های گم‌شده یا با نوع نامعتبر").toEqual([]);

    // manifest هم آیکون‌هایش را واقعاً داشته باشد
    const man = await request.get("/manifest.json");
    expect(man.status()).toBe(200);
    const icons = ((await man.json()) as { icons?: { src: string }[] }).icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(4);
    for (const ic of icons) {
      const r = await request.get(ic.src);
      expect(r.status(), `آیکون مانیفست ${ic.src}`).toBe(200);
    }
  });

  test("در طول یک نشست واقعی بازی هیچ درخواست تصویری ۴۰۴ نمی‌شود", async ({ page }) => {
    const notFound: string[] = [];
    page.on("response", (r) => {
      if (r.status() === 404 && /\.(png|jpe?g|webp|svg|ico|woff2?|gif)(\?|$)/i.test(r.url())) notFound.push(r.url());
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });

    // لوگوی صفحه‌ی اسپلش و بعد ورود به بازی (تصاویر داستان هم لود می‌شوند)
    const img = page.locator("img");
    const imgCount = await img.count();
    for (let i = 0; i < Math.min(imgCount, 6); i++) await img.nth(i).waitFor({ state: "attached" }).catch(() => undefined);

    await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap().catch(() => undefined);
    await page.waitForTimeout(1500);
    const nameInput = page.locator("input").first();
    if (await nameInput.count()) await nameInput.fill("امید").catch(() => undefined);
    const gate = page.getByRole("button", { name: "آغاز داستان" });
    if (await gate.count()) await gate.last().tap().catch(() => undefined);
    await page.waitForTimeout(2500);

    // هر تصویری که در DOM هست باید واقعاً لود شده باشد (naturalWidth > 0)
    const broken = await page.evaluate(() =>
      [...document.images]
        .filter((i) => i.getAttribute("src") && i.complete && i.naturalWidth === 0)
        .map((i) => i.getAttribute("src") || "")
    );
    expect(notFound, "درخواست تصویری ۴۰۴").toEqual([]);
    expect(broken, "تصویر شکسته (لود نشده)").toEqual([]);
  });
});
