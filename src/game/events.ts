"use client";

/**
 * src/game/events.ts — پلِ «منطق → نمایش»: پیام، صدا و افکت‌های روی نقشه.
 * منطق بازی فقط این رابط را می‌شناسد و هیچ وابستگی‌ای به React ندارد.
 */

import { ITEMS } from "./data";
import type { Events } from "./logic";
import { tileCenter } from "./render";
import { EMOJI_RE, stripEmoji } from "./icons";
import { sound } from "./audio";
import { rt } from "./store";

export type ToastFn = (raw: string, t?: string) => void;

/** آیکون افکت شناور را از ایموجیِ متن حدس می‌زند (آیکون کالا یا نمادهای UI). */
function fxIcon(text: string): { clean: string; icon?: string } {
  const emo = text.match(EMOJI_RE);
  const clean = stripEmoji(text);
  if (!emo) return { clean };
  const itemId = Object.keys(ITEMS).find((k) => ITEMS[k].icon === emo[0]);
  if (itemId) return { clean, icon: "item:" + itemId };
  if (emo[0] === "💧") return { clean, icon: "ui:water" };
  if (emo[0].startsWith("✨")) return { clean, icon: "ui:sparkle" };
  if (emo[0] === "🪙") return { clean, icon: "ui:coin" };
  return { clean };
}

export function makeEvents(toast: ToastFn): Events {
  return {
    toast,
    sound,
    fx: (gx, gy, text, color = "#fff", burst) => {
      const { x, y } = tileCenter(gx, gy);
      if (text) {
        const { clean, icon } = fxIcon(text);
        if (clean || icon) rt.fx.push({ kind: "text", x, y: y - 36, vx: 0, vy: -30, life: 1.4, max: 1.4, text: clean, icon, color });
      }
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
