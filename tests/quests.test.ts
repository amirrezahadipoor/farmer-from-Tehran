import { describe, it, expect, beforeEach } from "vitest";
import {
  DAILY_TEMPLATES,
  STREAK_BADGES,
  claimQuest,
  claimableQuests,
  dayBonus,
  dayKey,
  ensureQuests,
  makeDaily,
  newState,
  nice,
  normalizeQuests,
  prevDay,
  questDone,
  questProgress,
  questTitle,
  secondsToMidnight,
  weekKey,
  doPrestige,
  type Events,
  type State,
} from "../src/game/logic";
import { sanitizeSave } from "../src/game/sim/sanitize";
import { hasEmoji } from "../src/game/noEmoji";

/**
 * P6.2 — «۳ هدف روزانه با پاداش» + هدف هفتگی، زنجیره و نشان‌ها. «اکنون» تزریق می‌شود.
 */

const toasts: string[] = [];
const sounds: string[] = [];
const ev: Events = { toast: (m) => toasts.push(m), fx: () => {}, sound: (k) => sounds.push(k) };
let s: State;
const D = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);
const DAY1 = D(2026, 9, 27);

beforeEach(() => {
  toasts.length = 0;
  sounds.length = 0;
  s = newState();
  s.level = 6;
  s.achievements = Object.fromEntries(["rich1", "rich2", "rich3", "first_harvest", "level10", "harvest100"].map((k) => [k, true]));
});

/** همه‌ی هدف‌های روزانه را با جلو بردنِ آمارِ مربوط کامل می‌کند */
function completeDaily(st: State) {
  for (const e of st.quests!.daily) st.stats[e.stat] = e.base + e.target;
}

describe("تاریخ", () => {
  it("کلیدِ روز، روزِ قبل (حتی مرزِ ماه و سال)، هفته‌ی ISO و شمارشِ معکوس", () => {
    expect(dayKey(DAY1)).toBe("2026-09-27");
    expect(prevDay("2026-10-01")).toBe("2026-09-30");
    expect(prevDay("2026-01-01")).toBe("2025-12-31");
    expect(weekKey(D(2026, 9, 27))).toBe("2026-W39"); // یکشنبه
    expect(weekKey(D(2026, 9, 28))).toBe("2026-W40"); // دوشنبه = هفته‌ی تازه
    expect(weekKey(D(2021, 1, 3))).toBe("2020-W53");
    expect(secondsToMidnight(D(2026, 9, 27, 23))).toBe(3600);
  });
  it("nice عددِ خوش‌خوان می‌دهد", () => {
    expect([nice(7), nice(43), nice(137), nice(861), nice(3120)]).toEqual([7, 45, 140, 850, 3100]);
  });
});

describe("ساختِ اهداف", () => {
  it("۳ هدفِ متفاوت، قطعی برای یک تاریخ، متفاوت در روزهای مختلف", () => {
    const a = makeDaily(s, "2026-09-27");
    expect(a).toHaveLength(3);
    expect(new Set(a.map((e) => e.id)).size).toBe(3);
    expect(makeDaily(s, "2026-09-27")).toEqual(a);
    const days = Array.from({ length: 14 }, (_, i) => makeDaily(s, dayKey(D(2026, 10, i + 1))).map((e) => e.id).join());
    expect(new Set(days).size).toBeGreaterThan(3);
  });
  it("فقط الگوهای بازشده برای سطح؛ هدف و پاداش با سطح بزرگ می‌شوند", () => {
    s.level = 1;
    for (let i = 1; i <= 20; i++) {
      for (const e of makeDaily(s, dayKey(D(2026, 10, i)))) {
        expect(DAILY_TEMPLATES.find((t) => t.id === e.id)!.minLevel).toBeLessThanOrEqual(1);
      }
    }
    const low = makeDaily(s, "2026-09-27");
    s.level = 20;
    const high = makeDaily(s, "2026-09-27");
    const byId = (list: typeof low, id: string) => list.find((e) => e.id === id);
    for (const e of low) {
      const h = byId(high, e.id);
      if (h) expect(h.target).toBeGreaterThanOrEqual(e.target);
    }
    expect(high[0].coins).toBeGreaterThan(low[0].coins);
  });
  it("عنوان‌ها فارسی و بدون ایموجی‌اند", () => {
    for (let i = 1; i <= 10; i++) {
      for (const e of makeDaily(s, dayKey(D(2026, 11, i)))) {
        expect(questTitle(e)).toMatch(/[\u0600-\u06FF]/);
        expect(hasEmoji(questTitle(e))).toBe(false);
      }
    }
  });
});

