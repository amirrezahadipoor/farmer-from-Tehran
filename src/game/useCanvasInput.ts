"use client";

/**
 * src/game/useCanvasInput.ts — ورودیِ لمسیِ نقشه (P5.10: جدا شده از Game.tsx)
 *  • ضربه = اجرای ابزار روی یک زمین · کشیدن = جابه‌جایی نقشه · دو انگشت = زوم
 *  • نگه‌داشتن ۴۸۰ms = عمل دسته‌ای روی ۳×۳ (کاشتِ ردیفی بدون ۹ ضربه)
 *  • دکمه‌های زوم/مرکز (بدون چرخ ماوس و کیبورد)
 */

import { useRef } from "react";
import { N, fmt } from "./data";
import { toolAction, locked, idx, type Events } from "./logic";
import { A, B, screenToTile, tileCenter, type View } from "./render/core";
import { haptic } from "./mobile";
import { sound } from "./audio";
import { game, rt } from "./store";
import { sendHero } from "./hero";
import { waterRipple } from "./juice";
import type { Panel } from "./ui/common";

/** ثبت اشاره‌گر با گارد: در بعضی مرورگرها/رویدادهای مصنوعی خطای NotFoundError می‌دهد. */
export function capturePointer(el: Element | null, pointerId: number) {
  try {
    (el as HTMLElement | null)?.setPointerCapture?.(pointerId);
  } catch {
    /* اشاره‌گر دیگر فعال نیست */
  }
}

interface InputDeps {
  tool: string;
  seed: string;
  bsel: string;
  ev: Events;
  setPanel: (p: Panel) => void;
  setTool: (t: string) => void;
  setBsel: (b: string) => void;
}

const HOLD_MS = 480;
const clampZoom = (z: number) => Math.max(0.3, Math.min(2.4, z));
/** آستانه‌ی تشخیص «کشیدن» از «ضربه» — ۷px روی گوشیِ واقعی با لغزشِ طبیعیِ انگشت تپ‌ها را می‌شکست */
const DRAG_SLOP = 10;

/** مرکزِ توده‌ی زمین‌های خریداری‌شده در مختصاتِ جهان (برای نگه‌داشتنِ مزرعه در کادر) */
function farmCenterWorld(): { x: number; y: number } | null {
  const st = game.get();
  if (!st) return null;
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < st.tiles.length; i++) {
    if (locked(st, i % N, Math.floor(i / N))) continue;
    sx += (i % N - Math.floor(i / N)) * A;
    sy += (i % N + Math.floor(i / N) + 1) * B - N * B;
    n++;
  }
  return n ? { x: sx / n, y: sy / n } : null;
}

/**
 * P/FIX زوم‌اوت: بعد از کوچک‌نمایی، مزرعه نباید از کادر بیرون برود — گزارشِ کاربر:
 * «زوم اوت که می‌کنیم اصلاً دیگه مزرعه رو نشون نمیده». اگر مرکزِ مزرعه از حاشیه‌ی
 * مجازِ صفحه بیرون رفته باشد، دوربین به‌اندازه‌ی همان کمی جابه‌جا می‌شود (بدونِ پرش).
 */
function keepFarmInFrame(margin = 0.42) {
  const v = rt.view;
  const fc = farmCenterWorld();
  if (!fc) return;
  const sx = fc.x * v.cam.z + v.w / 2 + v.cam.x;
  const sy = fc.y * v.cam.z + v.h / 2 + v.cam.y;
  const mx = v.w * margin, my = v.h * margin;
  const dx = sx < mx ? sx - mx : sx > v.w - mx ? sx - (v.w - mx) : 0;
  const dy = sy < my ? sy - my : sy > v.h - my ? sy - (v.h - my) : 0;
  if (dx || dy) {
    v.cam.x -= dx;
    v.cam.y -= dy;
    game.bump();
  }
}

/** نقطه‌ی صفحه → مختصاتِ جهانِ نقشه (همان قراردادِ screenToTile پیش از گرد شدن) */
function screenToWorld(v: View, sx: number, sy: number) {
  return { x: (sx - v.w / 2 - v.cam.x) / v.cam.z, y: (sy - v.h / 2 - v.cam.y) / v.cam.z };
}

