import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  newState,
  toolAction,
  canExpand,
  expandCost,
  EXPAND_GROWTH,
  chunkOf,
  buildCost,
  decorCost,
  hire,
  fireWorker,
  rejectOrder,
  toggleAutoMode,
  setPlayerName,
  setStoryShown,
  unlockTech,
  learnSkill,
  claimContract,
  canPrestige,
  doPrestige,
  capacity,
  idx,
  NCH,
  WATER_SECONDS,
  type State,
  type Events,
} from "../src/game/logic";
import { BMAP, CLEAR_COST, CONTRACTS, FERT_COST, HOE_COST, WORKERS } from "../src/game/data";

/**
 * P5.11 — هر ابزار «دقیقاً همان کاری را می‌کند که اسمش است» و پیامِ خطای درست می‌دهد.
 */

const toasts: { m: string; t?: string }[] = [];
const ev: Events = { toast: (m, t) => toasts.push({ m, t }), fx: () => {}, sound: () => {} };
const lastToast = () => toasts[toasts.length - 1];
let s: State;
const X = 17,
  Y = 17; // داخلِ زمینِ شروع

beforeEach(() => {
  toasts.length = 0;
  s = newState();
  s.coins = 5000;
  s.achievements = { rich1: true, rich2: true, rich3: true, first_harvest: true, level10: true };
});
afterEach(() => vi.restoreAllMocks());

const put = (t: State["tiles"][number], x = X, y = Y) => (s.tiles[idx(x, y)] = t);

describe("ابزار دست", () => {
  it("کارگاه → پنل باز می‌شود و خروجی جمع می‌شود", () => {
    put({ k: "bld", v: 0.5, b: "coop", q: [], p: 0, out: ["egg", "egg"] });
    const inv0 = s.inv.egg || 0;
    expect(toolAction(s, X, Y, "hand", "", ev)).toBe("open");
    expect(s.inv.egg).toBe(inv0 + 2);
  });
  it("محصول رسیده برداشت می‌شود؛ نارس درصد رشد و تشنگی را می‌گوید", () => {
    put({ k: "soil", v: 0.5, crop: "wheat", g: 1 });
    toolAction(s, X, Y, "hand", "", ev);
    expect(s.tiles[idx(X, Y)].crop).toBeUndefined();
    put({ k: "soil", v: 0.5, crop: "wheat", g: 0.42 });
    toolAction(s, X, Y, "hand", "", ev);
    expect(lastToast().m).toContain("۴۲٪");
    expect(lastToast().m).toContain("تشنه");
  });
  it.each([
    [{ k: "soil", v: 0.5 }, "کاشت"],
    [{ k: "grass", v: 0.5 }, "شخم"],
    [{ k: "tree", v: 0.5 }, "پاکسازی"],
  ] as const)("راهنمای درست روی %o", (tile, word) => {
    put({ ...tile });
    toolAction(s, X, Y, "hand", "", ev);
    expect(lastToast().m).toContain(word);
  });
});

describe("کاشت، شخم، آب، کود", () => {
  it("کاشت فقط روی خاکِ خالی", () => {
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "seed", "carrot", ev);
    expect(lastToast().t).toBe("err");
    put({ k: "soil", v: 0.5, crop: "wheat", g: 0 });
    toolAction(s, X, Y, "seed", "carrot", ev);
    expect(lastToast().m).toContain("زیر کشت");
    put({ k: "soil", v: 0.5 });
    toolAction(s, X, Y, "seed", "carrot", ev);
    expect(s.tiles[idx(X, Y)].crop).toBe("carrot");
  });
  it("بذر بدون سکه کاشته نمی‌شود", () => {
    s.coins = 0;
    put({ k: "soil", v: 0.5 });
    toolAction(s, X, Y, "seed", "carrot", ev);
    expect(s.tiles[idx(X, Y)].crop).toBeUndefined();
  });
  it("شخم: چمن → خاک با هزینه؛ روی خاک/سنگ/بی‌پول خطا", () => {
    put({ k: "grass", v: 0.5 });
    const c0 = s.coins;
    toolAction(s, X, Y, "hoe", "", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("soil");
    expect(c0 - s.coins).toBe(HOE_COST);
    toolAction(s, X, Y, "hoe", "", ev);
    expect(lastToast().m).toContain("از قبل");
    put({ k: "rock", v: 0.5 });
    toolAction(s, X, Y, "hoe", "", ev);
    expect(lastToast().t).toBe("err");
    s.coins = 0;
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "hoe", "", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("grass");
  });
  it("آب: خاکِ خشک ۹۰ ثانیه خیس می‌شود؛ خاکِ خیس و چمن نه", () => {
    put({ k: "soil", v: 0.5 });
    toolAction(s, X, Y, "water", "", ev);
    expect(s.tiles[idx(X, Y)].wet).toBe(true);
    expect(s.tiles[idx(X, Y)].dry).toBe(WATER_SECONDS);
    toolAction(s, X, Y, "water", "", ev);
    expect(lastToast().m).toContain("رطوبت");
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "water", "", ev);
    expect(lastToast().t).toBe("err");
  });
  it("کود: با هزینه، یک بار، فقط روی خاک", () => {
    put({ k: "soil", v: 0.5 });
    const c0 = s.coins;
    toolAction(s, X, Y, "fert", "", ev);
    expect(s.tiles[idx(X, Y)].fert).toBe(true);
    expect(c0 - s.coins).toBe(FERT_COST);
    toolAction(s, X, Y, "fert", "", ev);
    expect(lastToast().m).toContain("قبلاً");
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "fert", "", ev);
    expect(lastToast().t).toBe("err");
    s.coins = 0;
    put({ k: "soil", v: 0.5 });
    toolAction(s, X, Y, "fert", "", ev);
    expect(s.tiles[idx(X, Y)].fert).toBeFalsy();
  });
});

