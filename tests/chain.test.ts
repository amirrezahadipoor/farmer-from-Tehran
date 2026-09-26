import { describe, it, expect, vi, afterEach } from "vitest";
import {
  newState,
  tick,
  toolAction,
  harvest,
  queueRecipe,
  collect,
  price,
  genOrder,
  unlockedItems,
  idx,
  CLEAR_YIELD,
  DROUGHT,
  WATER_SECONDS,
  type State,
  type Events,
} from "../src/game/logic";
import { BUILDINGS, BMAP, CLEAR_COST, SEASONS } from "../src/game/data";

/**
 * P5.8 — «درخت و سنگ وارد زنجیره‌ی تولید می‌شوند» + «رویداد خشکسالی»
 */

const quiet: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
afterEach(() => vi.restoreAllMocks());

function fresh(): State {
  const s = newState();
  s.weather = "sun";
  s.coins = 10_000;
  return s;
}

/** کارگاه در (x,y) با صفِ یک دستور؛ تا پایانِ تولید tick می‌زند و خروجی را جمع می‌کند */
function produce(s: State, bld: string, ri: number, x = 20, y = 20) {
  const t = (s.tiles[idx(x, y)] = { k: "bld", v: 0.5, b: bld, q: [], p: 0, out: [] });
  const before = { ...s.inv };
  const ok = queueRecipe(s, t, ri, quiet, true);
  const r = BMAP[bld].recipes[ri];
  for (let i = 0; i < Math.ceil(r.time) + 2; i++) tick(s, 1, quiet);
  collect(s, t, x, y, quiet, true);
  return { ok, before };
}

describe("پاکسازی: درخت = الوار، سنگ = سنگ", () => {
  it("قطع درخت حداقل ۲ الوار می‌دهد (نه ۳۵٪ شانسِ یکی)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // بدون شانسِ اضافه
    const s = fresh();
    s.tiles[idx(12, 12)] = { k: "tree", v: 0.4 };
    s.chunks = s.chunks.map(() => true);
    s.coins = 500; // زیر آستانه‌ی دستاوردهای پولی تا پاداششان حساب را به‌هم نزند
    const c0 = s.coins;
    toolAction(s, 12, 12, "clear", "", quiet);
    expect(s.inv.wood).toBe(CLEAR_YIELD);
    expect(c0 - s.coins).toBe(CLEAR_COST.tree);
    expect(s.tiles[idx(12, 12)].k).toBe("grass");
  });

  it("شکستن سنگ ۲ سنگ و با شانس ۳۰٪ یکی بیشتر", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const s = fresh();
    s.tiles[idx(12, 13)] = { k: "rock", v: 0.4 };
    s.chunks = s.chunks.map(() => true);
    toolAction(s, 12, 13, "clear", "", quiet);
    expect(s.inv.stone).toBe(CLEAR_YIELD + 1);
  });
});

describe("صنوبر: منبعِ تجدیدپذیرِ الوار", () => {
  it("برداشتِ نهال صنوبر «الوار» به انبار می‌آورد", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const s = fresh();
    s.tiles[idx(10, 10)] = { k: "soil", v: 0.5, crop: "poplar", g: 1 };
    expect(harvest(s, 10, 10, quiet, true)).toBe(true);
    expect(s.inv.wood).toBe(2);
    expect(s.inv.poplar).toBeUndefined();
  });

  it("سفارش‌ها «نهال صنوبر» نمی‌خواهند (کالای واقعی = الوار)", () => {
    const s = fresh();
    s.level = 10;
    expect(unlockedItems(s)).toContain("wood");
    expect(unlockedItems(s)).not.toContain("poplar");
    for (let i = 0; i < 40; i++) expect(genOrder(s).items.every((it) => it.id !== "poplar")).toBe(true);
  });
});

