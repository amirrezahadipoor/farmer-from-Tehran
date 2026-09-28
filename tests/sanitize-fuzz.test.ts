import { describe, it, expect } from "vitest";
import { sanitizeSave, OPTIONAL_STATE_KEYS } from "../src/game/sim/sanitize";
import { newState, type State } from "../src/game/logic";
import { makeRng, withRng, withSeed } from "../src/game/sim/rng";
import { ITEMS, N, WEATHER_TYPES } from "../src/game/data";

/**
 * کسری «هیچ تست fuzz/property-based برای sanitizeSave نیست» (ریویوی سخت‌گیرانه، صحت و تست).
 * sanitizeSave مرزِ اعتماد بین کلاینت و سرور است: هر ورودی‌ای — حتی از یک کلاینتِ خراب یا
 * مهاجم — باید یا null بدهد یا یک State سالم و تکرارپذیر. این تست با مولدِ تصادفیِ بذردار
 * (همان RNG تزریق‌پذیرِ شبیه‌سازی) هزاران ورودی می‌سازد و این قرارداد را می‌سنجد.
 */

/** ایموجی و نویسه‌ی کنترلیِ تست، به‌صورتِ کد ساخته می‌شوند تا خودِ فایلِ تست ایموجی نداشته باشد */
const EMOJI = String.fromCodePoint(0x1f642); // یک نمادِ تصویریِ معمول
const RLO = String.fromCodePoint(0x202e); // نویسه‌ی کنترلیِ جهتش‌دهنده

/** یک مقدارِ تصادفیِ «هرچه ممکن»: عددِ بی‌معنا، آرایه‌ی تو‌در‌تو، شئه‌ی ناقص، نشانه، تابع… */
function junk(rand: () => number, depth = 0): unknown {
  const pick = Math.floor(rand() * 12);
  switch (pick) {
    case 0: return null;
    case 1: return undefined;
    case 2: return rand() < 0.5 ? NaN : rand() < 0.5 ? Infinity : -Infinity;
    case 3: return rand() < 0.5 ? "متن" : `${rand()}`;
    case 4: return rand() < 0.5;
    case 5: return rand() * 1e12;
    case 6: return [junk(rand, depth + 1), junk(rand, depth + 1)];
    case 7: return { evil: junk(rand, depth + 1), deeper: depth < 3 ? junk(rand, depth + 1) : 1 };
    case 8: return new Map([["a", 1]]);
    case 9: return Symbol.for("x");
    case 10: return () => 1;
    default: return rand() < 0.5 ? EMOJI : RLO + "rtl";
  }
}

/** سیوِ نیمه‌خراب: شکلِ درست، مقدارهای خراب */
function brokenSave(rand: () => number): Record<string, unknown> {
  const base = JSON.parse(JSON.stringify(newState())) as Record<string, unknown>;
  const fields = ["coins", "xp", "level", "prestige", "day", "time", "rep", "nextId", "bought", "wAcc", "histAcc", "eventAcc", "weatherLeft", "savedAt"];
  for (const f of fields) if (rand() < 0.4) base[f] = junk(rand);
  if (rand() < 0.3) base.weather = junk(rand);
  if (rand() < 0.3) base.tiles = Array.from({ length: N * N }, () => (rand() < 0.5 ? junk(rand) : { k: "nope", v: junk(rand), g: junk(rand), crop: rand() < 0.2 ? 5 : "wheat" }));
  if (rand() < 0.3) base.tiles = (base.tiles as unknown[]).slice(0, 3); // کاشیِ کم
  if (rand() < 0.3) base.market = junk(rand);
  if (rand() < 0.3) base.inv = { wheat: junk(rand), stone: 5, not_an_item: 1 };
  if (rand() < 0.3) base.orders = Array.from({ length: 60 }, () => (rand() < 0.5 ? junk(rand) : { id: 1, exp: junk(rand) }));
  if (rand() < 0.3) base.workers = Array.from({ length: 60 }, () => junk(rand));
  if (rand() < 0.3) base.techs = ["biotech", 5, null, "biotech", ""];
  if (rand() < 0.3) base.story = { ...(base.story as object), name: EMOJI.repeat(40) };
  if (rand() < 0.2) base.chunks = "not-an-array";
  if (rand() < 0.2) base.achievements = { level20: "yes", a: true, b: 3 };
  if (rand() < 0.2) base.v = rand() < 0.5 ? 4 : "5";
  if (rand() < 0.2) base.unknown_key = junk(rand); // باید دور ریخته شود
  return base;
}

