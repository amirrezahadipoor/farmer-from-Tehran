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

import type { State } from "./logic";
import { N } from "./data";

export const SAVE_KEY = "farm_save";
export const BROKEN_KEY = "farm_save_broken";
/** پشتیبانِ خودکار: آخرین سیوِ سالمِ قبل از سیوِ فعلی (یک نوبت عقب‌تر) */
export const BACKUP_KEY = "farm_save_bak";
export const PID_KEY = "farm_pid";
/** P5.13: توکنِ ۲۵۶ بیتیِ این دستگاه؛ سیوِ ابری فقط با آن خوانده/نوشته می‌شود */
export const TOKEN_KEY = "farm_token";
export const TOKEN_HEADER = "x-farm-token";

export interface LoadOutcome {
  /** سیوِ سالم (یا `null` اگر هیچ سیوی نبود) */
  state: State | null;
  /** سیوِ خراب پیدا و قرنطینه شد */
  corrupt: boolean;
  /** منبع سیوی که برنده شد: محلی، پایگاه‌داده‌ی مرورگر (IndexedDB، مورد ۳)، پشتیبانِ خودکار یا ابری */
  source: "local" | "idb" | "backup" | "cloud" | null;
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

// P5.13: پاک‌سازِ سیو به ماژولِ خالصِ مشترک رفت تا سرور (api/save) هم دقیقاً همان را اجرا کند
import { sanitizeSave } from "./sim/sanitize";
import { STATIC_BUILD, asset } from "./base";
import { IDB_BACKUP, IDB_SAVE, idbDel, idbGet, idbRotateSave } from "./idb";
export { sanitizeSave };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

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
    return { state: null, corrupt: true, source: null, note: "سیوِ محلی نیمه‌کاره نوشته شده بود" };
  }

  const state = sanitizeSave(parsed);
  if (!state) {
    quarantine(raw);
    return { state: null, corrupt: true, source: null, note: "ساختار سیوِ محلی نامعتبر بود" };
  }
  return { state, corrupt: false, source: "local", note: "سیوِ محلی سالم" };
}

/* ------------------------ پشتیبانِ خودکار (چرخشی) ------------------------ */

/** بررسی ارزان: آیا این متن یک سیوِ کامل و قابل‌بارگذاری است؟ */
function looksLikeSave(raw: string): boolean {
  try {
    const o = JSON.parse(raw) as { v?: unknown; tiles?: unknown };
    return isObj(o) && o.v === 5 && Array.isArray(o.tiles) && o.tiles.length === N * N;
  } catch {
    return false;
  }
}

/**
 * نوشتن سیوِ محلی با «پشتیبانِ چرخشی»: پیش از بازنویسی، نسخه‌ی سالمِ قبلی به
 * `farm_save_bak` منتقل می‌شود. اگر سیوِ اصلی بعداً خراب شود (خاموشیِ ناگهانی وسط
 * نوشتن، باگ، دستکاری)، پیشرفتِ بازیکن حداکثر یک نوبتِ ذخیره (≈۱۲ ثانیه) عقب می‌رود.
 * هرگز پرتاب نمی‌کند.
 */
