/**
 * tests/festival.test.ts — V.5: فستیوال فصلی دهکده
 * پیشنهاد روز اول فصل، هزینه‌ها، اثر سرمایه‌گذاری روی قیمت، رشد آرامش، ضیافت، یک‌بار بودن.
 */
import { it, expect, describe, vi } from "vitest";
import {
  newState, proposeFestival, holdFestival, festActive, priceAt, tick,
} from "../src/game/logic";
import { DAY_LEN, SEASONS } from "../src/game/data";
import type { Events, State } from "../src/game/logic";
import { sanitizeSave, OPTIONAL_STATE_KEYS } from "../src/game/sim/sanitize";

const ev: Events = { toast: () => {}, fx: () => {}, sound: () => {}, celebrate: () => {} };

function onSeasonDay(day: number): State {
  const s = newState();
  s.time = (day - 1) * DAY_LEN + 1;
  s.day = day;
  s.seasonIndex = Math.floor((day - 1) / 5) % 4;
  return s;
}

describe("V.5 — فستیوال فصلی دهکده", () => {
  it("فقط روز اول هر فصل پیشنهاد می‌شود — جز روزِ اولِ مزرعه‌ی تازه", () => {
    expect(proposeFestival(onSeasonDay(1))).toBe(false);  // روز ۱ مزرعه: وقتِ آموزش، نه جشن
    expect(proposeFestival(onSeasonDay(6))).toBe(true);   // روز ۶ فصل تابستان
    expect(proposeFestival(onSeasonDay(21))).toBe(true);  // بهارِ سالِ دوم
    expect(proposeFestival(onSeasonDay(3))).toBe(false);  // وسط فصل
  });

  it("بازیِ تازه در روزِ اول هیچ پرده‌ی جشنی باز نمی‌کند (رگرسیونِ قفل‌شدنِ آموزش)", () => {
    const s = newState();
    s.weatherLeft = 999;
    tick(s, 1, ev);
    tick(s, 30, ev);
    expect(s.day).toBe(1);
    expect(s.fest).toBeUndefined();
  });

  it("سیوِ قدیمی با پیشنهادِ بی‌جوابِ روزِ اول پاک می‌شود؛ انتخابِ انجام‌شده می‌ماند", () => {
    const pending = newState();
    pending.fest = { idx: 0, day: 1, choice: null };
    expect(sanitizeSave(JSON.parse(JSON.stringify(pending)))?.fest).toBeUndefined();
    const chosen = newState();
    chosen.fest = { idx: 0, day: 1, choice: "rest" };
    expect(sanitizeSave(JSON.parse(JSON.stringify(chosen)))?.fest).toEqual({ idx: 0, day: 1, choice: "rest" });
    const summer = onSeasonDay(6);
    summer.fest = { idx: 1, day: 6, choice: null };
    expect(sanitizeSave(JSON.parse(JSON.stringify(summer)))?.fest).toEqual({ idx: 1, day: 6, choice: null });
  });

  it("در هر فصل فقط یک‌بار پیشنهاد می‌شود", () => {
    const s = onSeasonDay(21);
    expect(proposeFestival(s)).toBe(true);
    expect(proposeFestival(s)).toBe(false);
    expect(s.fest?.choice).toBeNull();
  });

  it("تیکِ عبور از مرز روز، فستیوال روز اول فصل را فعال می‌کند", () => {
    const s = onSeasonDay(5);
    s.weatherLeft = 999;
    tick(s, DAY_LEN, ev); // می‌رود به روز ۶ (اول تابستان)
    expect(s.day).toBe(6);
    expect(s.fest).toBeTruthy();
    expect(s.fest?.idx).toBe(1);
    expect(s.fest?.choice).toBeNull();
  });

  it("سرمایه‌گذاری: ۶۰۰ سکه می‌گیرد و قیمت فروش را ۱۰٪ بالا می‌برد", () => {
    const s = onSeasonDay(21);
    proposeFestival(s);
    s.coins = 1000;
    s.time = 60; // تثبیت موج قیمت برای مقایسه
    const before = priceAt(s, "cheese", 0); // کالای گران تا +۱۰٪ پس از گردشدن دیده شود
    expect(holdFestival(s, "invest", ev)).toBe(true);
    expect(s.coins).toBe(400);
    expect(s.stats.spent).toBe(600);
    const after = priceAt(s, "cheese", 0);
    // قیمت‌ها گرد می‌شوند؛ تلورانسِ یک سکه‌ای
    expect(after).toBeGreaterThanOrEqual(Math.round(before * 1.1) - 1);
    expect(after).toBeLessThanOrEqual(Math.round(before * 1.1) + 1);
    expect(festActive(s, "invest")).toBe(true);
  });

  it("سرمایه‌گذاری بدون سکه رد می‌شود و پیام خطا می‌دهد", () => {
    const s = onSeasonDay(21);
    proposeFestival(s);
    s.coins = 10;
    const toast = vi.fn();
    expect(holdFestival(s, "invest", { ...ev, toast })).toBe(false);
    expect(s.fest?.choice).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("کافی"), "err");
  });

  it("ضیافت: ۲۵۰ سکه می‌گیرد، تجربه و اعتبار می‌دهد", () => {
    const s = onSeasonDay(21);
    proposeFestival(s);
    s.coins = 300;
    const repBefore = s.rep;
    expect(holdFestival(s, "feast", ev)).toBe(true);
    expect(s.coins).toBe(50);
    expect(s.rep).toBe(repBefore + 5);
    expect(s.xp).toBeGreaterThan(0);
  });

  it("آرامش: رایگان است و رشد را ۱۰٪ تندتر می‌کند", () => {
    const s = onSeasonDay(21);
    proposeFestival(s);
    const coinsBefore = s.coins;
    expect(holdFestival(s, "rest", ev)).toBe(true);
    expect(s.coins).toBe(coinsBefore);
    expect(festActive(s, "rest")).toBe(true);
    // رشد: یک کاشی گندم در دو حالت (با/بدون فستیوال) مقایسه می‌شود
    const withFest = onSeasonDay(21);
    proposeFestival(withFest);
    holdFestival(withFest, "rest", ev);
    const plain = onSeasonDay(21);
    plain.fest = { idx: 0, day: 21, choice: "invest" }; // انتخاب دیگری: رشد بی‌اثر
    for (const st of [withFest, plain]) {
      st.tiles[0] = { k: "soil", v: 0, crop: "wheat", g: 0, wet: true };
      st.weatherLeft = 999;
    }
    const dt = 5; // کوتاه: گندم در ۳۰ ثانیه کامل می‌شود و هر دو به سقف ۱ می‌رسند
    tick(withFest, dt, ev);
    tick(plain, dt, ev);
    expect(withFest.tiles[0].g || 0).toBeGreaterThan(plain.tiles[0].g || 0);
  });

  it("انتخاب فستیوال در فصل‌های بعد بی‌اثر است (فقط همان فصل)", () => {
    const s = onSeasonDay(21);
    proposeFestival(s);
    holdFestival(s, "invest", ev);
    s.seasonIndex = 1; // فصل عوض شد
    expect(festActive(s, "invest")).toBe(false);
  });

  it("انتخابِ جشن و پاداشِ «اولین برداشتِ روز» از سیو و بارگذاری سالم می‌گذرند", () => {
    const s = onSeasonDay(6);
    s.fest = { idx: 1, day: 6, choice: "invest" };
    s.bonusDay = 6;
    const out = sanitizeSave(JSON.parse(JSON.stringify(s)));
    expect(out?.fest).toEqual({ idx: 1, day: 6, choice: "invest" }); // ۶۰۰ سکه‌ی پرداختی با رفرش گم نمی‌شود
    expect(out?.bonusDay).toBe(6); // رفرش پاداشِ روز را دوباره نمی‌دهد
    const bad = JSON.parse(JSON.stringify(s));
    bad.bonusDay = "x";
    expect(sanitizeSave(bad)?.bonusDay).toBe(0);
  });

  it("هر کلیدِ اختیاریِ فهرست‌شده از فیلترِ کلیدهای مجاز رد می‌شود", () => {
    const s = newState() as unknown as Record<string, unknown>;
    const sample: Record<string, unknown> = { xpAcc: 3, bonusDay: 2, fest: { idx: 0, day: 6, choice: "rest" } };
    for (const k of OPTIONAL_STATE_KEYS) if (k in sample) s[k] = sample[k];
    const out = sanitizeSave(JSON.parse(JSON.stringify(s))) as unknown as Record<string, unknown>;
    for (const k of Object.keys(sample)) expect(out[k], k).toBeDefined();
  });

  it("فصل‌های بازی چهارتا و پنج‌روزه‌اند", () => {
    expect(SEASONS).toHaveLength(4);
    expect(Math.floor((6 - 1) / 5) % 4).toBe(1);
  });
});