describe("زنجیره‌ی چوب و سنگ در کارگاه‌ها", () => {
  it("DoD: الوار و سنگ در دستورهای پخت مصرف می‌شوند", () => {
    const uses = (id: string) => BUILDINGS.flatMap((b) => b.recipes.filter((r) => id in r.inp).map((r) => `${b.id}→${r.out}`));
    expect(uses("wood").length).toBeGreaterThanOrEqual(2); // نجاری + معدن
    expect(uses("stone").length).toBeGreaterThanOrEqual(2); // سنگ‌تراشی + نان سنگک
  });

  it("نجاری: ۲ الوار → ۱ تخته؛ ۲ تخته → جعبه‌ی چوبی", () => {
    const s = fresh();
    s.inv.wood = 2;
    expect(produce(s, "sawmill", 0).ok).toBe(true);
    expect(s.inv.wood).toBe(0);
    expect(s.inv.planks).toBe(1);
    s.inv.planks = 2;
    produce(s, "sawmill", 1, 21, 21);
    expect(s.inv.crate).toBe(1);
  });

  it("معدن سنگ: ۱ الوار → ۲ سنگ (خروجیِ n واقعاً اعمال می‌شود)", () => {
    const s = fresh();
    s.inv.wood = 1;
    produce(s, "quarry", 0);
    expect(s.inv.wood).toBe(0);
    expect(s.inv.stone).toBe(2);
  });

  it("سنگ‌تراشی: ۲ سنگ → سنگ تراش‌خورده؛ ۲ تراش‌خورده + ۱ تخته → سنگ آسیاب", () => {
    const s = fresh();
    s.inv.stone = 2;
    produce(s, "stonemason", 0);
    expect(s.inv.cut_stone).toBe(1);
    s.inv.cut_stone = 2;
    s.inv.planks = 1;
    produce(s, "stonemason", 1, 22, 22);
    expect(s.inv.millstone).toBe(1);
    expect(s.inv.planks).toBe(0);
  });

  it("نانوایی: نان سنگک روی سنگِ داغ (آرد ۲ + سنگ ۱)", () => {
    const s = fresh();
    s.inv.flour = 2;
    s.inv.stone = 1;
    const ri = BMAP.bakery.recipes.findIndex((r) => r.out === "sangak");
    expect(ri).toBeGreaterThanOrEqual(3); // به انتهای فهرست اضافه شد؛ صفِ سیوهای قدیمی به‌هم نمی‌ریزد
    produce(s, "bakery", ri);
    expect(s.inv.sangak).toBe(1);
    expect(s.inv.stone).toBe(0);
  });

  it("هر پله‌ی زنجیره ارزش افزوده دارد (قیمت پایه‌ی خروجی > مجموع ورودی‌ها)", async () => {
    const { ITEMS } = await import("../src/game/data");
    for (const id of ["sawmill", "quarry", "stonemason"]) {
      for (const r of BMAP[id].recipes) {
        const cost = Object.entries(r.inp).reduce((a, [k, n]) => a + ITEMS[k].base * n, 0);
        expect(ITEMS[r.out].base * (r.n || 1), `${id}→${r.out}`).toBeGreaterThan(cost);
      }
    }
  });
});

describe("رویداد خشکسالی (تابستان)", () => {
  const summer = SEASONS.findIndex((x) => x.id === "summer");
  const spring = SEASONS.findIndex((x) => x.id === "spring");
  const drought = (s: State) => {
    s.currentEvent = { type: "drought", endsAt: s.time + 1000, text: "خشکسالی" };
  };

  it("فقط در تابستان وارد چرخه می‌شود", () => {
    const pickLast = () => {
      const s = fresh();
      s.eventAcc = 999;
      // اولین random: شانس رویداد (<0.5)، دومی: انتخاب آخرینِ فهرست
      const seq = [0.1, 0.999];
      vi.spyOn(Math, "random").mockImplementation(() => seq.shift() ?? 0.5);
      return s;
    };
    const a = pickLast();
    a.seasonIndex = spring;
    tick(a, 0.01, quiet);
    expect(a.currentEvent?.type).not.toBe("drought");
    vi.restoreAllMocks();
    const b = pickLast();
    b.seasonIndex = summer;
    tick(b, 0.01, quiet);
    expect(b.currentEvent?.type).toBe("drought");
  });

  it("خاک ۲ برابر زودتر خشک می‌شود", () => {
    const s = fresh();
    drought(s);
    s.tiles[idx(5, 5)] = { k: "soil", v: 0.5, wet: true, dry: WATER_SECONDS };
    tick(s, WATER_SECONDS / DROUGHT.dry + 0.5, quiet);
    expect(s.tiles[idx(5, 5)].wet).toBe(false);
  });

  it("باران نمی‌بارد", () => {
    const s = fresh();
    s.weather = "rain";
    s.seasonIndex = summer;
    vi.spyOn(Math, "random").mockReturnValue(0.99); // رویداد تازه‌ای انتخاب نشود
    s.currentEvent = { type: "drought", endsAt: 1e9, text: "خشکسالی" };
    // روزِ تازه با قرعه‌ی «باران»
    s.time = 239.99;
    vi.restoreAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.05); // < 0.3 = باران در حالت عادی
    tick(s, 0.02, quiet);
    expect(s.weather).not.toBe("rain");
  });

  it("گیاهِ خاکِ خشک ×۰.۶ کندتر رشد می‌کند و قیمت محصولات +۲۰٪", () => {
    const grow = (d: boolean) => {
      const s = fresh();
      if (d) drought(s);
      s.tiles[idx(6, 6)] = { k: "soil", v: 0.5, crop: "wheat", g: 0 };
      tick(s, 1, quiet);
      return s.tiles[idx(6, 6)].g || 0;
    };
    expect(grow(true) / grow(false)).toBeCloseTo(DROUGHT.dryGrowth, 5);

    const a = fresh();
    const b = fresh();
    b.market = a.market;
    drought(b);
    expect(price(b, "saffron") / price(a, "saffron")).toBeCloseTo(1 + DROUGHT.price, 2);
    expect(price(b, "icecream")).toBe(price(a, "icecream")); // کالای کارگاهی نه
  });
});
