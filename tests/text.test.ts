import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  newState,
  capacity,
  price,
  tick,
  genOrder,
  addXp,
  animalTimeFactor,
  idx,
  type State,
  type Events,
} from "../src/game/logic";
import { BMAP, BUILDINGS, TECH_TREE, SKILLS, WORKERS, ACHIEVEMENTS, CONTRACTS, CROPS, ITEMS, DAY_LEN } from "../src/game/data";
import { CHAPTERS } from "../src/game/story";

/**
 * P5.9 — «هر عددی که بازیکن در توضیح می‌خواند، همان است که بازی انجام می‌دهد»
 * این تست‌ها عدد را از خودِ متن فارسی بیرون می‌کشند و با اثرِ واقعی در منطق مقایسه می‌کنند.
 */

const quiet: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
const FA = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (t: string) => Number(t.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/٬/g, ""));
/** اولین «٪» در متن → کسر (۲۵٪ → 0.25) */
const pctOf = (desc: string) => {
  const m = desc.match(/([۰-۹]+)٪/);
  if (!m) throw new Error(`در «${desc}» درصدی نیست`);
  return faNum(m[1]) / 100;
};
/** اولین عدد در متن */
const numOf = (desc: string) => {
  const m = desc.match(/[۰-۹][۰-۹٬]*/);
  if (!m) throw new Error(`در «${desc}» عددی نیست`);
  return faNum(m[0]);
};
const tech = (id: string) => TECH_TREE.find((t) => t.id === id)!;
const skill = (id: string) => SKILLS.find((t) => t.id === id)!;

afterEach(() => vi.restoreAllMocks());

describe("ظرفیت انبار — عدد توضیح = افزایش واقعی", () => {
  it.each(["storage1", "storage2", "mega_silo"])("تحقیق %s", (id) => {
    const s = newState();
    const c0 = capacity(s);
    s.techs.push(id);
    expect(capacity(s) - c0).toBe(numOf(tech(id).desc.replace("+", "")));
  });

  it("مهارت انباردار خردمند و هر سیلو", () => {
    const s = newState();
    const c0 = capacity(s);
    s.skills.push("storage_master");
    expect(capacity(s) - c0).toBe(numOf(skill("storage_master").desc));
    const c1 = capacity(s);
    s.tiles[idx(3, 3)] = { k: "bld", v: 0.5, b: "silo", q: [], p: 0, out: [] };
    expect(capacity(s) - c1).toBe(numOf(BMAP.silo.desc));
  });
});

describe("قیمت فروش — درصدِ توضیح = ضریب واقعی", () => {
  const ratio = (mut: (s: State) => void) => {
    const a = newState();
    const b = newState();
    b.market = a.market; // همان موج بازار
    b.time = a.time;
    mut(b);
    return price(b, "icecream") / price(a, "icecream");
  };
  it.each([
    ["market1", "tech"],
    ["export_license", "tech"],
    ["price_mind", "skill"],
    ["economist", "skill"],
  ] as const)("%s", (id, kind) => {
    const want = 1 + pctOf(kind === "tech" ? tech(id).desc : skill(id).desc);
    expect(ratio((s) => (kind === "tech" ? s.techs.push(id) : s.skills.push(id)))).toBeCloseTo(want, 2);
  });
  it("هر دلال بورس", () => {
    const want = 1 + pctOf(WORKERS.trader.desc);
    expect(ratio((s) => s.workers.push({ id: 99, kind: "trader" }))).toBeCloseTo(want, 2);
  });
});

/** یک کارگاه با صفِ پُر و سرعتِ پیشرفت در ۱ ثانیه */
function productionRate(bld: string, mut: (s: State) => void) {
  const s = newState();
  s.weather = "sun";
  mut(s);
  const i = idx(20, 20);
  s.tiles[i] = { k: "bld", v: 0.5, b: bld, q: [0], p: 0, out: [] };
  tick(s, 1, quiet);
  return s.tiles[i].p || 0;
}

