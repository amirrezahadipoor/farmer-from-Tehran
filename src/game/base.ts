/**
 * src/game/base.ts — مسیرِ پایه‌ی انتشار (نقشه‌ی راه، مورد ۲)
 *
 * روی سرورِ خودمان BASE خالی است. روی GitHub Pages سایت زیرِ «/farmer-from-Tehran» می‌نشیند و هر
 * آدرسِ مطلقِ پوشه‌ی public (تصویر، فونت، SW، manifest، API) باید همین پیشوند را بگیرد.
 * هر دو مقدار هنگامِ build در کد ثابت می‌شوند (NEXT_PUBLIC_*).
 */
export const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** نسخه‌ی ایستای دمو: API ندارد و ذخیره فقط روی دستگاه است (بی‌هیچ درخواستِ شبکه‌ی بی‌نتیجه). */
export const STATIC_BUILD = process.env.NEXT_PUBLIC_STATIC === "1";

/** آدرسِ یک فایل یا مسیرِ سایت با پیشوندِ پایه؛ آدرسِ کامل، //، data: و blob: دست‌نخورده می‌ماند. */
export const asset = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? BASE + p : p);
