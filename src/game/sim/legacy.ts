/**
 * src/game/sim/legacy.ts — نسخه‌گردانی (تناسخِ مزرعه) و میراثِ نسل‌ها (P6.3)
 *
 * هر نسل تازه این‌ها را از نسلِ قبل به ارث می‌برد:
 *  • ضرایبِ قدیمی: قیمتِ فروش، پاداشِ سفارش، تجربه و ظرفیتِ انبار.
 *  • تازه‌ها (P6.3):
 *    ۱. کارگاه‌های تندتر: هر نسل ۵٪ زمانِ کمتر، حداکثر ۴۰٪ (پیش از این، نسل کارگاه را کُند می‌کرد).
 *    ۲. بذرِ ارزان‌تر: هر نسل ۵٪، حداکثر ۲۵٪.
 *    ۳. زمینِ موروثی: هر نسل یک قطعه‌ی رایگانِ کنارِ زمینِ شروع، حداکثر ۳ (بدون گران‌کردنِ خریدهای بعدی).
 *    ۴. ارثیه: ۱۰٪ سکه‌های نسلِ قبل.
 *    ۵. دستورِ خانوادگی: «حلوای مادربزرگ» در نانوایی از نسلِ دوم.
 *  • شجره‌نامه: کارنامه‌ی هر نسل (روز، سطح، درآمد، برداشت، سفارش) برای پنلِ کسب‌وکار.
 */
import { NCH } from "./state";
import type { Events, State } from "./state";
import { newState } from "./economy";
import { beginLineage } from "./lineage";
import { fmt } from "../data";

export const PRESTIGE_LEVEL = 20;
export const PRESTIGE_COINS = 10_000;
/** V.7: آستانه‌ی سکه‌ی تناسخ با درآمد کل بالا می‌رود تا نسبت سکه/تناسخ مهار شود */
export const prestigeCoins = (s: State) => PRESTIGE_COINS + Math.round((s.stats?.earned ?? 0) * 0.2);
export const INHERIT_SHARE = 0.1;
export const MAX_GENERATIONS_LOG = 50;

/** ضریبِ زمانِ کارگاه‌ها (کمتر = تندتر) */
export const workshopTimeFactor = (gen: number) => Math.max(60, 100 - 5 * gen) / 100;
/** تخفیفِ بذر ۰..۰٫۲۵ */
export const seedDiscount = (gen: number) => Math.min(25, 5 * gen) / 100;
/** شمارِ قطعه‌های موروثی */
export const inheritedChunks = (gen: number) => Math.min(3, gen);

export interface GenerationRecord {
  /** شماره‌ی نسلی که تمام شد (۰ = نسلِ اول) */
  gen: number;
  day: number;
  level: number;
  /** آمارِ تجمعی در پایانِ نسل (کارنامه‌ی هر نسل = تفاضل با نسلِ قبل) */
  earned: number;
  harvested: number;
  orders: number;
  /** P6.4: برای سبکِ نسل (کشاورز/بازرگان/صنعتگر/آبادگر) */
  produced?: number;
  decorations?: number;
  coins: number;
  inherited: number;
}

export interface LegacyPerk {
  icon: string;
  title: string;
  now: string;
  next: string;
  fresh?: boolean;
}

const pct = (x: number) => `${fmt(Math.round(x * 100))}٪`;

/** فهرستِ مزایا برای نسلِ فعلی و نسلِ بعد (پنلِ کسب‌وکار) */
export function legacyPerks(gen: number): LegacyPerk[] {
  const n = gen + 1;
  return [
    { icon: "bolt", title: "کارگاه‌های تندتر", now: `−${pct(1 - workshopTimeFactor(gen))}`, next: `−${pct(1 - workshopTimeFactor(n))}`, fresh: true },
    { icon: "seed", title: "بذرِ ارزان‌تر", now: `−${pct(seedDiscount(gen))}`, next: `−${pct(seedDiscount(n))}`, fresh: true },
    { icon: "map", title: "زمینِ موروثی", now: `${fmt(inheritedChunks(gen))} قطعه`, next: `${fmt(inheritedChunks(n))} قطعه`, fresh: true },
    { icon: "coin", title: "ارثیه از سکه‌ها", now: pct(INHERIT_SHARE), next: pct(INHERIT_SHARE), fresh: true },
    { icon: "gift", title: "دستورِ «حلوای مادربزرگ»", now: gen >= 1 ? "باز" : "بسته", next: "باز", fresh: true },
    { icon: "trendUp", title: "قیمتِ فروش", now: `+${pct(0.15 * gen)}`, next: `+${pct(0.15 * n)}` },
    { icon: "orders", title: "پاداشِ سفارش", now: `+${pct(0.1 * gen)}`, next: `+${pct(0.1 * n)}` },
    { icon: "star", title: "تجربه", now: `+${pct(0.2 * gen)}`, next: `+${pct(0.2 * n)}` },
    { icon: "box", title: "ظرفیتِ انبار", now: `+${fmt(140 * gen)}`, next: `+${fmt(140 * n)}` },
  ];
}

export function canPrestige(s: State) {
  return s.level >= PRESTIGE_LEVEL && s.coins >= prestigeCoins(s);
}

