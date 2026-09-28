/**
 * src/game/sim/sanitize.ts — پاک‌سازِ مشترکِ سیو (P5.1 → P5.13)
 *
 * هر سیو — محلی، پشتیبان، ابری و حالا ورودیِ سرور در POST /api/save — از همین فیلتر
 * می‌گذرد: JSON نیمه‌خراب نجات داده می‌شود، عددهای بی‌معنا سالم می‌شوند و کلیدهای ناشناخته
 * دور ریخته می‌شوند. ماژول خالص است (بدون "use client"، بدون DOM) تا سرور و کلاینت
 * دقیقاً یک کد را اجرا کنند.
 */
import { migrate, newStoryState, type State, type Tile } from "./state";
import { newState } from "./economy";
import { normalizeQuests } from "./quests";
import { normalizeGenerations } from "./legacy";
import { normalizeLineage } from "./lineage";
import { ITEMS, N, CH, WEATHER_TYPES } from "../data";
import { asGender } from "../gender";
import { rng } from "./rng";

const NCH = Math.ceil(N / CH);

/** کلیدهای مجازِ ریشه‌ی سیو: هرچه newState دارد + فیلدهای اختیاری (تنبل: ساختِ نقشه فقط یک بار) */
let stateKeys: Set<string> | null = null;
/**
 * کلیدهای اختیاریِ State که در newState() نیستند. هر فیلدِ اختیاریِ تازه باید این‌جا بیاید،
 * وگرنه فیلترِ پایانی (P5.13) آن را در هر بارگذاری پاک می‌کند — همان باگی که انتخابِ جشن (fest)
 * و پاداشِ «اولین برداشتِ روز» (bonusDay) را با هر رفرش از بین می‌برد.
 */
export const OPTIONAL_STATE_KEYS = ["xpAcc", "quests", "generations", "lineage", "bonusDay", "fest"] as const;
const allowedKeys = () => (stateKeys ??= new Set<string>([...Object.keys(newState()), ...OPTIONAL_STATE_KEYS]));

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** عدد متناهی و در محدوده‌ی معقول (جلوی NaN/Infinity/رشد بی‌نهایت را می‌گیرد) */
/**
 * Number() روی شمول/تابع/نشانه استثنا می‌دهد؛ sanitizeSave باید برای هر ورودی‌ای
 * (حتی از یک کلاینتِ خراب) پاسخ بدهد، نه اینکه ۵۰۰ بدهد. این نسخه هرگز throw نمی‌کند.
 */
function toNum(v: unknown): number {
  try {
    return Number(v as number);
  } catch {
    return NaN;
  }
}

