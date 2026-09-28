import { describe, it, expect, vi, afterEach } from "vitest";
import { newState, idx, tick, type State, type Events } from "../src/game/logic";
import { growthFactors, growTile } from "../src/game/sim/growth";
import { runBuilding, animalTimeFactor, isAnimalBuilding } from "../src/game/sim/machines";
import { runWorkers } from "../src/game/sim/workers";
import { updateMarket, updateOrders } from "../src/game/sim/market";
import { stepDay } from "../src/game/sim/daycycle";
import { BMAP, CROPS, SEASONS, DAY_LEN, FERT_COST, N, WORKERS } from "../src/game/data";
import { DROUGHT, RAIN_SECONDS, SPRINKLER_SECONDS } from "../src/game/sim/state";

/**
 * R8 — ماژول‌های موضوعیِ شبیه‌سازی (daycycle/growth/machines/workers/market) جدا از tick تست می‌شوند:
 * هر ماژول باید بی‌واسطهٔ بقیه قابل آزمون باشد، در حالی که tick فقط ترتیب را می‌بندد.
 */
const q: Events = { toast: () => {}, fx: () => {}, sound: () => {} };

/** گوشه و مرکزِ زمینِ خاکِ مزرعه‌ی آغازین (همیشه باز و قابل استفاده) */
const SX = Math.floor(N / 2) - 3, SY = Math.floor(N / 2) - 3;
const CX = SX + 3, CY = SY + 2;

afterEach(() => vi.restoreAllMocks());

describe("growth — عواملی که رشد و ماشین‌ها را می‌سازند", () => {
  it("پایه: ضریب رشد از فصل، بی‌هیچ پاداش", () => {
    const s = newState();
    s.seasonIndex = 0;
    const f = growthFactors(s);
    expect(f.gMult).toBeCloseTo(SEASONS[0].growthRate, 10);
    expect(f.dryRate).toBe(1);
    expect(f.drought).toBe(false);
    expect(f.autoR).toBe(0);
    expect(f.waterBonus).toBe(0);
  });

  it("زمستان رشد را کند و موج گرما/برف/مه آن را کم می‌کند", () => {
    const s = newState();
    s.seasonIndex = 3;
    const base = growthFactors(s).gMult;
    expect(base).toBeCloseTo(SEASONS[3].growthRate, 10);
    s.weather = "heatwave";
    expect(growthFactors(s).gMult).toBeCloseTo(SEASONS[3].growthRate * 0.9, 10);
    s.weather = "snow";
    expect(growthFactors(s).gMult).toBeCloseTo(SEASONS[3].growthRate * 0.82, 10);
    s.weather = "fog";
    expect(growthFactors(s).gMult).toBeCloseTo(SEASONS[3].growthRate * 0.95, 10);
  });

  it("بیوتکنولوژی، استادِ کشاورزی، جشنِ برکت و آرامشِ فستیوال رشد را بیشتر می‌کنند", () => {
    const s = newState();
    s.seasonIndex = 1;
    const base = SEASONS[1].growthRate;
    expect(growthFactors(s).gMult).toBeCloseTo(base, 10);
    s.techs = ["biotech"];
    expect(growthFactors(s).gMult).toBeCloseTo(base * 1.15, 10);
    s.skills = ["grow_master"];
    expect(growthFactors(s).gMult).toBeCloseTo(base * 1.15 * 1.1, 10);
    s.currentEvent = { type: "bountiful_harvest", endsAt: 1, text: "" };
    expect(growthFactors(s).gMult).toBeCloseTo(base * 1.15 * 1.1 * 1.2, 10);
    s.currentEvent = null;
    s.fest = { idx: 1, day: 6, choice: "rest" };
    expect(growthFactors(s).gMult).toBeCloseTo(base * 1.15 * 1.1 * 1.1, 10);
  });

  it("خشکسالی خشک‌شدن را دوبرابر و «شبکه‌ی قنات» آن را کند می‌کند", () => {
    const s = newState();
    s.currentEvent = { type: "drought", endsAt: 1, text: "" };
    expect(growthFactors(s).dryRate).toBe(DROUGHT.dry);
    expect(growthFactors(s).drought).toBe(true);
    s.techs = ["qanat_net"];
    expect(growthFactors(s).dryRate).toBeCloseTo(DROUGHT.dry / 1.5, 10);
  });

  it("دقتِ کشاورزی شعاع خودکار و مهندسی آبیاری/میراب شعاع آب را زیاد می‌کند", () => {
    const s = newState();
    expect(growthFactors(s).autoR).toBe(0);
    s.techs = ["precision_agri"];
    expect(growthFactors(s).autoR).toBe(1);
    s.techs = ["irrigation_engineering"];
    s.skills = ["water_wise"];
    expect(growthFactors(s).waterBonus).toBe(2);
  });
});

