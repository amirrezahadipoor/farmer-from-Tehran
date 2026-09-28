import { describe, expect, it } from "vitest";
import { achievementProgress } from "../src/game/sim/achieve";
import { newState, idx } from "../src/game/logic";

/** B/T8 — پوششِ پیشرفتِ زنده‌ی دستاوردها (V.8): هر شاخه، گیرِ کف و سقف و میان‌برِ کسب‌شده */
describe("achievementProgress — نوارِ پیشرفتِ دیوارِ مدال‌ها", () => {
  it("دستاوردِ کسب‌شده = ۱ حتی اگر آمارِ فعلی کمتر باشد", () => {
    const s = newState();
    s.achievements.rich1 = true;
    expect(achievementProgress(s, "rich1")).toBe(1);
    s.coins = 5;
    expect(achievementProgress(s, "rich1")).toBe(1);
  });

  it("سکه و سطح: نسبت‌های درست و گیر در ۰..۱", () => {
    const s = newState();
    s.coins = 500;
    expect(achievementProgress(s, "rich1")).toBeCloseTo(0.5);
    expect(achievementProgress(s, "rich2")).toBeCloseTo(0.05);
    s.coins = 1e9;
    expect(achievementProgress(s, "rich3")).toBe(1);
    expect(achievementProgress(s, "rich1")).toBe(1);
    expect(achievementProgress(s, "level10")).toBeCloseTo(0.1);
    s.level = 30;
    expect(achievementProgress(s, "level25")).toBe(1);
  });

  it("کارخانه، زمین، مهارت و اتوماسیون از آمار و کاشی‌ها می‌خوانند", () => {
    const s = newState();
    s.stats.produced = 30;
    expect(achievementProgress(s, "factory_master")).toBeCloseTo(0.5);
    s.bought = 5;
    expect(achievementProgress(s, "land_baron")).toBeCloseTo(0.5);
    s.skills = ["zen_master", "crop_lord"];
    expect(achievementProgress(s, "skill_master")).toBeCloseTo(0.2);
    s.tiles[idx(2, 2)] = { k: "grass", v: 0, b: "coop" };
    expect(achievementProgress(s, "zoo")).toBeCloseTo(0.2);
    expect(achievementProgress(s, "automation_king")).toBe(0); // coop اتومات نیست
    s.tiles[idx(3, 2)] = { k: "grass", v: 0, b: "barn" };
    s.tiles[idx(4, 2)] = { k: "grass", v: 0, b: "auto_planter" };
    expect(achievementProgress(s, "automation_king")).toBeCloseTo(0.2);
  });

  it("دستاوردِ ناشناخته → ۰ و هرگز بیرون از ۰..۱ نمی‌رود", () => {
    const s = newState();
    expect(achievementProgress(s, "چنین_ندارد")).toBe(0);
    s.stats.harvested = -50; // داده‌ی خراب
    expect(achievementProgress(s, "first_harvest")).toBe(0);
  });
});