const KINDS = new Set(["grass", "soil", "tree", "rock", "water", "bld"]);
const NUM_FIELDS = ["coins", "xp", "level", "prestige", "day", "time", "rep", "nextId", "bought", "wAcc", "histAcc", "eventAcc", "weatherLeft", "savedAt"];
const ALLOWED = new Set([...Object.keys(newState()), ...OPTIONAL_STATE_KEYS]);

/** قراردادِ sanitizeSave — با JS خالص (بی‌expect در حلقه) و یک assert در پایان */
function problems(s: State): string[] {
  const bad: string[] = [];
  if (s.tiles.length !== N * N) bad.push("tiles.length");
  for (const t of s.tiles) {
    if (!KINDS.has(t.k)) bad.push("tile.k");
    if (!Number.isFinite(t.v)) bad.push("tile.v");
    if (t.g !== undefined && !Number.isFinite(t.g)) bad.push("tile.g");
    if (t.crop !== undefined && typeof t.crop !== "string") bad.push("tile.crop");
  }
  if (!(WEATHER_TYPES as readonly string[]).includes(s.weather)) bad.push("weather");
  for (const f of NUM_FIELDS) if (!Number.isFinite(s[f as keyof State] as number)) bad.push(f);
  if (s.level < 1) bad.push("level");
  for (const [k, v] of Object.entries(s.inv)) {
    if (!(k in ITEMS)) bad.push(`inv.${k}`);
    if (!Number.isFinite(v) || v < 0) bad.push(`inv.value.${k}`);
  }
  if (s.orders.length > 50) bad.push("orders");
  if (s.workers.length > 50) bad.push("workers");
  if (s.techs.length > 200) bad.push("techs");
  if (s.skills.length > 200) bad.push("skills");
  if (s.story.name.length > 24) bad.push("name");
  if (s.chunks.length !== 81) bad.push("chunks");
  for (const k of Object.keys(s)) if (!ALLOWED.has(k)) bad.push(`key.${k}`); // کلیدِ ناشناخته نمی‌ماند
  return bad;
}

describe("sanitizeSave — تست حالت‌محور (fuzz) روی مرزِ اعتمادِ کلاینت به سرور", () => {
  it("۲۰۰۰ ورودیِ تصادفی: هرگز استثنا نمی‌دهد و خروجی سالم است", () => {
    const gen = makeRng(20260928); // مولدِ ورودی‌ها هم بذردار است، پس هر خرابی قابلِ بازتولید است
    withSeed(20260928, () => {
      let rejected = 0;
      let accepted = 0;
      const bad: string[] = [];
      for (let i = 0; i < 2000; i++) {
        const raw = i % 3 === 0 ? junk(gen) : i % 3 === 1 ? brokenSave(gen) : JSON.parse(JSON.stringify(newState()));
        let out: State | null = null;
        try {
          out = sanitizeSave(raw);
        } catch (e) {
          bad.push(`throw #${i}: ${(e as Error).message}`);
          continue;
        }
        if (out) {
          accepted++;
          bad.push(...problems(out).map((p) => `#${i}: ${p}`));
        } else rejected++;
      }
      expect(bad.slice(0, 10)).toEqual([]);
      expect(accepted).toBeGreaterThan(300); // مولد واقعاً ورودیِ «قابلِ نجات» هم ساخته
      expect(rejected).toBeGreaterThan(0); // و ورودیِ «غیرقابلِ نجات» هم
    });
  }, 30000);

  it("خروجی پایدار است: sanitizeSave(sanitizeSave(x)) همان sanitizeSave(x)", () => {
    const gen = makeRng(777);
    withSeed(777, () => {
      for (let i = 0; i < 400; i++) {
        const raw = i % 2 === 0 ? brokenSave(gen) : junk(gen);
        const once = sanitizeSave(raw);
        if (!once) continue;
        const twice = sanitizeSave(JSON.parse(JSON.stringify(once)));
        expect(twice).not.toBeNull();
        expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
      }
    });
  }, 30000);

  it("با بذرِ یکسان، پاک‌سازیِ یک سیوِ خراب بیت‌به‌بیت تکرارپذیر است", () => {
    const run = () => {
      const gen = makeRng(4242);
      return withRng(gen, () => JSON.stringify(sanitizeSave(brokenSave(gen))));
    };
    expect(run()).toBe(run());
  });

  it("سیوِ سالم دست‌نخورده از فیلتر رد می‌شود", () => {
    const s = newState();
    s.coins = 1234;
    s.inv.wheat = 7;
    const out = sanitizeSave(JSON.parse(JSON.stringify(s)));
    expect(out).not.toBeNull();
    expect(out!.coins).toBe(1234);
    expect(out!.inv.wheat).toBe(7);
  });
});