export function useCanvasInput({ tool, seed, bsel, ev, setPanel, setTool, setBsel }: InputDeps) {
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef(0);
  const pinchEnded = useRef(false);
  const hoverClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFired = useRef(false);

  /** عمل دسته‌ای: همان ابزار روی ۹ زمین (۳×۳) اجرا می‌شود. */
  const groupAct = (tx: number, ty: number) => {
    const s = game.get();
    if (!s) return;
    if (tool === "build") {
      setPanel("build");
      return;
    }
    haptic("big");
    let done = 0;
    let opened = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx,
          y = ty + dy;
        if (x < 0 || y < 0 || x >= N || y >= N || locked(s, x, y)) continue;
        const before = JSON.stringify(s.tiles[idx(x, y)]);
        const r = toolAction(s, x, y, tool, tool === "seed" ? seed : "", ev);
        if (r === "open") {
          opened = true;
          continue;
        }
        if (JSON.stringify(s.tiles[idx(x, y)]) !== before) done++;
      }
    }
    if (done) sendHero(s, tx, ty, tool);
    if (opened && !done) setPanel({ bx: tx, by: ty });
    sound(done ? "click" : "err");
    ev.toast(done ? `عملیات دسته‌ای روی ${fmt(done)} زمین اجرا شد` : "برای عمل دسته‌ای زمین آزادِ بیشتری لازم است", done ? "ok" : "err");
    game.bump();
  };

  const act = (tx: number, ty: number) => {
    const s = game.get();
    if (!s) return;
    const arg = tool === "seed" ? seed : tool === "build" ? bsel : "";
    if (tool === "build" && !bsel) {
      setPanel("build");
      return;
    }
    haptic("tap");
    const tc = tileCenter(tx, ty);
    rt.fx.push({ kind: "ring", x: tc.x, y: tc.y - 4, vx: 0, vy: 0, life: 0.45, max: 0.45, color: "rgba(255,255,255,0.9)" }); // V.3
    // P/FIX فیدبکِ شکستِ بی‌صدا: اگر ابزار هیچ تغییری در کاشی نداد، با صدا و لرزشِ خطا اعلام شود
    // تا کاربر «لمس کار نمی‌کند» حس نکند (پیامِ توضیحی را خودِ toolAction نشان می‌دهد)
    const tile0 = s.tiles[idx(tx, ty)];
    const wasWet = tile0.wet === true;
    const before = JSON.stringify(s.tiles[idx(tx, ty)]);
    const r = toolAction(s, tx, ty, tool, arg, ev);
    if (tool === "water" && !wasWet && tile0.wet === true) {
      const tc2 = tileCenter(tx, ty);
      waterRipple(tc2.x, tc2.y); // M6: موج و قطره‌های آبیاری
    }
    if (r !== "open" && JSON.stringify(s.tiles[idx(tx, ty)]) === before) {
      sound("err");
      haptic("error");
    }
    if (r !== "open") sendHero(s, tx, ty, tool);
    if (r === "open") {
      setPanel({ bx: tx, by: ty });
      sound("click");
    }
    if (tool === "build" && r !== "open" && s.tiles[idx(tx, ty)].k === "bld") {
      setTool("hand");
      setBsel("");
    }
    game.bump();
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const keepHover = (t: { x: number; y: number } | null) => {
    rt.view.hover = t;
    if (hoverClear.current) clearTimeout(hoverClear.current);
    if (t)
      hoverClear.current = setTimeout(() => {
        rt.view.hover = null;
      }, 1100);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    capturePointer(e.target as Element, e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = rt.view;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      pinchEnded.current = false;
      drag.current = null;
      cancelHold();
      keepHover(null);
      return;
    }
    pinchEnded.current = false;
    drag.current = { x: e.clientX, y: e.clientY, cx: v.cam.x, cy: v.cam.y, moved: false };
    const t0 = screenToTile(v, e.clientX, e.clientY);
    keepHover(t0);
    holdFired.current = false;
    cancelHold();
    if (t0)
      holdTimer.current = setTimeout(() => {
        holdFired.current = true;
        groupAct(t0.x, t0.y);
      }, HOLD_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const v = rt.view;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current && d > 0) {
        // P/FIX زومِ دوانگشتی حولِ وسطِ دو انگشت (قبلاً حولِ مرکزِ صفحه بود و دستِ کاربر را گم می‌کرد)
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const before = screenToWorld(v, mx, my);
        const z0 = v.cam.z;
        v.cam.z = clampZoom(v.cam.z * (d / pinch.current));
        if (v.cam.z !== z0) {
          const after = screenToWorld(v, mx, my);
          v.cam.x += (after.x - before.x) * v.cam.z;
          v.cam.y += (after.y - before.y) * v.cam.z;
          if (v.cam.z < z0) keepFarmInFrame(); // کوچک‌نمایی → مزرعه در کادر بماند
        }
      }
      pinch.current = d;
      return;
    }
    const dr = drag.current;
    if (!dr) {
      // P/FIX بعد از pinch: انگشتِ باقی‌مانده بدون برداشتن، باید بتواند درگ کند
      if (pointers.current.size === 1 && pinchEnded.current) {
        drag.current = { x: e.clientX, y: e.clientY, cx: v.cam.x, cy: v.cam.y, moved: true };
      }
      return;
    }
    const dx = e.clientX - dr.x,
      dy = e.clientY - dr.y;
    if (Math.abs(dx) + Math.abs(dy) > (dr.moved ? 0 : DRAG_SLOP)) {
      dr.moved = true;
      cancelHold();
      v.cam.x = dr.cx + dx;
      v.cam.y = dr.cy + dy;
      keepHover(null);
    } else {
      keepHover(screenToTile(v, e.clientX, e.clientY));
    }
  };

  const endPointer = (e: React.PointerEvent, cancelled = false) => {
    cancelHold();
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      if (pinch.current) pinchEnded.current = true; // انگشتِ باقی‌مانده می‌تواند درگ را ادامه دهد
      pinch.current = 0;
    }
    const dr = drag.current;
    drag.current = null;
    if (cancelled || !dr || dr.moved) {
      keepHover(null);
      return;
    }
    if (holdFired.current) {
      holdFired.current = false; // دسته‌ای اجرا شد؛ ضربه‌ی دوم لازم نیست
      keepHover(null);
      return;
    }
    const t = screenToTile(rt.view, e.clientX, e.clientY);
    if (t) {
      keepHover(t);
      act(t.x, t.y);
    } else keepHover(null);
  };

  return {
    canvasHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: React.PointerEvent) => endPointer(e),
      onPointerCancel: (e: React.PointerEvent) => endPointer(e, true),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

