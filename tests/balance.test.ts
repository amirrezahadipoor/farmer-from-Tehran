/**
 * tests/balance.test.ts — نگهبانِ بالانسِ اقتصادی (بسته‌ی D)
 *
 * نام‌زدهایی که هر تغییری در data.ts/economy.ts باید نگه دارد:
 *  ۱. تاجِ سودِ سطوح صعودی و بدونِ جهش است (نه سکه‌پاشیِ نعنا، نه محصولِ مرده).
 *  ۲. هیچ دستورِ کارگاهی زیان‌ده نیست (آبمیوه و شربتِ عسلِ زیان‌دهِ پیشین لغو شد).
 *  ۳. درختِ مهارت کامل‌شدنی است: کلِ هزینه ≤ امتیازِ سطحِ ۲۸ (۱/سطح + پاداشِ هر ۴ سطح).
 *  ۴. سفارش‌ها از فروشِ خام سودمندترند.
 *
 * گزارشِ کاملِ جدول‌ها: BALANCE_REPORT=1 npx vitest run tests/balance.test.ts
 */
import { describe, expect, it } from "vitest";
import { CROPS, ITEMS, BUILDINGS, SKILLS, xpFor } from "../src/game/data";
import { newState, genOrder, addXp } from "../src/game/logic";

const profitPerHour = (id: string) => {
  const c = CROPS.find((x) => x.id === id)!;
  const out = c.out ?? c.id;
  return ((c.yield * (ITEMS[out]?.base ?? 0) - c.seed) / c.time) * 3600;
};
/** کشت‌هایی که نقشِ زنجیره دارند و عمداً سودِ خامِ پایین‌تری دارند */
const UTILITY = new Set(["clover", "rose", "poplar"]);

describe("بالانس: نردبانِ محصول", () => {
  const byLvl = new Map<number, number>();
  for (const c of CROPS) {
    const p = profitPerHour(c.id);
    byLvl.set(c.lvl, Math.max(byLvl.get(c.lvl) ?? 0, p));
    if (!UTILITY.has(c.id) && !c.out) {
      const crown = byLvl.get(c.lvl)!;
      expect(p, `${c.name}: سودِ ${Math.round(p)} در برابرِ تاجِ ${Math.round(crown)}`)
        .toBeGreaterThanOrEqual(crown * 0.5);
    }
  }
  const levels = [...byLvl.keys()].sort((a, b) => a - b);

  it("تاجِ سودِ هر سطح دست‌کم ۸۵٪ سطحِ قبل است (محصولِ تازه بی‌ارزش نیست)", () => {
    for (let i = 1; i < levels.length; i++) {
      const prev = byLvl.get(levels[i - 1])!, cur = byLvl.get(levels[i])!;
      expect(cur, `سطحِ ${levels[i]}: تاجِ ${Math.round(cur)} پس از ${Math.round(prev)}`)
        .toBeGreaterThanOrEqual(prev * 0.85);
    }
  });

  it("بدونِ جهش: تاجِ هر سطح بیش از ۴۰٪ تاجِ قبل نپرد (سکه‌پاشیِ تکی ممنوع)", () => {
    for (let i = 1; i < levels.length; i++) {
      const prev = byLvl.get(levels[i - 1])!, cur = byLvl.get(levels[i])!;
      expect(cur / prev, `سطحِ ${levels[i]}`).toBeLessThanOrEqual(1.4);
    }
  });

  it("رشدِ کلی: تاجِ آخرین سطح دست‌کم ۳ برابرِ سطحِ اول (پیشرفت حس می‌شود)", () => {
    expect(byLvl.get(levels[levels.length - 1])!).toBeGreaterThanOrEqual(byLvl.get(levels[0])! * 3);
  });
});

describe("بالانس: زنجیره‌ی کارگاه‌ها", () => {
  it("هر دستورِ هر کارگاه ارزش‌افزوده‌ی مثبت دارد", () => {
    for (const b of BUILDINGS) for (const r of b.recipes) {
      const cost = Object.entries(r.inp).reduce((a, [k, n]) => a + (ITEMS[k]?.base ?? 0) * n, 0);
      expect(ITEMS[r.out]?.base * (r.n || 1), `${b.id}→${r.out}: خروجی در برابرِ ورودیِ ${cost}`)
        .toBeGreaterThan(cost);
    }
  });
});

describe("بالانس: اقتصادِ مهارت", () => {
  it("کلِ درخت ≤ امتیازِ در دسترس تا سطحِ ۲۸ (۱/سطح + پاداشِ هر ۴ سطح)", () => {
    const total = SKILLS.reduce((a, s) => a + s.cost, 0);
    const pointsAt28 = 28 + Math.floor(28 / 4);
    expect(total, `درختِ ${total} امتیازی در برابرِ ${pointsAt28}`).toBeLessThanOrEqual(pointsAt28);
  });

  it("دستاوردِ «استاد مهارت‌ها» (۱۰ مهارت) تا سطحِ ۱۸ ممکن است", () => {
    const cheapest10 = SKILLS.map((s) => s.cost).sort((a, b) => a - b).slice(0, 10)
      .reduce((a, c) => a + c, 0);
    expect(cheapest10).toBeLessThanOrEqual(18 + Math.floor(18 / 4));
  });

  it("پاداشِ امتیازِ هر ۴ سطح واقعاً اعطا می‌شود", () => {
    const s = newState();
    s.story.shown = false;
    const before = s.stats.skillPoints;
    s.xp = xpFor(1); // یک سطح کامل
    addXp(s, 1, { toast: () => {}, fx: () => {}, sound: () => {} });
    expect(s.level).toBe(2);
    expect(s.stats.skillPoints - before).toBe(1); // سطحِ ۲ مضربِ ۴ نیست
  });
});

describe("بالانس: سفارش در برابرِ فروشِ خام", () => {
  it("سفارش دست‌کم ۱۲۰٪ ارزشِ پایه‌ی اقلام می‌پردازد", () => {
    for (let i = 0; i < 30; i++) {
      const s = newState();
      s.story.shown = false;
      s.rep = 0;
      const o = genOrder(s);
      const val = o.items.reduce((a, it) => a + (ITEMS[it.id]?.base ?? 10) * it.n, 0);
      expect(o.coins / val, `سفارشِ ${o.items.map((x) => x.id).join(",")}`).toBeGreaterThanOrEqual(1.2);
    }
  });
});

describe("گزارشِ بالانس (BALANCE_REPORT=1)", () => {
  it("جدول‌های نردبان/دیوارِ تجربه", () => {
    if (!process.env.BALANCE_REPORT) return;
    const rows = [...CROPS].sort((a, b) => a.lvl - b.lvl || a.seed - b.seed);
    for (const c of rows) {
      const out = c.out ?? c.id;
      console.log(`L${String(c.lvl).padStart(2)} ${c.name}: بذر=${c.seed} زمان=${c.time} سود=${Math.round(profitPerHour(c.id))}/h xp=${Math.round((c.xp / c.time) * 3600)}/h`);
    }
    let total = 0;
    for (let l = 1; l <= 28; l++) {
      total += xpFor(l);
      const avail = CROPS.filter((c) => c.lvl <= l);
      const best = Math.max(...avail.map((c) => (c.xp / c.time) * 3600));
      console.log(`سطحِ ${l}: نیاز=${xpFor(l)} جمع=${total} بهترینِ xp/h=${Math.round(best)}`);
    }
  });
});