function num(v: unknown, fallback: number, min = -1e12, max = 1e12): number {
  const n = typeof v === "number" ? v : toNum(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function intOr(v: unknown, fallback: number, min = 0, max = 1e6): number {
  return Math.round(num(v, fallback, min, max));
}

/**
 * `migrate` فقط ستون‌های اصلی را چک می‌کند و روی داده‌ی نیمه‌خراب (مثلاً
 * `market: null` یا کاشی‌های ناقص) استثنا می‌اندازد. این تابع یک لایه‌ی دفاعی
 * است: هر فیلدی که نامعتبر باشد با مقدار سالم جایگزین می‌شود و اگر ساختار پایه
 * قابل نجات نباشد `null` برمی‌گردد.
 */
export function sanitizeSave(raw: unknown): State | null {
  if (!isObj(raw)) return null;
  if (raw.v !== 5) return null; // نسخه‌ی ناشناخته: مهاجرت معنادار نیست

  const tiles = Array.isArray(raw.tiles) ? raw.tiles : null;
  if (!tiles || tiles.length !== N * N) return null;

  // `migrate` روی ستون‌های کمکی (مثل `market: null`) استثنا می‌اندازد؛ قبل از صدا
  // زدنش آن‌ها را به شکل سالم درمی‌آوریم تا سیوِ نیمه‌خراب قابل نجات باشد.
  const pre = { ...raw };
  if (!isObj(pre.market)) pre.market = {};
  if (!Array.isArray(pre.chunks)) pre.chunks = new Array(NCH * NCH).fill(false);
  if (!Array.isArray(pre.orders)) pre.orders = [];
  if (!Array.isArray(pre.workers)) pre.workers = [];
  if (!isObj(pre.achievements)) pre.achievements = {};
  if (!isObj(pre.inv)) pre.inv = {};
  if (!isObj(pre.stats)) pre.stats = {};
  if (!isObj(pre.story)) pre.story = newStoryState();

  let s: State | null = null;
  try {
    s = migrate(pre);
  } catch {
    return null; // ساختار پایه قابل نجات نبود
  }
  if (!s) return null;

  // ── اعداد: هر NaN / Infinity / مقدار بی‌معنا با مقدار سالم عوض می‌شود
  s.coins = Math.round(num(s.coins, 400, 0));
  s.xp = Math.round(num(s.xp, 0, 0));
  s.level = Math.max(1, intOr(s.level, 1, 1, 1000));
  s.prestige = intOr(s.prestige, 0, 0, 999);
  s.day = intOr(s.day, 1, 1, 1e6);
  s.time = num(s.time, 0, 0, 1e9);
  s.weatherLeft = num(s.weatherLeft, 0, 0, 1e6);
  s.rep = intOr(s.rep, 0, 0, 1e6);
  s.savedAt = intOr(s.savedAt, 0, 0, 4e12);
  s.nextId = intOr(s.nextId, 1, 1, 1e9);
  s.bought = intOr(s.bought, 0, 0, 1e6);
  s.wAcc = num(s.wAcc, 0, 0, 1e6);
  s.histAcc = num(s.histAcc, 0, 0, 1e6);
  s.eventAcc = num(s.eventAcc, 0, 0, 1e6);
  if (typeof s.weather !== "string" || !(WEATHER_TYPES as readonly string[]).includes(s.weather)) s.weather = "sun";
  if (s.currentEvent !== null && !isObj(s.currentEvent)) s.currentEvent = null;

  // ── کاشی‌ها: هر کاشی نامعتبر به چمنِ خالی تبدیل می‌شود (زمین بازی «گم» نمی‌شود)
  const KINDS = new Set(["grass", "soil", "tree", "rock", "water", "bld"]);
  s.tiles = s.tiles.map((t, i): Tile => {
    if (!isObj(t)) return { k: "grass", v: 0 };
    const raw2 = t as unknown as Record<string, unknown>;
    const k = typeof raw2.k === "string" && KINDS.has(raw2.k) ? (raw2.k as Tile["k"]) : "grass";
    const tile: Tile = { k, v: intOr(raw2.v, i, 0, 1e6) };
    if (Number.isFinite(toNum(raw2.g))) tile.g = num(raw2.g, 0, 0, 1e9);
    if (typeof raw2.crop === "string" && raw2.crop) tile.crop = raw2.crop;
    if (typeof raw2.b === "string" && raw2.b) tile.b = raw2.b;
    if (raw2.wet === true) tile.wet = true;
    if (raw2.fert === true) tile.fert = true;
    if (Number.isFinite(toNum(raw2.q))) tile.q = [intOr(raw2.q, 0, 0, 1e6)];
    if (raw2.autoMode === true) tile.autoMode = true;
    return tile;
  });

  // ── نقشه‌ی بازار: اگر نبود، از صفر ساخته می‌شود (نه استثنا)
  if (!isObj(s.market)) s.market = {};
  Object.keys(ITEMS).forEach((k) => {
    const m = (s.market as Record<string, unknown>)[k];
    if (!isObj(m)) {
      (s.market as Record<string, unknown>)[k] = { sat: 0, hist: [], ph: rng() * 6.28 };
      return;
    }
    m.sat = num(m.sat, 0, -1e6, 1e6);
    m.ph = num(m.ph, 0, -1e6, 1e6);
    if (!Array.isArray(m.hist)) m.hist = [];
    else m.hist = m.hist.filter((v) => Number.isFinite(v)).slice(-64);
  });

  // ── انبار و آمار
  if (!isObj(s.inv)) s.inv = {};
  s.inv = Object.fromEntries(
    Object.entries(s.inv)
      .filter(([k, v]) => k in ITEMS && Number.isFinite(toNum(v)))
      .map(([k, v]) => [k, Math.max(0, Math.round(toNum(v)))])
  );
  const statKeys = ["earned", "harvested", "orders", "produced", "spent", "animals", "decorations", "skillPoints"] as const;
  if (!isObj(s.stats)) s.stats = { earned: 0, harvested: 0, orders: 0, produced: 0, spent: 0, animals: 0, decorations: 0, skillPoints: 0 };
  statKeys.forEach((k) => {
    s.stats[k] = intOr((s.stats as unknown as Record<string, unknown>)[k], 0, 0);
  });

  // ── فهرست‌ها: هر عضو نامعتبر حذف می‌شود (تکِ نامعلوم باعث کرش استخراج نمی‌شود)
  const safeIds = (list: unknown, max = 200): string[] =>
    Array.isArray(list) ? [...new Set(list.filter((x): x is string => typeof x === "string" && x.length > 0))].slice(0, max) : [];
  s.techs = safeIds(s.techs);
  s.skills = safeIds(s.skills);
  s.chunks = Array.isArray(s.chunks) && s.chunks.length === NCH * NCH ? s.chunks.map(Boolean) : new Array(NCH * NCH).fill(false);
  s.orders = Array.isArray(s.orders) ? s.orders.filter((o) => isObj(o)).slice(0, 50) : [];
  s.workers = Array.isArray(s.workers) ? s.workers.filter((w) => isObj(w)).slice(0, 50) : [];
  if (!isObj(s.achievements)) s.achievements = {};
  // V.5: فستیوال فصلی — ساختار خراب یعنی «بدون فستیوال» (بازی هرگز قفل نمی‌شود)
  if (!isObj(s.fest)) s.fest = undefined;
  else {
    const f = s.fest as Record<string, unknown>;
    const choice = typeof f.choice === "string" && (["invest", "feast", "rest"] as string[]).includes(f.choice) ? (f.choice as "invest" | "feast" | "rest") : null;
    s.fest = { idx: intOr(f.idx, 0, 0, 3), day: intOr(f.day, 1, 1, 1e6), choice };
    // پیشنهادِ بی‌جوابِ روزِ اول (قاعده‌ی قدیمی، روی آموزش باز می‌شد) کنار گذاشته می‌شود
    if (s.fest.choice === null && s.fest.day <= 1) s.fest = undefined;
  }
  // V.7: روزِ آخرین پاداشِ «اولین برداشتِ روز» — بدونِ ماندگاری، هر رفرش پاداش را دوباره می‌داد
  if (s.bonusDay !== undefined) s.bonusDay = intOr(s.bonusDay, 0, 0, 1e6);
  // V.8: مقدار دستاورد یا true قدیمی است یا شماره‌ی روز (سازگار با هر دو)
  s.achievements = Object.fromEntries(
    Object.entries(s.achievements)
      .filter(([, v]) => v === true || (typeof v === "number" && Number.isFinite(v) && v >= 1))
      .map(([k, v]) => [k, v === true ? true : intOr(v, 1, 1, 1e6)])
  );

  // ── داستان: اگر مرحله/صحنه بیرون از محدوده باشد، به ابتدای همان فصل برمی‌گردد
  if (!isObj(s.story)) s.story = newStoryState();
  s.story.name = typeof s.story.name === "string" ? s.story.name.slice(0, 24) : "";
  s.story.gender = asGender(s.story.gender); // مورد ۷: سیوِ قدیمی = خطابِ خنثی
  s.story.chapter = intOr(s.story.chapter, 0, 0, 99);
  s.story.sceneIdx = intOr(s.story.sceneIdx, 0, 0, 999);
  if (s.story.phase !== "scenes" && s.story.phase !== "goal" && s.story.phase !== "end") s.story.phase = "scenes";
  if (!Array.isArray(s.story.completed)) s.story.completed = [];
  s.story.done = s.story.done === true;

  // ── P6.2: اهدافِ نامعتبر حذف و از نو ساخته می‌شوند
  const quests = normalizeQuests((s as { quests?: unknown }).quests);
  if (quests) s.quests = quests;
  else delete s.quests;
  // ── P6.3: شجره‌نامه
  const gens = normalizeGenerations((s as { generations?: unknown }).generations);
  if (gens) s.generations = gens;
  else delete s.generations;
  // ── P6.4: داستانِ نسل‌ها
  const lineage = normalizeLineage((s as { lineage?: unknown }).lineage);
  if (lineage) s.lineage = lineage;
  else delete s.lineage;

  // ── P5.13: فقط کلیدهای شناخته‌شده‌ی State می‌مانند؛ سرور نمی‌تواند انبارِ دادهِ دلخواه شود
  const allowed = allowedKeys();
  for (const k of Object.keys(s)) if (!allowed.has(k)) delete (s as unknown as Record<string, unknown>)[k];

  return s;
}