/** زوم با دکمه‌های کنار صفحه. کوچک‌نمایی مزرعه را در کادر نگه می‌دارد (P/FIX گزارشِ کاربر). */
export function zoomBy(f: number) {
  const z0 = rt.view.cam.z;
  rt.view.cam.z = clampZoom(rt.view.cam.z * f);
  if (f < 1) {
    // در رسیدن به کفِ زوم، دوربین هم به مرکزِ مزرعه برمی‌گردد تا «دیگه مزرعه نشون داده نشه» رخ ندهد
    if (rt.view.cam.z <= 0.301 && z0 <= 0.301) recenter();
    else keepFarmInFrame();
  }
  game.bump();
}

/** بازگشت دوربین به مرکزِ زمین‌های خریداری‌شده. */
export function recenter() {
  const v = rt.view;
  const st = game.get();
  let cx = N / 2,
    cy = N / 2;
  if (st) {
    const own = st.tiles.map((_, i) => i).filter((i) => !locked(st, i % N, Math.floor(i / N)));
    if (own.length) {
      cx = own.reduce((a, i) => a + (i % N), 0) / own.length;
      cy = own.reduce((a, i) => a + Math.floor(i / N), 0) / own.length;
    }
  }
  const p = tileCenter(cx, cy);
  v.cam.z = 0.62;
  v.cam.x = -p.x * v.cam.z;
  v.cam.y = -p.y * v.cam.z;
  game.bump();
}
