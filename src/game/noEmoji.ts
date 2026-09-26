/**
 * src/game/noEmoji.ts — قاعده‌ی پروژه (P5.16): هیچ ایموجی‌ای در بازی، اسناد و ابزارها نیست.
 * همه‌ی نمادها SVG دست‌سازند (icons.tsx). این ماژول فقط نگهبانِ ورودی‌های بیرونی است
 * (نامی که بازیکن تایپ می‌کند، سیوهای قدیمی) و tests/no-emoji.test.ts همین الگو را
 * روی تک‌تکِ فایل‌های مخزن اجرا می‌کند.
 */

/** هر نماد تصویری یونیکد + دنباله‌های ZWJ، به‌علاوه‌ی «انتخاب‌گرِ نمایش ایموجی» و کی‌کپ */
export const EMOJI_RE = /(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*|[\uFE0F\u20E3])/gu;

/** حذفِ ایموجی بدون دست‌زدن به فاصله‌ها (برای ورودیِ در حالِ تایپ) */
export const dropEmoji = (s: string) => s.replace(EMOJI_RE, "");

/** حذفِ ایموجی + جمع‌کردنِ فاصله‌های اضافه (برای متنِ نهایی) */
export const stripEmoji = (s: string) => dropEmoji(s).replace(/\s{2,}/g, " ").trim();

export const hasEmoji = (s: string) => new RegExp(EMOJI_RE.source, "u").test(s);
