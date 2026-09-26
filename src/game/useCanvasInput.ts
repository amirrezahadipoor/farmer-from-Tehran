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
import { screenToTile, tileCenter } from "./render";
import { haptic } from "./mobile";
import { sound } from "./audio";
import { game, rt } from "./store";
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

export function useCanvasInput({ tool, seed, bsel, ev, setPanel, setTool, setBsel }: InputDeps) {
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef(0);
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
    const r = toolAction(s, tx, ty, tool, arg, ev);
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
      drag.current = null;
      cancelHold();
      keepHover(null);
      return;
    }
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
      if (pinch.current) v.cam.z = clampZoom(v.cam.z * (d / pinch.current));
      pinch.current = d;
      return;
    }
    const dr = drag.current;
    if (!dr) return;
    const dx = e.clientX - dr.x,
      dy = e.clientY - dr.y;
    if (Math.abs(dx) + Math.abs(dy) > 7) {
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
    if (pointers.current.size < 2) pinch.current = 0;
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

/** زوم با دکمه‌های کنار صفحه. */
export function zoomBy(f: number) {
  rt.view.cam.z = clampZoom(rt.view.cam.z * f);
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
