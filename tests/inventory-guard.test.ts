import { describe, expect, it } from "vitest";
import { addInv, harvest, collect, capacity, invCount, newState } from "../src/game/logic";

/**
 * رگرسیونِ باگِ اینونتوری (گزارشِ کاربر: «در قسمتِ اینونتوری کلی خطا داره»):
 * addInv وقتی ظرفیت پر بود عددِ «منفی» برمی‌گرداند؛ harvest شرطِ got === 0 را
 * رد می‌کرد و محصول بدونِ ورود به انبار نابود می‌شد. حالا هرگز منفی برنمی‌گردد.
 */
const empty = (s: ReturnType<typeof newState>) => {
  for (const k of Object.keys(s.inv)) delete s.inv[k];
  return s;
};

describe("انبار: گاردِ ظرفیتِ پر", () => {
  it("addInv با انبارِ سرریز هرگز منفی برنمی‌گرداند", () => {
    const s = empty(newState());
    s.inv.wood = 99999; // انبار سرریز
    expect(invCount(s)).toBeGreaterThan(capacity(s));
    expect(addInv(s, "wheat", 5)).toBe(0);
    expect(s.inv.wheat ?? 0).toBe(0);
  });

  it("harvest با انبارِ پر محصول را نابود نمی‌کند", () => {
    const s = empty(newState());
    s.inv.wood = 99999;
    const N = 36;
    const i = N * 12 + 12;
    s.tiles[i] = { ...s.tiles[i], k: "soil", crop: "wheat", g: 1 };
    const ev = { toast: () => {}, sound: () => {}, fx: () => {} } as never;
    const ok = harvest(s, 12, 12, ev, true);
    expect(ok).toBe(false); // برداشت انجام نمی‌شود
    expect(s.tiles[i].crop).toBe("wheat"); // محصول سرِ جایش می‌ماند
  });

  it("collect با انبارِ پر اقلامِ ساختمان را گم نمی‌کند", () => {
    const s = empty(newState());
    s.inv.wood = 99999;
    const N = 36;
    const t = { ...s.tiles[N * 5 + 5], k: "bld", b: "coop", out: ["egg", "egg"] } as never;
    s.tiles[N * 5 + 5] = t;
    const ev = { toast: () => {}, sound: () => {}, fx: () => {} } as never;
    collect(s, t, 5, 5, ev, true);
    expect((t as { out: string[] }).out.length).toBe(2); // صفِ خروجی دست‌نخورده
  });

  it("برداشتِ تا لبه‌ی ظرفیت درستِ جزئی کار می‌کند", () => {
    const s = empty(newState());
    s.inv.wood = capacity(s) - 3; // فقط ۳ جا مانده
    const N = 36;
    const i = N * 12 + 12;
    s.tiles[i] = { ...s.tiles[i], k: "soil", crop: "wheat", g: 1 };
    const ev = { toast: () => {}, sound: () => {}, fx: () => {} } as never;
    harvest(s, 12, 12, ev, true);
    expect(invCount(s)).toBeLessThanOrEqual(capacity(s)); // هرگز سرریز نمی‌کند
    expect(invCount(s)).toBeGreaterThan(capacity(s) - 4); // تا لبه‌ی ظرفیت پر شد
    expect(s.tiles[i].crop).toBeUndefined(); // برداشت کامل ثبت شد
  });
});