describe("پاکسازی", () => {
  it("بی‌پول درخت قطع نمی‌شود", () => {
    s.coins = CLEAR_COST.tree - 1;
    put({ k: "tree", v: 0.5 });
    toolAction(s, X, Y, "clear", "", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("tree");
  });
  it("خاکِ کاشته → چمن (با هشدار از بین رفتن محصول)", () => {
    put({ k: "soil", v: 0.5, crop: "wheat", g: 0.3 });
    toolAction(s, X, Y, "clear", "", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("grass");
    expect(lastToast().m).toContain("از بین رفت");
  });
  it("برچیدن ساختمان نیمی از هزینه را برمی‌گرداند؛ دکور نصفِ قیمتش", () => {
    put({ k: "bld", v: 0.5, b: "mill", q: [], p: 0, out: [] });
    const c0 = s.coins;
    toolAction(s, X, Y, "clear", "", ev);
    expect(s.coins - c0).toBe(Math.round(BMAP.mill.cost * 0.5));
    s.stats.decorations = 1;
    put({ k: "bld", v: 0.5, b: "gate", q: [], p: 0, out: [] });
    const c1 = s.coins;
    toolAction(s, X, Y, "clear", "", ev);
    expect(s.coins - c1).toBe(Math.round(decorCost(s, "gate") * 0.5));
    expect(s.stats.decorations).toBe(0);
  });
  it("روی چمن خالی چیزی برای پاکسازی نیست", () => {
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "clear", "", ev);
    expect(lastToast().m).toContain("چیزی");
  });
});

describe("ساخت", () => {
  it("ساختمان روی چمن ساخته می‌شود و قیمتِ بعدی ۳۵٪ گران‌تر است", () => {
    put({ k: "grass", v: 0.5 });
    const first = buildCost(s, "mill");
    toolAction(s, X, Y, "build", "mill", ev);
    expect(s.tiles[idx(X, Y)].b).toBe("mill");
    expect(buildCost(s, "mill")).toBe(Math.round(BMAP.mill.cost * 1.35));
    expect(first).toBe(BMAP.mill.cost);
  });
  it("روی محصول/سنگ نمی‌شود ساخت؛ دکور بدون دانش هم نه", () => {
    put({ k: "soil", v: 0.5, crop: "wheat", g: 0 });
    toolAction(s, X, Y, "build", "mill", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("soil");
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "build", "gate", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("grass");
    expect(lastToast().m).toContain("طراحی منظر");
  });
  it("دکور با دانشِ طراحی منظر ساخته و شمرده می‌شود", () => {
    s.techs.push("landscape_design");
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "build", "gate", ev);
    expect(s.tiles[idx(X, Y)].b).toBe("gate");
    expect(s.stats.decorations).toBe(1);
  });
  it("بی‌پول یا شناسه‌ی نامعتبر → هیچ", () => {
    s.coins = 10;
    put({ k: "grass", v: 0.5 });
    toolAction(s, X, Y, "build", "mill", ev);
    toolAction(s, X, Y, "build", "no_such", ev);
    expect(s.tiles[idx(X, Y)].k).toBe("grass");
  });
  it("مهارت طراح باغ: دکور ۲۰٪ ارزان‌تر", () => {
    const base = decorCost(s, "fountain");
    s.skills.push("landscape_art");
    expect(decorCost(s, "fountain")).toBe(Math.round(base * 0.8));
  });
});

describe("خرید زمین", () => {
  const lockedTile = () => {
    // اولین کاشیِ قفلِ هم‌جوار با زمینِ باز
    for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) if (!s.chunks[chunkOf(x, y)] && canExpand(s, chunkOf(x, y))) return [x, y];
    throw new Error("no expandable tile");
  };
  it("قطعه‌ی هم‌جوار با پول خریده می‌شود و قیمتِ بعدی ۸.۵٪ بیشتر است", () => {
    const [x, y] = lockedTile();
    const cost = expandCost(s);
    toolAction(s, x, y, "hand", "", ev);
    expect(s.chunks[chunkOf(x, y)]).toBe(true);
    expect(s.bought).toBe(1);
    expect(expandCost(s)).toBe(Math.round(500 * EXPAND_GROWTH));
    expect(cost).toBe(500);
  });
  it("قطعه‌ی دور یا بی‌پول خریده نمی‌شود", () => {
    toolAction(s, 0, 0, "hand", "", ev); // گوشه‌ی نقشه، هم‌جوار نیست
    expect(s.chunks[chunkOf(0, 0)]).toBe(false);
    expect(lastToast().m).toContain("مجاور");
    s.coins = 0;
    const [x, y] = lockedTile();
    toolAction(s, x, y, "hand", "", ev);
    expect(s.chunks[chunkOf(x, y)]).toBe(false);
    expect(canExpand(s, chunkOf(X, Y))).toBe(false); // قطعه‌ی خریده‌شده دوباره خریدنی نیست
    expect(NCH).toBe(9);
  });
});

