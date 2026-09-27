"use client";

/**
 * src/game/guests.ts — مهمانِ سپاسگزار (V.6): پس از تحویل هر سفارش، NPC همان سفارش
 * به مزرعه می‌آید، حبابِ دیالوگِ سپاس با نامِ بازیکن نشان می‌دهد و پس از ~۲۰ ثانیه می‌رود.
 * روی پروفایلِ ضعیف سقفِ هم‌زمان ۳ مهمان است. ماژول نمایش است؛ منطق headless دست نمی‌خورد.
 */
import { N } from "./data";
import type { State } from "./logic";
import { rt } from "./store";
import type { Walker } from "./render/core";

export interface Guest {
  w: Walker;
  npc: number;
  until: number;
  leaving: boolean;
}

const THANKS = [
  "سپاس {n} جان! دستت طلا",
  "قربونت {n}! چه بارِ تازه‌ای",
  "به‌به {n}! دهکده ازت راضیه",
  "دستِ مریزاد {n}! باز هم می‌آیم",
  "{n} جان، نانِ تو برکتِ دهه",
];

/** now = ثانیه‌ی هم‌_phase_ با حلقه‌ی رندر (performance.now()/1000) */
export function spawnGuest(s: State, npc: number, now: number) {
  const cap = rt.view.dpr <= 0.7 ? 3 : 6;
  if (rt.guests.length >= cap) return;
  let hx = 18, hy = 19;
  s.tiles.forEach((t, i) => { if (t.b === "coop") { hx = i % N; hy = Math.floor(i / N); } });
  const fromX = 10 + Math.floor(Math.random() * 16);
  const name = (s.story?.name || "کشاورز").slice(0, 12);
  const w: Walker = {
    x: fromX, y: hy + 7, tx: hx + 1.5, ty: hy + 2, kind: "guest", face: 1, wait: 0,
    say: THANKS[Math.floor(Math.random() * THANKS.length)].replace("{n}", name),
  };
  rt.guests.push({ w, npc, until: now + 20, leaving: false });
}

export function stepGuests(dt: number, now: number) {
  rt.guests = rt.guests.filter((g) => {
    const w = g.w;
    if (!g.leaving && now > g.until) {
      g.leaving = true;
      w.say = undefined;
      w.tx = w.x + (w.x < 18 ? -10 : 10);
      w.ty = w.y + 7;
    }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d > 0.05) {
      const sp = 1.25 * dt;
      w.x += (dx / d) * Math.min(sp, d);
      w.y += (dy / d) * Math.min(sp, d);
      w.face = dx - dy > 0 ? 1 : -1;
    }
    return !(g.leaving && (d <= 0.06 || w.x < 2 || w.x > N - 2 || w.y > N - 2));
  });
}
