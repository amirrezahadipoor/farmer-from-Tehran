"use client";

/**
 * src/game/loop.ts — حلقه‌ی ۶۰ فریمِ بازی (بیرون از React)
 *  • سازگارسازی خودکار رزولوشن (dpr) تا دستگاه ضعیف لگ نزند
 *  • tick منطق، افکت‌ها، هوش راه‌روندگان (کارگرها)، رندر و بررسی هدف داستان
 *  • هر ۰.۲۵ ثانیه یک‌بار UI را باخبر می‌کند (نه ۶۰ بار)
 *  • هر ۱ ثانیه حالِ دره (ساعت، فصل، هوا) را به صدای محیط و موسیقی می‌دهد (P5.12)
 */

import { ambience, type AmbientEnv } from "./audio";
import { DAY_LEN, N, SEASONS } from "./data";
import { tick, locked, idx, ensureQuests, type Events, type State } from "./logic";
import { render } from "./render";
import { updateStory } from "./story";
import { game, rt } from "./store";

const MIN_DPR = 0.6;
const maxDpr = () => Math.min(2, window.devicePixelRatio || 1);

/** تصمیمِ رزولوشن برای پنجره‌ی سنجش (خالص؛ تست‌پذیر). */
export function nextDpr(cur: number, avgFrameMs: number, max: number): number {
  if (avgFrameMs > 20 && cur > MIN_DPR) return Math.max(MIN_DPR, cur - 0.15); // کند → رزولوشن کمتر
  if (avgFrameMs < 13.5 && cur < max) return Math.min(max, cur + 0.1); // جا هست → کیفیت بیشتر
  return cur;
}

/** حالِ صوتیِ دره از وضعیتِ بازی (خالص؛ تست‌پذیر) */
export function soundEnv(s: State): AmbientEnv {
  return {
    hour: ((s.time % DAY_LEN) / DAY_LEN) * 24,
    season: SEASONS[s.seasonIndex]?.id ?? "spring",
    weather: s.weather,
  };
}

function stepWalkers(s: State, dt: number) {
  const wm = rt.walkers;
  const ids = new Set(s.workers.map((w) => w.id));
  for (const k of wm.keys()) if (!ids.has(k)) wm.delete(k);

  for (const w of s.workers) {
    let wk = wm.get(w.id);
    if (!wk) {
      wk = { x: 10, y: 10, tx: 10, ty: 10, kind: w.kind, face: 1, wait: 0 };
      wm.set(w.id, wk);
    }
    const dx = wk.tx - wk.x,
      dy = wk.ty - wk.y,
      d = Math.hypot(dx, dy);
    if (d < 0.05) {
      wk.wait -= dt;
      if (wk.wait <= -2) {
        const opts: number[] = [];
        s.tiles.forEach((tt, i) => {
          const x = i % N,
            y = Math.floor(i / N);
          if (!locked(s, x, y) && (tt.k === "grass" || tt.k === "soil")) opts.push(i);
        });
        const pick = opts[Math.floor(Math.random() * opts.length)] ?? idx(10, 10);
        wk.tx = (pick % N) + 0.5;
        wk.ty = Math.floor(pick / N) + 0.5;
        wk.wait = 0;
      }
    } else {
      const sp = 1.35 * dt;
      wk.x += (dx / d) * Math.min(sp, d);
      wk.y += (dy / d) * Math.min(sp, d);
      wk.wait = 0;
      wk.face = dx - dy > 0 ? 1 : -1;
      if (d < 0.06) wk.wait = 0.001;
    }
  }
}

function stepFx(dt: number) {
  rt.fx = rt.fx.filter((f) => {
    f.life -= dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.kind !== "text") f.vy += 260 * dt;
    else f.vy *= 0.97;
    return f.life > 0;
  });
}

/** حلقه را روی بوم شروع می‌کند؛ خروجی = تابع توقف. */
export function startGameLoop(cv: HTMLCanvasElement, getEv: () => Events): () => void {
  const ctx = cv.getContext("2d");
  if (!ctx) return () => {};
  let raf = 0,
    last = performance.now(),
    uiAcc = 0,
    audioAcc = 1,
    lastFrame = performance.now();

  const resize = () => {
    const v = rt.view;
    v.dpr = maxDpr();
    v.w = window.innerWidth;
    v.h = window.innerHeight;
    cv.width = v.w * v.dpr;
    cv.height = v.h * v.dpr;
    cv.style.width = v.w + "px";
    cv.style.height = v.h + "px";
    if (v.w < 700) v.cam.z = Math.min(v.cam.z, 0.6);
    v.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  };
  resize();
  window.addEventListener("resize", resize);

  const adaptResolution = (t: number) => {
    // پنجره‌ی سنجش: ۴۰ فریم یا ۱ ثانیه (هرکدام زودتر) — روی دستگاه خیلی کند (≈۴ فریم)
    // هم واکنش سریع است؛ فاصله‌های بیش از ۱ ثانیه (تب پنهان/توقف) شمرده نمی‌شوند.
    const p = rt.perf;
    const gap = t - lastFrame;
    lastFrame = t;
    if (gap > 0 && gap < 1000) {
      p.acc += gap;
      p.n += 1;
    }
    if (p.n >= 40 || (p.acc >= 1000 && p.n >= 3)) {
      const avg = p.acc / p.n;
      rt.perf = { acc: 0, n: 0 };
      const v = rt.view;
      const d = nextDpr(v.dpr, avg, maxDpr());
      if (Math.abs(d - v.dpr) > 0.01) {
        v.dpr = d;
        cv.width = Math.round(v.w * d);
        cv.height = Math.round(v.h * d);
      }
    }
  };

  const loop = (t: number) => {
    adaptResolution(t);
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const s = game.get();
    if (s) {
      const ev = getEv();
      tick(s, dt, ev);
      stepFx(dt);
      stepWalkers(s, dt);
      render(ctx, s, rt.view, t / 1000, rt.fx, [...rt.walkers.values()]);
      updateStory(s, ev); // بررسی هدف فصلِ داستان
      audioAcc += dt;
      if (audioAcc >= 1) {
        audioAcc = 0;
        ambience(soundEnv(s));
        ensureQuests(s, new Date()); // P6.2: روز/هفته‌ی تازه = اهدافِ تازه
      }
      uiAcc += dt;
      if (uiAcc > 0.25) {
        uiAcc = 0;
        game.bump();
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}
