import { describe, it, expect, vi, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { newState, tick, type State, type Events } from "../src/game/logic";
import { sanitizeSave } from "../src/game/sim/sanitize";
import { makeRng, rng, setRng, withRng, withSeed } from "../src/game/sim/rng";

/**
 * R/T9 — همه‌ی نقاطِ تصادفِ شبیه‌سازی از یک درگاهِ تزریق‌پذیر عبور می‌کنند:
 * با بذرِ ثابت باید همان نتیجه بیرون بیاید، و شکلِ سیو نباید تغییر کند.
 */
const q: Events = { toast: () => {}, fx: () => {}, sound: () => {} };

/** اثرِ انگشتِ وضعیت: هر چیزی که تصادف می‌تواند به آن دست بزند */
const fp = (s: State) =>
  JSON.stringify({
    coins: s.coins, day: s.day, time: s.time, weather: s.weather, level: s.level, xp: s.xp, rep: s.rep,
    inv: s.inv, orders: s.orders, workers: s.workers,
    tiles: s.tiles.map((t) => [
      t.k, t.crop ?? null, +(t.g ?? 0).toFixed(6), t.wet ? 1 : 0, t.fert ? 1 : 0, t.dry ?? null,
      t.b ?? null, (t.out || []).join(","), +(t.p ?? 0).toFixed(6),
    ]),
    market: Object.fromEntries(Object.entries(s.market).map(([k, m]) => [k, +m.ph.toFixed(6), +m.sat.toFixed(6)])),
  });

afterEach(() => vi.restoreAllMocks());

describe("درگاهِ تصادف (sim/rng)", () => {
  it("هیچ فایلی در sim مستقل Math.random را صدا نمی‌زند (جز خودِ درگاه)", () => {
    const dir = new URL("../src/game/sim/", import.meta.url).pathname;
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && f !== "rng.ts")
      .filter((f) => readFileSync(join(dir, f), "utf8").includes("Math.random("));
    expect(offenders).toEqual([]);
  });

  it("پیش‌فرض هنوز Math.random است، پس spy کردنِ Math.random کار می‌کند", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    expect(rng()).toBe(0.42);
  });

  it("makeRng با بذرِ یکسان دنباله‌ی یکسان و با بذرِ دیگر دنباله‌ی دیگر می‌دهد", () => {
    const a = Array.from({ length: 8 }, makeRng(2026));
    const b = Array.from({ length: 8 }, makeRng(2026));
    const c = Array.from({ length: 8 }, makeRng(2027));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...a)).toBeLessThan(1);
  });

  it("withRng و withSeed مقدارِ قبلی را برمی‌گردانند (حتی در خطا)", () => {
    const stub = () => 0.5;
    setRng(stub);
    expect(rng()).toBe(0.5);
    const back = withSeed(1, () => rng());
    expect(back).not.toBe(0.5);
    expect(rng()).toBe(0.5); // مقدارِ قبلی دست‌نخورده ماند
    setRng(() => Math.random()); // بازگشت به پیش‌فرض
    expect(withRng(stub, () => rng())).toBe(0.5);
    expect(rng()).not.toBe(0.5);
    expect(() => withSeed(2, () => { throw new Error("boom"); })).toThrow("boom");
  });
});

describe("دترمینیسمِ شبیه‌سازی با بذرِ ثابت", () => {
  it("نقشه‌ی تازه با بذرِ یکسان بیت‌به‌بیت یکی است و با بذرِ دیگر نیست", () => {
    const a = withSeed(1234, () => newState());
    const b = withSeed(1234, () => newState());
    const c = withSeed(4321, () => newState());
    expect(fp(a)).toBe(fp(b));
    expect(fp(c)).not.toBe(fp(a));
  });

  it("سیلِ تیک‌ها با بذرِ یکسان به همان نتیجه می‌رسد", () => {
    const run = () =>
      withSeed(99, () => {
        const s = newState();
        for (let i = 0; i < 400; i++) tick(s, 0.5, q);
        return fp(s);
      });
    expect(run()).toBe(run());
  });

  it("بذرشده و تصادفیِ واقعی هر دو بازیِ معتبر می‌سازند (رفتارِ پیش‌فرض عوض نشده)", () => {
    const seeded = withSeed(7, () => newState());
    const live = newState();
    for (const s of [seeded, live]) {
      expect(s.tiles).toHaveLength(1296);
      expect(s.coins).toBeGreaterThan(0);
      expect(Object.keys(s.market).length).toBeGreaterThan(5);
      expect(s.orders.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("سیو هیچ فیلدِ تازه‌ای نمی‌گیرد و پاک‌ساز با بذرِ ثابت تکرارپذیر است", () => {
    const seededKeys = withSeed(11, () => Object.keys(newState()).sort());
    expect(JSON.stringify(seededKeys)).toBe(JSON.stringify(Object.keys(newState()).sort()));
    expect(seededKeys).not.toContain("rng");

    const clean = (seed: number) =>
      withSeed(seed, () => {
        const s = newState();
        const out = sanitizeSave(JSON.parse(JSON.stringify(s)));
        return out ? fp(out) : null;
      });
    expect(clean(5)).toBe(clean(5));
    expect(clean(5)).not.toBeNull();
  });
});
