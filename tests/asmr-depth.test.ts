import { describe, expect, it } from "vitest";
import { applyStreak, harvest, plant, idx, migrate, newState } from "../src/game/logic";
import { seasonBoost, cropSeasons, CROPS, xpFor } from "../src/game/data";
import { sanitizeSave } from "../src/game/sim/sanitize";
import { setRng } from "../src/game/sim/rng";

/** M7..M12 — عمقِ گیم‌پلی: کمبو، طلایی، فصل‌کشت، آرزو، استریک و مهاجرتِ فیلدهای تازه */

const ev = {
  toast: () => {},
  fx: () => {},
  sound: () => {},
} as never;

const soilWithRipe = (s: ReturnType<typeof newState>, x: number, y: number, crop = "wheat") => {
  s.tiles[idx(x, y)] = { k: "soil", v: 0.5, crop, g: 1 } as never;
};

describe("M7: زنجیره‌ی برداشت", () => {
  it("حلقه‌های پیوسته شمرده می‌شوند و با فاصله صفر می‌شوند", () => {
    const s = newState();
    soilWithRipe(s, 3, 3);
    harvest(s, 3, 3, ev, true);
    expect(s.combo).toBe(1);
    soilWithRipe(s, 4, 3);
    s.time += 2; // داخل پنجره‌ی ۴ ثانیه
    harvest(s, 4, 3, ev, true);
    expect(s.combo).toBe(2);
    soilWithRipe(s, 5, 3);
    s.time += 10; // بیرون پنجره
    harvest(s, 5, 3, ev, true);
    expect(s.combo).toBe(1);
  });

  it("بهترین زنجیره در آمار می‌ماند", () => {
    const s = newState();
    for (let i = 0; i < 5; i++) {
      soilWithRipe(s, 3 + i, 6);
      s.time += 1;
      harvest(s, 3 + i, 6, ev, true);
    }
    expect(s.stats.bestChain).toBe(5);
  });

  it("تجربه‌ی زنجیره با ضریب رشد می‌کند (سقف ۱٫۵)", () => {
    const s = newState();
    s.combo = 26; // ۲۵ گام × ۲٪ = ۱.۵ (سقف)
    s.comboAt = s.time;
    soilWithRipe(s, 2, 2);
    const before = s.xp;
    harvest(s, 2, 2, ev, true);
    expect(s.xp - before).toBe(2); // گندم xp=۱ × ۱.۵
  });
});

describe("M8: محصول طلایی", () => {
  it("برداشت طلایی سکه پنج‌برابر ارزش می‌دهد و پرچم را جمع می‌کند", () => {
    // دو قلو: تنها تفاوت پرچمِ طلایی است؛ تفاوتِ سکه = دقیقا پاداشِ طلایی
    const run = (gold: boolean) => {
      const s = newState();
      s.tiles[idx(7, 7)] = { k: "soil", v: 0.5, crop: "wheat", g: 1, gold } as never;
      const c0 = s.coins;
      setRng(() => 0.99);
      harvest(s, 7, 7, ev, true);
      setRng(() => Math.random());
      return s.coins - c0;
    };
    expect(run(true) - run(false)).toBe(5 * 4); // گندم پایه ۴
    // پرچم پس از برداشت جمع می‌شود
    const s2 = newState();
    s2.tiles[idx(7, 7)] = { k: "soil", v: 0.5, crop: "wheat", g: 1, gold: true } as never;
    setRng(() => 0.99);
    harvest(s2, 7, 7, ev, true);
    setRng(() => Math.random());
    expect(s2.stats.golden).toBe(1);
    expect(s2.tiles[idx(7, 7)].gold).toBe(false);
  });

  it("شانس طلایی با کود بیشتر است (کاشت بسته‌دار)", () => {
    const s = newState();
    s.coins = 1e6;
    s.tiles[idx(2, 8)] = { k: "soil", v: 0.5 } as never;
    s.tiles[idx(2, 8)].fert = true;
    let gold = 0;
    setRng(() => 0.05); // زیرِ ۸٪ کود، بالای ۳٪ ساده
    plant(s, 2, 8, "wheat", ev, true);
    gold = s.tiles[idx(2, 8)].gold ? 1 : 0;
    setRng(() => 0.05);
    s.tiles[idx(3, 8)] = { k: "soil", v: 0.5 } as never; // بدون کود
    plant(s, 3, 8, "wheat", ev, true);
    setRng(() => Math.random());
    expect(gold).toBe(1);
    expect(s.tiles[idx(3, 8)].gold).toBe(false);
  });
});

