"use client";

/**
 * src/game/persist.ts — لایه‌ی خواندن سیو با «درمان» (P5.1)
 *
 * مسئله‌ای که حل می‌کند:
 *  • قبلاً `JSON.parse(localStorage.farm_save)` بدون try/catch بود؛ یک کاراکتر خراب
 *    در سیو باعث پرتاب استثنا داخل useEffect می‌شد و بازی برای همیشه روی اسپلش
 *    قفل می‌ماند (مانع انتشار ریویو: «قفل ابدی»).
 *  • حالا هر سیو (محلی یا ابری) از فیلترِ `sanitizeSave` می‌گذرد: اگر JSON خراب باشد
 *    یا شکلِ داده نامعتبر باشد، سیوِ معیوب در `farm_save_broken` قرنطینه می‌شود
 *    (برای پشتیبانی)، حذف می‌شود و بازی با «شروع تازه» بالا می‌آید + به بازیکن
 *    گزارش صادقانه نشان داده می‌شود.
 */

import { migrate, newStoryState, type State, type Tile } from "./logic";
import { ITEMS, N, CH, WEATHER_TYPES } from "./data";

const NCH = Math.ceil(N / CH);

export const SAVE_KEY = "farm_save";
export const BROKEN_KEY = "farm_save_broken";
export const PID_KEY = "farm_pid";

export interface LoadOutcome {
  /** سیوِ سالم (یا `null` اگر هیچ سیوی نبود) */
  state: State | null;
  /** سیوِ خراب پیدا و قرنطینه شد */
  corrupt: boolean;
  /** منبع سیوی که برنده شد: محلی یا ابری */
  source: "local" | "cloud" | null;
  /** توضیح خوانا برای UI/لاگ */
  note: string;
}

/* --------------------------- حافظه‌ی ایمن (LS) --------------------------- */

/**
 * در حالت مرور خصوصی یا وقتی حافظه پر است، هر دسترسی به localStorage می‌تواند
 * استثنا بیندازد. این سه تابع هرگز پرتاب نمی‌کنند تا بازی روی صفحه‌ی اسپلش قفل نشود.
 */
