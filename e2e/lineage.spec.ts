import { test, expect, type Page } from "@playwright/test";

/**
 * e2e/lineage.spec.ts — شاهدِ P6.4 «داستان با متغیرهای نسل قبل ادامه دارد»
 *  تناسخِ واقعی از پنلِ کسب‌وکار → دروازه‌ی نامِ وارث (پیشنهادِ پیش‌فرض) → فصل ۱۱ «وارث» →
 *  نسلِ قبل با نام و عددهای واقعیِ خودش حرف می‌زند → قول = هدف → با عملی شدنِ قول، پایان روی
 *  تنه‌ی گردو و پاداشِ یک‌باره.
 */
type Lin = { phase: string; shown: boolean; goalBase: number; completed: number[]; heirs: { name: string; trait: string }[] };
type G = {
  getState: () => Record<string, unknown> & { coins: number; level: number; day: number; stats: Record<string, number>; lineage?: Lin; story: Record<string, unknown> };
  setState: (s: unknown) => void;
  openPanel: (p: unknown) => void;
};
const game = (page: Page) => page.evaluate(() => !!(window as unknown as { __game?: G }).__game?.getState());
const lineage = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.getState().lineage ?? null);
/** ماشین‌تحریر: اگر هنوز تایپ می‌کند، لمس متن را کامل می‌کند (قطعی، بر اساسِ برچسبِ پایینِ کادر) */
const TYPING = "لمس = نمایش کامل متن";
const complete = async (page: Page) => {
  if (await page.getByText(TYPING).isVisible()) await page.mouse.click(160, 220);
  await expect(page.getByText(TYPING)).toHaveCount(0);
};
/** صحنه‌ی بعد */
const advance = async (page: Page) => {
  await complete(page);
  await page.mouse.click(160, 220);
};

test("فصلِ نسل: تناسخ ← نامِ وارث ← سخنِ نسلِ قبل با عددهایش ← قول ← پایان", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("farm_started", "1");
    localStorage.setItem("farm_onboard", "1");
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => game(page), { timeout: 15_000 }).toBe(true);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    const s = g.getState();
    s.level = 22;
    s.coins = 60_000;
    s.day = 43;
    Object.assign(s.stats, { harvested: 900, orders: 180, produced: 60, decorations: 2 });
    Object.assign(s.story, { name: "امید", chapter: 10, phase: "scenes", done: true, shown: false });
    g.setState(s);
    g.openPanel("biz");
  });

  // تناسخِ واقعی (دو ضربه‌ی تأیید)
  await page.getByRole("button", { name: "آغاز تناسخ" }).click();
  await page.getByRole("button", { name: "مطمئنی؟ آغاز نسل تازه" }).click();
  await expect(page.getByText("وارثِ نسلِ دوم")).toBeVisible();
  await expect(page.getByLabel("نامِ وارث")).toHaveValue("مهسا");
  await page.getByLabel("نامِ وارث").fill("نیلوفر");
  await page.getByRole("button", { name: "سپردنِ کلید" }).click();

  // فصل ۱۱ و سخنِ نسلِ قبل (بازرگان: ۱۸۰ سفارش در ۴۳ روز)
  await expect(page.getByRole("heading", { name: "وارث", exact: true })).toBeVisible();
  await expect(page.getByText("فصل ۱۱")).toBeVisible();
  await advance(page); // ← سخنِ نسلِ قبل
  await complete(page);
  await expect(page.getByText("در ۴۳ روز ۱۸۰ سفارش", { exact: false })).toBeVisible();
  await expect(page.getByText("بازرگانِ نسلِ پیش")).toBeVisible();
  await advance(page); // ← دفترچه‌ی حلوا (خاله رعنا)
  await complete(page);
  await expect(page.getByText("خاله رعنا")).toBeVisible();
  await advance(page); // ← قولِ وارث
  await complete(page);
  await expect(page.getByText("وارثِ نسلِ دوم")).toBeVisible();
  await expect(page.getByText("قول می‌دهم ۱۲ سفارش", { exact: false })).toBeVisible();
  await advance(page); // ← پایانِ صحنه‌ها: پرده بسته می‌شود و شمارشِ قول آغاز
  await expect.poll(async () => (await lineage(page))?.phase).toBe("goal");
  const L = (await lineage(page))!;
  expect(L.shown).toBe(false);
  expect(L.goalBase).toBe(180);
  expect(L.heirs.at(-1)).toMatchObject({ name: "نیلوفر", trait: "merchant" });

  // قول عملی می‌شود ← پایان روی گردو
  const coins0 = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState().coins);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    const s = g.getState();
    s.stats.orders += 12;
    g.setState(s);
  });
  await expect(page.getByText("لمس = نمایش کامل متن").or(page.getByText("غروبِ همان سال", { exact: false })).first()).toBeVisible({ timeout: 8_000 });
  await complete(page);
  await expect(page.getByText("غروبِ همان سال", { exact: false })).toBeVisible();
  await expect(page.getByText("رحیم و امید", { exact: false })).toBeVisible();
  await advance(page); // ← دعای بابابزرگ
  await complete(page);
  await expect(page.getByText("بابابزرگ رحیم")).toBeVisible();
  await advance(page); // ← پاداش
  await expect.poll(async () => (await lineage(page))?.phase).toBe("done");
  const coins1 = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState().coins);
  expect(coins1 - coins0).toBeGreaterThanOrEqual(6000);
  expect((await lineage(page))!.completed).toEqual([1]);
});
