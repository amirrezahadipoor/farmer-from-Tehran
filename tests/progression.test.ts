import { describe, it, expect, vi, afterEach } from "vitest";
import {
  newState,
  tick,
  price,
  genOrder,
  queueRecipe,
  unlockTech,
  unlocksAt,
  nextUnlock,
  idx,
  WATER_SECONDS,
  type State,
  type Events,
} from "../src/game/logic";
import { BUILDINGS, BMAP, CROPS, ITEMS, TECH_TREE, xpFor } from "../src/game/data";

/**
 * P5.4 + P6.1 — «بازه‌ی ۱۰ تا ۲۵ خالی و خسته‌کننده نیست»
 *  • منحنی XP بعد از سطح ۱۰ ملایم‌تر است (و تا ۱۰ دست نخورده — سیوهای قدیمی عادلانه می‌مانند)
 *  • هر سطح از ۱۲ تا ۲۵ دست‌کم ۲ بازکردنیِ معنادار دارد
 *  • در بازه‌ی ۱۰..۲۰ دست‌کم ۱۲ محتوای تازه
 *  • هر محتوای تازه «قابل‌ساخت» است: همه‌ی ورودی‌هایش تا همان سطح به دست می‌آید
 */

const quiet: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
afterEach(() => vi.restoreAllMocks());
const oldXp = (l: number) => Math.round(40 * Math.pow(l, 1.6));

describe("منحنی تجربه (P5.4)", () => {
  it("تا سطح ۱۰ دقیقاً همان منحنیِ قبلی", () => {
    for (let l = 1; l <= 10; l++) expect(xpFor(l)).toBe(oldXp(l));
  });

  it("پیوسته و صعودی تا سطح ۶۰", () => {
    for (let l = 1; l < 60; l++) expect(xpFor(l + 1)).toBeGreaterThan(xpFor(l));
  });

  it("مجموع تجربه‌ی ۱۰ → ۲۰ دست‌کم ۱۰٪ کمتر از قبل (ولی نه ارزان‌تر از نصف)", () => {
    let now = 0,
      before = 0;
    for (let l = 10; l < 20; l++) {
      now += xpFor(l);
      before += oldXp(l);
    }
    expect(now / before).toBeLessThan(0.9);
    expect(now / before).toBeGreaterThan(0.5);
  });
});

/** سطحی که هر کالا در آن «قابل تهیه» می‌شود: محصول (سطح کاشت) یا خروجیِ دستورِ یک کارگاه */
function availableLevel(): Record<string, number> {
  const lv: Record<string, number> = {};
  for (const c of CROPS) {
    const id = c.out ?? c.id;
    lv[id] = Math.min(lv[id] ?? 99, c.lvl);
  }
  lv.wood = 1; // پاکسازی درخت
  lv.stone = 1; // شکستن سنگ
  // چند دور تا زنجیره‌ها بسته شوند
  for (let pass = 0; pass < 6; pass++)
    for (const b of BUILDINGS)
      for (const r of b.recipes) {
        const need = Math.max(b.lvl, r.lvl ?? 0, ...Object.keys(r.inp).map((k) => lv[k] ?? 99));
        lv[r.out] = Math.min(lv[r.out] ?? 99, need);
      }
  return lv;
}

describe("بازکردنی‌ها در هر سطح (P6.1)", () => {
  it.each(Array.from({ length: 14 }, (_, i) => i + 12))("سطح %i: دست‌کم ۲ بازکردنی", (l) => {
    expect(unlocksAt(l).length, unlocksAt(l).map((u) => u.name).join("، ")).toBeGreaterThanOrEqual(2);
  });

  it("DoD P5.4: دست‌کم ۱۲ محتوای تازه در بازه‌ی ۱۰..۲۰", () => {
    let n = 0;
    for (let l = 11; l <= 20; l++) n += unlocksAt(l).length;
    expect(n).toBeGreaterThanOrEqual(12);
  });

  it("«معنادار»: هر بازکردنی در همان سطح واقعاً قابل استفاده است (ورودی‌هایش در دسترس است)", () => {
    const lv = availableLevel();
    for (let l = 11; l <= 25; l++)
      for (const u of unlocksAt(l)) {
        if (u.kind === "crop") expect(ITEMS[CROPS.find((c) => c.id === u.id)!.out ?? u.id], u.id).toBeDefined();
        if (u.kind === "building") {
          const b = BMAP[u.id];
          expect(b.recipes.length > 0 || b.isAuto, `${u.id} کاری انجام نمی‌دهد`).toBeTruthy();
          for (const r of b.recipes.filter((x) => (x.lvl ?? 0) <= l))
            for (const k of Object.keys(r.inp)) expect(lv[k] ?? 99, `${u.id}: ورودیِ ${k} در سطح ${l} در دسترس نیست`).toBeLessThanOrEqual(l);
        }
        if (u.kind === "recipe") {
          const [bid, out] = u.id.split(":");
          const r = BMAP[bid].recipes.find((x) => x.out === out)!;
          for (const k of Object.keys(r.inp)) expect(lv[k] ?? 99, `${u.id}: ورودیِ ${k}`).toBeLessThanOrEqual(l);
        }
      }
  });

  it("هر دستورِ تازه ارزش افزوده دارد", () => {
    for (const b of BUILDINGS)
      for (const r of b.recipes) {
        if (b.lvl < 11 && !r.lvl) continue;
        const cost = Object.entries(r.inp).reduce((a, [k, n]) => a + ITEMS[k].base * n, 0);
        expect(ITEMS[r.out].base * (r.n || 1), `${b.id}→${r.out}`).toBeGreaterThan(cost);
      }
  });

  it("«بازکردنیِ بعدی» همیشه جلوتر را نشان می‌دهد", () => {
    expect(nextUnlock(11)?.level).toBe(12);
    expect(nextUnlock(24)?.level).toBe(25);
    expect(nextUnlock(25)?.level).toBe(26); // W.1: به
    expect(nextUnlock(28)).toBeNull(); // پرتقال (۲۸) آخرین بازکردنی است
  });
});

