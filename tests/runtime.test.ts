import { describe, it, expect, vi } from "vitest";
import { newState } from "../src/game/logic";
import { DAY_LEN } from "../src/game/data";
import { nextDpr } from "../src/game/loop";
import { catchUp } from "../src/game/usePersistence";
import { game } from "../src/game/store";

/**
 * P5.10 — ماژول‌هایی که از Game.tsx جدا شدند، حالا بدون مرورگر تست‌پذیرند.
 */

describe("nextDpr — سازگارسازی خودکار رزولوشن", () => {
  it("فریم کند (> ۲۰ms) → رزولوشن ۰.۱۵ کم می‌شود ولی از ۰.۶ پایین‌تر نمی‌رود", () => {
    expect(nextDpr(2, 40, 2)).toBeCloseTo(1.85);
    expect(nextDpr(0.7, 200, 2)).toBeCloseTo(0.6);
    expect(nextDpr(0.6, 200, 2)).toBe(0.6);
  });

  it("فریم سریع (< ۱۳.۵ms) → کیفیت تا سقفِ دستگاه برمی‌گردد", () => {
    expect(nextDpr(1, 8, 2)).toBeCloseTo(1.1);
    expect(nextDpr(1.95, 8, 2)).toBe(2);
    expect(nextDpr(2, 8, 2)).toBe(2);
  });

  it("۶۰ هرتز پایدار (≈۱۶.۷ms) → دست نمی‌خورد (بدون نوسان)", () => {
    expect(nextDpr(1.5, 16.7, 2)).toBe(1.5);
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
