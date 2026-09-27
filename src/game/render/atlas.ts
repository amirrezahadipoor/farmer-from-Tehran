/**
 * src/game/render/atlas.ts — کشِ اسپرایت‌اطلسِ آرتِ AI (نقشه‌ی راه، فاز A/B)
 *
 * معماری:
 *  • تصاویر در public/art/atlas/*.png (تولید: tools/align-assets.py → tools/pack-atlas.py)
 *  • manifest.json کلیدِ کشِ فعلی (g|grass|spring، t|summer|b، c|wheat|7|spring|1 و…)
 *    را به ناحیه‌ی اطلس نگاشت می‌کند.
 *  • sprite() در nature.ts اول این کش را می‌پرسد؛ اگر نبود دقیقاً همان رسمِ رویه‌ایِ
 *    قبلی اجرا می‌شود — بازی هرگز سفید/شکسته دیده نمی‌شود (قاعده‌ی رودمپ).
 *  • محصولات ۲۰ پله‌ی رشد از ۵ فریمِ کلیدی می‌سازند: resolveAtlas کلیدِ q را به فریمِ
 *    کلیدیِ نزدیک + مقیاسِ میان‌یابی‌شده (cropFrame — آینه‌ی tools/pack-atlas.py) نگاشت می‌کند.
 */

import { A, B, TH, TW } from "./core";

export interface AtlasEntry {
  /** نام اطلس (کلیدِ atlases در manifest) */
  a: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** مقیاسِ ثابتِ اضافی (برای فریم‌های کلیدی) */
  s?: number;
  /** لنگر: "b" = وسطِ پایین روی مبدأ (پیش‌فرض) · "c" = وسطِ بوم (کاشی‌های زمین) */
  an?: "b" | "c";
}

export interface AtlasManifest {
  atlases: Record<string, string>;
  entries: Record<string, AtlasEntry>;
}

interface AtlasState {
  mf: AtlasManifest;
  imgs: Record<string, unknown>;
  /** هر بار که اطلس آماده می‌شود +۱ می‌شود (برای امضای کشِ زمین) */
  n: number;
}

let atlas: AtlasState | null = null;

/** آماده‌سازی از طرفِ atlasLoader (یا تست‌ها) */
export function setAtlas(mf: AtlasManifest, imgs: Record<string, unknown>): void {
  atlas = { mf, imgs, n: (atlas?.n ?? 0) + 1 };
}
export function clearAtlas(): void {
  atlas = null;
}
export function isAtlasReady(): boolean {
  return atlas !== null;
}
/** نسخه‌ی آرت: در امضای کشِ زمین می‌رود تا پس از لودِ اطلس بازسازی شود */
export function artVersion(): number {
  return atlas?.n ?? 0;
}

/** پله‌هایِ فریمِ کلیدیِ محصول (q = ۰..۲۰) */
export const CROP_KF = [0, 5, 10, 15, 20];
const CROP_SCALE_MIN = 0.62;

/**
 * فریمِ کلیدی و مقیاسِ q: فریمِ i = قعرِ بازه، مقیاس از ۰.۶۲ (نهال) تا ۱ (رسیده).
 * خالص و قطعی — tests/atlas.test.ts و tools/pack-atlas.py باید با هم هم‌خوان باشند.
 */
export function cropFrame(q: number, kf: number[] = CROP_KF): { k: number; s: number } {
  const n = kf.length - 1;
  const i = Math.max(0, Math.min(n, Math.floor(q / (20 / n))));
  if (i === n) return { k: n, s: 1 }; // رسیده: فریمِ آخر با مقیاسِ کامل
  const a = kf[i], b = kf[i + 1];
  const t = b > a ? (q - a) / (b - a) : 0;
  const sA = CROP_SCALE_MIN + (1 - CROP_SCALE_MIN) * (i / n);
  const sB = CROP_SCALE_MIN + (1 - CROP_SCALE_MIN) * ((i + 1) / n);
  return { k: i, s: sA + (sB - sA) * t };
}

const CROP_RE = /^c\|([^|]+)\|(\d+)\|([^|]+)\|(\d+)$/;

/* ---------- بلت: سه لنگر، یک منبعِ تصویر ---------- */

/** کاشیِ زمین: لوزیِ ۸۸×۴۴ با حاشیه‌ی ۰.۶ (همان رفتارِ بدون‌درزِ رویه‌ای) */
export function blitAtlasTile(ctx: CanvasRenderingContext2D, hit: AtlasHit, x: number, y: number): void {
  const e = hit.e;
  ctx.drawImage(hit.img as CanvasImageSource, e.x, e.y, e.w, e.h, x - A - 0.6, y - B - 0.6, TW + 1.2, TH + 1.2);
}

/** داخلِ sprite(): مختصاتِ محلی (تبدیلِ SS تنظیم‌شده) — لنگرِ پیش‌فرض: وسطِ پایین روی مبدأ */
export function blitAtlas(ctx: CanvasRenderingContext2D, hit: AtlasHit, x0: number, y0: number, w: number, h: number): void {
  const e = hit.e;
  if (e.an === "c") {
    ctx.drawImage(hit.img as CanvasImageSource, e.x, e.y, e.w, e.h, x0, y0, w, h);
    return;
  }
  let dw = w * hit.s, dh = h * hit.s;
  const f = Math.min(1, w / dw, -y0 / dh); // جا در جعبه‌ی اسپرایت (بالای مبدأ)
  dw *= f;
  dh *= f;
  ctx.drawImage(hit.img as CanvasImageSource, e.x, e.y, e.w, e.h, -dw / 2, -dh, dw, dh);
}

/** صحنه‌ی اصلی: وسطِ پایین روی نقطه‌ی جهانی (ساختمان‌ها) */
export function blitAtlasWorld(ctx: CanvasRenderingContext2D, hit: AtlasHit, x: number, y: number, w: number, h: number): void {
  let dw = w * hit.s, dh = h * hit.s;
  ctx.drawImage(hit.img as CanvasImageSource, hit.e.x, hit.e.y, hit.e.w, hit.e.h, x - dw / 2, y - dh, dw, dh);
}

export interface AtlasHit {
  img: unknown;
  e: AtlasEntry;
  /** مقیاسِ نهایی (ثابت × میان‌یابیِ رشد) */
  s: number;
}


/**
 * یافتنِ ناحیه‌ی اطلس برای کلیدِ کش. کلیدهایِ محصول (c|…) با qِ بینِ پله‌هایِ کلیدی
 * به فریمِ کلیدیِ پایین‌تر + مقیاسِ cropFrame(q) نگاشت می‌شوند.
 */
export function resolveAtlas(key: string): AtlasHit | null {
  if (!atlas) return null;
  const m = CROP_RE.exec(key);
  if (m) {
    // محصولات همیشه از فریمِ کلیدی + مقیاسِ رشد می‌گیرند (حتی اگر کلیدِ دقیق در manifest هست)
    const q = Number(m[2]);
    const { k, s } = cropFrame(q);
    const ke = atlas.mf.entries[`c|${m[1]}|${CROP_KF[k]}|${m[3]}|${m[4]}`];
    if (ke) return { img: atlas.imgs[ke.a], e: ke, s: (ke.s ?? 1) * s };
    return null;
  }
  const e = atlas.mf.entries[key];
  if (e) return { img: atlas.imgs[e.a], e, s: e.s ?? 1 };
  return null;
}
