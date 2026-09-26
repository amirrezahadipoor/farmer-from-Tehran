import { describe, it, expect, beforeAll } from "vitest";
import { newState, idx, type State } from "../src/game/logic";
import { N } from "../src/game/data";

/**
 * P5.14 — کشِ زمین و اسپرایت: شمارشِ واقعیِ فراخوان‌های رسم در یک فریم (بومِ ساختگیِ ضبط‌کننده).
 * همین نما و همین نقشه با رندرِ پیش از P5.14 (سنجیده با همین بومِ ساختگی):
 *   ۷۷۲ گرادیان، ۲۰۷۷ fill، ۲۹۷۹ stroke، ۲۳۳ fillRect، ≈ ۱۶ هزار عملِ مسیر در هر فریم.
 * حالا: زمین یک drawImage، هر درخت/سنگ/کاشیِ محصول یک drawImage، و گرادیان فقط برای
 * دیوارِ ساختمان‌ها.
 */
type Counts = Record<string, number>;
const frame: Counts = {};
const cache: Counts = {};
function fakeCtx(counts: Counts, canvas: { width: number; height: number }) {
  const target: Record<string | symbol, unknown> = { canvas };
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return (..._a: unknown[]) => {
        counts[k as string] = (counts[k as string] || 0) + 1;
        if (k === "createLinearGradient" || k === "createRadialGradient") return { addColorStop() {} };
        if (k === "createPattern") return { setTransform() {} };
        if (k === "measureText") return { width: 0 };
        return undefined;
      };
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}
class FakePath { moveTo() {} lineTo() {} ellipse() {} quadraticCurveTo() {} closePath() {} arc() {} rect() {} }

let render: typeof import("../src/game/render").render;
let renderStats: typeof import("../src/game/render").renderStats;
let screenFx: typeof import("../src/game/render").screenFx;
let ground: typeof import("../src/game/render/ground");
let nature: typeof import("../src/game/render/nature");
beforeAll(async () => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.Path2D = FakePath;
  g.DOMMatrix = class { constructor(_m?: number[]) {} };
  g.document = { createElement: () => { const c = { width: 1, height: 1, getContext: () => fakeCtx(cache, c) }; return c; } };
  ({ render, renderStats, screenFx } = await import("../src/game/render"));
  ground = await import("../src/game/render/ground");
  nature = await import("../src/game/render/nature");
});

const view = () => ({ w: 412, h: 839, dpr: 1, cam: { x: 0, y: -14, z: 0.6 }, hover: null, tool: "hand", arg: "" });
function frameOf(s: State, now: number, v = view()) {
  for (const k of Object.keys(frame)) delete frame[k];
  const c = { width: 412, height: 839 };
  render(fakeCtx(frame, c), s, v, now, [], []);
  return { ...frame };
}
const draws = (c: Counts) => (c.fill || 0) + (c.stroke || 0) + (c.fillRect || 0) + (c.drawImage || 0);