describe("سرعت کارگاه‌ها — «زمان −X٪» یعنی ضریب زمان (۱−X)", () => {
  it.each([
    ["speed_ovens", "tech"],
    ["artisan", "skill"],
  ] as const)("%s", (id, kind) => {
    const base = productionRate("bakery", () => {});
    const fast = productionRate("bakery", (s) => (kind === "tech" ? s.techs.push(id) : s.skills.push(id)));
    const f = 1 - pctOf(kind === "tech" ? tech(id).desc : skill(id).desc);
    expect(base / fast).toBeCloseTo(f, 5);
  });

  it("تولید دامی: دامپزشک، دامپروری پیشرفته و دامدار مهربان «X٪ سریع‌تر»", () => {
    const s = newState();
    expect(animalTimeFactor(s)).toBe(1);
    s.workers.push({ id: 1, kind: "vet" });
    expect(animalTimeFactor(s)).toBeCloseTo(1 - pctOf(WORKERS.vet.desc), 5);
    const t = newState();
    t.techs.push("animal_husbandry");
    expect(1 / animalTimeFactor(t)).toBeCloseTo(1 + pctOf(tech("animal_husbandry").desc), 5);
    const k = newState();
    k.skills.push("animal_tamer");
    expect(1 / animalTimeFactor(k)).toBeCloseTo(1 + pctOf(skill("animal_tamer").desc), 5);
    // و واقعاً روی مرغداری اثر می‌گذارد
    const slow = productionRate("coop", () => {});
    const quick = productionRate("coop", (x) => x.techs.push("animal_husbandry"));
    expect(quick / slow).toBeCloseTo(1.25, 5);
  });
});

/** ساختمان در (cx,cy) و خاکِ خشک در اطراف → چند خاک خیس/کوددار شد؟ */
function area(bld: string, mut: (s: State) => void = () => {}, dt = 0.05) {
  const s = newState();
  s.weather = "sun";
  mut(s);
  const cx = 18,
    cy = 18;
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) s.tiles[idx(x, y)] = { k: "soil", v: 0.5 };
  s.tiles[idx(cx, cy)] = { k: "bld", v: 0.5, b: bld, q: [], p: 0, out: [] };
  tick(s, dt, quiet);
  let wet = 0,
    fert = 0;
  for (let y = cy - 3; y <= cy + 3; y++)
    for (let x = cx - 3; x <= cx + 3; x++) {
      const t = s.tiles[idx(x, y)];
      if (t.wet) wet++;
      if (t.fert) fert++;
    }
  return { wet, fert };
}

describe("آبیاری و کود خودکار — تعداد زمینِ توضیح = پوشش واقعی", () => {
  it("چاه ۴ زمین، آب‌پاش ۸ زمین، آب‌پاش صنعتی ۲۴ زمین", () => {
    expect(area("well").wet).toBe(numOf(BMAP.well.desc));
    expect(area("sprinkler").wet).toBe(numOf(BMAP.sprinkler.desc));
    expect(area("mega_sprinkler").wet).toBe(numOf(BMAP.mega_sprinkler.desc));
  });

  it("مهندسی آبیاری و «میراب» هر کدام شعاع را ۱ خانه بیشتر می‌کنند", () => {
    expect(area("sprinkler", (s) => s.techs.push("irrigation_engineering")).wet).toBe(24);
    expect(area("sprinkler", (s) => s.skills.push("water_wise")).wet).toBe(24);
    expect(area("well", (s) => s.skills.push("water_wise")).wet).toBe(12);
  });

  it("کمپوست‌ساز واقعاً ۴ زمینِ مجاور را کود می‌دهد (قبلاً شعاع ۰ بود و هیچ کاری نمی‌کرد)", () => {
    expect(area("composter", () => {}, 10).fert).toBe(numOf(BMAP.composter.desc));
  });

  it("گلخانه: گیاهِ کنارش «۲۵٪ سریع‌تر»", () => {
    const s = newState();
    s.weather = "sun";
    const near = idx(10, 10),
      far = idx(25, 25);
    s.tiles[near] = { k: "soil", v: 0.5, crop: "wheat", g: 0 };
    s.tiles[far] = { k: "soil", v: 0.5, crop: "wheat", g: 0 };
    s.tiles[idx(11, 10)] = { k: "bld", v: 0.5, b: "greenhouse", q: [], p: 0, out: [] };
    tick(s, 1, quiet);
    expect((s.tiles[near].g || 0) / (s.tiles[far].g || 1)).toBeCloseTo(1 + pctOf(BMAP.greenhouse.desc), 5);
  });
});

