import { describe, it, expect } from "vitest";
import { ambientPlan, ambientTotal, isNight } from "../src/game/render/ambient";

/** V.2: برنامه‌ی عناصر محیطی قطعی و سبک است (بودجه ≤ ۲۴ موجودیت در هر فریم) */
describe("برنامه‌ی زندگی محیطی (V.2)", () => {
  it("بهارِ روزِ آفتابی: پروانه و شکوفه و پرنده، بی شب‌تاب", () => {
    const p = ambientPlan("spring", 12, "sun");
    expect(p.butterflies).toBe(4);
    expect(p.petals).toBe(8);
    expect(p.birds).toBe(3);
    expect(p.fireflies).toBe(0);
    expect(ambientTotal(p)).toBeLessThanOrEqual(24);
  });

  it("تابستانِ شب: فقط کرم شب‌تاب", () => {
    const p = ambientPlan("summer", 23, "sun");
    expect(p.fireflies).toBe(6);
    expect(p.butterflies).toBe(0);
    expect(p.birds).toBe(0);
  });

  it("پاییز: برگ‌ریزان", () => {
    const p = ambientPlan("autumn", 10, "fog");
    expect(p.leaves).toBe(10);
    expect(p.petals).toBe(0);
  });

  it("زمستانِ شب: دره آرام است", () => {
    const p = ambientPlan("winter", 2, "snow");
    expect(ambientTotal(p)).toBe(0);
  });

  it("باران: نه پروانه نه پرنده", () => {
    const p = ambientPlan("spring", 12, "rain");
    expect(p.butterflies).toBe(0);
    expect(p.birds).toBe(0);
  });

  it("بودجه‌ی عملکرد: هیچ ترکیبی بیش از ۲۴ موجودیت", () => {
    for (const season of ["spring", "summer", "autumn", "winter"])
      for (const hour of [3, 12, 22])
        for (const weather of ["sun", "rain", "snow", "fog", "heatwave"])
          expect(ambientTotal(ambientPlan(season, hour, weather))).toBeLessThanOrEqual(24);
  });

  it("روی دستگاه ضعیف تراکم کم می‌شود (سازگاری خودکار)", () => {
    const full = ambientPlan("spring", 12, "sun", 1);
    const low = ambientPlan("spring", 12, "sun", 0.4);
    expect(low.butterflies).toBeLessThan(full.butterflies);
    expect(ambientTotal(low)).toBeLessThanOrEqual(10);
  });

  it("مرز شب/روز با ساعت بازی هم‌خوان است", () => {
    expect(isNight(4)).toBe(true);
    expect(isNight(12)).toBe(false);
    expect(isNight(20.5)).toBe(true);
  });
});
