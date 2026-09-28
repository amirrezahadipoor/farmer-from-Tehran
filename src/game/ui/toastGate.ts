/**
 * src/game/ui/toastGate.ts — دروازه‌ی توست‌ها (B/T3 — بازخوردِ «اخطارهای متنیِ زیاد»)
 *
 * منطقِ خالص و تست‌پذیر: چه پیامی حقِ نمایش دارد؟
 *  • همان متنِ تکراری در پنجره‌ی کوتاه پخش نمی‌شود (لرزشِ هپتیک و صدا هم پشتِ همین دروازه‌اند)
 *  • پنجره بر اساسِ نوع: خطا و سطح ۴ ثانیه · موفقیت ۱۰ ثانیه · راهنما ۴۵ ثانیه
 *    (راهنماهای ابزار با هر ضربه‌ی اشتباه می‌آمدند و شلوغیِ اصلی از همین‌جا بود)
 *  • حافظه فقط یک ردیف است (آخرین پیام) — چیزی رشد نمی‌کند
 */

export interface GateMemory {
  /** متنِ پیام‌های اخیر → زمانِ آخرین نمایش (LRU با سقفِ GATE_MAX_KEYS) */
  recent: Map<string, number>;
}

/** پنجره‌ی سکوت (میلی‌ثانیه) برای هر نوعِ پیام */
export const TOAST_WINDOW_MS: Record<string, number> = {
  err: 4_000,
  lvl: 4_000,
  prestige: 4_000,
  ok: 10_000,
  info: 45_000,
};

export const newGate = (): GateMemory => ({ recent: new Map() });

/** سقفِ حافظه: پیام‌های کهنه‌تر فراموش می‌شوند تا نشستِ طولانی رشد نکند (C/T4) */
export const GATE_MAX_KEYS = 6;

/** آیا این پیام right now حقِ نمایش دارد؟ (خالص؛ حافظه را خودش به‌روز می‌کند) */
export function pass(g: GateMemory, text: string, type: string, now: number): boolean {
  const windowMs = TOAST_WINDOW_MS[type] ?? 10_000;
  const at = g.recent.get(text);
  if (at !== undefined && now - at < windowMs) return false;
  g.recent.delete(text); // درجِ دوباره = تازه‌ترین در ترتیبِ LRU
  g.recent.set(text, now);
  while (g.recent.size > GATE_MAX_KEYS) {
    const oldest = g.recent.keys().next();
    if (oldest.done) break;
    g.recent.delete(oldest.value);
  }
  return true;
}
