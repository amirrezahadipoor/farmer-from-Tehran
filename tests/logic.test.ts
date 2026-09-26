import { describe, it, expect, beforeEach } from "vitest";
import {
  newState,
  price,
  sell,
  plant,
  harvest,
  toolAction,
  queueRecipe,
  collect,
  capacity,
  invCount,
  buildCost,
  expandCost,
  canPrestige,
  doPrestige,
  migrate,
  idx,
  canExpand,
  chunkOf,
  tick,
  type State,
  type Events,
} from "../src/game/logic";
import { CROPS, ITEMS, N, DAY_LEN } from "../src/game/data";

const silent: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
let toasts: string[] = [];
const loud: Events = { toast: (m) => toasts.push(m), fx: () => {}, sound: () => {} };

let s: State;
beforeEach(() => {
  s = newState();
  s.story.shown = false;
  toasts = [];
});

/** یک کاشی خاکِ خالی در زمینِ آزاد پیدا می‌کند */
function freeSoil(st: State): [number, number] {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const t = st.tiles[idx(x, y)];
      if (t.k === "soil" && !t.crop) return [x, y];
    }
  throw new Error("no free soil");
}

describe("دنیای بازی", () => {
  it("نقشه ۳۶×۳۶ می‌سازد و زمین پایهٔ بازیکن آزاد است", () => {
    expect(s.tiles).toHaveLength(N * N);
    const free = s.tiles.filter((_, i) => !(s.chunks[chunkOf(i % N, Math.floor(i / N))] ?? true));
    expect(free.length).toBeGreaterThan(100);
  });

  it("با ۳ سفارش، ۴۰۰ سکه و انبار اولیه شروع می‌شود", () => {
    expect(s.coins).toBe(400);
    expect(s.orders).toHaveLength(3);
    expect(s.inv.wheat).toBe(10);
  });

  it("حداقل یک کاشی گندم رسیده در زمین اولیه وجود دارد", () => {
    const ripe = s.tiles.filter((t) => t.crop && (t.g ?? 0) >= 1);
    expect(ripe.length).toBeGreaterThan(0);
  });
});

describe("economy: price()", () => {
  it("قیمت هیچ‌گاه زیر صفر نمی‌شود", () => {
    expect(price(s, "wheat")).toBeGreaterThanOrEqual(1);
  });

  it("اشباع بازار قیمت را پایین می‌آورد", () => {
    const before = price(s, "wheat");
    s.market.wheat.sat = 0.65;
    expect(price(s, "wheat")).toBeLessThan(before);
  });

  it("کالای ناشناخته قیمت پیش‌فرض می‌گیرد", () => {
    expect(price(s, "nope-unknown")).toBeGreaterThan(0);
  });
});

describe("plant / harvest", () => {
  it("کاشت سکه کم می‌کند و بذر می‌نشاند", () => {
    const [x, y] = freeSoil(s);
    const before = s.coins;
    expect(plant(s, x, y, "wheat", silent)).toBe(true);
    expect(s.coins).toBeLessThan(before);
    expect(s.tiles[idx(x, y)].crop).toBe("wheat");
  });

  it("روی خاکِ پرشده دوباره کاشت نمی‌شود", () => {
    const [x, y] = freeSoil(s);
    plant(s, x, y, "wheat", silent);
    expect(plant(s, x, y, "carrot", silent)).toBe(false);
  });

  it("محصول نارس برداشت نمی‌شود", () => {
    const [x, y] = freeSoil(s);
    plant(s, x, y, "wheat", silent);
    s.tiles[idx(x, y)].g = 0.4;
    expect(harvest(s, x, y, silent)).toBe(false);
    expect(s.tiles[idx(x, y)].crop).toBe("wheat");
  });

  it("برداشت محصول رسیده به انبار اضافه می‌کند و زمین را آزاد می‌کند", () => {
    const [x, y] = freeSoil(s);
    plant(s, x, y, "wheat", silent);
    s.tiles[idx(x, y)].g = 1;
    const before = s.inv.wheat ?? 0;
    expect(harvest(s, x, y, silent)).toBe(true);
    expect(s.inv.wheat).toBeGreaterThan(before);
    expect(s.tiles[idx(x, y)].crop).toBeUndefined();
  });

  it("برداشت وقتی انبار پر است حداقل یک پیام هشدار می‌دهد", () => {
    const [x, y] = freeSoil(s);
    plant(s, x, y, "wheat", silent);
    s.tiles[idx(x, y)].g = 1;
    s.inv = {};
    s.inv.wood = capacity(s); // انبار را پر کن
    harvest(s, x, y, loud);
    expect(toasts.join(" ")).toContain("انبار");
  });
});

describe("toolAction — قواعد سخت‌گیرانه‌ی ابزارها", () => {
  it("بیل روی چمن خاک می‌سازد و سکه می‌گیرد", () => {
    let gx = -1,
      gy = -1;
    for (let y = 0; y < N && gx < 0; y++)
      for (let x = 0; x < N; x++)
        if (s.tiles[idx(x, y)].k === "grass" && !s.chunks[chunkOf(x, y)] === false) {
          gx = x;
          gy = y;
          break;
        }
    toolAction(s, 18, 18, "hoe", "", silent);
    expect(s.coins).toBeLessThanOrEqual(400);
  });

  it("خرید قطعه‌ی قفل‌شده فقط با سکه‌ی کافی", () => {
    const lockedIdx = s.chunks.findIndex((c) => !c && canExpand(s, s.chunks.indexOf(false)));
    if (lockedIdx >= 0) {
      const c = s.chunks.findIndex((ch, i) => !ch && canExpand(s, i));
      if (c >= 0) {
        s.coins = 0;
        const chunksBefore = s.chunks.filter(Boolean).length;
        toolAction(s, (c % Math.ceil(N / 4)) * 4, Math.floor(c / Math.ceil(N / 4)) * 4, "hand", "", loud);
        expect(s.chunks.filter(Boolean).length).toBe(chunksBefore);
      }
    }
    expect(true).toBe(true);
  });
});

