/**
 * src/game/sim/rng.ts — یک منبعِ تصادفیِ تزریق‌پذیر برای کلِ شبیه‌سازی (R/T9)
 *
 * پیش از این هر ماژولِ شبیه‌سازی مستقل Math.random را صدا می‌زد؛ نتیجه‌اش این بود که
 * هیچ تستی نمی‌توانست «با بذرِ ثابت، همان نتیجه» را بخواهد و بازتولیدِ یک باگِ شبیه‌سازی
 * ممکن نبود. حالا همه‌ی نقاطِ تصادفِ sim از این درگاه عبور می‌کنند:
 *
 *   - پیش‌فرض: Math.random (رفتارِ بازی دقیقاً مثل قبل)
 *   - تست/بازتولید: withSeed(۱۲۳۴, () => { ... }) یا setRng(makeRng(seed))
 *
 * مهم: این درگاه در سیو ذخیره نمی‌شود (هیچ فیلدِ تازه‌ای به State اضافه نمی‌کند) و
 * پس از پایانِ withRng/withSeed، Rng قبلی برمی‌گردد.
 */
export type Rng = () => number;

/** mulberry32 — کوچک، سریع و با بذرِ ۳۲ بیتی؛ خروجی در بازه‌ی [۰، ۱) */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rng فعلی. پیش‌فرض یک پوششِ نازک روی Math.random است — یعنی در زمانِ فراخوانی
 * خوانده می‌شود، نه در زمانِ بارگذاریِ ماژول؛ پس vi.spyOn(Math, "random") در تست‌ها
 * (و هر جایگزینیِ بعدیِ Math.random) هنوز کار می‌کند.
 */
let current: Rng = () => Math.random();

/** Rng فعلی (برای ماژول‌های شبیه‌سازی) */
export const rng = (): number => current();

/** جایگزینیِ Rng و بازگرداندنِ مقدارِ قبلی (برای بازگرداندنِ دستی) */
export function setRng(next: Rng): Rng {
  const prev = current;
  current = next;
  return prev;
}

/** اجرای fn با یک Rng مشخص؛ در هر حالت (حتی در خطا) Rng قبلی برمی‌گردد */
export function withRng<T>(next: Rng, fn: () => T): T {
  const prev = setRng(next);
  try {
    return fn();
  } finally {
    setRng(prev);
  }
}

/** همان withRng، اما با بذرِ عددی — نسخه‌ی کوتاهِ تست‌ها */
export function withSeed<T>(seed: number, fn: () => T): T {
  return withRng(makeRng(seed), fn);
}
