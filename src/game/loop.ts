"use client";

/**
 * src/game/loop.ts — حلقه‌ی ۶۰ فریمِ بازی (بیرون از React)
 *  • سازگارسازی خودکار رزولوشن (dpr) تا دستگاه ضعیف لگ نزند؛ با سقفِ پسماند (P6.6) تا
 *    بعد از یک شروعِ کند دوباره بالا برود ولی بینِ دو سطح نوسان نکند
 *  • پشتِ پرده‌ی تمام‌صفحه‌ی داستان رندر نمی‌شود (باتری)؛ شبیه‌سازی ادامه دارد
 *  • tick منطق، افکت‌ها، هوش راه‌روندگان (کارگرها)، رندر و بررسی هدف داستان
 *  • هر ۰.۲۵ ثانیه یک‌بار UI را باخبر می‌کند (نه ۶۰ بار)
 *  • هر ۱ ثانیه حالِ دره (ساعت، فصل، هوا) را به صدای محیط و موسیقی می‌دهد (P5.12)
 */

import { ambience, type AmbientEnv } from "./audio";
import { DAY_LEN, N, SEASONS } from "./data";
import { tick, locked, idx, ensureQuests, type Events, type State } from "./logic";
import { applyScreenFx, lightInfo, render, renderStats, screenFx, waterMaskCanvas } from "./render";
import type { PostFX } from "./render/postfx";
import { updateStory } from "./story";
import { updateLineage } from "./lineageStory";
import { game, rt } from "./store";
import { stepHero } from "./hero";
import { stepGuests } from "./guests";
import { stepSfx, drawSfx } from "./juice";
import { raiseFatal, reportError } from "./errors";

const MIN_DPR = 0.6;
const maxDpr = () => Math.min(2, window.devicePixelRatio || 1);

/**
 * تصمیمِ رزولوشن برای پنجره‌ی سنجش (خالص؛ تست‌پذیر).
 * کند (> ۲۰ms) → کمتر؛ هم‌پای vsync (< ۱۷.۵ms، یعنی ۵۷+ فریم) → بیشتر تا سقف. پیش از P6.6
 * آستانه‌ی بالا رفتن ۱۳.۵ms بود که در ۶۰ هرتز هرگز رخ نمی‌دهد: یک شروعِ کند رزولوشن را
 * برای همیشه روی ۰.۶ نگه می‌داشت.
 */
export function nextDpr(cur: number, avgFrameMs: number, max: number, ceil = max): number {
  if (avgFrameMs > 18.5 && cur > MIN_DPR) {
    // زیرِ ۵۴ فریم → رزولوشن کمتر. هزینه‌ی رسم ≈ تعدادِ پیکسل ≈ dpr²، پس کندیِ شدید یک‌جا به
    // تخمین می‌پرد (۱۰٪ حاشیه) به‌جای ده‌ها پله‌ی ۰.۱۵ (دستگاهِ ضعیف در ۱ تا ۲ پنجره می‌نشیند)
    const est = Math.round(cur * Math.sqrt(16.7 / avgFrameMs) * 0.9 * 20) / 20;
    return Math.max(MIN_DPR, Math.min(cur - 0.15, est));
  }
  const top = Math.min(max, ceil);
  if (avgFrameMs < 17.3 && cur < top - 0.001) return Math.min(top, cur + 0.1); // ۵۸+ فریم → کیفیت بیشتر
  return cur;
}
export interface DprState { dpr: number; ceil: number }
/** با سقفِ پسماند: سطحی که کند بود دوباره امتحان نمی‌شود؛ سقف = آخرین سطحِ سالمِ زیرِ آن */
export function adaptDpr(st: DprState, avgFrameMs: number, max: number): DprState {
  const d = nextDpr(st.dpr, avgFrameMs, max, st.ceil);
  return { dpr: d, ceil: d < st.dpr ? Math.max(MIN_DPR, st.dpr - 0.1) : st.ceil };
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
    if (f.kind !== "text" && f.kind !== "ring") f.vy += 260 * dt;
    else f.vy *= 0.97;
    return f.life > 0;
  });
}

