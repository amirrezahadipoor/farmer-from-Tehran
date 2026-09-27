import { describe, it, expect } from "vitest";
import { vnoise, fbm, tileVar, contactEdges, PALS } from "../src/game/render/artlab";
import { newState, idx } from "../src/game/logic";
import { N } from "../src/game/data";

/**
 * انجینِ آرت (ArtLab) — تضمین‌های ریاضی:
 *  ۱. همه‌ی نویزها در بازه‌ی [0,1] و **تعیینی**‌اند (کاش و وصله یک رسم می‌دهند)
 *  ۲. متغیرِ کاشی‌ها پیوسته است (دو کاشیِ هم‌سایه تفاوتِ کوچکی دارند، نه شطرنجی)
 *  ۳. ماسکِ سایه‌ی تماس فقط وقتی نوعِ هم‌سایه فرق کند می‌شود
 */
describe("ArtLab — ریاضیِ تعیینی", () => {
  it("vnoise در بازه‌ی [0,1] و تعیینی است", () => {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 100, y = Math.random() * 100;
      const a = vnoise(x, y), b = vnoise(x, y);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(a).toBe(b); // همان ورودی = همان خروجی
    }
  });
  it("fbm در بازه‌ی [0,1] است و با اکتاوِ بیشتر نوسانِ ریز می‌گیرد", () => {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 50, y = Math.random() * 50;
      const a = fbm(x, y, 2), b = fbm(x, y, 5);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
    // فرکانسِ متفاوت = بافتِ متفاوت (نه یک خطِ صاف)
    expect(fbm(3.1, 7.7, 5, 2)).not.toBeCloseTo(fbm(3.1, 7.7, 5, 1), 6);
  });
  it("tileVar پیوسته است: هم‌سایه‌ها نزدیک‌اند، نه شطرنجی", () => {
    const a = tileVar(10, 10), b = tileVar(11, 10), c = tileVar(12, 10);
    expect(Math.abs(a.dl - b.dl)).toBeLessThan(6);
    expect(Math.abs(b.dl - c.dl)).toBeLessThan(6);
    // شطرنجی نبودن: هم‌سایه‌های جفت/فرد هم‌نمره نیستند
    expect(a.dl).not.toBe(c.dl);
  });
  it("contactEdges: مرزِ چمن/آب = هر دو طرف علامت دارند، چمن/چمن = هیچ", () => {
    const s = newState();
    // هم‌سایه‌ها را صریحاً چمن می‌کنیم تا وضعیتِ اولیه نقشه تفسیر را خراب نکند
    for (const [x, y] of [[16, 17], [18, 17], [17, 16], [17, 18], [17, 17]]) {
      const t = s.tiles[idx(x, y)];
      t.k = "grass";
      delete t.crop;
    }
    s.tiles[idx(17, 17)].k = "water";
    expect(contactEdges(s, 17, 17) & 1).toBeTruthy(); // لبه‌ی بالایی (سمتِ چمن)
    expect(contactEdges(s, 16, 17) & 2).toBeTruthy(); // چمنِ سمتِ چپ، لبه‌ی راستش
    expect(contactEdges(s, 18, 17) & 8).toBeTruthy(); // چمنِ سمتِ راست، لبه‌ی چپش
    s.tiles[idx(17, 17)].k = "grass";
    expect(contactEdges(s, 16, 17) & 2).toBeFalsy(); // هم‌نوع = مرز نیست
    expect(contactEdges(s, 17, 17)).toBe(0);
  });
  it("پالتِ هر فصل کامل است (هیچ کلیدِ گمشده‌ای)", () => {
    for (const season of ["spring", "summer", "autumn", "winter"]) {
      const P = PALS[season];
      expect(P.grass.length).toBe(3);
      expect(P.water.length).toBe(3);
      expect(P.leaf.length).toBe(3);
      expect(P.conifer.length).toBe(2);
      expect(P.autumnHues.length).toBeGreaterThan(0);
    }
  });
});
