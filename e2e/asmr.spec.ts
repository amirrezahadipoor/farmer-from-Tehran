import { test, expect, type Page } from "@playwright/test";

/**
 * M14 — پوششِ مرورگریِ فازِ «ASMR و عمق»:
 *  • M7 زنجیره‌ی برداشت (کمبو) با سه برداشتِ پشت‌سرهمِ واقعی
 *  • M8 محصولِ طلایی با پرچمِ دست‌ساز و حسابِ تفاضلی (مقاوم به پاداشِ «اولین برداشتِ روز»)
 *  • M11 ستاره‌ی آرزو با هوکِ window.__game.wishStar() در شب
 *  • M12 استریکِ روزانه از راهِ ذخیره/بارگذاریِ واقعی (applyStreak پس از load)
 * ضربه‌ها روی کاشیِ واقعی می‌نشیند (tileScreen) — نه فراخوانیِ مستقیمِ سیم.
 */

type Tile = { k: string; crop?: string; g?: number; gold?: boolean; wet?: boolean };
type St = {
  level: number;
  coins: number;
  seasonIndex: number;
  time: number;
  day: number;
  tiles: Tile[];
  chunks: boolean[];
  inv: Record<string, number>;
  combo?: number;
  wishUntil?: number;
  streak?: number;
  streakDay?: number;
  stats: { harvested: number; bestChain: number; golden: number };
};
type G = {
  getState: () => St;
  setState: (s: St) => void;
  tileScreen: (x: number, y: number) => { x: number; y: number };
  view: () => { w: number; h: number; cam: { x: number; y: number; z: number } };
  wishStar: () => void;
  save: () => void;
};

async function enter(page: Page) {
  const consoleErrs: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrs.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => consoleErrs.push("PAGEERROR: " + String(e).slice(0, 200)));
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
    } catch { /* sandbox */ }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 20_000 });
  // شروعِ داستان (اگر لندینگ باز باشد) — بعد از آن بازی و قلابِ __game بالا می‌آید
  const start = page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first();
  if (await start.count()) await start.tap();
  await page.waitForFunction(() => {
    const g = (window as unknown as { __game?: { getState: () => unknown } }).__game;
    return g && typeof g.getState === "function" && g.getState() !== null;
  }, null, { timeout: 30_000 }).catch((e) => {
    throw new Error(`__game پس از ۳۰ ثانیه نیامد — کنسول: ${JSON.stringify(consoleErrs.slice(0, 6))} — ${String(e).slice(0, 80)}`);
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => { story: { shown: boolean } } | null; setState: (s: unknown) => void } }).__game;
    const st = g.getState();
    if (st?.story) { st.story.shown = false; g.setState(st); }
  });
  await page.waitForTimeout(800);
  // شانسیِ خاموش تا همه‌ی حساب‌ها قطعی شود (۰.۹۹: نه اسپانسرِ درخشش، نه طلاییِ تصادفی، نه +۱ شانسی)
  await page.evaluate(() => {
    Math.random = () => 0.99;
  });
}

/** خاکِ رسیده‌ی گندم: نزدیک‌ترین کاشیِ آزاد به مرکز + k−۱ همسایه‌ی راست/پایین؛ دوربین هم روی همان نقطه می‌نشیند */
async function ripePatch(page: Page, k: number) {
  const r = await page.evaluate((k) => {
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
    const cells: number[] = [];
    const bx = best % N;
    const by = Math.floor(best / N);
    // L-شکل: خودِ کاشی، راست، پایین، راستِ پایین — همه در همسایگیِ نزدیک می‌مانند
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      if (cells.length >= k) break;
      const x = bx + dx, y = by + dy;
      s.chunks[Math.floor(y / 4) * 9 + Math.floor(x / 4)] = true;
      s.tiles[y * N + x] = { ...s.tiles[y * N + x], k: "soil", crop: "wheat", g: 1, gold: false };
      cells.push(y * N + x);
    }
    g.setState(s);
    // دوربین: کاشیِ نخست دقیقاً مرکزِ صفحه
    const p = g.tileScreen(bx, by);
    const v2 = g.view();
    v2.cam.x += v2.w / 2 - p.x;
    v2.cam.y += v2.h / 2 - p.y;
    return { cells, N };
  }, k);
  await page.waitForTimeout(400); // نشستنِ دوربین
  return r;
}


/** ضربه‌ی واقعی روی کاشی (i) با مختصاتِ همان لحظه */
async function tapTile(page: Page, i: number, N: number) {
  const p = await page.evaluate(
    ({ i, N }: { i: number; N: number }) => (window as unknown as { __game: G }).__game.tileScreen(i % N, Math.floor(i / N)),
    { i, N },
  );
  await page.touchscreen.tap(Math.round(p.x), Math.round(p.y));
}

