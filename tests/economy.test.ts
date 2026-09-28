import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  newState,
  addXp,
  tick,
  toolAction,
  sell,
  sellPreview,
  price,
  plant,
  harvest,
  idx,
  WATER_SECONDS,
  invCount,
  capacity,
  type State,
  type Events,
} from "../src/game/logic";
import { CROPS, N, ITEMS } from "../src/game/data";

/**
 * tests/economy.test.ts — اقتصادِ سالم (P5.5، P5.6، P5.7)
 *
 * سه قاعده‌ای که این فایل نگهبانی می‌کند:
 *  ۱. هیچ ماشین/کارگری «پول از هوا» نمی‌سازد؛ بذرپاش بذرِ انبار را مصرف می‌کند.
 *  ۲. آبیاری معنا دارد: خاک زمان‌دار است و بعد از مدت مشخص خشک می‌شود.
 *  ۳. تجربه و درآمد تابع «ارزش» است، نه تعداد کلیک؛ و پیش‌نمایش فروش دروغ نمی‌گوید.
 */

const silent: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
let s: State;

beforeEach(() => {
  s = newState();
  s.story.shown = false;
  s.story.name = "امید";
});

/** یک کاشی خاک در مرکز نقشه */
function soilAt(dx = 0, dy = 0): [number, number] {
  const x = Math.floor(N / 2) + dx;
  const y = Math.floor(N / 2) + dy;
  s.tiles[idx(x, y)] = { k: "soil", v: 0 };
  return [x, y];
}

/** یک ماشینِ خودکار (بذرپاش/دروگر/...) در نقشه می‌گذارد */
function placeMachine(x: number, y: number, id: string) {
  s.tiles[idx(x, y)] = { k: "bld", v: 0, b: id, q: [], p: 0, out: [], autoMode: true };
}

/* ───────────────────────── P5.6 — خاکِ زمان‌دار ───────────────────────── */

describe("P5.6 — خاک زمان‌دار و آبیاری معنادار", () => {
  it("آبیاری دستی رطوبت ۹۰ ثانیه‌ای می‌دهد", () => {
    const [x, y] = soilAt();
    toolAction(s, x, y, "water", "", silent);
    const t = s.tiles[idx(x, y)];
    expect(t.wet).toBe(true);
    expect(t.dry).toBe(WATER_SECONDS);
  });

  it("پس از ۸۹ ثانیه هنوز خیس است و پس از ۹۰ ثانیه خشک می‌شود", () => {
    const [x, y] = soilAt();
    toolAction(s, x, y, "water", "", silent);
    tick(s, 89, silent);
    expect(s.tiles[idx(x, y)].wet, "قبل از پایان مهلت باید خیس بماند").toBe(true);
    tick(s, 1.5, silent);
    expect(s.tiles[idx(x, y)].wet, "بعد از ۹۰ ثانیه باید خشک شود").toBe(false);
    expect(s.tiles[idx(x, y)].dry).toBe(0);
  });

  it("آبیاری دوباره مهلت را از نو می‌شمارد (نه تمدید الکی)", () => {
    const [x, y] = soilAt();
    toolAction(s, x, y, "water", "", silent);
    tick(s, 60, silent);
    s.tiles[idx(x, y)].wet = false; // خاک خشک شد (مثلاً بازیکن آبیاری نکرده)
    toolAction(s, x, y, "water", "", silent);
    expect(s.tiles[idx(x, y)].dry).toBe(WATER_SECONDS);
    tick(s, 89, silent);
    expect(s.tiles[idx(x, y)].wet).toBe(true);
  });

  it("خاکِ خشک‌شده دوباره قابل آبیاری است و پیام «هنوز خیس است» فقط تا مهلت می‌آید", () => {
    const [x, y] = soilAt();
    const msgs: string[] = [];
    const loud: Events = { toast: (m) => msgs.push(m), fx: () => {}, sound: () => {} };
    toolAction(s, x, y, "water", "", loud);
    toolAction(s, x, y, "water", "", loud); // هنوز خیس
    expect(msgs.some((m) => m.includes("رطوبت"))).toBe(true);
    tick(s, 100, silent);
    msgs.length = 0;
    toolAction(s, x, y, "water", "", loud);
    expect(msgs, "بعد از خشک‌شدن باید بی‌صدا آب بخورد").toHaveLength(0);
    expect(s.tiles[idx(x, y)].wet).toBe(true);
  });

  it("رشد گیاه روی خاک خیس سریع‌تر از خاک خشک است", () => {
    const [x1, y1] = soilAt(-2, 0);
    const [x2, y2] = soilAt(2, 0);
    s.coins = 1000;
    plant(s, x1, y1, CROPS[0].id, silent);
    plant(s, x2, y2, CROPS[0].id, silent);
    s.tiles[idx(x1, y1)].wet = true;
    s.tiles[idx(x1, y1)].dry = 3600; // خیسِ ماندگار برای مقایسه
    tick(s, 5, silent); // کمتر از زمان بلوغ تا سقف ۱ نزند
    const wetG = s.tiles[idx(x1, y1)].g || 0;
    const dryG = s.tiles[idx(x2, y2)].g || 0;
    expect(wetG).toBeGreaterThan(dryG);
  });
});