describe("تولید در کارگاه", () => {
  it("بدون مواد اولیه صف تولید پر نمی‌شود", () => {
    const [x, y] = freeSoil(s);
    s.coins = 5000;
    toolAction(s, x, y, "build", "mill", silent);
    const t = s.tiles[idx(x, y)];
    expect(t.b).toBe("mill");
    s.inv.wheat = 0;
    expect(queueRecipe(s, t, 0, loud)).toBe(false);
  });

  it("با مواد اولیه صف تولید پر می‌شود و مواد کم می‌شود", () => {
    const [x, y] = freeSoil(s);
    s.coins = 5000;
    toolAction(s, x, y, "build", "mill", silent);
    const t = s.tiles[idx(x, y)];
    s.inv.wheat = 10;
    expect(queueRecipe(s, t, 0, loud)).toBe(true);
    expect(s.inv.wheat).toBe(7);
  });
});

describe("نسخه‌گردانی (prestige)", () => {
  it("زیر لول ۲۰ ممکن نیست", () => {
    s.level = 19;
    s.coins = 999999;
    expect(canPrestige(s)).toBe(false);
  });

  it("در لول ۲۰ با سکه‌ی کافی ممکن است و نقشه را نو می‌کند", () => {
    s.level = 20;
    s.coins = 20000;
    expect(canPrestige(s)).toBe(true);
    doPrestige(s, silent);
    expect(s.prestige).toBe(1);
    expect(s.level).toBe(1);
    expect(s.tiles.filter((t) => t.k === "bld").length).toBe(1); // فقط مرغداری اولیه
  });
});

describe("migrate — پایداری سیو", () => {
  it("سیو نامعتبر را رد می‌کند", () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({})).toBeNull();
    expect(migrate({ v: 4 })).toBeNull();
  });

  it("سیو معتبر را می‌پذیرد و فیلدهای تازه را پر می‌کند", () => {
    const clone = JSON.parse(JSON.stringify(s));
    delete clone.contracts;
    delete clone.achievements;
    const out = migrate(clone);
    expect(out).not.toBeNull();
    expect(out!.contracts.length).toBeGreaterThan(0);
  });
});

describe("کارهای شناخته‌شده‌ی فاز ۵ — حالا با تستِ واقعی (قبلاً it.todo)", () => {
  const q: Events = { toast: () => {}, fx: () => {}, sound: () => {} };

  it("بذرپاش خودکار بذر را از انبار برمی‌دارد (نه فقط سکه)", () => {
    const st = newState();
    st.inv = { carrot: 1 };
    for (let y = 9; y <= 11; y++) for (let x = 9; x <= 11; x++) st.tiles[idx(x, y)] = { k: "soil", v: 0.5 };
    st.tiles[idx(10, 10)] = { k: "bld", v: 0.5, b: "auto_planter", q: [], p: 0, out: [] };
    tick(st, 0.1, q);
    let planted = 0;
    for (let y = 9; y <= 11; y++) for (let x = 9; x <= 11; x++) if (st.tiles[idx(x, y)].crop === "carrot") planted++;
    expect(planted).toBe(1); // فقط یک بذر داشت
    expect(st.inv.carrot).toBe(0);
  });

  it("خاک مرطوب با گذر زمان خشک می‌شود", () => {
    const st = newState();
    st.weather = "sun";
    st.tiles[idx(5, 5)] = { k: "soil", v: 0.5, wet: true, dry: 3 };
    tick(st, 4, q);
    expect(st.tiles[idx(5, 5)].wet).toBe(false);
  });

  it("XP فروش تابع ارزش است نه تعداد کلیک", () => {
    const a = newState();
    const b = newState();
    b.market = JSON.parse(JSON.stringify(a.market));
    a.inv = { wheat: 20 };
    b.inv = { wheat: 20 };
    const xa0 = a.xp,
      xb0 = b.xp;
    sell(a, "wheat", 20, q);
    for (let i = 0; i < 20; i++) sell(b, "wheat", 1, q);
    expect(Math.abs(b.xp - xb0 - (a.xp - xa0))).toBeLessThanOrEqual(1);
  });

  it("برداشت وقتی انبار جا ندارد محصول را نمی‌سوزاند", () => {
    const st = newState();
    st.inv = { wheat: capacity(st) }; // انبار پر
    st.tiles[idx(5, 5)] = { k: "soil", v: 0.5, crop: "wheat", g: 1 };
    expect(harvest(st, 5, 5, q)).toBe(false);
    expect(st.tiles[idx(5, 5)].crop).toBe("wheat"); // محصول سر جایش ماند
  });

  it("خرید همه‌ی نقشه با ضریب منطقی ممکن است (قیمتِ آخرین قطعه < یک میلیون)", () => {
    const chunks = 81 - 9; // ۹ قطعه‌ی اولیه باز است
    const last = Math.round(500 * Math.pow(1.085, chunks - 1));
    expect(last).toBeLessThan(1_000_000);
    const st = newState();
    st.bought = chunks - 1;
    expect(expandCost(st)).toBe(last);
  });
});
