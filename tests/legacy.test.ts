import { describe, it, expect, beforeEach } from "vitest";
import {
  INHERIT_SHARE,
  NCH,
  canPrestige,
  doPrestige,
  generationRows,
  grantInheritedLand,
  inheritedChunks,
  legacyPerks,
  newState,
  normalizeGenerations,
  plant,
  queueRecipe,
  recipeLock,
  recipeOpen,
  seedDiscount,
  tick,
  unlockedItems,
  workshopTimeFactor,
  idx,
  type Events,
  type State,
} from "../src/game/logic";
import { BMAP, CMAP, ITEMS } from "../src/game/data";
import { hasItemIcon } from "../src/game/icons";
import { sanitizeSave } from "../src/game/sim/sanitize";

/**
 * P6.3 — «نسخه‌گردانی ≥ ۳ مزیتِ تازه» + آمارِ نسلی. هر مزیت با عدد سنجیده می‌شود، نه با متن.
 */
const toasts: { m: string; t?: string }[] = [];
const ev: Events = { toast: (m, t) => toasts.push({ m, t }), fx: () => {}, sound: () => {} };
let s: State;
beforeEach(() => {
  toasts.length = 0;
  s = newState();
  s.achievements = Object.fromEntries(["rich1", "rich2", "rich3", "first_harvest", "level10"].map((k) => [k, true]));
});
const ready = (st: State, coins = 50_000) => {
  st.level = 22;
  st.coins = coins;
};
const ownedChunks = (st: State) => st.chunks.filter(Boolean).length;

describe("مزایای تازه (عددی)", () => {
  it("۱) کارگاه در هر نسل تندتر می‌شود (پیش از این کُندتر می‌شد)؛ سقف ۴۰٪", () => {
    expect(workshopTimeFactor(0)).toBe(1);
    expect(workshopTimeFactor(1)).toBeCloseTo(0.95);
    expect(workshopTimeFactor(4)).toBeCloseTo(0.8);
    expect(workshopTimeFactor(50)).toBe(0.6);
    // اثرِ واقعی در tick: همان دستور در نسلِ ۴ زودتر تمام می‌شود
    const run = (gen: number) => {
      const st = newState();
      st.prestige = gen;
      st.tiles[idx(17, 17)] = { k: "bld", v: 0.5, b: "mill", q: [0], p: 0, out: [] };
      const r = BMAP.mill.recipes[0];
      let t = 0;
      while ((st.tiles[idx(17, 17)].out?.length || 0) === 0 && t < r.time * 3) {
        tick(st, 0.5, ev);
        t += 0.5;
      }
      return t;
    };
    expect(run(4)).toBeLessThan(run(0) * 0.85);
  });

  it("۲) بذر در هر نسل ۵٪ ارزان‌تر؛ سقف ۲۵٪", () => {
    expect([0, 1, 3, 5, 9].map(seedDiscount)).toEqual([0, 0.05, 0.15, 0.25, 0.25]);
    const cost = (gen: number) => {
      const st = newState();
      st.prestige = gen;
      st.coins = 100_000;
      st.tiles[idx(17, 17)] = { k: "soil", v: 0.5 };
      const c0 = st.coins;
      plant(st, 17, 17, "saffron", ev, true);
      return c0 - st.coins;
    };
    expect(cost(0)).toBe(CMAP.saffron.seed);
    expect(cost(5)).toBe(Math.floor(CMAP.saffron.seed * 0.75));
  });

  it("۳) زمینِ موروثی: هر نسل یک قطعه‌ی رایگانِ هم‌جوار، حداکثر ۳، بدون گران‌کردنِ خرید", () => {
    const base = ownedChunks(s);
    ready(s);
    doPrestige(s, ev);
    expect(ownedChunks(s)).toBe(base + 1);
    expect(s.bought).toBe(0);
    for (let g = 2; g <= 5; g++) {
      ready(s);
      doPrestige(s, ev);
      expect(ownedChunks(s)).toBe(base + inheritedChunks(g));
    }
    expect(inheritedChunks(5)).toBe(3);
    // هر قطعه‌ی موروثی به زمینِ قبلی چسبیده است
    const st = newState();
    const got = grantInheritedLand(st, 3);
    expect(got).toHaveLength(3);
    for (const c of got) {
      const cx = c % NCH, cy = Math.floor(c / NCH);
      expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => st.chunks[(cy + dy) * NCH + cx + dx])).toBe(true);
    }
  });

  it("۴) ارثیه: ۱۰٪ سکه‌ها به نسلِ بعد می‌رسد", () => {
    ready(s, 80_000);
    doPrestige(s, ev);
    expect(s.coins).toBe(1000 + 80_000 * INHERIT_SHARE);
    expect(toasts.at(-1)!.m).toContain("ارثیه");
  });

  it("۵) دستورِ خانوادگی: حلوای مادربزرگ فقط از نسلِ دوم، با SVG و بدون ورود به سفارشِ نسلِ اول", () => {
    const r = BMAP.bakery.recipes.find((x) => x.out === "grandma_halva")!;
    expect(r.gen).toBe(1);
    expect(ITEMS.grandma_halva.base).toBeGreaterThan(ITEMS.bread.base * 5);
    expect(hasItemIcon("grandma_halva")).toBe(true);
    s.level = 10;
    s.tiles[idx(17, 17)] = { k: "bld", v: 0.5, b: "bakery", q: [], p: 0, out: [] };
    s.inv.flour = 10;
    s.inv.honey = 10;
    expect(recipeOpen(s, r)).toBe(false);
    expect(recipeLock(s, r)).toBe("از نسل ۲");
    expect(unlockedItems(s)).not.toContain("grandma_halva");
    const ri = BMAP.bakery.recipes.indexOf(r);
    const tile = s.tiles[idx(17, 17)];
    expect(queueRecipe(s, tile, ri, ev)).toBe(false);
    expect(toasts.at(-1)!.m).toContain("نسل ۲");
    s.prestige = 1;
    expect(recipeOpen(s, r)).toBe(true);
    expect(unlockedItems(s)).toContain("grandma_halva");
    expect(queueRecipe(s, tile, ri, ev)).toBe(true);
  });

  it("پنل: ۵ مزیتِ تازه + ۴ ضریبِ قدیمی، مقدارِ نسلِ بعد هیچ‌وقت بدتر نیست", () => {
    const perks = legacyPerks(2);
    expect(perks.filter((p) => p.fresh)).toHaveLength(5);
    expect(perks).toHaveLength(9);
    for (const p of perks) expect(p.next.length).toBeGreaterThan(0);
  });
});