/* ───────────────── P5.5 — حفره‌های خودکارسازی بسته است ───────────────── */

describe("P5.5 — ماشین‌ها پول از هوا نمی‌سازند", () => {
  it("بذرپاشِ خودکار بدون بذرِ انبار هیچ چیز نمی‌کارد", () => {
    const [mx, my] = [Math.floor(N / 2), Math.floor(N / 2)];
    placeMachine(mx, my, "auto_planter");
    // ۹ خانه‌ی خاک اطراف، انبار بدون بذر
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) s.tiles[idx(mx + dx, my + dy)] = { k: "soil", v: 0 };
    s.inv = {}; // انبار خالی
    s.coins = 100000;
    tick(s, 30, silent);
    const planted = s.tiles.filter((t) => t.crop).length;
    expect(planted, "بدون بذر در انبار، هیچ کاشتی نباید رخ دهد").toBe(0);
  });

  it("بذرپاش به‌ازای هر کاشت دقیقاً یک بذر از انبار مصرف می‌کند", () => {
    const [mx, my] = [Math.floor(N / 2), Math.floor(N / 2)];
    placeMachine(mx, my, "auto_planter");
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) s.tiles[idx(mx + dx, my + dy)] = { k: "soil", v: 0 };
    const seed = CROPS[0].id;
    s.inv = { [seed]: 3 };
    s.coins = 100000;

    tick(s, 5, silent);
    const planted = s.tiles.filter((t) => t.crop).length;
    expect(planted, "با ۳ بذر حداکثر ۳ خانه کاشته می‌شود").toBeLessThanOrEqual(3);
    expect(s.inv[seed], "به‌ازای هر کاشت یک بذر کم می‌شود").toBe(Math.max(0, 3 - planted));
  });

  it("با یک بذرِ ذخیره‌شده نمی‌توان بی‌نهایت زمین کاشت (حلقه‌ی سود بسته شد)", () => {
    const [mx, my] = [Math.floor(N / 2), Math.floor(N / 2)];
    placeMachine(mx, my, "auto_planter");
    let soils = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) { s.tiles[idx(mx + dx, my + dy)] = { k: "soil", v: 0 }; soils++; }
    const seed = CROPS[0].id;
    s.inv = { [seed]: 1 };
    s.coins = 100000;
    tick(s, 10, silent);
    // بذرپاش یک بذر دارد → فقط یک کاشت؛ بقیه‌ی خانه‌ها باید خالی بمانند
    expect(s.tiles.filter((t) => t.crop).length).toBe(1);
    expect(soils).toBeGreaterThan(1);
  });

  it("کارگر مزرعه‌دار برای کاشتِ دوباره هم بذر از انبار می‌دهد", () => {
    // زمین را از کشتِ پیش‌فرضِ شروع پاک می‌کنیم تا حساب‌وکتاب فقط روی یک کاشی باشد
    s.tiles = s.tiles.map((t) => (t.crop ? { k: t.k, v: t.v } : t));
    const [x, y] = soilAt();
    s.coins = 100000;
    s.inv = {};
    plant(s, x, y, CROPS[0].id, silent);
    s.tiles[idx(x, y)].g = 1; // رسیده
    s.workers = [{ kind: "farmhand", hiredAt: 0 } as unknown as State["workers"][number]];

    // برداشتِ قطعی: بدون پاداشِ تصادفی تا حساب کتاب دقیق باشد
    const rnd = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const expectedYield = CROPS[0].yield;
    tick(s, 3, silent); // یک چرخه‌ی کارگر: برداشت + کاشتِ دوباره
    rnd.mockRestore();

    expect(s.tiles[idx(x, y)].crop, "کارگر باید همان محصول را دوباره بکارد").toBe(CROPS[0].id);
    expect(s.inv[CROPS[0].id] || 0, "از برداشت، یک واحد به‌عنوان بذر مصرف شد").toBe(expectedYield - 1);
  });

  it("کودپاشِ خودکار بابت هر کود سکه می‌پردازد (کود مجانی نیست)", () => {
    const [mx, my] = [Math.floor(N / 2), Math.floor(N / 2)];
    placeMachine(mx, my, "auto_fertilizer");
    s.tiles[idx(mx + 1, my)] = { k: "soil", v: 0 };
    s.coins = 500;
    tick(s, 60, silent);
    const fert = s.tiles[idx(mx + 1, my)].fert === true;
    if (fert) expect(s.coins, "برای کود پول کم شده است").toBeLessThan(500);
  });
});