/** قطعه‌های رایگانِ کنارِ زمینِ شروع: نزدیک‌ترین به مرکز، به ترتیبِ ثابت */
export function grantInheritedLand(s: State, k: number): number[] {
  const got: number[] = [];
  const c0 = (NCH - 1) / 2;
  for (let i = 0; i < k; i++) {
    const cands: number[] = [];
    for (let c = 0; c < NCH * NCH; c++) {
      if (s.chunks[c]) continue;
      const cx = c % NCH, cy = Math.floor(c / NCH);
      const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = cx + dx, ny = cy + dy;
        return nx >= 0 && ny >= 0 && nx < NCH && ny < NCH && s.chunks[ny * NCH + nx];
      });
      if (adj) cands.push(c);
    }
    if (!cands.length) break;
    const dist = (c: number) => Math.hypot((c % NCH) - c0, Math.floor(c / NCH) - c0);
    cands.sort((a, b) => dist(a) - dist(b) || a - b);
    s.chunks[cands[0]] = true;
    got.push(cands[0]);
  }
  return got;
}

export function doPrestige(s: State, ev: Events) {
  if (!canPrestige(s)) return;
  ev.celebrate?.("prestige"); // V.3
  ev.shake?.();
  const prev = s.prestige;
  const gen = prev + 1;
  const inherit = Math.floor(s.coins * INHERIT_SHARE);
  const record: GenerationRecord = {
    gen: prev,
    day: s.day,
    level: s.level,
    earned: s.stats.earned,
    harvested: s.stats.harvested,
    orders: s.stats.orders,
    produced: s.stats.produced,
    decorations: s.stats.decorations,
    coins: s.coins,
    inherited: inherit,
  };
  // P6.4: کارنامه‌ی همین نسل (تفاضل با نسلِ قبل) برای داستانِ وارث
  const last = s.generations?.[s.generations.length - 1];
  const deltas = {
    days: s.day,
    harvested: Math.max(0, s.stats.harvested - (last?.harvested ?? 0)),
    orders: Math.max(0, s.stats.orders - (last?.orders ?? 0)),
    // رکوردهای پیش از P6.4 این دو را ندارند: نامعلوم = صفر (نه کلِ عمرِ مزرعه)
    produced: last && last.produced == null ? 0 : Math.max(0, s.stats.produced - (last?.produced ?? 0)),
    decorations: last && last.decorations == null ? 0 : Math.max(0, s.stats.decorations - (last?.decorations ?? 0)),
    earned: Math.max(0, s.stats.earned - (last?.earned ?? 0)),
  };
  const fresh = newState();
  fresh.prestige = gen;
  fresh.coins = 1000 * gen + inherit;
  fresh.stats.earned = s.stats.earned;
  fresh.stats.harvested = s.stats.harvested;
  fresh.stats.orders = s.stats.orders;
  fresh.stats.produced = s.stats.produced;
  fresh.stats.animals = s.stats.animals;
  fresh.stats.decorations = s.stats.decorations;
  fresh.stats.skillPoints = s.stats.skillPoints + 3;
  fresh.achievements = s.achievements;
  fresh.techs = s.techs;
  fresh.skills = s.skills;
  fresh.story = s.story;
  fresh.rep = s.rep;
  fresh.generations = [...(s.generations ?? []), record].slice(-MAX_GENERATIONS_LOG);
  const land = grantInheritedLand(fresh, inheritedChunks(gen));
  Object.assign(s, fresh);
  beginLineage(s, deltas);
  ev.toast(
    `نسل ${fmt(gen)} آغاز شد! ارثیه ${fmt(inherit)} سکه، ${fmt(land.length)} قطعه زمینِ موروثی، ۳ امتیاز مهارت و دستورِ «حلوای مادربزرگ».`,
    "prestige",
  );
  ev.sound("prestige");
}

/** کارنامه‌ی هر نسل (تفاضلِ آمارِ تجمعی) برای نمایش */
export function generationRows(s: State) {
  const log = s.generations ?? [];
  return log.map((r, i) => {
    const p = i > 0 ? log[i - 1] : null;
    return { gen: r.gen, day: r.day, level: r.level, earned: r.earned - (p?.earned ?? 0), harvested: r.harvested - (p?.harvested ?? 0), orders: r.orders - (p?.orders ?? 0), inherited: r.inherited };
  });
}

/** اعتبارسنجیِ شجره‌نامه در سیو (هر رکوردِ نامعتبر حذف می‌شود) */
export function normalizeGenerations(raw: unknown): GenerationRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const n = (x: unknown, max = 1e15) => (Number.isFinite(Number(x)) ? Math.min(max, Math.max(0, Math.round(Number(x)))) : 0);
  const out = raw
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null && !Array.isArray(r))
    .map((r) => ({ gen: n(r.gen, 999), day: n(r.day, 1e6), level: n(r.level, 1000), earned: n(r.earned), harvested: n(r.harvested), orders: n(r.orders), ...(r.produced != null ? { produced: n(r.produced) } : {}), ...(r.decorations != null ? { decorations: n(r.decorations, 1e6) } : {}), coins: n(r.coins), inherited: n(r.inherited) }))
    .slice(-MAX_GENERATIONS_LOG);
  return out;
}