describe("کارگر، سفارش، کارگاه، نام", () => {
  it("استخدام با پول، تعدیل برمی‌گرداند که کسی رفت یا نه", () => {
    hire(s, "farmhand", ev);
    expect(s.workers).toHaveLength(1);
    expect(fireWorker(s, "farmhand")).toBe(true);
    expect(fireWorker(s, "farmhand")).toBe(false);
    s.coins = 0;
    hire(s, "scientist", ev);
    expect(s.workers).toHaveLength(0);
    expect(WORKERS.scientist.hire).toBeGreaterThan(0);
  });
  it("رد سفارش = انقضای فوری؛ کلید تولید خودکار؛ نام کوتاه‌شده", () => {
    rejectOrder(s, 0);
    expect(s.orders[0].exp).toBe(0);
    rejectOrder(s, 99); // بی‌اثر
    const t = { k: "bld" as const, v: 0.5, b: "mill", autoMode: false };
    expect(toggleAutoMode(t)).toBe(true);
    expect(toggleAutoMode(t)).toBe(false);
    setPlayerName(s, "   امید   ");
    expect(s.story.name).toBe("امید");
    setPlayerName(s, "ا".repeat(40));
    expect(s.story.name.length).toBe(24);
    setStoryShown(s, false);
    expect(s.story.shown).toBe(false);
  });
});

describe("تحقیق و مهارت", () => {
  it("تحقیق: پیش‌نیاز، پول، و تکرارنشدن", () => {
    unlockTech(s, "crop_xp", ev); // پیش‌نیاز: seeds1
    expect(s.techs).not.toContain("crop_xp");
    unlockTech(s, "seeds1", ev);
    unlockTech(s, "seeds1", ev);
    expect(s.techs.filter((t) => t === "seeds1")).toHaveLength(1);
    s.coins = 0;
    unlockTech(s, "crop_xp", ev);
    expect(s.techs).not.toContain("crop_xp");
    unlockTech(s, "no_such", ev);
  });
  it("مهارت: پیش‌نیاز، امتیاز کافی، و پیام‌های ویژه", () => {
    learnSkill(s, "fert_soil", ev);
    expect(s.skills).not.toContain("fert_soil");
    learnSkill(s, "master_planter", ev);
    expect(s.skills).not.toContain("master_planter"); // امتیاز ندارد
    s.stats.skillPoints = 20;
    for (const id of ["master_planter", "fert_soil", "price_mind", "storage_master", "harvest_god"]) learnSkill(s, id, ev);
    expect(s.skills).toEqual(["master_planter", "fert_soil", "price_mind", "storage_master", "harvest_god"]);
    expect(capacity(s)).toBe(capacity({ ...s, skills: [] }) + 150);
    learnSkill(s, "master_planter", ev); // تکراری بی‌اثر
    expect(s.stats.skillPoints).toBe(20 - 1 - 1 - 2 - 2 - 2);
  });
});

describe("قرارداد و تناسخ", () => {
  it("پاداش قرارداد فقط وقتی کامل شده و فقط یک بار", () => {
    const c = CONTRACTS[0];
    const c0 = s.coins;
    claimContract(s, c.id, ev);
    expect(s.coins).toBe(c0);
    s.contracts.find((x) => x.id === c.id)!.progress = c.target;
    claimContract(s, c.id, ev);
    expect(s.coins).toBe(c0 + c.rewardCoins);
    claimContract(s, c.id, ev);
    expect(s.coins).toBe(c0 + c.rewardCoins);
  });
  it("تناسخ: فقط سطح ۲۰ + ۱۰٬۰۰۰ سکه؛ نسل، اعتبار، داستان، تحقیق و مهارت می‌مانند", () => {
    expect(canPrestige(s)).toBe(false);
    doPrestige(s, ev);
    expect(s.prestige).toBe(0);
    s.level = 20;
    s.coins = 20_000;
    s.rep = 33;
    s.techs.push("seeds1");
    s.skills.push("master_planter");
    s.story.name = "امید";
    expect(canPrestige(s)).toBe(true);
    doPrestige(s, ev);
    expect(s.prestige).toBe(1);
    expect(s.level).toBe(1);
    expect(s.rep).toBe(33);
    expect(s.story.name).toBe("امید");
    expect(s.techs).toContain("seeds1");
    expect(s.skills).toContain("master_planter");
    expect(s.coins).toBe(1000);
    expect(lastToast().t).toBe("prestige");
  });
});