/** حلقه را روی بوم شروع می‌کند؛ خروجی = تابع توقف. */
export function startGameLoop(cv: HTMLCanvasElement, getEv: () => Events): () => void {
  // بومِ شفاف: آسمان و رنگ‌های صفحه‌ای لایه‌ی CSS زیر/روی بوم هستند (ui/ScreenLayers.tsx)
  const ctx = cv.getContext("2d");
  if (!ctx) return () => {};
  // ── انجینِ آرت، فازِ ۱: پست‌پردازشِ GPU (PixiJS/WebGL2) — اختیاری؛ نبودنش = مسیرِ ۲بعدیِ خالص
  const srcCv = document.createElement("canvas");
  const sctx2d = srcCv.getContext("2d");
  let postFX: PostFX | null = null;
  let maskSeen: HTMLCanvasElement | null = null;
  void (async () => {
    try {
      const m = await import("./render/postfx");
      if (m.webgl2Available()) postFX = (await m.createPostFX(srcCv)) ?? null;
    } catch { /* مسیرِ ۲بعدی می‌ماند */ }
  })();
  let raf = 0,
    last = performance.now(),
    uiAcc = 0,
    audioAcc = 1,
    lastFrame = performance.now(),
    ceil = maxDpr(),
    skipGap = false;

  const resize = () => {
    const v = rt.view;
    // شروع از ≤ ۱.۵: دستگاهِ قوی در چند ثانیه به سقف می‌رسد، دستگاهِ ضعیف چند ثانیه‌ی اول را
    // با کشِ زمینِ غول‌آسا و فریم‌های نیم‌ثانیه‌ای شروع نمی‌کند
    v.dpr = Math.min(1.5, maxDpr());
    v.maxDpr = maxDpr();
    ceil = maxDpr(); // اندازه‌ی تازه = سنجشِ تازه
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
    const v = rt.view;
    if (rt.dprLock && Math.abs(v.dpr - rt.dprLock) > 0.001) { // قفلِ دستی (سنجش/تست)
      v.dpr = rt.dprLock;
      cv.width = Math.round(v.w * v.dpr);
      cv.height = Math.round(v.h * v.dpr);
    }
    // فریمی که کشِ زمین را از نو ساخت یا پشتِ پرده بود، معیارِ نرمیِ بازی نیست
    if (skipGap || v.covered || rt.dprLock) {
      skipGap = false;
      return;
    }
    if (gap > 0 && gap < 1000) {
      p.acc += gap;
      p.n += 1;
    }
    if (p.n >= 40 || (p.acc >= 1000 && p.n >= 3)) {
      const avg = p.acc / p.n;
      rt.perf = { acc: 0, n: 0 };
      const next = adaptDpr({ dpr: v.dpr, ceil }, avg, maxDpr());
      const d = next.dpr;
      ceil = next.ceil;
      if (Math.abs(d - v.dpr) > 0.01) {
        v.dpr = d;
        cv.width = Math.round(v.w * d);
        cv.height = Math.round(v.h * d);
      }
    }
  };

  // مورد ۴: فریمِ بعد اول زمان‌بندی می‌شود تا یک فریمِ خراب بازی را یخ نزند؛ خطا ثبت می‌شود و اگر
  // پشتِ‌سرِهم تکرار شد (وضعیتِ خراب)، صفحه‌ی بازیابی می‌آید
  let failures = 0;
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    try {
      frame(t);
      failures = 0;
    } catch (e) {
      reportError(e, "loop");
      if (++failures >= 30) {
        cancelAnimationFrame(raf);
        raiseFatal(e);
      }
    }
  };
  const frame = (t: number) => {
    adaptResolution(t);
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const s = game.get();
    if (s) {
      const ev = getEv();
      tick(s, dt, ev);
      stepFx(dt);
      stepSfx(dt);
      stepWalkers(s, dt);
      stepHero(s, dt);
      stepGuests(dt, t / 1000);
      if (!rt.view.covered) {
        // V.3: لرزش ملایم دوربین — آفست موقت روی دوربین، بدون تغییر در render
        const sh = rt.shakeT;
        if (sh > 0) rt.shakeT = Math.max(0, sh - dt);
        const ox = rt.view.cam.x, oy = rt.view.cam.y;
        if (sh > 0) {
          rt.view.cam.x += Math.sin(t / 17) * 5 * sh;
          rt.view.cam.y += Math.cos(t / 14) * 3.5 * sh;
        }
        const r0 = renderStats().rebuilds;
        const t0 = performance.now();
        const walkers = [...rt.walkers.values(), ...rt.guests.map((g) => g.w), rt.hero];
        if (postFX && sctx2d && srcCv.width !== cv.width) { srcCv.width = cv.width; srcCv.height = cv.height; }
        if (postFX && sctx2d && srcCv.width === cv.width && srcCv.height === cv.height) {
          render(sctx2d, s, rt.view, t / 1000, rt.fx, walkers); // دنیا روی بومِ آفلاین
          const wm = waterMaskCanvas();
          if (wm && wm !== maskSeen) { postFX.setWaterMask(wm); maskSeen = wm; }
          const vv = rt.view, kk = vv.dpr * vv.cam.z;
          const li = lightInfo(s);
          const cl = s.weather === "rain" ? 1 : s.weather === "fog" ? 0.9 : s.weather === "snow" ? 0.8 : s.weather === "heatwave" ? 0.15 : 0.35;
          postFX.update({ time: t / 1000, rain: s.weather === "rain" ? 1 : 0, ox: vv.dpr * (vv.w / 2 + vv.cam.x), oy: vv.dpr * (vv.h / 2 + vv.cam.y), k: kk, sw: srcCv.width, sh: srcCv.height, dark: li.dark, dusk: li.dusk, cloud: cl, skyT: vv.reduced ? 0 : t / 1000 });
          postFX.present(); // texture ← مسیرِ GPU (گرید + دیدِ جوی + وینیت)
          ctx.drawImage(postFX.canvas, 0, 0); // فریمِ پردازش‌شده روی بومِ نمایش
        } else {
          render(ctx, s, rt.view, t / 1000, rt.fx, walkers);
        }
        rt.view.cam.x = ox;
        rt.view.cam.y = oy;
        rt.stats.renders++;
        rt.stats.renderMs += performance.now() - t0;
        if (renderStats().rebuilds !== r0) skipGap = true;
        drawSfx(ctx, rt.view.dpr); // V.3: سکه‌های پرنده و کاغذرنگی
        if (cv.parentElement) applyScreenFx(cv.parentElement, screenFx(s));
      }
      updateStory(s, ev); // بررسی هدف فصلِ داستان
      updateLineage(s, ev); // قولِ وارثِ نسلِ جاری (P6.4)
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
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    postFX?.destroy();
    postFX = null;
  };
}
