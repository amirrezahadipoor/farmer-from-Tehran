import { describe, it, expect } from "vitest";

/**
 * postfx — سقوطِ نرم: در محیطی بدونِ WebGL2 (تست/سرور) حتماً false/null برمی‌گردد
 * تا مسیرِ ۲بعدیِ خالص حفظ شود و بازی هرگز نشکند.
 */
describe("postfx — سقوطِ نرم بدونِ WebGL2", () => {
  it("webgl2Available در محیطِ تست false است و createPostFX null می‌دهد", async () => {
    const m = await import("../src/game/render/postfx");
    expect(m.webgl2Available()).toBe(false);
    const p = await m.createPostFX({ width: 8, height: 8 } as unknown as HTMLCanvasElement);
    expect(p).toBeNull();
  });
});