describe("growth — رطوبت و رشدِ هر خانه", () => {
  it("باران زمین را خیس می‌کند و رطوبت را تازه می‌کند", () => {
    const s = newState();
    s.weather = "rain";
    s.tiles[idx(CX, CY)] = { k: "soil", v: 0.5 };
    growTile(s, idx(CX, CY), 1, growthFactors(s));
    expect(s.tiles[idx(CX, CY)].wet).toBe(true);
    expect(s.tiles[idx(CX, CY)].dry).toBe(RAIN_SECONDS);
  });

  it("رطوبت با گذر زمان تمام می‌شود و خشکسالی آن را تندتر می‌کند", () => {
    const s = newState();
    s.weather = "sun";
    s.tiles[idx(CX, CY)] = { k: "soil", v: 0.5, wet: true, dry: 3 };
    growTile(s, idx(CX, CY), 4, growthFactors(s));
    expect(s.tiles[idx(CX, CY)].wet).toBe(false);
    expect(s.tiles[idx(CX, CY)].dry).toBe(0);

    s.currentEvent = { type: "drought", endsAt: 1, text: "" };
    s.tiles[idx(CX, CY)] = { k: "soil", v: 0.5, wet: true, dry: 3 };
    growTile(s, idx(CX, CY), 2, growthFactors(s)); // ۳ − ۲×۲ < ۰
    expect(s.tiles[idx(CX, CY)].wet).toBe(false);
  });

  it("زمینِ خیس ۱٫۸ برابر زمینِ خشک رشد می‌کند", () => {
    const wheat = CROPS.find((c) => c.id === "wheat")!;
    const dry = newState();
    const wet = newState();
    dry.weather = "sun"; wet.weather = "sun";
    dry.tiles[idx(CX, CY)] = { k: "soil", v: 0.5, crop: "wheat", g: 0 };
    wet.tiles[idx(CX, CY)] = { k: "soil", v: 0.5, crop: "wheat", g: 0, wet: true, dry: 90 };
    const f = growthFactors(dry);
    growTile(dry, idx(CX, CY), 1, f);
    growTile(wet, idx(CX, CY), 1, f);
    const gDry = dry.tiles[idx(CX, CY)].g!;
    const gWet = wet.tiles[idx(CX, CY)].g!;
    expect(gDry).toBeCloseTo((1 / wheat.time) * f.gMult, 10);
    expect(gWet / gDry).toBeCloseTo(1.8, 10);
  });

  it("محصولِ ناشناس رشد نمی‌کند و خانه رد می‌شود", () => {
    const s = newState();
    s.weather = "sun";
    s.tiles[idx(CX, CY)] = { k: "soil", v: 0.5, crop: "no_such_crop", g: 0.5 };
    expect(growTile(s, idx(CX, CY), 1, growthFactors(s))).toBe(false);
    expect(s.tiles[idx(CX, CY)].g).toBe(0.5);
  });
});

