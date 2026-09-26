"use client";

/**
 * src/game/store.ts — منبع واحدِ وضعیت بازی بیرون از React (P5.10)
 *
 * چرا؟ منطق بازی (logic.ts) وضعیت را «درجا» تغییر می‌دهد (برای سرعتِ حلقه‌ی ۶۰ فریم)،
 * و قبلاً Game.tsx آن را در یک ref نگه می‌داشت و حین رندر می‌خواند — ۹۸ خطای
 * react-hooks/refs از همین‌جا بود. حالا:
 *  • وضعیت در این store است؛ `bump()` بعد از هر تغییر درجا، مشترک‌ها را باخبر می‌کند.
 *  • کامپوننت‌ها با `useGame()` (روی useSyncExternalStore) مشترک می‌شوند.
 *  • چیزهای غیرِ React حلقه (افکت‌ها، راه‌روندگان، دوربین) در `rt` می‌مانند.
 */

import { useSyncExternalStore } from "react";
import type { Fx, State } from "./logic";
import type { View, Walker } from "./render";

type Listener = () => void;

let current: State | null = null;
let version = 0;
const listeners = new Set<Listener>();

export const game = {
  /** وضعیت فعلی (یا null پیش از بارگذاری) */
  get(): State | null {
    return current;
  },
  /** جایگزینی کل وضعیت (بارگذاری، بازیابی، شروع دوباره، قلاب تست) */
  set(next: State) {
    current = next;
    game.bump();
  },
  /** بعد از هر تغییرِ درجا صدا زده می‌شود تا UI تازه شود */
  bump() {
    version = (version + 1) | 0;
    for (const l of listeners) l();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  version() {
    return version;
  },
};

const serverVersion = () => 0;

/** اشتراک در تغییرات وضعیت؛ خروجی = وضعیت فعلی (پس از بارگذاری هرگز null نیست). */
export function useGameVersion(): number {
  return useSyncExternalStore(game.subscribe, game.version, serverVersion);
}

/** وضعیتِ بازی برای کامپوننت‌هایی که فقط بعد از «آماده‌بودن» رندر می‌شوند. */
export function useGame(): State {
  useGameVersion();
  const s = game.get();
  if (!s) throw new Error("useGame() پیش از بارگذاری وضعیت صدا زده شد");
  return s;
}

/** حالتِ زمان‌اجرای حلقه (غیر React): افکت‌ها، راه‌روندگان، دوربین و سنجش فریم. */
export const rt = {
  fx: [] as Fx[],
  walkers: new Map<number, Walker>(),
  view: {
    w: 800,
    h: 600,
    dpr: 1,
    cam: { x: 0, y: -14, z: 0.62 },
    hover: null,
    tool: "hand",
    arg: "",
  } as View,
  perf: { acc: 0, n: 0 },
};

/** پاک‌کردن حالت زمان‌اجرا (شروع دوباره از ابتدا). */
export function resetRuntime() {
  rt.fx = [];
  rt.walkers.clear();
}
