import { describe, it, expect, vi } from "vitest";
import { newState } from "../src/game/logic";
import { DAY_LEN } from "../src/game/data";
import { adaptDpr, nextDpr } from "../src/game/loop";
import { catchUp } from "../src/game/usePersistence";
import { game } from "../src/game/store";

/**
 * P5.10 — ماژول‌هایی که از Game.tsx جدا شدند، حالا بدون مرورگر تست‌پذیرند.
 */

describe("nextDpr / adaptDpr — سازگارسازی خودکار رزولوشن (P6.6 + B/T1)", () => {
  it("کندیِ واقعی (بیش از ۲۱ms) → کم می‌شود؛ هرگز زیرِ ۰.۹ (B/T1: دیگر تاریِ عمیق ممنوع)", () => {
    expect(nextDpr(2, 22, 2)).toBeLessThanOrEqual(1.85);
    expect(nextDpr(0.95, 200, 2)).toBeCloseTo(0.9);
    expect(nextDpr(0.9, 200, 2)).toBe(0.9);
    // زیرِ کف فقط از راهِ قفلِ دستی ممکن است؛ در کُندی پایین‌تر نمی‌رود و در رفعِ کندی بالا می‌آید
    expect(nextDpr(0.6, 200, 2)).toBe(0.6);
    expect(nextDpr(0.6, 8, 2)).toBe(0.7);
  });

  it("کندیِ شدید → یک‌جا به تخمین می‌پرد (هزینه ≈ dpr²)، نه ده‌ها پله", () => {
    // ۲ → ۱.۱۵ با ۴۰ms (قبلاً ۱.۸۵ و بعد ده پنجره‌ی دیگر)
    expect(nextDpr(2, 40, 2)).toBeCloseTo(1.15);
    // B/T1: تخمین زیرِ کفِ ۰.۹ نمی‌رود
    expect(nextDpr(2, 100, 2)).toBe(0.9);
  });

  it("هم‌پای vsync (۶۰ هرتز ≈ ۱۶.۷ms یا سریع‌تر) → کیفیت بالا می‌رود تا سقفِ دستگاه", () => {
    expect(nextDpr(1, 16.7, 2)).toBeCloseTo(1.1); // پیش از P6.6 این‌جا گیر می‌کرد
    expect(nextDpr(1, 8, 2)).toBeCloseTo(1.1);
    expect(nextDpr(1.95, 8, 2)).toBe(2);
    expect(nextDpr(2, 8, 2)).toBe(2);
  });

  it("بینِ ۱۷.۳ و ۲۱ms → دست نمی‌خورد (بدون نوسان)", () => {
    expect(nextDpr(1.5, 17.8, 2)).toBe(1.5);
    expect(nextDpr(1.5, 20.5, 2)).toBe(1.5); // پیش از B/T1 اینجا سقوط می‌کرد
  });


  it("سقفِ پسماند: سطحی که کند بود دوباره امتحان نمی‌شود", () => {
    let st = { dpr: 1.5, ceil: 2 };
    st = adaptDpr(st, 16.7, 2); // ۱.۶
    expect(st.dpr).toBeCloseTo(1.6);
    st = adaptDpr(st, 24, 2); // کندِ واقعی در ۱.۶ → پایین و سقف = ۱.۵ (آخرین سطحِ سالم؛ آستانه‌ی B/T1: ۲۱ms)
    expect(st.dpr).toBeLessThan(1.6);
    expect(st.ceil).toBeCloseTo(1.5);
    for (let i = 0; i < 10; i++) st = adaptDpr(st, 16.7, 2);
    expect(st.dpr).toBeCloseTo(1.5); // تا سقف بالا می‌رود و همان‌جا می‌ماند
  });
});

describe("catchUp — مزرعه در غیاب بازیکن کار می‌کند و گزارش صادقانه می‌دهد", () => {
  it("۳۰ دقیقه غیاب → گزارش ۳۰ دقیقه و زمانِ بازی جلو رفته", () => {
    const s = newState();
    const now = Date.now();
    s.savedAt = now - 30 * 60 * 1000;
    const t0 = s.time;
    const rep = catchUp(s, now);
    expect(rep?.minutes).toBe(30);
    expect(s.time - t0).toBeGreaterThan(1790);
    expect(rep?.days).toBe(Math.floor((t0 + 1800) / DAY_LEN) - Math.floor(t0 / DAY_LEN));
  });

  it("کمتر از یک دقیقه → بدون گزارش", () => {
    const s = newState();
    const now = Date.now();
    s.savedAt = now - 20_000;
    expect(catchUp(s, now)).toBeNull();
  });

  it("غیابِ ۵ ساعته → سقف ۲ ساعت (بی‌نهایت سود آفلاین نداریم)", () => {
    const s = newState();
    const now = Date.now();
    s.savedAt = now - 5 * 3600 * 1000;
    const t0 = s.time;
    const rep = catchUp(s, now);
    expect(rep?.minutes).toBe(120);
    expect(s.time - t0).toBeLessThanOrEqual(7200 + 1);
  });

  it("ساعتِ دستگاه عقب کشیده شده (savedAt در آینده) → بدون شبیه‌سازی و بدون خطا", () => {
    const s = newState();
    const now = Date.now();
    s.savedAt = now + 3600 * 1000;
    const t0 = s.time;
    expect(catchUp(s, now)).toBeNull();
    expect(s.time).toBe(t0);
  });
});

describe("store — منبع واحد وضعیت بیرون از React", () => {
  it("set و bump مشترک‌ها را باخبر می‌کنند و نسخه بالا می‌رود", () => {
    const spy = vi.fn();
    const off = game.subscribe(spy);
    const v0 = game.version();
    const s = newState();
    game.set(s);
    expect(game.get()).toBe(s);
    game.bump();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(game.version()).toBe(v0 + 2);
    off();
    game.bump();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