describe("tick — ترتیبِ ماژول‌ها حفظ می‌شود", () => {
  it("خانه با محصولِ ناشناس از شبیه‌سازی بیرون می‌ماند (ساختارش هم کار نمی‌کند)", () => {
    const s = newState();
    s.weather = "sun";
    for (let y = CY - 1; y <= CY + 1; y++) for (let x = CX - 1; x <= CX + 1; x++) s.tiles[idx(x, y)] = { k: "soil", v: 0.5 };
    // محصولِ ناشناس روی همان خانه‌ای که آب‌پاش دارد: رشد رد می‌شود و آب‌پاش هم اجرا نمی‌شود
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "sprinkler", q: [], p: 0, out: [], crop: "no_such_crop", g: 0.5 };
    tick(s, 0.1, q);
    expect(s.tiles[idx(CX + 1, CY)].wet).toBeFalsy(); // continueِ خانه‌ی نامعتبر حفظ شد
    expect(s.tiles[idx(CX, CY)].g).toBe(0.5);
  });

  it("یک تیکِ کامل هم رشد می‌دهد هم ماشین را می‌چرخاند هم بازار را به‌روز می‌کند", () => {
    const s = newState();
    s.weather = "sun";
    for (let y = CY - 1; y <= CY + 1; y++) for (let x = CX - 1; x <= CX + 1; x++) s.tiles[idx(x, y)] = { k: "soil", v: 0.5, crop: "wheat", g: 0, wet: true, dry: 90 };
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "sprinkler", q: [], p: 0, out: [] };
    const k0 = Object.keys(s.market)[0];
    s.market[k0].sat = 1;
    const t0 = s.time;
    tick(s, 1, q);
    expect(s.tiles[idx(CX + 1, CY)].wet).toBe(true); // ماشین
    expect(s.tiles[idx(CX + 1, CY + 1)].g!).toBeGreaterThan(0); // رشد
    expect(s.market[k0].sat).toBeLessThan(1); // بازار
    expect(s.time).toBe(t0 + 1); // چرخه‌ی روز
  });
});

describe("machines — ساختارها", () => {
  const soilBox = (s: State, bx: number, by: number) => {
    for (let y = by - 1; y <= by + 1; y++) for (let x = bx - 1; x <= bx + 1; x++) s.tiles[idx(x, y)] = { k: "soil", v: 0.5 };
  };

  it("آب‌پاش گردان ۸ زمینِ اطراف را خیس می‌کند", () => {
    const s = newState();
    soilBox(s, CX, CY);
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "sprinkler", q: [], p: 0, out: [] };
    runBuilding(s, idx(CX, CY), 0.1, growthFactors(s), q);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const t = s.tiles[idx(CX + dx, CY + dy)];
      expect(t.wet).toBe(true);
      expect(t.dry).toBeGreaterThanOrEqual(SPRINKLER_SECONDS);
    }
  });

  it("چاه فقط لوزی را آبیاری می‌کند (خانه‌ی گوشه خشک می‌ماند)", () => {
    const s = newState();
    soilBox(s, CX, CY);
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "well", q: [], p: 0, out: [] };
    runBuilding(s, idx(CX, CY), 0.1, growthFactors(s), q);
    expect(s.tiles[idx(CX - 1, CY - 1)].wet).toBeFalsy();
    expect(s.tiles[idx(CX + 1, CY - 1)].wet).toBeFalsy();
    expect(s.tiles[idx(CX - 1, CY)].wet).toBe(true);
    expect(s.tiles[idx(CX, CY + 1)].wet).toBe(true);
  });

  it("دروگر فقط وقتی انبار جا دارد برداشت می‌کند", () => {
    const room = newState();
    soilBox(room, CX, CY);
    room.tiles[idx(CX + 1, CY + 1)] = { k: "soil", v: 0.5, crop: "wheat", g: 1 };
    room.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "harvester", q: [], p: 0, out: [] };
    runBuilding(room, idx(CX, CY), 0.1, growthFactors(room), q);
    expect(room.tiles[idx(CX + 1, CY + 1)].crop).toBeUndefined();
    expect(room.inv.wheat).toBeGreaterThanOrEqual(2);

    const full = newState();
    soilBox(full, CX, CY);
    full.inv = { rock: 200 }; // بیش از ظرفیتِ ۱۲۰
    full.tiles[idx(CX + 1, CY + 1)] = { k: "soil", v: 0.5, crop: "wheat", g: 1 };
    full.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "harvester", q: [], p: 0, out: [] };
    runBuilding(full, idx(CX, CY), 0.1, growthFactors(full), q);
    expect(full.tiles[idx(CX + 1, CY + 1)].crop).toBe("wheat");
  });

  it("بذرپاش خودکار برای هر کاشت یک بذر از انبار برمی‌دارد", () => {
    const s = newState();
    soilBox(s, CX, CY);
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "auto_planter", q: [], p: 0, out: [] };
    s.inv = { carrot: 1 }; // انبار فقط یک بذرِ هویج دارد
    runBuilding(s, idx(CX, CY), 0.1, growthFactors(s), q);
    let planted = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (s.tiles[idx(CX + dx, CY + dy)].crop === "carrot") planted++;
    expect(planted).toBe(1); // فقط یک بذر بود
    expect(s.inv.carrot).toBe(0);
  });

  it("کمپوست‌ساز و کودپاش زمین را کود می‌دهند و کودپاش سکه می‌خواهد", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const s = newState();
    soilBox(s, CX, CY);
    s.coins = 100;
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "auto_fertilizer", q: [], p: 0, out: [] };
    runBuilding(s, idx(CX, CY), 1, growthFactors(s), q);
    expect(s.tiles.filter((t) => t.fert).length).toBe(8);
    expect(s.coins).toBe(100 - 8 * Math.ceil(FERT_COST * 0.4));

    const poor = newState();
    soilBox(poor, CX, CY);
    poor.coins = 0;
    poor.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "auto_fertilizer", q: [], p: 0, out: [] };
    runBuilding(poor, idx(CX, CY), 1, growthFactors(poor), q);
    expect(poor.tiles.filter((t) => t.fert).length).toBe(0);
  });

  it("کارگاهِ دامی با دامپزشک تندتر تولید می‌کند", () => {
    const mk = (vet: boolean) => {
      const s = newState();
      s.inv = { wheat: 10 };
      if (vet) s.workers = [{ id: 1, kind: "vet" }];
      s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "coop", q: [0], p: 0, out: [] };
      runBuilding(s, idx(CX, CY), 25, growthFactors(s), q);
      return s;
    };
    const plain = mk(false);
    expect(plain.tiles[idx(CX, CY)].out).toEqual([]); // ۲۵ < ۲۸ ثانیه
    expect(plain.tiles[idx(CX, CY)].p).toBeCloseTo(25 / 28, 10);

    const vetted = mk(true);
    expect(vetted.tiles[idx(CX, CY)].out).toEqual(["egg"]); // ۲۵ > ۲۸×۰٫۸۵
    expect(vetted.tiles[idx(CX, CY)].q).toEqual([]);
    expect(vetted.xp).toBeGreaterThan(plain.xp);
  });

  it("کارگاهِ غیردامی با دامپزشک تغییر نمی‌کند", () => {
    const s = newState();
    s.workers = [{ id: 1, kind: "vet" }];
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "mill", q: [0], p: 0, out: [] };
    expect(isAnimalBuilding(BMAP.mill)).toBe(false);
    expect(animalTimeFactor(s)).toBeLessThan(1); // ضریب فقط برای کارگاه‌های دامی به کار می‌رود
    runBuilding(s, idx(CX, CY), 10, growthFactors(s), q);
    expect(s.tiles[idx(CX, CY)].p).toBeCloseTo(10 / 24, 10);
  });
});