describe("پیشرفت و دریافت", () => {
  it("پیشرفت = تفاضلِ آمار از لحظه‌ی ساخت؛ کارهای قبل از ساخت شمرده نمی‌شوند", () => {
    s.stats.harvested = 500;
    ensureQuests(s, DAY1);
    const e = s.quests!.daily[0];
    expect(questProgress(s, e)).toBe(0);
    s.stats[e.stat] += 1;
    expect(questProgress(s, e)).toBe(1);
    s.stats[e.stat] += e.target * 5;
    expect(questProgress(s, e)).toBe(e.target); // سقف
  });

  it("هدفِ ناتمام دریافت نمی‌شود؛ تمام‌شده یک بار و فقط یک بار", () => {
    ensureQuests(s, DAY1);
    expect(claimQuest(s, 0, ev)).toBe(false);
    expect(toasts.at(-1)).toContain("کامل نشده");
    const e = s.quests!.daily[0];
    s.stats[e.stat] = e.base + e.target;
    expect(claimableQuests(s)).toBeGreaterThanOrEqual(1);
    const coins = s.coins;
    expect(claimQuest(s, 0, ev)).toBe(true);
    expect(s.coins).toBe(coins + e.coins);
    expect(claimQuest(s, 0, ev)).toBe(false);
    expect(s.coins).toBe(coins + e.coins);
    expect(sounds).toContain("goal");
  });

  it("پاداشِ یک هدف، هدفِ «درآمد» را خودبه‌خود جلو نمی‌برد", () => {
    ensureQuests(s, DAY1);
    const q = s.quests!;
    q.daily = [
      { id: "harvest", stat: "harvested", target: 5, base: 0, coins: 5000, xp: 1, sp: 0, claimed: false },
      { id: "earn", stat: "earned", target: 1000, base: s.stats.earned, coins: 10, xp: 1, sp: 0, claimed: false },
      { id: "invest", stat: "spent", target: 10, base: 0, coins: 10, xp: 1, sp: 0, claimed: false },
    ];
    s.stats.harvested = 5;
    claimQuest(s, 0, ev);
    expect(questDone(s, q.daily[1])).toBe(false);
    expect(questProgress(s, q.daily[1])).toBe(0);
  });

  it("هدفِ هفتگی امتیاز مهارت هم می‌دهد", () => {
    ensureQuests(s, DAY1);
    const w = s.quests!.weekly!;
    expect(w.sp).toBe(1);
    s.stats[w.stat] = w.base + w.target;
    const sp = s.stats.skillPoints;
    expect(claimQuest(s, "weekly", ev)).toBe(true);
    expect(s.stats.skillPoints).toBe(sp + 1);
    expect(s.quests!.bonus).toBe(false); // هفتگی جایزه‌ی روز نمی‌دهد
  });
});