describe("کشِ زمین و اسپرایت (P5.14)", () => {
  it("فریمِ پایدار: زمین و درخت و محصول صفر گرادیان (فقط دیوارِ ساختمان‌ها)، fill+stroke زیرِ ۱۰۰ (قبلاً ۵۰۵۶)", () => {
    const s = newState();
    s.weather = "sun";
    const blds = s.tiles.filter((t) => t.k === "bld").length;
    frameOf(s, 1); // فریمِ اول کش را می‌سازد
    const st0 = renderStats();
    const f = frameOf(s, 1.016);
    expect(f.createLinearGradient || 0).toBeLessThanOrEqual(3 * blds); // دیوارِ چپ/راست + شیروانی
    expect(f.createRadialGradient || 0).toBe(0);
    expect(f.drawImage || 0).toBeGreaterThanOrEqual(1);
    expect((f.fill || 0) + (f.stroke || 0) + (f.fillRect || 0)).toBeLessThan(100);
    const sprites = s.tiles.filter((t) => t.k === "tree" || t.k === "rock" || t.crop).length;
    expect(f.drawImage || 0).toBeLessThanOrEqual(sprites + 8); // یک drawImage برای هر شیء + زمین و تابلوها
    // بدونِ ساختمان: هیچ گرادیانی در فریم ساخته نمی‌شود
    for (const t of s.tiles) if (t.k === "bld") { t.k = "grass"; delete t.b; }
    frameOf(s, 1.1);
    const g = frameOf(s, 1.2);
    expect((g.createLinearGradient || 0) + (g.createRadialGradient || 0)).toBe(0);
    expect(renderStats().rebuilds).toBe(st0.rebuilds); // فریمِ دوم کش را از نو نمی‌سازد
    console.log(`[render] فریمِ پایدار: ${JSON.stringify({ fill: f.fill || 0, stroke: f.stroke || 0, fillRect: f.fillRect || 0, drawImage: f.drawImage || 0, gradients: f.createLinearGradient || 0, total: draws(f) })}`);
  });

  it("عوض شدنِ یک کاشی = وصله‌ی همان ناحیه، نه بازسازیِ کل؛ فصلِ تازه = بازسازی", () => {
    const s = newState();
    s.weather = "sun";
    frameOf(s, 1);
    const a = renderStats();
    const t = s.tiles[idx(17, 17)];
    t.wet = !t.wet; // آب دادن
    frameOf(s, 1.1);
    const b = renderStats();
    expect(b.patches).toBe(a.patches + 1);
    expect(b.rebuilds).toBe(a.rebuilds);
    s.seasonIndex = (s.seasonIndex + 1) % 4;
    frameOf(s, 1.2);
    expect(renderStats().rebuilds).toBe(b.rebuilds + 1);
  });

  it("پله‌ی مقیاسِ کش و رسمِ مستقیم در زومِ نزدیک (با پسماند)", () => {
    expect(ground.cacheStep(0.36)).toBe(0.35);
    expect(ground.cacheStep(0.6)).toBe(0.7);
    expect(ground.cacheStep(1.2)).toBe(1.28);
    expect(ground.cacheStep(5)).toBe(1.28); // سقفِ حافظه: ≈ ۸.۳ مگاپیکسل
    expect(ground.GW * ground.GH * 1.28 * 1.28).toBeLessThan(16.7e6); // زیرِ سقفِ بومِ iOS
    expect(ground.wantsDirect(1.4, false)).toBe(false);
    expect(ground.wantsDirect(1.5, false)).toBe(true);
    expect(ground.wantsDirect(1.35, true)).toBe(true); // پسماند: چشمک نمی‌زند
    expect(ground.wantsDirect(1.2, true)).toBe(false);
    const s = newState();
    frameOf(s, 1, { ...view(), cam: { x: 0, y: 0, z: 1.8 }, dpr: 1 }); // زومِ خیلی نزدیک
    expect(renderStats().direct).toBe(true);
  });

  it("کلیدِ زمین فقط با چیزهایی عوض می‌شود که واقعاً دیده می‌شوند", () => {
    const s = newState();
    const i = idx(17, 17);
    const k0 = ground.groundKey(s, i, false);
    s.tiles[i].g = 0.7; // رشدِ محصول ← زمین همان است
    expect(ground.groundKey(s, i, false)).toBe(k0);
    expect(ground.groundKey(s, i, true)).not.toBe(ground.groundKey(s, idx(0, 0), true)); // کاشی‌های متفاوت
    s.tiles[i].fert = true;
    expect(ground.groundKey(s, i, false)).not.toBe(k0);
    const j = idx(0, 0);
    const k1 = ground.groundKey(s, j, false);
    s.chunks[0] = true; // خریدِ زمین (قفل باز)
    expect(ground.groundKey(s, j, false)).not.toBe(k1);
  });

  it("اسپرایت: هر درختِ هم‌شکل یک بار کشیده می‌شود (نه در هر فریم)", () => {
    const s = newState();
    s.weather = "sun";
    frameOf(s, 1);
    const n1 = nature.spriteCount();
    frameOf(s, 1.5);
    frameOf(s, 2.5);
    expect(nature.spriteCount()).toBe(n1);
    const trees = s.tiles.filter((t) => t.k === "tree").length;
    expect(n1).toBeLessThan(trees); // کمتر از تعدادِ درخت‌ها: اسپرایتِ مشترک
  });

  it("لایه‌های CSSِ صفحه: شب تیره، روز روشن، مه فقط در مه", () => {
    const s = newState();
    s.time = 12 * 10; // ظهر (DAY_LEN = ۲۴۰)
    s.weather = "sun";
    const day = screenFx(s);
    expect(day.dark).toBe(0);
    expect(day.fog).toBe(0);
    s.time = 23 * 10;
    s.weather = "fog";
    const night = screenFx(s);
    expect(night.dark).toBeGreaterThan(0.3);
    expect(night.sky).toBeCloseTo(night.dark * 0.85);
    expect(night.fog).toBe(1);
  });

  it("کلِ نقشه در کش جا می‌شود (هیچ کاشی بیرونِ مستطیلِ کش نیست)", () => {
    for (const [gx, gy] of [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]) {
      const x = (gx - gy) * 44, y = (gx + gy + 1) * 22 - N * 22;
      expect(x - 44).toBeGreaterThanOrEqual(ground.X0);
      expect(x + 44).toBeLessThanOrEqual(ground.X0 + ground.GW);
      expect(y - 22 - 14).toBeGreaterThanOrEqual(ground.Y0); // تیرکِ پرچین در لبه‌ی بالا
      expect(y + 22).toBeLessThanOrEqual(ground.Y0 + ground.GH);
    }
  });
});