describe("workers — کارگرِ مزرعه و اپراتور", () => {
  it("کارگرِ مزرعه محصولِ رسیده را می‌چیند، با یک بذر می‌کارد و آب می‌دهد", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // بی‌پاداشِ تصادفیِ برداشت
    const s = newState();
    s.coins = 500;
    s.inv = { wheat: 5 };
    s.workers = [{ id: 1, kind: "farmhand" }];
    s.wAcc = 2.3; // یک گامِ کاملِ ۲٫۲ ثانیه
    const target = idx(CX, CY); // گندمِ رسیده‌ی زمینِ آغازین
    expect(s.tiles[target].crop).toBe("wheat");
    expect(s.tiles[target].g).toBe(1);
    runWorkers(s, 0.001, q);
    expect(s.tiles[target].crop).toBe("wheat"); // دوباره کاشت شد
    expect(s.tiles[target].g).toBe(0);
    expect(s.tiles[target].wet).toBe(true); // و آب گرفت
    expect(s.inv.wheat).toBe(6); // ۵ + ۲ برداشت − ۱ بذر
    expect(s.inv.carrot).toBe(1); // هویجِ دومِ زمینِ آغازین هم چیده و باز کاشته شد
    expect(s.stats.harvested).toBe(4); // دو برداشتِ دو واحد
    expect(s.wAcc).toBeLessThan(2.2);
  });

  it("اپراتور خروجیِ کارگاه را به انبار می‌برد و صف را پر می‌کند", () => {
    const s = newState();
    s.inv = { wheat: 5 };
    s.workers = [{ id: 1, kind: "operator" }];
    s.wAcc = 2.3;
    s.tiles[idx(CX, CY)] = { k: "bld", v: 0.5, b: "mill", q: [], p: 0, out: ["flour"], lr: 0, autoMode: true };
    runWorkers(s, 0.001, q);
    expect(s.inv.flour).toBe(1);
    expect(s.tiles[idx(CX, CY)].q).toEqual([0]); // دستورِ آخرین بار کهنه شد
    expect(s.inv.wheat).toBe(2); // مواد اولیه از انبار کم شد
  });
});