describe("سفارش، حقوق و دستاوردها", () => {
  it("قرارداد تشویقی: پاداش سکه‌ی سفارش ×۱.۲۵", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const a = newState();
    const b = newState();
    b.techs.push("order_bonus");
    const ratio = genOrder(b).coins / genOrder(a).coins;
    expect(ratio).toBeCloseTo(1 + pctOf(tech("order_bonus").desc), 1);
  });

  it("اتوماسیون جامع: حقوق روزانه −۱۵٪", () => {
    const pay = (mut: (s: State) => void) => {
      const s = newState();
      s.workers = [{ id: 1, kind: "scientist" }];
      s.coins = 5000;
      s.time = DAY_LEN - 0.01;
      mut(s);
      const c0 = s.coins;
      tick(s, 0.02, quiet);
      return c0 - s.coins;
    };
    expect(pay(() => {})).toBe(WORKERS.scientist.wage);
    expect(pay((s) => s.techs.push("automation_tech"))).toBe(Math.round(WORKERS.scientist.wage * (1 - pctOf(tech("automation_tech").desc))));
  });

  it("دستاورد «استاد اعظم» در سطح ۲۰ و «افسانه‌ی دره» در سطح ۲۵ (قبلاً level20 در ۲۵ باز می‌شد)", () => {
    const s = newState();
    s.level = 19;
    addXp(s, 0, quiet);
    expect(s.achievements.level20).toBeFalsy();
    s.level = 20;
    addXp(s, 0, quiet);
    expect(s.achievements.level20).toBe(s.day); // V.8: شماره‌ی روزِ گرفتن
    expect(s.achievements.level25).toBeFalsy();
    s.level = 25;
    addXp(s, 0, quiet);
    expect(s.achievements.level25).toBe(s.day);
    const d20 = ACHIEVEMENTS.find((a) => a.id === "level20")!;
    const d25 = ACHIEVEMENTS.find((a) => a.id === "level25")!;
    expect(numOf(d20.desc)).toBe(20);
    expect(numOf(d25.desc)).toBe(25);
  });
});

describe("هیچ تحقیق/مهارت/کارگرِ «توخالی» نمانده", () => {
  // منطق از P5.11 در src/game/sim/*.ts است (logic.ts فقط درگاه است) — تیک از R8 به ماژول‌های موضوعی شکسته شد
  const logic = ["state", "economy", "actions", "tick", "daycycle", "growth", "machines", "workers", "market"]
    .map((m) => readFileSync(new URL(`../src/game/sim/${m}.ts`, import.meta.url), "utf8")).join("\n");
  it.each([...TECH_TREE.map((t) => t.id), ...SKILLS.map((k) => k.id)])("%s در منطق بازی اثر دارد", (id) => {
    expect(logic.includes(`"${id}"`)).toBe(true);
  });
  it.each(Object.keys(WORKERS))("کارگر %s در منطق بازی کار می‌کند", (k) => {
    expect(logic.includes(`"${k}"`)).toBe(true);
  });
});

describe("نام‌ها یکتا و فارسی", () => {
  it("نام محصول‌ها و کالاها تکراری نیست (جز محصولِ هم‌نام با کالای خودش)", () => {
    const names = Object.values(ITEMS).map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    for (const c of CROPS) {
      if (c.out) expect(ITEMS[c.out], `${c.id} → ${c.out}`).toBeDefined(); // صنوبر ← الوار
      else expect(ITEMS[c.id]?.name).toBe(c.name);
    }
  });
});

describe("مستندات با داده‌ی واقعی بازی هم‌خوان است (README، متادیتا، manifest)", () => {
  const counts: [string, number][] = [
    ["محصول", CROPS.length],
    ["ساختمان", BUILDINGS.length],
    ["تحقیق", TECH_TREE.length],
    ["مهارت", SKILLS.length],
    ["قرارداد", CONTRACTS.length],
    ["نوع کارگر", Object.keys(WORKERS).length],
    ["فصل", CHAPTERS.length],
    ["دکور", BUILDINGS.filter((b) => b.isDecor).length],
  ];
  it.each(["README.md", "src/app/layout.tsx", "public/manifest.json"])("%s", (f) => {
    const txt = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const [word, n] of counts) {
      for (const m of txt.matchAll(new RegExp(`([۰-۹]+) ${word}`, "g"))) {
        expect(`${faNum(m[1])} ${word}`).toBe(`${n} ${word}`);
      }
    }
  });
});
