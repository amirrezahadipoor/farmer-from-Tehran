"use client";

/**
 * src/game/events.ts — پلِ «منطق → نمایش»: پیام، صدا و افکت‌های روی نقشه.
 * منطق بازی فقط این رابط را می‌شناسد و هیچ وابستگی‌ای به React ندارد.
 */

import type { Events } from "./logic";
import { tileCenter } from "./render";
import { stripEmoji } from "./icons";
import { sound } from "./audio";
import { rt } from "./store";

export type ToastFn = (raw: string, t?: string) => void;


export function makeEvents(toast: ToastFn): Events {
  return {
    toast,
    sound,
    fx: (gx, gy, text, color = "#fff", burst, icon) => {
      const { x, y } = tileCenter(gx, gy);
      // نماد همیشه SVG است (کلیدِ icons.tsx)؛ stripEmoji فقط نگهبانِ آخر است
      const clean = stripEmoji(text);
      if (clean || icon) rt.fx.push({ kind: "text", x, y: y - 36, vx: 0, vy: -30, life: 1.4, max: 1.4, text: clean, icon, color });
      if (burst)
        for (let i = 0; i < 14; i++)
          rt.fx.push({
            kind: i % 3 ? "leaf" : "spark",
            x,
            y: y - 8,
            vx: (Math.random() - 0.5) * 130,
            vy: -70 - Math.random() * 90,
            life: 0.95,
            max: 0.95,
            color: i % 3 ? burst : "#fffde7",
          });
    },
  };
}

/** رویدادهای بی‌صدا برای شبیه‌سازیِ زمانِ غیاب (بدون افکت و پیام). */
export const SILENT: Events = { toast: () => {}, fx: () => {}, sound: () => {} };
