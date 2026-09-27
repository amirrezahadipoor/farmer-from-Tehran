import { test, expect, type Page } from "@playwright/test";

/** W.1 — بسته‌ی محصولاتِ ۲: کاشت و برداشتِ واقعیِ سیب‌زمینی با ضربه روی نقشه + نمای شانزده محصولِ تازه */

type Tile = { k: string; crop?: string; g?: number; wet?: boolean; dry?: number };
type St = { level: number; coins: number; tiles: Tile[]; inv: Record<string, number>; stats: { harvested: number } };
type G = {
  getState: () => St;
  setState: (s: St) => void;
  tileScreen: (x: number, y: number) => { x: number; y: number };
  view: () => { w: number; h: number; cam: { x: number; y: number; z: number } };
};
const W1 = ["cucumber", "potato", "onion", "eggplant", "chickpea", "lentil", "garlic", "sesame", "sugar_beet", "mulberry", "cumin", "apricot", "sugarcane", "olive", "quince", "orange"];

async function enter(page: Page) {
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

test("W.1: سیب‌زمینی با ضربه کاشته و برداشت می‌شود؛ شانزده محصولِ تازه روی نقشه", async ({ page }) => {
  test.setTimeout(120_000);
  await enter(page);
  // سطح و سکه‌ی کافی؛ نزدیک‌ترین کاشی به مرکزِ صفحه خاکِ خالی می‌شود و دوربین رویش می‌نشیند
  const tgt = await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    const s = g.getState();
    const N = Math.round(Math.sqrt(s.tiles.length));
    const v = g.view();
    let best = -1;
    let bd = Infinity;
    s.tiles.forEach((t, i) => {
      if (t.k !== "soil" && t.k !== "grass") return;
      const p = g.tileScreen(i % N, Math.floor(i / N));
      const d = Math.hypot(p.x - v.w / 2, p.y - v.h / 2) + (t.k === "soil" && !t.crop ? 0 : 60);
      if (d < bd) (bd = d), (best = i);
    });
    s.level = 30;
    s.coins = 99_999;
    s.tiles[best] = { ...s.tiles[best], k: "soil", crop: undefined, g: 0 };
    g.setState(s);
    const p = g.tileScreen(best % N, Math.floor(best / N));
    v.cam.x += v.w / 2 - p.x;
    v.cam.y += v.h / 2 - p.y;
    return { i: best, x: best % N, y: Math.floor(best / N), N };
  });
  await page.waitForTimeout(500);
  const at = () => page.evaluate(({ x, y }) => (window as unknown as { __game: G }).__game.tileScreen(x, y), tgt);

  // کاشت: ابزارِ «کاشت» ← بذرِ «سیب‌زمینی» در سینی ← ضربه روی خاک
  await page.getByRole("button", { name: "کاشت", exact: true }).tap();
  const potato = page.getByRole("button", { name: "سیب‌زمینی", exact: true });
  await expect(potato).toBeVisible();
  await expect(potato).toBeEnabled();
  await potato.tap();
  await expect(potato).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "docs/shots/w1-seed-tray.png" });
  let p = await at();
  await page.touchscreen.tap(Math.round(p.x), Math.round(p.y));
  await expect
    .poll(() => page.evaluate((i) => (window as unknown as { __game: G }).__game.getState().tiles[i].crop ?? null, tgt.i), { timeout: 10_000 })
    .toBe("potato");

  // برداشت: رسیدنِ فوری (فقط زمان جلو می‌رود) ← ابزارِ «دست» ← ضربه
  const before = await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    const s = g.getState();
    return { potato: s.inv.potato ?? 0, harvested: s.stats.harvested };
  });
  await page.evaluate((i) => {
    const g = (window as unknown as { __game: G }).__game;
    const s = g.getState();
    s.tiles[i].g = 1;
    g.setState(s);
  }, tgt.i);
  await page.getByRole("button", { name: "دست", exact: true }).tap();
  p = await at();
  await page.touchscreen.tap(Math.round(p.x), Math.round(p.y));
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __game: G }).__game.getState().inv.potato ?? 0), { timeout: 10_000 })
    .toBeGreaterThan(before.potato);
  const after = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState().stats.harvested);
  expect(after).toBeGreaterThan(before.harvested);

  // نمای مزرعه: شانزده محصولِ تازه در ردیفِ ۴×۴ دورِ همان کاشی، رسیده
  await page.evaluate(({ x, y, N, ids }) => {
    const g = (window as unknown as { __game: G }).__game;
    const s = g.getState();
    ids.forEach((id, k) => {
      const tx = x - 1 + (k % 4);
      const ty = y - 1 + Math.floor(k / 4);
      const i = ty * N + tx;
      if (s.tiles[i].k === "grass" || s.tiles[i].k === "soil") s.tiles[i] = { ...s.tiles[i], k: "soil", crop: id, g: k % 5 === 4 ? 0.6 : 1 };
    });
    g.setState(s);
  }, { ...tgt, ids: W1 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "docs/shots/w1-crops.png" });
  const planted = await page.evaluate(({ ids }) => {
    const s = (window as unknown as { __game: G }).__game.getState();
    return ids.filter((id) => s.tiles.some((t) => t.crop === id)).length;
  }, { ids: W1 });
  expect(planted).toBeGreaterThanOrEqual(12);
});