describe("شجره‌نامه", () => {
  it("هر تناسخ کارنامه‌ی همان نسل را ثبت می‌کند (تفاضلِ آمار)", () => {
    expect(canPrestige(s)).toBe(false);
    ready(s, 30_000);
    s.day = 40;
    s.stats.earned = 100_000;
    s.stats.harvested = 900;
    s.stats.orders = 30;
    doPrestige(s, ev);
    ready(s, 60_000);
    s.day = 25;
    s.stats.earned = 250_000;
    s.stats.harvested = 2_000;
    s.stats.orders = 70;
    doPrestige(s, ev);
    const rows = generationRows(s);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ gen: 0, day: 40, earned: 100_000, harvested: 900, orders: 30, inherited: 3_000 });
    expect(rows[1]).toMatchObject({ gen: 1, day: 25, earned: 150_000, harvested: 1_100, orders: 40, inherited: 6_000 });
  });

  it("سیو: شجره‌نامه از sanitize سالم عبور می‌کند و رکوردِ خراب حذف یا صفر می‌شود", () => {
    ready(s);
    doPrestige(s, ev);
    const back = sanitizeSave(JSON.parse(JSON.stringify(s)))!;
    expect(back.generations).toEqual(s.generations);
    expect(normalizeGenerations("x")).toBeUndefined();
    expect(normalizeGenerations([null, 4, { gen: "2", day: -5, earned: Infinity }])).toEqual([
      { gen: 2, day: 0, level: 0, earned: 0, harvested: 0, orders: 0, coins: 0, inherited: 0 },
    ]);
    expect(normalizeGenerations(Array.from({ length: 80 }, (_, i) => ({ gen: i })))!.length).toBe(50);
  });
});
