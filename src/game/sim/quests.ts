/**
 * src/game/sim/quests.ts — اهداف روزانه و هفتگی + زنجیره و نشان‌ها (P6.2)
 *
 *  • هر روزِ محلیِ بازیکن ۳ هدفِ متفاوت (بذرِ تصادف = تاریخ، پس بارگذاریِ دوباره عوضشان نمی‌کند)
 *    و هر هفته‌ی ISO یک هدفِ بزرگ.
 *  • پیشرفت = تفاضلِ آمارِ بازی از لحظه‌ی ساختِ هدف (بدون شمارنده‌ی جدا؛ هیچ کاری دوبار شمرده نمی‌شود).
 *  • هر هدف یک بار دریافت می‌شود؛ هر سه = «جایزه‌ی روز» + یک روز به زنجیره.
 *  • زنجیره‌ی ۳، ۷، ۱۴ و ۳۰ روزه نشانِ دائمی و امتیاز مهارت می‌دهد.
 * ماژول خالص است: «اکنون» همیشه از بیرون می‌آید تا تست قطعی باشد.
 */
import { fmt } from "../data";
import type { Events, State } from "./state";
import { addXp } from "./economy";

export type QuestStat = "harvested" | "earned" | "orders" | "produced" | "spent" | "decorations";

export interface QuestEntry {
  id: string;
  stat: QuestStat;
  target: number;
  /** مقدارِ آمار در لحظه‌ی ساختِ هدف */
  base: number;
  coins: number;
  xp: number;
  /** پاداشِ امتیاز مهارت (فقط هدفِ هفتگی) */
  sp: number;
  claimed: boolean;
}

export interface QuestState {
  day: string;
  week: string;
  daily: QuestEntry[];
  weekly: QuestEntry | null;
  /** جایزه‌ی روز (هر سه هدف) گرفته شد */
  bonus: boolean;
  streak: number;
  best: number;
  /** آخرین روزی که هر سه هدف کامل شد */
  lastFull: string;
  badges: number[];
}

interface Template {
  id: string;
  stat: QuestStat;
  /** هدف در سطحِ lvl */
  target: (lvl: number) => number;
  minLevel: number;
  title: (n: number) => string;
  /** نمادِ SVG: item:<id> یا ui:<name> */
  icon: string;
}

/** گردکردن به عددِ خوش‌خوان (۵، ۱۰، ۵۰ ...) */
export function nice(n: number): number {
  if (n <= 10) return Math.max(1, Math.round(n));
  const step = n < 50 ? 5 : n < 200 ? 10 : n < 1000 ? 50 : n < 5000 ? 100 : 500;
  return Math.round(n / step) * step;
}

export const DAILY_TEMPLATES: Template[] = [
  { id: "harvest", stat: "harvested", target: (l) => nice(18 + l * 4), minLevel: 1, title: (n) => `${fmt(n)} محصول برداشت کن`, icon: "item:wheat" },
  { id: "earn", stat: "earned", target: (l) => nice(250 + l * 150), minLevel: 1, title: (n) => `${fmt(n)} سکه درآمد داشته باش`, icon: "ui:coin" },
  { id: "invest", stat: "spent", target: (l) => nice(200 + l * 110), minLevel: 1, title: (n) => `${fmt(n)} سکه در مزرعه خرج کن`, icon: "ui:build" },
  { id: "orders", stat: "orders", target: (l) => nice(2 + l / 4), minLevel: 2, title: (n) => `${fmt(n)} سفارش تحویل بده`, icon: "ui:orders" },
  { id: "produce", stat: "produced", target: (l) => nice(3 + l * 0.8), minLevel: 3, title: (n) => `${fmt(n)} کالا از کارگاه‌ها جمع کن`, icon: "ui:factory" },
  { id: "decor", stat: "decorations", target: (l) => nice(1 + l / 12), minLevel: 5, title: (n) => `${fmt(n)} دکور در دره بگذار`, icon: "ui:decor" },
];

export const WEEKLY_TEMPLATES: Template[] = [
  { id: "w_harvest", stat: "harvested", target: (l) => nice(150 + l * 30), minLevel: 1, title: (n) => `این هفته ${fmt(n)} محصول برداشت کن`, icon: "item:wheat" },
  { id: "w_earn", stat: "earned", target: (l) => nice(2500 + l * 1100), minLevel: 1, title: (n) => `این هفته ${fmt(n)} سکه درآمد داشته باش`, icon: "ui:coin" },
  { id: "w_orders", stat: "orders", target: (l) => nice(10 + l), minLevel: 2, title: (n) => `این هفته ${fmt(n)} سفارش تحویل بده`, icon: "ui:orders" },
];

export const TEMPLATE = Object.fromEntries([...DAILY_TEMPLATES, ...WEEKLY_TEMPLATES].map((t) => [t.id, t]));