export function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLS(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function dropLS(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ------------------------------ اعتبارسنجی ------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** عدد متناهی و در محدوده‌ی معقول (جلوی NaN/Infinity/رشد بی‌نهایت را می‌گیرد) */
function num(v: unknown, fallback: number, min = -1e12, max = 1e12): number {
  const n = typeof v === "number" ? v : Number(v);
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
  if (!(WEATHER_TYPES as readonly string[]).includes(String(s.weather))) s.weather = "sun";
  if (s.currentEvent !== null && !isObj(s.currentEvent)) s.currentEvent = null;

  // ── کاشی‌ها: هر کاشی نامعتبر به چمنِ خالی تبدیل می‌شود (زمین بازی «گم» نمی‌شود)
  const KINDS = new Set(["grass", "soil", "tree", "rock", "water", "bld"]);
  s.tiles = s.tiles.map((t, i): Tile => {
    if (!isObj(t)) return { k: "grass", v: 0 };
    const raw2 = t as unknown as Record<string, unknown>;
    const k = KINDS.has(String(raw2.k)) ? (raw2.k as Tile["k"]) : "grass";
    const tile: Tile = { k, v: intOr(raw2.v, i, 0, 1e6) };
    if (Number.isFinite(Number(raw2.g))) tile.g = num(raw2.g, 0, 0, 1e9);
    if (typeof raw2.crop === "string" && raw2.crop) tile.crop = raw2.crop;
    if (typeof raw2.b === "string" && raw2.b) tile.b = raw2.b;
    if (raw2.wet === true) tile.wet = true;
    if (raw2.fert === true) tile.fert = true;
    if (Number.isFinite(Number(raw2.q))) tile.q = [intOr(raw2.q, 0, 0, 1e6)];
    if (raw2.autoMode === true) tile.autoMode = true;
    return tile;
  });

  // ── نقشه‌ی بازار: اگر نبود، از صفر ساخته می‌شود (نه استثنا)
  if (!isObj(s.market)) s.market = {};
  Object.keys(ITEMS).forEach((k) => {
    const m = (s.market as Record<string, unknown>)[k];
    if (!isObj(m)) {
      (s.market as Record<string, unknown>)[k] = { sat: 0, hist: [], ph: Math.random() * 6.28 };
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
      .filter(([k, v]) => k in ITEMS && Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Math.max(0, Math.round(Number(v)))])
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
  s.achievements = Object.fromEntries(Object.entries(s.achievements).filter(([, v]) => v === true));

  // ── داستان: اگر مرحله/صحنه بیرون از محدوده باشد، به ابتدای همان فصل برمی‌گردد
  if (!isObj(s.story)) s.story = newStoryState();
  s.story.name = typeof s.story.name === "string" ? s.story.name.slice(0, 24) : "";
  s.story.chapter = intOr(s.story.chapter, 0, 0, 99);
  s.story.sceneIdx = intOr(s.story.sceneIdx, 0, 0, 999);
  if (s.story.phase !== "scenes" && s.story.phase !== "goal" && s.story.phase !== "end") s.story.phase = "scenes";
  if (!Array.isArray(s.story.completed)) s.story.completed = [];
  s.story.done = s.story.done === true;

  return s;
}

/* --------------------------- خواندن سیوِ محلی --------------------------- */

/** اگر داده‌ی خام قابل تجزیه نبود، آن را قرنطینه می‌کند (پشتیبان برای دیباگ) و برمی‌گرداند. */
export function quarantine(raw: string): void {
  try {
    localStorage.setItem(BROKEN_KEY, JSON.stringify({ at: Date.now(), raw: String(raw).slice(0, 200_000) }));
  } catch {
    /* حافظه پر — بی‌اهمیت */
  }
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** سیوِ محلی را می‌خواند؛ خرابی را می‌گیرد و قرنطینه می‌کند. هرگز پرتاب نمی‌کند. */
export function readLocalSave(): LoadOutcome {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { state: null, corrupt: false, source: null, note: "حافظه در دسترس نیست" };
  }
  if (!raw) return { state: null, corrupt: false, source: null, note: "سیو محلی وجود ندارد" };

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantine(raw);
    return { state: null, corrupt: true, source: null, note: "JSON سیوِ محلی خراب بود" };
  }

  const state = sanitizeSave(parsed);
  if (!state) {
    quarantine(raw);
    return { state: null, corrupt: true, source: null, note: "شکل سیوِ محلی نامعتبر بود" };
  }
  return { state, corrupt: false, source: "local", note: "سیوِ محلی سالم" };
}

/** آخرین نسخه‌ی قرنطینه‌شده (برای دکمه‌ی «بازیابی» در تنظیمات). */
export function readQuarantined(): { at: number; raw: string } | null {
  try {
    const raw = localStorage.getItem(BROKEN_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { at?: number; raw?: string };
    return { at: Number(o.at) || 0, raw: String(o.raw ?? "") };
  } catch {
    return null;
  }
}

/** تلاش می‌کند سیوِ قرنطینه‌شده را بازیابی کند (اگر واقعاً فقط JSON خراب بوده). */
export function restoreQuarantined(): LoadOutcome {
  const q = readQuarantined();
  if (!q) return { state: null, corrupt: false, source: null, note: "پشتیبانی موجود نیست" };
  try {
    const state = sanitizeSave(JSON.parse(q.raw));
    if (!state) return { state: null, corrupt: true, source: null, note: "پشتیبان هم سالم نبود" };
    return { state, corrupt: false, source: "local", note: "از پشتیبان بازیابی شد" };
  } catch {
    return { state: null, corrupt: true, source: null, note: "پشتیبان قابل تجزیه نبود" };
  }
}

/* ---------------------------- خواندن سیوِ ابری ---------------------------- */

/** سیوِ ابری را با مهلت زمانی می‌خواند؛ هر خطا (آفلاین، ۵۰۰، JSON خراب) = `null`. */
export async function fetchCloudSave(id: string, timeoutMs = 7000): Promise<LoadOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/save?id=${encodeURIComponent(id)}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: unknown };
    if (!body?.data) return { state: null, corrupt: false, source: null, note: "سیو ابری خالی است" };
    const state = sanitizeSave(body.data);
    if (!state) return { state: null, corrupt: false, source: null, note: "سیو ابری نامعتبر بود (نادیده گرفته شد)" };
    return { state, corrupt: false, source: "cloud", note: "سیو ابری سالم" };
  } catch {
    return { state: null, corrupt: false, source: null, note: "سیو ابری در دسترس نبود" };
  } finally {
    clearTimeout(timer);
  }
}

/** بین سیوِ محلی و ابری، تازه‌تر را انتخاب می‌کند. */
export function pickNewer(a: LoadOutcome, b: LoadOutcome): LoadOutcome {
  if (!a.state && !b.state) return { state: null, corrupt: a.corrupt || b.corrupt, source: null, note: a.note };
  if (!a.state) return { ...b, corrupt: a.corrupt };
  if (!b.state) return { ...a, corrupt: a.corrupt || b.corrupt };
  return a.state.savedAt >= b.state.savedAt ? { ...a, corrupt: a.corrupt || b.corrupt } : { ...b, corrupt: a.corrupt || b.corrupt };
}

/** ساخت شناسه‌ی یکتای بازیکن (یک‌بار برای همیشه). */
export function ensurePlayerId(): string {
  try {
    const cur = localStorage.getItem(PID_KEY);
    if (cur) return cur;
    const id = "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(PID_KEY, id);
    return id;
  } catch {
    return "p_" + Math.random().toString(36).slice(2);
  }
}
