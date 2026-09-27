import { describe, it, expect } from "vitest";
import { newState, toolAction, sell, type Events } from "../src/game/logic";
import { TOUR_STEPS } from "../src/game/tourSteps";

/**
 * tests/tour.test.ts — آموزشِ تعاملی در بازیِ تازه گیر نمی‌کند (نقشه‌ی راه، مورد ۵)
 * هر گام با همان زمینی که حلقه نشان می‌دهد و همان ابزار، با منطقِ واقعیِ بازی انجام می‌شود و شاخصش بالا می‌رود.
 */
const quiet: Events = { toast: () => {}, fx: () => {}, sound: () => {} };

describe("آموزشِ تعاملی", () => {
  it("پنج گام: شخم، کاشت، آبیاری، برداشت و فروش", () => {
    expect(TOUR_STEPS.map((s) => s.title)).toEqual(["شخم بزن", "بذر بکار", "آبیاری کن", "برداشت کن", "بفروش"]);
  });

  it("در بازیِ تازه هر گام با هدفِ نشان‌داده‌شده انجام‌شدنی است و فقط با همان کار جلو می‌رود", () => {
    for (let seed = 0; seed < 5; seed++) {
      const s = newState();
      for (const step of TOUR_STEPS) {
        const before = step.metric(s);
        if (step.tool) {
          const p = step.tile?.(s);
          expect(p, `${step.title}: زمینِ هدف (بازیِ ${seed})`).toBeTruthy();
          expect(s.chunks.length).toBeGreaterThan(0);
          toolAction(s, p!.x, p!.y, step.tool, step.tool === "seed" ? "wheat" : "", quiet);
        } else {
          const item = Object.keys(s.inv).find((k) => (s.inv[k] || 0) > 0);
          expect(item, "بعد از برداشت چیزی برای فروش هست").toBeTruthy();
          sell(s, item!, 1, quiet);
        }
        expect(step.metric(s), `${step.title} (بازیِ ${seed})`).toBeGreaterThan(before);
      }
    }
  });

  it("کارِ نادرست گام را جلو نمی‌برد (ابزارِ دیگر روی همان زمین)", () => {
    const s = newState();
    const plow = TOUR_STEPS[0];
    const p = plow.tile?.(s);
    const before = plow.metric(s);
    toolAction(s, p!.x, p!.y, "water", "", quiet);
    expect(plow.metric(s)).toBe(before);
  });
});