/* ───────────── P5.7 — فروش ایمن، پیش‌نمایش صادق، XP بر پایه‌ی ارزش ───────────── */

describe("P5.7 — فروش ایمن و تجربه بر پایه‌ی ارزش", () => {
  beforeEach(() => {
    s.inv = { wheat: 100 };
    s.market.wheat = { sat: 0, hist: [], ph: 0 };
  });

  it("پیش‌نمایش فروش با نتیجه‌ی واقعیِ فروش یکی است", () => {
    const pv = sellPreview(s, "wheat", 38);
    const coinsBefore = s.coins;
    sell(s, "wheat", 38, silent);
    expect(s.coins - coinsBefore).toBe(pv.coins);
    expect(s.inv.wheat).toBe(62);
    expect(pv.satAfter).toBeCloseTo(s.market.wheat.sat, 6);
  });

  it("پیش‌نمایش هیچ تغییری در وضعیت ایجاد نمی‌کند", () => {
    const snapshot = JSON.stringify({ coins: s.coins, inv: s.inv, sat: s.market.wheat.sat });
    sellPreview(s, "wheat", 50);
    expect(JSON.stringify({ coins: s.coins, inv: s.inv, sat: s.market.wheat.sat })).toBe(snapshot);
  });

  it("فروش بیشتر از موجودی، فقط تا موجودی حساب می‌شود", () => {
    const pv = sellPreview(s, "wheat", 1000);
    expect(pv.n).toBe(100);
    sell(s, "wheat", 1000, silent);
    expect(s.inv.wheat).toBe(0);
  });

  it("تجربه تابع ارزش است نه تعداد کلیک: ۱۰۰ فروش تکی = یک فروش انبوه", () => {
    const sBulk = structuredClone(s);
    for (let i = 0; i < 100; i++) sell(s, "wheat", 1, silent); // ۱۰۰ کلیک
    sell(sBulk, "wheat", 100, silent); // یک کلیک

    const xpClicks = s.xp + (s.xpAcc || 0);
    const xpBulk = sBulk.xp + (sBulk.xpAcc || 0);
    expect(Math.round(xpClicks)).toBe(Math.round(xpBulk));
    expect(s.coins, "درآمد هم باید یکسان باشد").toBe(sBulk.coins);
  });

  it("فروشِ تکیِ ارزان، تجربه‌ی بی‌پایان نمی‌دهد", () => {
    const cheap = Object.keys(ITEMS).find((k) => ITEMS[k].base <= 12) || "wheat";
    s.inv = { [cheap]: 200 };
    s.market[cheap] = { sat: 0, hist: [], ph: 0 };
    const xp0 = s.xp;
    for (let i = 0; i < 200; i++) sell(s, cheap, 1, silent);
    const gained = s.xp - xp0 + (s.xpAcc || 0);
    const value = 200 * ITEMS[cheap].base;
    expect(gained).toBeLessThanOrEqual(value / 50 + 1);
  });

  it("فروش انبوه قیمت را کم می‌کند (شبیه‌سازی درست اشباع بازار)", () => {
    const now = price(s, "wheat");
    sell(s, "wheat", 100, silent);
    expect(s.market.wheat.sat).toBeGreaterThan(0);
    expect(price(s, "wheat")).toBeLessThan(now);
    expect(sellPreview(s, "wheat", 0).satAfter).toBe(s.market.wheat.sat);
  });
});

/* ─────────────────────── قواعد پایه‌ی سلامت اقتصاد ─────────────────────── */

