/**
 * src/game/faNum.ts — قالب‌بندیِ عددِ فارسی بی‌ICU (P6.5)
 *
 * اولین new Intl.NumberFormat("fa-IR") در مرورگر ۱۰ تا ۱۶ میلی‌ثانیه داده‌ی محلیِ ICU بار می‌کند (×۴
 * روی موبایلِ میانی) و همین بخشِ بزرگی از ارزیابیِ ماژول‌های بارگذاریِ اول بود. خروجی دقیقاً همان
 * toLocaleString("fa-IR") است (tests/faNum.test.ts هزاران عدد را با ICU مقایسه می‌کند):
 *   • ارقامِ فارسی، جداکننده‌ی هزارگانِ «٬» (U+066C) و ممیزِ «٫» (U+066B)
 *   • حداکثر سه رقمِ اعشار، گردکردنِ نیمه‌به‌بالا روی کوتاه‌ترین نمایشِ اعشاریِ عدد (مثل ICU: ۱٫۰۰۰۵ → ۱٫۰۰۱)
 *   • منفی (و صفرِ منفی) به‌شکلِ LRM + «−» (U+200E U+2212)
 * و چون ICU در کار نیست، خروجیِ سرور (SSR) و مرورگر هرگز با هم فرق نمی‌کند.
 */

const DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const NEG = "\u200E\u2212";

/** ارقامِ لاتینِ یک رشته را فارسی می‌کند */
export const faDigits = (s: string) => s.replace(/[0-9]/g, (d) => DIGITS[d.charCodeAt(0) - 48]);

/** یک واحد به رشته‌ی ارقامِ ده‌دهی اضافه می‌کند ("199" → "200"، "99" → "100") */
function inc(d: string): string {
  const a = d.split("");
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i] !== "9") {
      a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1);
      return a.join("");
    }
    a[i] = "0";
  }
  return "1" + a.join("");
}

let icu: Intl.NumberFormat | null = null;

export function faNum(n: number, maxFrac = 3): string {
  const abs = Math.abs(n);
  // بیرون از دامنه‌ی بازی (بی‌نهایت، NaN، ≥ ۱۰¹⁵): همان ICU، فقط اگر روزی لازم شد
  if (!Number.isFinite(n) || abs >= 1e15) return (icu ??= new Intl.NumberFormat("fa-IR")).format(n);
  let s = String(abs);
  if (s.includes("e")) s = "0"; // فقط عددهای خیلی کوچک (< ۱۰⁻⁶) که به صفر گرد می‌شوند
  let [int, frac = ""] = s.split(".");
  if (frac.length > maxFrac) {
    const up = frac.charCodeAt(maxFrac) - 48 >= 5;
    let digits = int + frac.slice(0, maxFrac);
    if (up) digits = inc(digits);
    int = digits.slice(0, digits.length - maxFrac) || "0";
    frac = digits.slice(digits.length - maxFrac);
  }
  frac = frac.replace(/0+$/, "");
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  const neg = n < 0 || Object.is(n, -0);
  return (neg ? NEG : "") + faDigits(int) + (frac ? "٫" + faDigits(frac) : "");
}

/** دو رقمیِ ساعت (۰۷:۰۵)؛ همان toLocaleString("fa-IR", { minimumIntegerDigits: 2 }) برای عددِ صحیحِ نامنفی */
export const faPad2 = (n: number) => (n >= 0 && n < 10 && Number.isInteger(n) ? "۰" + DIGITS[n] : faNum(n));
