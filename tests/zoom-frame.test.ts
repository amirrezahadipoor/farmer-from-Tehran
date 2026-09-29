import { describe, expect, it, beforeEach } from "vitest";
import { zoomBy, recenter } from "../src/game/useCanvasInput";
import { game, rt } from "../src/game/store";
import { newState } from "../src/game/logic";

/**
 * رگرسیونِ باگِ زوم‌اوت (گزارشِ کاربر: «زوم اوت که می‌کنیم اصلاً دیگه مزرعه رو نشون نمیده»):
 * کوچک‌نمایی باید مرکزِ توده‌ی زمین‌های خریداری‌شده را در کادر نگه دارد.
 */
function farmScreenPos() {
  const v = rt.view;
  const st = game.get()!;
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < st.tiles.length; i++) {
    const gx = i % 36, gy = Math.floor(i / 36);
    if (!st.chunks[Math.floor(gy / 4) * 9 + Math.floor(gx / 4)]) continue;
    sx += ((gx - gy) * 44) * v.cam.z + v.w / 2 + v.cam.x;
    sy += ((gx + gy + 1) * 22 - 36 * 22) * v.cam.z + v.h / 2 + v.cam.y;
    n++;
  }
  return { x: sx / n, y: sy / n };
}

const inFrame = (p: { x: number; y: number }) =>
  p.x > 0 && p.x < rt.view.w && p.y > 0 && p.y < rt.view.h;

describe("دوربین: زوم‌اوتِ هوشمند", () => {
  beforeEach(() => {
    const s = newState();
    game.set(s);
    rt.view.w = 412;
    rt.view.h = 839;
    rt.view.cam.z = 1.0;
    rt.view.cam.x = 0;
    rt.view.cam.y = 0;
  });

  it("بعد از درگِ دور به دریا، زوم‌اوت مزرعه را به کادر برمی‌گرداند", () => {
    // کاربر نقشه را دور کرده (مزرعه از کادر خارج شده)
    rt.view.cam.x = -2600;
    rt.view.cam.y = -1900;
    for (let i = 0; i < 6; i++) zoomBy(0.8);
    expect(inFrame(farmScreenPos())).toBe(true); // مزرعه دیده می‌شود
  });

  it("زوم‌اوتِ وقتی مزرعه در کادر است، دوربین را نمی‌کشد", () => {
    const before = { x: rt.view.cam.x, y: rt.view.cam.y };
    zoomBy(0.8);
    // مرکزِ مزرعه نزدیکِ مرکزِ نقشه است؛ در این وضعیت جابه‌جایی باید صفر یا کم باشد
    expect(Math.abs(rt.view.cam.x - before.x)).toBeLessThan(1);
    expect(Math.abs(rt.view.cam.y - before.y)).toBeLessThan(1);
  });

  it("کفِ زوم با دکمه‌ها مرکزِ مزرعه را نشان می‌دهد", () => {
    rt.view.cam.x = -2600;
    rt.view.cam.y = -1900;
    for (let i = 0; i < 12; i++) zoomBy(0.8); // چند بارِ اضافه: در کفِ زوم recenterِ خودکار می‌شود
    expect(inFrame(farmScreenPos())).toBe(true);
    expect(rt.view.cam.z).toBeGreaterThan(0); // recenter زومِ کاربردی برمی‌گرداند
  });

  it("recenter به مرکزِ زمین‌های خریداری‌شده برمی‌گردد", () => {
    rt.view.cam.x = -3000;
    rt.view.cam.z = 0.3;
    recenter();
    const p = farmScreenPos();
    expect(Math.abs(p.x - rt.view.w / 2)).toBeLessThan(rt.view.w * 0.34);
    expect(Math.abs(p.y - rt.view.h / 2)).toBeLessThan(rt.view.h * 0.34);
  });
});