describe("روزِ تازه، زنجیره و نشان‌ها", () => {
  it("هر سه = جایزه‌ی روز و زنجیره‌ی ۱؛ روزِ تازه اهدافِ تازه می‌آورد", () => {
    ensureQuests(s, DAY1);
    completeDaily(s);
    const coins = s.coins;
    const bonus = dayBonus(s);
    const sum = s.quests!.daily.reduce((a, e) => a + e.coins, 0);
    [0, 1, 2].forEach((i) => claimQuest(s, i, ev));
    expect(s.quests!.bonus).toBe(true);
    expect(s.quests!.streak).toBe(1);
    expect(s.coins).toBe(coins + sum + bonus);
    const before = s.quests!.daily.map((e) => e.id).join();
    expect(ensureQuests(s, D(2026, 9, 27, 23))).toBe(false); // همان روز: بی‌تغییر
    expect(ensureQuests(s, D(2026, 9, 28, 8))).toBe(true);
    expect(s.quests!.daily.every((e) => !e.claimed)).toBe(true);
    expect(s.quests!.bonus).toBe(false);
    expect(s.quests!.streak).toBe(1); // دیروز کامل بود: زنجیره زنده است
    expect(s.quests!.day).toBe("2026-09-28");
    expect(s.quests!.daily.map((e) => e.id).join()).toBe(makeDaily(s, "2026-09-28").map((e) => e.id).join());
    expect(typeof before).toBe("string");
  });

  it("روزِ جاافتاده زنجیره را صفر می‌کند", () => {
    ensureQuests(s, DAY1);
    completeDaily(s);
    [0, 1, 2].forEach((i) => claimQuest(s, i, ev));
    ensureQuests(s, D(2026, 9, 29)); // ۲۸ام جا افتاد
    expect(s.quests!.streak).toBe(0);
    completeDaily(s);
    [0, 1, 2].forEach((i) => claimQuest(s, i, ev));
    expect(s.quests!.streak).toBe(1);
    expect(s.quests!.best).toBe(1);
  });

  it("۷ روز پشتِ‌سرِهم: نشان‌های ۳ و ۷ روزه، هر کدام یک بار، با امتیاز مهارت", () => {
    const sp0 = s.stats.skillPoints;
    for (let d = 0; d < 7; d++) {
      ensureQuests(s, D(2026, 10, 1 + d));
      completeDaily(s);
      [0, 1, 2].forEach((i) => claimQuest(s, i, ev));
    }
    const q = s.quests!;
    expect(q.streak).toBe(7);
    expect(q.badges.sort((a, b) => a - b)).toEqual([3, 7]);
    const spBadges = STREAK_BADGES.filter((b) => b.days <= 7).reduce((a, b) => a + b.sp, 0);
    expect(s.stats.skillPoints - sp0).toBeGreaterThanOrEqual(spBadges);
    expect(toasts.filter((t) => t.includes("نشانِ تازه"))).toHaveLength(2);
    expect(sounds).toContain("achievement");
  });

  it("هفته‌ی تازه هدفِ هفتگیِ تازه می‌سازد", () => {
    ensureQuests(s, D(2026, 9, 27));
    const w1 = s.quests!.week;
    ensureQuests(s, D(2026, 9, 28));
    expect(s.quests!.week).not.toBe(w1);
    expect(s.quests!.weekly!.claimed).toBe(false);
  });

  it("نسخه‌گردانی: اهداف و زنجیره می‌مانند؛ «خرج»ِ صفرشده پیشرفتِ منفی نمی‌سازد", () => {
    s.stats.spent = 50_000;
    ensureQuests(s, DAY1);
    s.quests!.streak = 4;
    s.quests!.daily[0] = { id: "invest", stat: "spent", target: 300, base: 50_000, coins: 100, xp: 10, sp: 0, claimed: false };
    s.level = 25;
    s.coins = 10_000_000;
    s.stats.earned = 10_000_000;
    doPrestige(s, ev);
    expect(s.quests?.streak).toBe(4);
    expect(s.stats.spent).toBe(0);
    ensureQuests(s, DAY1);
    expect(s.quests!.daily[0].base).toBe(0);
    expect(questProgress(s, s.quests!.daily[0])).toBe(0);
  });
});

describe("سیو", () => {
  it("اهداف از سیو و sanitize سالم عبور می‌کنند", () => {
    ensureQuests(s, DAY1);
    completeDaily(s);
    claimQuest(s, 0, ev);
    const back = sanitizeSave(JSON.parse(JSON.stringify(s)))!;
    expect(back.quests).toEqual(s.quests);
  });
  it("اهدافِ خراب حذف می‌شوند (نه کرش) و دوباره ساخته می‌شوند", () => {
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    raw.quests = { day: "bad", daily: "x" };
    const back = sanitizeSave(raw)!;
    expect(back.quests).toBeUndefined();
    expect(ensureQuests(back, DAY1)).toBe(true);
    expect(back.quests!.daily).toHaveLength(3);
    expect(normalizeQuests(null)).toBeUndefined();
    const partial = normalizeQuests({ day: "2026-09-27", week: "2026-W39", daily: [{ id: "nope" }, { id: "harvest", stat: "harvested", target: 5, base: 1 }], badges: [3, 3, 99], streak: -4, best: "x" })!;
    expect(partial.daily).toHaveLength(1);
    expect(partial.badges).toEqual([3]);
    expect(partial.streak).toBe(0);
    expect(partial.weekly).toBeNull();
  });
});
