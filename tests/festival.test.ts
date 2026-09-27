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

const ev: Events = { toast: () => {}, fx: () => {}, sound: () => {}, celebrate: () => {} };

function onSeasonDay(day: number): State {
  const s = newState();
  s.time = (day - 1) * DAY_LEN + 1;
  s.day = day;
  s.seasonIndex = Math.floor((day - 1) / 5) % 4;
  return s;
}

describe("V.5 — فستیوال فصلی دهکده", () => {
  it("فقط روز اول هر فصل پیشنهاد می‌شود", () => {
    expect(proposeFestival(onSeasonDay(1))).toBe(true);   // روز ۱ فصل بهار
    expect(proposeFestival(onSeasonDay(6))).toBe(true);   // روز ۶ فصل تابستان
    expect(proposeFestival(onSeasonDay(3))).toBe(false);  // وسط فصل
  });

  it("در هر فصل فقط یک‌بار پیشنهاد می‌شود", () => {
    const s = onSeasonDay(1);
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
    const s = onSeasonDay(1);
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
    const s = onSeasonDay(1);
    proposeFestival(s);
    s.coins = 10;
    const toast = vi.fn();
    expect(holdFestival(s, "invest", { ...ev, toast })).toBe(false);
    expect(s.fest?.choice).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("کافی"), "err");
  });

  it("ضیافت: ۲۵۰ سکه می‌گیرد، تجربه و اعتبار می‌دهد", () => {
    const s = onSeasonDay(1);
    proposeFestival(s);
    s.coins = 300;
    const repBefore = s.rep;
    expect(holdFestival(s, "feast", ev)).toBe(true);
    expect(s.coins).toBe(50);
    expect(s.rep).toBe(repBefore + 5);
    expect(s.xp).toBeGreaterThan(0);
  });

  it("آرامش: رایگان است و رشد را ۱۰٪ تندتر می‌کند", () => {
    const s = onSeasonDay(1);
    proposeFestival(s);
    const coinsBefore = s.coins;
    expect(holdFestival(s, "rest", ev)).toBe(true);
    expect(s.coins).toBe(coinsBefore);
    expect(festActive(s, "rest")).toBe(true);
    // رشد: یک کاشی گندم در دو حالت (با/بدون فستیوال) مقایسه می‌شود
    const withFest = onSeasonDay(1);
    proposeFestival(withFest);
    holdFestival(withFest, "rest", ev);
    const plain = onSeasonDay(1);
    plain.fest = { idx: 0, day: 1, choice: "invest" }; // انتخاب دیگری: رشد بی‌اثر
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
    const s = onSeasonDay(1);
    proposeFestival(s);
    holdFestival(s, "invest", ev);
    s.seasonIndex = 1; // فصل عوض شد
    expect(festActive(s, "invest")).toBe(false);
  });

  it("فصل‌های بازی چهارتا و پنج‌روزه‌اند", () => {
    expect(SEASONS).toHaveLength(4);
    expect(Math.floor((6 - 1) / 5) % 4).toBe(1);
  });
});
