import { describe, it, expect, vi, beforeEach } from "vitest";
import { newState, addXp, sell, type Events } from "../src/game/logic";
import { doPrestige } from "../src/game/logic";
import { xpFor } from "../src/game/data";

/** V.3: رویدادهای «حس رضایت» دقیقاً سرِ جای درست صدا زده می‌شوند */
function recorder() {
  const calls: string[] = [];
  const ev: Events = {
    toast: () => {},
    fx: () => {},
    sound: () => {},
    celebrate: (k) => calls.push("celebrate:" + k),
    shake: () => calls.push("shake"),
    coins: (n) => calls.push("coins:" + n),
  };
  return { calls, ev };
}

beforeEach(() => vi.restoreAllMocks());

describe("حس رضایت (V.3)", () => {
  it("سطح گرفتن جشن دارد", () => {
    const s = newState();
    const { calls, ev } = recorder();
    addXp(s, xpFor(1) + 1, ev);
    expect(s.level).toBe(2);
    expect(calls).toContain("celebrate:level");
  });

  it("بدون سطح، جشنی نیست", () => {
    const s = newState();
    const { calls, ev } = recorder();
    addXp(s, 3, ev);
    expect(calls.filter((c) => c.startsWith("celebrate"))).toHaveLength(0);
  });

  it("فروش سکه‌ی پرنده دارد (سقف ۶)", () => {
    const s = newState();
    s.inv.wheat = 40;
    const { calls, ev } = recorder();
    sell(s, "wheat", 40, ev);
    const coin = calls.find((c) => c.startsWith("coins:"));
    expect(coin).toBe("coins:6");
  });

  it("تناسخ جشن و لرزش دارد", () => {
    const s = newState();
    s.level = 20;
    s.coins = 20_000;
    const { calls, ev } = recorder();
    doPrestige(s, ev);
    expect(calls).toContain("celebrate:prestige");
    expect(calls).toContain("shake");
    expect(s.prestige).toBe(1);
  });
});
