/**
 * tests/photo.test.ts — V.10: حالتِ عکس (بخش‌های خالص؛ کشیدنِ واقعی در e2e/photo.spec.ts)
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FRAMES, PALETTES, frameForSeason, frameInsets, motifSpots, photoCaption, photoFileName, readFx, seeded, type FxQuery } from "../src/game/photo";

describe("V.10 — حالت عکس", () => {
  it("پنج قاب: چهار فصل + بی‌قاب، با نام فارسی و پالتِ کامل برای هر فصل", () => {
    expect(FRAMES.map((f) => f.id)).toEqual(["spring", "summer", "autumn", "winter", "none"]);
    expect(new Set(FRAMES.map((f) => f.name)).size).toBe(5);
    for (const id of ["spring", "summer", "autumn", "winter"] as const) {
      const p = PALETTES[id];
      expect(p.bg).toHaveLength(2);
      for (const c of [...p.bg, p.line, p.text]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("قابِ پیش‌فرض همان فصلِ جاری است (با شاخصِ بیرون از بازه هم)", () => {
    expect(frameForSeason(0)).toBe("spring");
    expect(frameForSeason(1)).toBe("summer");
    expect(frameForSeason(2)).toBe("autumn");
    expect(frameForSeason(3)).toBe("winter");
    expect(frameForSeason(5)).toBe("summer");
    expect(frameForSeason(-1)).toBe("winter");
    expect(frameForSeason(Number.NaN)).toBe("spring");
  });

  it("حاشیه‌ها با DPR مقیاس می‌گیرند؛ بی‌قاب یعنی بی‌حاشیه", () => {
    expect(frameInsets("none", 2)).toEqual({ top: 0, side: 0, bottom: 0 });
    const a = frameInsets("spring", 1);
    const b = frameInsets("spring", 2);
    expect(b.top).toBe(a.top * 2);
    expect(b.bottom).toBe(a.bottom * 2);
    expect(a.bottom).toBeGreaterThan(a.top); // نوارِ پایین جای نوشته دارد
  });

  it("نامِ فایل ASCII و امن است", () => {
    expect(photoFileName(12, 0)).toBe("golden-valley-day-12-spring.png");
    expect(photoFileName(6.9, 1)).toBe("golden-valley-day-6-summer.png");
    expect(photoFileName(Number.NaN, 7)).toBe("golden-valley-day-1-winter.png");
    expect(photoFileName(-3, -2)).toBe("golden-valley-day-1-autumn.png");
    expect(photoFileName(40, 3)).toMatch(/^[a-z0-9-]+\.png$/);
  });

  it("نوشته فقط نامِ بازیکن و تاریخِ بازی است — بی‌نشان و بی‌آدرس", () => {
    expect(photoCaption("امید", 12, "بهار")).toBe("امید — روز ۱۲، بهار");
    expect(photoCaption("  ", 3, "پاییز")).toBe("روز ۳، پاییز");
    expect(photoCaption("نامی-بسیار-بلند-که-از-بیست-و-چهار-بیشتر-است", 1, "زمستان").split(" — ")[0]).toHaveLength(24);
    const cap = photoCaption("امید", 1, "بهار");
    expect(cap).not.toMatch(/https?:|github|www\.|مزرعه طلایی/i);
  });

  it("PRNGِ دانه‌دار: تکرارپذیر و در بازه‌ی [۰، ۱)", () => {
    const a = seeded(1403);
    const b = seeded(1403);
    const xs = Array.from({ length: 200 }, () => a());
    expect(Array.from({ length: 200 }, () => b())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs.map((x) => Math.floor(x * 10))).size).toBe(10); // پخشِ یکنواخت، نه ثابت
    expect(seeded(2718)()).not.toBe(seeded(1403)());
  });

  it("جای نقش‌مایه‌ها روی نوارِ قاب است و وسطِ نوارِ نوشته خالی می‌ماند", () => {
    const k = 2;
    const W = 780 + 72;
    const H = 1400 + 128;
    const ins = frameInsets("autumn", k);
    const pts = motifSpots(W, H, ins, k, seeded(3141));
    expect(pts.length).toBeGreaterThan(40);
    for (const [x, y] of pts) {
      const onBand = y <= ins.top + 6 * k || x <= ins.side + 6 * k || x >= W - ins.side - 6 * k || y >= H - ins.bottom;
      expect(onBand, `${x},${y}`).toBe(true);
      if (y >= H - ins.bottom) expect(x < 70 * k || x > W - 70 * k, "نوشته آزاد").toBe(true);
    }
    expect(motifSpots(W, H, ins, k, seeded(3141))).toEqual(pts); // هر بار یکسان
  });

  it("readFx همان شفافیت‌ها و جایِ خورشید و ماهِ لایه‌های data-fx را می‌خواند", () => {
    const els: Record<string, { opacity: string; left: string; top: string }> = {
      sky: { opacity: "0.4", left: "", top: "" },
      stars: { opacity: "0.8", left: "", top: "" },
      sun: { opacity: "0", left: "12.5%", top: "40.0%" },
      moon: { opacity: "0.9", left: "70.0%", top: "22.5%" },
      dusk: { opacity: "1.7", left: "", top: "" }, // بیرون از بازه → ۱
      dark: { opacity: "abc", left: "", top: "" }, // نامعتبر → ۰
    };
    const q: FxQuery = (sel) => {
      const k = /data-fx="(\w+)"/.exec(sel)?.[1] ?? "";
      return els[k] ? { style: els[k] } : null;
    };
    const fx = readFx(q);
    expect(fx.sky).toBeCloseTo(0.4);
    expect(fx.stars).toBeCloseTo(0.8);
    expect(fx.dusk).toBe(1);
    expect(fx.dark).toBe(0);
    expect(fx.fog).toBe(0); // لایه‌ی غایب
    expect(fx.moon).toEqual({ x: 0.7, y: 0.225, o: 0.9 });
    expect(fx.sun.x).toBeCloseTo(0.125);
    expect(fx.sun.o).toBe(0);
    const empty = readFx(() => null);
    expect(empty.sun).toEqual({ x: 0.5, y: 0.84, o: 0 }); // پیش‌فرضِ CSS
  });

  it("ترکیب‌کننده از Math.random استفاده نمی‌کند (خروجیِ تکرارپذیر، بی‌هشدارِ CodeQL)", () => {
    for (const f of ["photo.ts", "photoDraw.ts"]) {
      const src = readFileSync(new URL(`../src/game/${f}`, import.meta.url), "utf8");
      expect(src, f).not.toMatch(/Math\.random/);
    }
  });
});