/** نشان‌های زنجیره: روز → پاداش */
export const STREAK_BADGES: { days: number; sp: number; coins: number; title: string }[] = [
  { days: 3, sp: 1, coins: 500, title: "کشاورزِ پیگیر" },
  { days: 7, sp: 2, coins: 1500, title: "یک هفته بی‌وقفه" },
  { days: 14, sp: 3, coins: 4000, title: "دستِ پرکار" },
  { days: 30, sp: 5, coins: 12000, title: "افسانه‌ی دره" },
];

/* ------------------------------------------------------------ تاریخ */
const pad = (n: number) => String(n).padStart(2, "0");
/** کلیدِ روزِ محلی «YYYY-MM-DD» */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** روزِ قبل از یک کلید */
export function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}
/** هفته‌ی ISO «YYYY-Www» (دوشنبه تا یکشنبه) */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(w)}`;
}
/** ثانیه تا نیمه‌شبِ محلی (برای شمارشِ معکوسِ پنل) */
export function secondsToMidnight(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return Math.max(0, Math.round((m.getTime() - d.getTime()) / 1000));
}

/** بذرِ عددی از رشته (FNV-1a) و تصادفِ قابل‌تکرار */
function seedOf(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rand(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ ساخت */
const entry = (s: State, t: Template, lvl: number, weekly: boolean): QuestEntry => ({
  id: t.id,
  stat: t.stat,
  target: t.target(lvl),
  base: s.stats[t.stat] || 0,
  coins: weekly ? nice(600 + lvl * 260) : nice(80 + lvl * 45),
  xp: weekly ? 60 + lvl * 20 : 15 + lvl * 6,
  sp: weekly ? 1 : 0,
  claimed: false,
});

/** سه هدفِ متفاوتِ روز (قطعی برای یک تاریخ و سطح) */
export function makeDaily(s: State, day: string): QuestEntry[] {
  const r = rand(seedOf("d:" + day));
  const pool = DAILY_TEMPLATES.filter((t) => s.level >= t.minLevel);
  const picked: Template[] = [];
  while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return picked.map((t) => entry(s, t, s.level, false));
}

export function makeWeekly(s: State, week: string): QuestEntry {
  const r = rand(seedOf("w:" + week));
  const pool = WEEKLY_TEMPLATES.filter((t) => s.level >= t.minLevel);
  return entry(s, pool[Math.floor(r() * pool.length)], s.level, true);
}

export function newQuestState(s: State, now: Date): QuestState {
  const day = dayKey(now);
  const week = weekKey(now);
  return { day, week, daily: makeDaily(s, day), weekly: makeWeekly(s, week), bonus: false, streak: 0, best: 0, lastFull: "", badges: [] };
}

/**
 * اهداف را با «اکنون» هم‌گام می‌کند: روزِ تازه → سه هدفِ تازه، هفته‌ی تازه → هدفِ هفتگیِ تازه.
 * اگر آماری پایین‌تر از پایه‌ی هدف رفت (مثلاً «خرج» بعد از نسخه‌گردانی صفر می‌شود)، پایه جابه‌جا
 * می‌شود تا پیشرفت منفی نشود. خروجی: آیا چیزی عوض شد.
 */
export function ensureQuests(s: State, now: Date): boolean {
  const day = dayKey(now);
  const week = weekKey(now);
  if (!s.quests) {
    s.quests = newQuestState(s, now);
    return true;
  }
  const q = s.quests;
  let changed = false;
  if (q.day !== day) {
    q.day = day;
    q.daily = makeDaily(s, day);
    q.bonus = false;
    // زنجیره فقط وقتی زنده است که دیروز کامل شده باشد
    if (q.lastFull !== prevDay(day) && q.lastFull !== day) q.streak = 0;
    changed = true;
  }
  if (q.week !== week || !q.weekly) {
    q.week = week;
    q.weekly = makeWeekly(s, week);
    changed = true;
  }
  for (const e of [...q.daily, q.weekly]) {
    if (e && (s.stats[e.stat] || 0) < e.base) {
      e.base = s.stats[e.stat] || 0;
      changed = true;
    }
  }
  return changed;
}

/* ------------------------------------------------------------ پیشرفت و دریافت */
export const questProgress = (s: State, e: QuestEntry) => Math.max(0, Math.min(e.target, (s.stats[e.stat] || 0) - e.base));
export const questDone = (s: State, e: QuestEntry) => questProgress(s, e) >= e.target;
export const questTitle = (e: QuestEntry) => TEMPLATE[e.id]?.title(e.target) ?? "";
export const questIcon = (e: QuestEntry) => TEMPLATE[e.id]?.icon ?? "ui:target";

/** شمارِ هدف‌های آماده‌ی دریافت (برای نشانِ منو) */
export function claimableQuests(s: State): number {
  const q = s.quests;
  if (!q) return 0;
  return [...q.daily, q.weekly].filter((e): e is QuestEntry => !!e && !e.claimed && questDone(s, e)).length;
}

/** جایزه‌ی روز: دو برابرِ پاداشِ یک هدفِ روزانه */
export const dayBonus = (s: State) => nice(160 + s.level * 90);

/**
 * دریافتِ یک هدف (شماره‌ی ۰..۲ یا "weekly"). هر هدف فقط یک بار؛ با سومین هدفِ روزانه،
 * جایزه‌ی روز، زنجیره و نشان‌های تازه هم اعمال می‌شوند.
 */
export function claimQuest(s: State, which: number | "weekly", ev: Events): boolean {
  const q = s.quests;
  if (!q) return false;
  const e = which === "weekly" ? q.weekly : q.daily[which];
  if (!e || e.claimed) return false;
  if (!questDone(s, e)) {
    ev.toast("این هدف هنوز کامل نشده است", "err");
    return false;
  }
  e.claimed = true;
  s.coins += e.coins;
  s.stats.earned += e.coins;
  if (e.sp) s.stats.skillPoints += e.sp;
  addXp(s, e.xp, ev);
  // پاداش نباید هدفِ «درآمد» را خودش جلو ببرد
  for (const o of [...q.daily, q.weekly]) if (o && o !== e && o.stat === "earned" && !o.claimed) o.base += e.coins;
  ev.toast(`هدف کامل شد: +${fmt(e.coins)} سکه${e.sp ? ` و ${fmt(e.sp)} امتیاز مهارت` : ""}`, "ok");
  ev.sound("goal");

  if (which !== "weekly" && !q.bonus && q.daily.length > 0 && q.daily.every((d) => d.claimed)) {
    q.bonus = true;
    const b = dayBonus(s);
    s.coins += b;
    s.stats.earned += b;
    for (const o of [q.weekly]) if (o && o.stat === "earned" && !o.claimed) o.base += b;
    q.streak = q.lastFull === prevDay(q.day) ? q.streak + 1 : q.lastFull === q.day ? q.streak : 1;
    q.lastFull = q.day;
    q.best = Math.max(q.best, q.streak);
    ev.toast(`جایزه‌ی روز: +${fmt(b)} سکه — زنجیره‌ی ${fmt(q.streak)} روزه`, "lvl");
    for (const badge of STREAK_BADGES) {
      if (q.streak >= badge.days && !q.badges.includes(badge.days)) {
        q.badges.push(badge.days);
        s.coins += badge.coins;
        s.stats.skillPoints += badge.sp;
        ev.toast(`نشانِ تازه: «${badge.title}» — +${fmt(badge.coins)} سکه و ${fmt(badge.sp)} امتیاز مهارت`, "prestige");
        ev.sound("achievement");
      }
    }
  }
  return true;
}

/* ------------------------------------------------------------ اعتبارسنجیِ سیو */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const STATS: QuestStat[] = ["harvested", "earned", "orders", "produced", "spent", "decorations"];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normEntry(v: unknown): QuestEntry | null {
  if (!isObj(v) || typeof v.id !== "string" || !TEMPLATE[v.id] || !STATS.includes(v.stat as QuestStat)) return null;
  const n = (x: unknown, max: number) => (Number.isFinite(Number(x)) ? Math.min(max, Math.max(0, Math.round(Number(x)))) : 0);
  const target = n(v.target, 1e9);
  if (target < 1) return null;
  return { id: v.id, stat: v.stat as QuestStat, target, base: n(v.base, 1e15), coins: n(v.coins, 1e7), xp: n(v.xp, 1e6), sp: n(v.sp, 10), claimed: v.claimed === true };
}

/** سیوِ نامعتبر → undefined (اهداف از نو ساخته می‌شوند؛ هیچ‌وقت کرش نمی‌کند) */
export function normalizeQuests(raw: unknown): QuestState | undefined {
  if (!isObj(raw) || typeof raw.day !== "string" || !DAY_RE.test(raw.day) || typeof raw.week !== "string" || !Array.isArray(raw.daily)) return undefined;
  const daily = raw.daily.map(normEntry).filter((e): e is QuestEntry => !!e).slice(0, 3);
  const n = (x: unknown) => (Number.isFinite(Number(x)) ? Math.min(100_000, Math.max(0, Math.round(Number(x)))) : 0);
  const badges = Array.isArray(raw.badges) ? [...new Set(raw.badges.filter((b) => STREAK_BADGES.some((sb) => sb.days === b)) as number[])] : [];
  return {
    day: raw.day,
    week: typeof raw.week === "string" ? raw.week.slice(0, 10) : typeof raw.week === "number" ? String(raw.week).slice(0, 10) : "",
    daily,
    weekly: normEntry(raw.weekly),
    bonus: raw.bonus === true,
    streak: n(raw.streak),
    best: Math.max(n(raw.best), n(raw.streak)),
    lastFull: typeof raw.lastFull === "string" && DAY_RE.test(raw.lastFull) ? raw.lastFull : "",
    badges,
  };
}
