/**
 * src/game/transferCode.ts — قالبِ کدِ انتقالِ کوتاه، مشترکِ کلاینت و سرور (نقشه‌ی راه، مورد ۳)
 * ۸ نویسه از الفبای ۳۲تایی بدونِ O/0 و I/1 (≈۴۰ بیت)، یک‌بارمصرف، با سقفِ نرخ و ۲۴ ساعت اعتبار.
 */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LEN = 8;
export const CODE_TTL_MS = 24 * 3600 * 1000;
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

/** ورودیِ کاربر: فاصله و خط تیره حذف، حروف بزرگ؛ نامعتبر = null */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_RE.test(c) ? c : null;
}

/** نمایشِ خوانا: ABCD-EFGH */
export const formatCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;
