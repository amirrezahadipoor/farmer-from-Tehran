/**
 * tests/crops2.test.ts — W.1: بسته‌ی محصولاتِ ۲ (شانزده محصولِ تازه)
 */
import { describe, expect, it } from "vitest";
import { CROPS, ITEMS } from "../src/game/data";
import { ITEM_SVG } from "../src/game/art/itemIcons";

const W1 = ["cucumber", "potato", "onion", "eggplant", "chickpea", "lentil", "garlic", "sesame", "sugar_beet", "mulberry", "cumin", "apricot", "sugarcane", "olive", "quince", "orange"];
const LOOKS = new Set(["tree", "bush", "paddy", "boll", "tuber", "cane", "pod", "vine", "umbel"]);
const perHour = (id: string) => {
  const c = CROPS.find((x) => x.id === id)!;
  return { profit: ((c.yield * ITEMS[id].base - c.seed) / c.time) * 3600, xp: (c.xp / c.time) * 3600, lvl: c.lvl };
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

describe("W.1 — بسته‌ی محصولاتِ ۲", () => {
  it("≥ ۴۵ محصول با شناسه و نامِ یکتا", () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(45);
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(CROPS.length);
    expect(new Set(CROPS.map((c) => c.name)).size).toBe(CROPS.length);
    for (const id of W1) expect(CROPS.some((c) => c.id === id), id).toBe(true);
  });

  it("هر محصول کالای فروشی و آیکونِ اختصاصی دارد (نه جعبه‌ی پیش‌فرض)", () => {
    for (const c of CROPS) {
      const out = c.out ?? c.id;
      expect(ITEMS[out], out).toBeDefined();
      expect(ITEMS[out].name.length).toBeGreaterThan(0);
      const svg = ITEM_SVG[out];
      expect(svg, `آیکونِ ${out}`).toBeTruthy();
      expect(svg).not.toMatch(/undefined|NaN/);
    }
  });

  it("محصولاتِ تازه ظاهرِ معتبر و رنگِ hex دارند", () => {
    for (const id of W1) {
      const c = CROPS.find((x) => x.id === id)!;
      expect(LOOKS.has(c.look ?? ""), `${id}: ${c.look}`).toBe(true);
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.leaf).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("بالانس: سود و تجربه‌ی ساعتی هر محصولِ تازه در بازه‌ی همسایه‌های هم‌سطح", () => {
    // مرجع: محصولاتِ قدیمیِ فروشی (گل‌ها و صنوبر که برای کارگاه‌اند کنار می‌روند)
    const old = CROPS.filter((c) => !W1.includes(c.id) && !c.out && perHour(c.id).profit > 600);
    for (const id of W1) {
      const me = perHour(id);
      const near = old.filter((c) => Math.abs(c.lvl - me.lvl) <= 3).map((c) => perHour(c.id));
      const ref = near.length >= 2 ? near : old.filter((c) => c.lvl <= me.lvl).slice(-3).map((c) => perHour(c.id));
      const mp = median(ref.map((r) => r.profit));
      const mx = median(ref.map((r) => r.xp));
      expect(me.profit / mp, `${id}: سود ${Math.round(me.profit)} در برابرِ میانه‌ی ${Math.round(mp)}`).toBeGreaterThan(0.55);
      expect(me.profit / mp, `${id}: سود ${Math.round(me.profit)} در برابرِ میانه‌ی ${Math.round(mp)}`).toBeLessThan(1.6);
      expect(me.xp / mx, `${id}: تجربه`).toBeGreaterThan(0.6);
      expect(me.xp / mx, `${id}: تجربه`).toBeLessThan(1.6);
    }
  });

  it("سطح‌ها: هر سطحِ ۱ تا ۲۴ محصولی دارد و محصولِ تازه تا سطحِ ۲۸ ادامه دارد", () => {
    const lv = new Set(CROPS.map((c) => c.lvl));
    for (let l = 1; l <= 24; l++) expect(lv.has(l), `سطح ${l}`).toBe(true);
    expect(Math.max(...CROPS.map((c) => c.lvl))).toBe(28);
  });
});