describe("قواعد پایه — هیچ ابزاری بی‌هزینه معجزه نمی‌کند", () => {
  it("شخم، آبیاری و کود هزینه‌شان را از بازیکن می‌گیرند یا محدودند", () => {
    const [x, y] = soilAt();
    const c0 = s.coins;
    toolAction(s, x, y, "hoe", "", silent); // روی خاک: پیام خطا، بدون هزینه
    expect(s.coins).toBe(c0);

    const [gx, gy] = [Math.floor(N / 2) + 5, Math.floor(N / 2)];
    if (s.tiles[idx(gx, gy)].k === "grass") {
      toolAction(s, gx, gy, "hoe", "", silent);
      expect(s.coins).toBeLessThan(c0); // شخم هزینه دارد
    }

    s.coins = 100;
    soilAt(3, 3);
    toolAction(s, Math.floor(N / 2) + 3, Math.floor(N / 2) + 3, "fert", "", silent);
    expect(s.coins).toBe(100 - 10); // FERT_COST
  });

  it("برداشت محصول XP می‌دهد و انبار را پر می‌کند (نه بیشتر از ظرفیت)", () => {
    const [x, y] = soilAt();
    s.coins = 1000;
    plant(s, x, y, CROPS[0].id, silent);
    s.tiles[idx(x, y)].g = 1;
    const xp0 = s.xp;
    expect(harvest(s, x, y, silent)).toBe(true);
    expect(s.xp).toBeGreaterThan(xp0);
    expect(invCount(s)).toBeLessThanOrEqual(capacity(s));
  });

  it("پول بازی هرگز منفی نمی‌شود (خریدهای گران رد می‌شوند)", () => {
    s.coins = 3;
    const [x, y] = [Math.floor(N / 2) + 7, Math.floor(N / 2)];
    if (s.tiles[idx(x, y)].k === "grass") toolAction(s, x, y, "hoe", "", silent);
    expect(s.coins).toBeGreaterThanOrEqual(0);
  });
});

// ─── V.7: پاداش «اولین برداشت روز» ─────────────────────────────────────
describe("پاداش اولین برداشت روز", () => {
  it("فقط اولین برداشتِ هر روز پاداش می‌دهد", () => {
    const s = newState();
    s.tiles[147] = { k: "grass", v: 0, crop: "tomato", g: 1 }; // (3,4) در نقشه‌ی ۳۶
    s.tiles[148] = { k: "grass", v: 0, crop: "tomato", g: 1 }; // (4,4)
    const toasts: string[] = [];
    const ev2: Events = { toast: (msg) => { toasts.push(msg); }, fx: () => {}, sound: () => {} };
    const before = s.coins;
    expect(harvest(s, 3, 4, ev2)).toBe(true);
    expect(harvest(s, 4, 4, ev2)).toBe(true);
    expect(toasts.filter((m) => m.includes("اولین برداشت روز"))).toHaveLength(1);
    const b = 20 + s.level * 5;
    expect(s.bonusDay).toBe(s.day);
    expect(s.coins).toBeGreaterThanOrEqual(before + b);
  });
  it("روز بعد دوباره پاداش می‌دهد", () => {
    const s = newState();
    s.tiles[147] = { k: "grass", v: 0, crop: "tomato", g: 1 }; // (3,4)
    const toasts: string[] = [];
    const ev2: Events = { toast: (msg) => { toasts.push(msg); }, fx: () => {}, sound: () => {} };
    expect(harvest(s, 3, 4, ev2)).toBe(true);
    const bonusOf = (m: string) => m.includes("اولین برداشت روز");
    expect(toasts.filter(bonusOf)).toHaveLength(1);
    s.day += 1; s.tiles[147] = { k: "grass", v: 0, crop: "tomato", g: 1 };
    expect(harvest(s, 3, 4, ev2)).toBe(true);
    expect(toasts.filter(bonusOf)).toHaveLength(2);
  });
});

describe("B/T2 — یک رویداد = یک پیام در لول‌آپ", () => {
  it("پرشِ چندسطحی هم فقط یک توست می‌سازد که سطح، پاداش و امتیازِ مهارت را با هم دارد", () => {
    const s = newState();
    const msgs: string[] = [];
    const ev: Events = { toast: (m) => msgs.push(m), fx: () => {}, sound: () => {} };
    addXp(s, 100_000, ev);
    expect(s.level).toBeGreaterThan(2);
    expect(msgs.filter((m) => m.includes("سطح"))).toHaveLength(1);
    const one = msgs[0];
    expect(one).toContain("پاداش");
    expect(one).toContain("امتیاز مهارتِ تازه"); // C/T8: سهمِ همین پرش، نه شمارنده‌ی تجمعی
  });
});