describe("M9: فصل‌کشت", () => {
  it("گندم بهار و پاییز مطلوب است؛ زمستان نه", () => {
    expect(seasonBoost("wheat", 0)).toBe(true);
    expect(seasonBoost("wheat", 2)).toBe(true);
    expect(seasonBoost("wheat", 3)).toBe(false);
  });
  it("هر محصول فصلِ مطلوب دارد و برداشتِ فصلی +۱ است", () => {
    for (const c of CROPS) expect(cropSeasons(c).length).toBeGreaterThanOrEqual(1);
    const s = newState();
    s.seasonIndex = 0; // بهار
    soilWithRipe(s, 9, 9, "wheat");
    const inv0 = s.inv.wheat ?? 0;
    setRng(() => 0.99);
    harvest(s, 9, 9, ev, true);
    setRng(() => Math.random());
    expect((s.inv.wheat ?? 0) - inv0).toBe(3); // دوه + یکی فصل
  });
});

describe("M11: آرزوی ستاره", () => {
  it("بافِ فعال برداشت را ده درصد زیاد می‌کند", () => {
    const run = (wish: boolean) => {
      const s = newState();
      s.seasonIndex = 1; // تابستان: گندم خارج از فصل
      if (wish) s.wishUntil = s.time + 900;
      soilWithRipe(s, 5, 5);
      const inv0 = s.inv.wheat ?? 0;
      setRng(() => 0.99); // شانسیِ ۲۰٪ خاموش تا قطعی بسنجیم
      harvest(s, 5, 5, ev, true);
      setRng(() => Math.random());
      return (s.inv.wheat ?? 0) - inv0;
    };
    expect(run(true) - run(false)).toBe(1); // ده درصد با کفِ یک
  });
});

describe("M12: استریک روزانه", () => {
  it("روزِ پیوسته پاداشِ پلکانی می‌دهد؛ روزِ گم صفر می‌کند؛ همان‌روز کاری نمی‌کند", () => {
    const s = newState();
    expect(applyStreak(s, 100, ev)).toBe(false); // نخستین روز
    expect(applyStreak(s, 100, ev)).toBe(false); // همان روز
    expect(applyStreak(s, 101, ev)).toBe(true);
    expect(s.streak).toBe(2);
    const coins0 = s.coins;
    expect(applyStreak(s, 103, ev)).toBe(true); // روز ۱۰۲ گم شد
    expect(s.streak).toBe(1);
    expect(s.coins - coins0).toBe(50); // صندوق روزِ یک
    expect(applyStreak(s, 110, ev)).toBe(true);
    expect(applyStreak(s, 111, ev)).toBe(true);
    expect(s.coins - 0).toBeGreaterThan(0);
  });
});

describe("مهاجرت و ضدخرابیِ فیلدهای تازه", () => {
  it("سیوِ قدیمی بدون فیلدهای تازه بالا می‌آید", () => {
    const s = newState();
    delete (s as { combo?: number }).combo;
    delete (s as { streak?: number }).streak;
    const m = migrate(JSON.parse(JSON.stringify(s)));
    expect(m?.combo).toBe(0);
    expect(m?.streak).toBe(0);
    expect(m?.stats.bestChain).toBe(0);
  });
  it("مقادیرِ آشفته به مرزِ سالم می‌رسند", () => {
    const s = newState();
    const dirty = JSON.parse(JSON.stringify(s));
    dirty.combo = "بسیار";
    dirty.streak = -50;
    dirty.wishUntil = Number.NaN;
    dirty.tiles[40].gold = "yes";
    const fixed = sanitizeSave(dirty);
    expect(fixed).not.toBeNull();
    expect(fixed!.combo).toBe(0);
    expect(fixed!.streak).toBe(0);
    expect(fixed!.wishUntil).toBe(0);
    expect(fixed!.tiles[40].gold).toBeUndefined();
  });
});

describe("M10: منحنی تجربه‌ی کندتر", () => {
  it("پس از سطح ۱۰ سخت‌گیری پیدا می‌کند و یکنواخت صعودی است", () => {
    let prev = 0;
    for (let l = 1; l <= 30; l++) {
      expect(xpFor(l)).toBeGreaterThan(prev);
      prev = xpFor(l);
    }
    // جمعِ ۱۰..۲۰ حدود سه برابرِ منحنیِ پیشین باشد (ساعاتِ بازی بیشتر)
    let cum = 0;
    for (let l = 11; l <= 19; l++) cum += xpFor(l);
    expect(cum).toBeGreaterThan(80_000);
  });
});