describe("market — اشباع، تاریخچه و سفارش‌ها", () => {
  it("اشباع کم می‌شود و تاریخچه‌ی قیمت سقف ۴۰ نمونه دارد", () => {
    const s = newState();
    const k = Object.keys(s.market)[0];
    s.market[k].sat = 1;
    updateMarket(s, 1);
    expect(s.market[k].sat).toBeCloseTo(1 - 0.0035, 10);

    s.market[k].hist = Array.from({ length: 40 }, (_, i) => i);
    s.histAcc = 6.9;
    updateMarket(s, 0.2);
    expect(s.market[k].hist).toHaveLength(40); // بی‌نهایت بزرگ نمی‌شود
    expect(s.histAcc).toBe(0);
  });

  it("سفارشِ منقضی تازه و فهرست تا سقفِ سطح پر می‌شود", () => {
    const s = newState();
    s.orders = s.orders.map((o) => ({ ...o, exp: s.time - 1 }));
    updateOrders(s);
    expect(s.orders.every((o) => o.exp > s.time)).toBe(true);

    s.orders = [];
    updateOrders(s);
    expect(s.orders).toHaveLength(Math.min(7, 3 + Math.floor(s.level / 3)));

    s.level = 30;
    s.orders = [];
    updateOrders(s);
    expect(s.orders).toHaveLength(7); // سقفِ هفت سفارش
  });
});

describe("daycycle — روز، حقوق و آب‌وهوا", () => {
  it("با گذشتنِ روز، حقوق پرداخت و فصل عوض می‌شود", () => {
    const s = newState();
    s.coins = 1000;
    s.workers = [{ id: 1, kind: "farmhand" }];
    const wage = WORKERS.farmhand.wage;
    s.time = DAY_LEN - 0.5; // تیکِ کوچک، ولی مرزِ روز را می‌گذراند
    stepDay(s, 1, q);
    expect(s.day).toBe(2);
    expect(s.coins).toBe(1000 - wage); // بی‌درآمدِ دیگر در تیک
    expect(s.seasonIndex).toBe(0);
  });

  it("کارگرِ بی‌حقوق استعفا می‌کند", () => {
    const s = newState();
    s.coins = 0;
    s.workers = [{ id: 1, kind: "farmhand" }];
    s.time = DAY_LEN - 0.5;
    const errs: string[] = [];
    const loud: Events = { ...q, toast: (m: string) => errs.push(m) };
    stepDay(s, 1, loud);
    expect(s.workers).toHaveLength(0);
    expect(errs.join(" ")).toContain("استعفا");
  });

  it("زمستان برف می‌آورد و خشکسالی باران را نمی‌گذارد", () => {
    const winter = newState();
    winter.seasonIndex = 3;
    winter.time = 15 * DAY_LEN - 0.5; // روزِ ۱۶ ⇒ زمستان
    vi.spyOn(Math, "random").mockReturnValue(0.1); // < ۰٫۵ ⇒ برف
    stepDay(winter, 1, q);
    expect(winter.weather).toBe("snow");

    const dry = newState();
    dry.seasonIndex = 1;
    dry.currentEvent = { type: "drought", endsAt: 1, text: "" };
    dry.time = DAY_LEN - 0.5;
    stepDay(dry, 1, q);
    expect(dry.weather === "rain" || dry.weather === "snow").toBe(false);
  });

  it("شمارشِ آب‌وهوا به صفر برسد هوا آفتابی می‌شود", () => {
    const s = newState();
    s.weather = "fog";
    s.weatherLeft = 5;
    stepDay(s, 6, q);
    expect(s.weather).toBe("sun");
  });
});