describe("قفلِ سطح برای دستور و تحقیق", () => {
  it("دستورِ سطح ۱۵ (رب انار) پیش از سطح ۱۵ در صف نمی‌رود", () => {
    const s = newState();
    s.level = 14;
    s.inv.pomegranate = 3;
    const t = (s.tiles[idx(20, 20)] = { k: "bld", v: 0.5, b: "press", q: [], p: 0, out: [] });
    const ri = BMAP.press.recipes.findIndex((r) => r.out === "pom_paste");
    expect(queueRecipe(s, t, ri, quiet, true)).toBe(false);
    s.level = 15;
    expect(queueRecipe(s, t, ri, quiet, true)).toBe(true);
  });

  it("تحقیقِ سطح ۱۵ پیش از سطح ۱۵ خریده نمی‌شود", () => {
    const s = newState();
    s.coins = 1e6;
    s.level = 14;
    unlockTech(s, "export_pack", quiet);
    expect(s.techs).not.toContain("export_pack");
    s.level = 15;
    unlockTech(s, "export_pack", quiet);
    expect(s.techs).toContain("export_pack");
  });

  it("سفارش‌ها کالای دستورِ قفل را نمی‌خواهند", () => {
    const s = newState();
    s.level = 14;
    s.tiles[idx(20, 20)] = { k: "bld", v: 0.5, b: "press", q: [], p: 0, out: [] };
    for (let i = 0; i < 60; i++) expect(genOrder(s).items.some((it) => it.id === "pom_paste" || it.id === "fig_jam")).toBe(false);
  });
});

describe("اثرِ تحقیق‌ها و قنات", () => {
  const tech = (id: string) => TECH_TREE.find((t) => t.id === id)!;

  it("بسته‌بندی صادراتی: کالای کارگاهی +۱۰٪، محصولِ خام نه", () => {
    const a = newState();
    const b = newState();
    b.market = a.market;
    b.techs.push("export_pack");
    expect(price(b, "carpet") / price(a, "carpet")).toBeCloseTo(1.1, 2);
    expect(price(b, "saffron")).toBe(price(a, "saffron"));
    expect(tech("export_pack").desc).toContain("۱۰٪");
  });

  it("بازار جهانی: پاداش سفارش ×۱.۱۵", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const a = newState();
    const b = newState();
    b.techs.push("global_market");
    expect(genOrder(b).coins / genOrder(a).coins).toBeCloseTo(1.15, 1);
  });

  it("زیست‌فناوری: رشد ×۱.۱۵", () => {
    const grow = (t: boolean) => {
      const s = newState();
      s.weather = "sun";
      if (t) s.techs.push("biotech");
      s.tiles[idx(6, 6)] = { k: "soil", v: 0.5, crop: "wheat", g: 0 };
      tick(s, 1, quiet);
      return s.tiles[idx(6, 6)].g || 0;
    };
    expect(grow(true) / grow(false)).toBeCloseTo(1.15, 5);
  });

  it("شبکه‌ی قنات: رطوبت ۵۰٪ ماندگارتر", () => {
    const wetAfter = (t: boolean, secs: number) => {
      const s: State = newState();
      s.weather = "sun";
      if (t) s.techs.push("qanat_net");
      s.tiles[idx(5, 5)] = { k: "soil", v: 0.5, wet: true, dry: WATER_SECONDS };
      tick(s, secs, quiet);
      return !!s.tiles[idx(5, 5)].wet;
    };
    expect(wetAfter(false, WATER_SECONDS + 1)).toBe(false);
    expect(wetAfter(true, WATER_SECONDS + 1)).toBe(true);
    expect(wetAfter(true, WATER_SECONDS * 1.5 + 1)).toBe(false);
  });

  it("قنات ۲۴ زمینِ اطرافش را خیس نگه می‌دارد", () => {
    const s = newState();
    s.weather = "sun";
    const cx = 18,
      cy = 18;
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) s.tiles[idx(x, y)] = { k: "soil", v: 0.5 };
    s.tiles[idx(cx, cy)] = { k: "bld", v: 0.5, b: "qanat", q: [], p: 0, out: [] };
    tick(s, 0.05, quiet);
    let wet = 0;
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (s.tiles[idx(x, y)].wet) wet++;
    expect(wet).toBe(24);
  });
});
