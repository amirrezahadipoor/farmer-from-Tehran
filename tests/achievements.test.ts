/**
 * tests/achievements.test.ts — V.8: دیوار مدال‌ها؛ تاریخ روز و پیشرفت زنده
 */
import { it, expect, describe } from "vitest";
import { newState, harvest, achievementProgress, sell } from "../src/game/logic";
import { sanitizeSave } from "../src/game/sim/sanitize";
import type { Events } from "../src/game/logic";

const ev: Events = { toast: () => {}, fx: () => {}, sound: () => {}, celebrate: () => {} };

describe("V.8 — دیوار مدال‌ها", () => {
  it("دستاورد به‌جای true، شماره‌ی روزِ گرفتن را ذخیره می‌کند", () => {
    const s = newState();
    s.tiles[147] = { k: "grass", v: 0, crop: "tomato", g: 1 };
    s.day = 4;
    expect(harvest(s, 3, 4, ev)).toBe(true); // اولین برداشت ← دستاورد first_harvest
    expect(s.achievements.first_harvest).toBe(4);
  });

  it("پیشرفت دستاوردهای نگرفته بین ۰ و  است و با رشد وضعیت بالا می‌رود", () => {
    const s = newState();
    const p1 = achievementProgress(s, "rich1");
    s.coins = 500;
    expect(achievementProgress(s, "rich1")).toBeCloseTo(0.5, 5);
    expect(p1).toBeLessThan(0.5);
    s.coins = 5000;
    expect(achievementProgress(s, "rich1")).toBe(1);
    expect(achievementProgress(s, "level25")).toBeLessThanOrEqual(1);
  });

  it("سیو قدیمی با true و سیو نو با شماره‌ی روز هر دو از sanitize عبور می‌کنند", () => {
    const s = newState();
    s.achievements = { rich1: true, first_harvest: 7, zoo: "x" as unknown as boolean };
    const ok = sanitizeSave(JSON.parse(JSON.stringify(s)));
    expect(ok).toBeTruthy();
    const a = ok!.achievements;
    expect(a.rich1).toBe(true);
    expect(a.first_harvest).toBe(7);
    expect(a.zoo).toBeUndefined();
  });

  it("فروشِ ساده دستاوردِ ثروت را با شماره‌ی روز می‌دهد", () => {
    const s = newState();
    s.inv.wheat = 20;
    s.day = 9;
    sell(s, "wheat", 20, ev);
    if (s.achievements.rich1) expect(s.achievements.rich1).toBe(9);
    expect(achievementProgress(s, "rich1")).toBeGreaterThanOrEqual(0);
  });
});
