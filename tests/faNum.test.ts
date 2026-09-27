import { describe, expect, it } from "vitest";
import { faDigits, faNum, faPad2 } from "../src/game/faNum";
import { fmt } from "../src/game/data";

/** مرجع: ICU (همان چیزی که پیش‌تر مستقیم صدا زده می‌شد) */
const icu = new Intl.NumberFormat("fa-IR");
const icu2 = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 });

/** مولدِ شبه‌تصادفیِ تکرارپذیر */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe("faNum = toLocaleString('fa-IR') بی‌ICU (P6.5)", () => {
  it("موارد مرزی: صفر، منفی، هزارگان، گردکردن روی کوتاه‌ترین نمایش", () => {
    const cases = [0, -0, 1, 7, 9, 10, 99, 100, 999, 1000, 1234, 9999, 10000, 12345, 123456, 1234567, -1, -1234, -1234567,
      0.5, 2.5, 2.25, 12345.6789, 1.0005, 2.675, 0.0005, 0.0004, -0.0004, -0.0005, 0.9995, 999.9995, 99999.9999, 1e-7, -1e-7,
      0.1 + 0.2, 1 / 3, 2 / 3, -3.14159, 1e14, 999999999999999, 123456789012.345, 5e-4, 4.9995, 0.001, 0.0015, 0.1234];
    for (const v of cases) expect(faNum(v), String(v)).toBe(icu.format(v));
  });

  it("۲۰٬۰۰۰ عددِ تصادفی (صحیح، اعشاری، منفی، بزرگ) عینِ ICU", () => {
    const r = rng(6_5);
    for (let i = 0; i < 20000; i++) {
      const kind = i % 5;
      const mag = Math.pow(10, Math.floor(r() * 13));
      let v = r() * mag;
      if (kind === 0) v = Math.floor(v);
      if (kind === 1) v = Math.round(v * 1000) / 1000;
      if (kind === 2) v = -v;
      if (kind === 3) v = Math.round(v * 10000 + 0.5) / 10000; // لبه‌ی گردکردنِ رقمِ چهارم
      expect(faNum(v), String(v)).toBe(icu.format(v));
    }
  });

  it("خارج از دامنه به ICU برمی‌گردد", () => {
    for (const v of [Infinity, -Infinity, NaN, 1e15, 1e21, -2e16]) expect(faNum(v)).toBe(icu.format(v));
  });

  it("fmt (کفِ عدد) و faPad2 (ساعت) همان خروجیِ قبلی را می‌دهند", () => {
    for (const v of [0, 0.9, 1.5, 1999.99, 25_000.4, -0.5, -12.2]) expect(fmt(v)).toBe(Math.floor(v).toLocaleString("fa-IR"));
    for (let n = 0; n < 130; n++) expect(faPad2(n)).toBe(icu2.format(n));
    expect(faDigits("v2.10 · 07:05")).toBe("v۲.۱۰ · ۰۷:۰۵");
  });
});