export function writeLocalSave(json: string): boolean {
  try {
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev && prev !== json && looksLikeSave(prev)) localStorage.setItem(BACKUP_KEY, prev);
  } catch {
    /* حافظه پر — پشتیبان این نوبت رد می‌شود، سیوِ اصلی مهم‌تر است */
  }
  // مورد ۳: همین سیو در IndexedDB هم (ناهم‌زمان، با پشتیبانِ چرخشیِ خودش)
  void idbRotateSave(json);
  try {
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

/** سیوِ IndexedDB (و اگر خراب بود، پشتیبانِ همان‌جا) را می‌خواند (مورد ۳). */
export async function readIdbSave(): Promise<LoadOutcome> {
  const tries = [
    [IDB_SAVE, "idb", "سیوِ پایگاه‌داده‌ی مرورگر سالم"],
    [IDB_BACKUP, "backup", "از پشتیبانِ پایگاه‌داده‌ی مرورگر بازیابی شد"],
  ] as const;
  for (const [key, source, note] of tries) {
    const raw = await idbGet(key);
    if (!raw) continue;
    try {
      const state = sanitizeSave(JSON.parse(raw));
      if (state) return { state, corrupt: false, source, note };
    } catch {
      /* نسخه‌ی بعدی */
    }
  }
  return { state: null, corrupt: false, source: null, note: "پایگاه‌داده‌ی مرورگر خالی است" };
}

/** همه‌ی نسخه‌های سیوِ این دستگاه را پاک می‌کند («شروع دوباره»). */
export function clearAllSaves(): void {
  dropLS(SAVE_KEY);
  dropLS(BACKUP_KEY);
  void idbDel(IDB_SAVE, IDB_BACKUP);
}

export type PersistState = "granted" | "denied" | "unsupported";

/**
 * درخواستِ حافظه‌ی ماندگار (مورد ۳): مرورگر زیرِ فشارِ فضا یا بعد از مدتی بی‌استفادگی سیو را پاک نمی‌کند.
 * ask=false فقط وضعیت را می‌پرسد (بی‌پنجره‌ی اجازه).
 */
export const PERSIST_KEY = "farm_persist";

export async function requestPersistence(ask = true): Promise<PersistState> {
  const r = await persistState(ask);
  if (ask) writeLS(PERSIST_KEY, r); // نتیجه‌ی آخرین درخواست (پنلِ «انتقال و پشتیبان» و تست)
  return r;
}

async function persistState(ask: boolean): Promise<PersistState> {
  const s = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!s?.persisted) return "unsupported";
  try {
    if (await s.persisted()) return "granted";
    if (!ask || !s.persist) return "denied";
    return (await s.persist()) ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

/** پشتیبانِ خودکار را می‌خواند (اگر سالم باشد). */
export function readBackupSave(): LoadOutcome {
  const raw = readLS(BACKUP_KEY);
  if (!raw) return { state: null, corrupt: false, source: null, note: "پشتیبانی موجود نیست" };
  try {
    const state = sanitizeSave(JSON.parse(raw));
    if (state) return { state, corrupt: false, source: "backup", note: "از پشتیبانِ خودکار بازیابی شد" };
  } catch {
    /* پایین */
  }
  return { state: null, corrupt: false, source: null, note: "پشتیبان هم سالم نبود" };
}

/**
 * سیوِ محلی را می‌خواند و اگر خراب بود، خودکار سراغ پشتیبانِ چرخشی می‌رود.
 * پرچم `corrupt` حفظ می‌شود تا UI صادقانه به بازیکن بگوید چه شد.
 */
export function readLocalWithBackup(): LoadOutcome {
  const local = readLocalSave();
  if (!local.corrupt) return local;
  const bak = readBackupSave();
  if (bak.state) return { ...bak, corrupt: true, note: `${local.note}؛ پیشرفتت از پشتیبانِ خودکار برگشت` };
  return local;
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
  if (STATIC_BUILD) return { state: null, corrupt: false, source: null, note: "نسخه‌ی دمو: ذخیره فقط روی همین دستگاه" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(asset(`/api/save?id=${encodeURIComponent(id)}`), {
      signal: controller.signal,
      headers: { [TOKEN_HEADER]: ensureFarmToken() },
    });
    if (res.status === 403) return { state: null, corrupt: false, source: null, note: "سیو ابری با توکنِ این دستگاه باز نمی‌شود" };
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

/** توکنِ تصادفیِ این دستگاه (۶۴ رقمِ هگز)؛ یک‌بار ساخته و نگه داشته می‌شود. */
export function ensureFarmToken(): string {
  const cur = readLS(TOKEN_KEY);
  if (cur && /^[a-f0-9]{64}$/.test(cur)) return cur;
  const bytes = new Uint8Array(32);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  const tok = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  writeLS(TOKEN_KEY, tok);
  return tok;
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
