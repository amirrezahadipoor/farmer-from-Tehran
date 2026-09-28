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
  last: { text: string; at: number } | null;
}

/** پنجره‌ی سکوت (میلی‌ثانیه) برای هر نوعِ پیام */
export const TOAST_WINDOW_MS: Record<string, number> = {
  err: 4_000,
  lvl: 4_000,
  prestige: 4_000,
  ok: 10_000,
  info: 45_000,
};

export const newGate = (): GateMemory => ({ last: null });

/** آیا این پیام right now حقِ نمایش دارد؟ (خالص؛ memory را خودش به‌روز می‌کند) */
export function pass(g: GateMemory, text: string, type: string, now: number): boolean {
  const windowMs = TOAST_WINDOW_MS[type] ?? 10_000;
  if (g.last && g.last.text === text && now - g.last.at < windowMs) return false;
  if (g.last) {
    g.last.text = text;
    g.last.at = now;
  } else {
    g.last = { text, at: now };
  }
  return true;
}