test.describe("M14 — عمق و آرامش روی مرورگر", () => {
  test("M7: سه برداشتِ پیوسته کمبو می‌سازد و رکوردِ زنجیره ثبت می‌شود", async ({ page }) => {
    await enter(page);
    const { cells, N } = await ripePatch(page, 3);
    await page.getByRole("button", { name: "دست", exact: true }).tap();
    for (const i of cells) {
      await tapTile(page, i, N);
      await page.waitForTimeout(250);
    }
    const st = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState());
    expect(st.combo ?? 0, "کمبو پس از برداشت‌های پیوسته بالای ۱ است").toBeGreaterThanOrEqual(2);
    expect(st.stats.bestChain, "رکوردِ زنجیره ثبت شده باشد").toBeGreaterThanOrEqual(st.combo ?? 0);
  });

  test("M8: برداشتِ طلایی سکه‌ی خیلی بیشتر می‌دهد و پرچم جمع می‌شود", async ({ page }) => {
    await enter(page);
    const { cells, N } = await ripePatch(page, 2);
    await page.evaluate(
      ({ a, b }: { a: number; b: number }) => {
        const g = (window as unknown as { __game: G }).__game;
        const s = g.getState();
        s.tiles[a].gold = false;
        s.tiles[b].gold = true; // دوقلوی طلایی
        s.seasonIndex = 1; // تابستان: بدونِ پاداشِ فصلی
        g.setState(s);
      },
      { a: cells[0], b: cells[1] },
    );
    await page.getByRole("button", { name: "دست", exact: true }).tap();
    const coins0 = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState().coins);
    for (const i of [cells[0], cells[1]]) {
      await tapTile(page, i, N);
      await page.waitForTimeout(250);
    }
    const st = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState());
    const delta = st.coins - coins0;
    // دو برداشتِ دو‌قلو (هر کدام گندمِ رسیده): اولی معمولی + پاداشِ «اولین برداشتِ روز»، دومی طلایی
    // طلایی ۵ برابرِ معمولی می‌دهد؛ کل = ۵x + x + پاداشِ روز → دست‌کم ۵ برابرِ سهمِ معمولی
    expect(delta, "طلایی + معمولی + پاداشِ روز").toBeGreaterThan(6 * 2 * 4);
    const gold = await page.evaluate(
      ({ i }: { i: number }) => (window as unknown as { __game: G }).__game.getState().tiles[i].gold ?? false,
      { i: cells[1] },
    );
    expect(gold, "پرچمِ طلایی پس از برداشت جمع می‌شود").toBe(false);
    const golden = await page.evaluate(() => (window as unknown as { __game: G }).__game.getState().stats.golden);
    expect(golden).toBe(1);
  });

  test("M11: ستاره‌ی آرزو در شب با هوک می‌آید و ضربه‌اش پانزده دقیقه برکت می‌دهد", async ({ page }) => {
    await enter(page);
    await page.evaluate(() => {
      const g = (window as unknown as { __game: G }).__game;
      const s = g.getState();
      s.time = 1380; // ۲۳:۰۰ — تاریکیِ کامل
      g.setState(s);
      g.wishStar();
    });
    const star = page.getByRole("button", { name: "ستاره‌ی آرزو" });
    await expect(star).toBeVisible({ timeout: 5_000 });
    await star.tap();
    const w = await page.evaluate(() => {
      const s = (window as unknown as { __game: G }).__game.getState();
      return { diff: (s.wishUntil ?? 0) - s.time, until: s.wishUntil ?? 0 };
    });
    expect(w.until).toBeGreaterThan(0);
    expect(w.diff, "بافِ آرزو حدودِ ۹۰۰ ثانیه").toBeGreaterThan(880);
    expect(w.diff).toBeLessThanOrEqual(905);
    await expect(page.getByText("آرزوی ستاره")).toBeVisible({ timeout: 3_000 });
  });

  test("M12: استریکِ روزِ قبل با بارگذاریِ ذخیره تازه می‌شود و صندوق می‌دهد", async ({ page }) => {
    await enter(page);
    await page.evaluate(() => {
      const g = (window as unknown as { __game: G }).__game;
      const s = g.getState();
      s.streak = 3;
      s.streakDay = Math.floor(Date.now() / 86_400_000) - 1; // دیروز
      s.coins = 1_000;
      g.setState(s);
      g.save();
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const g = (window as unknown as { __game?: { getState: () => unknown } }).__game;
      return g && typeof g.getState === "function" && g.getState() !== null;
    }, null, { timeout: 30_000 });
    await expect(page.getByText("پیاپی: صندوقِ روزانه"), "توستِ صندوقِ استریک").toBeVisible({ timeout: 8_000 });
    const st = await page.evaluate(() => {
      const s = (window as unknown as { __game: G }).__game.getState();
      return { streak: s.streak ?? 0, coins: s.coins };
    });
    expect(st.streak, "استریکِ پیوسته یک گام جلو می‌رود").toBe(4);
    expect(st.coins, "صندوقِ استریک: ۵۰×۴").toBe(1_200);
  });
});
