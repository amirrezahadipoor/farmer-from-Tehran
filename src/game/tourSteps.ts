/**
 * src/game/tourSteps.ts — گام‌های آموزشِ تعاملی، بی‌React تا با منطقِ واقعیِ بازی تست شوند (مورد ۵)
 */
import { chunkOf, idx, type State } from "./logic";
import { N } from "./data";
import type { UI } from "./ui/common";

type Tile = State["tiles"][number];
export type Pt = { x: number; y: number };

export interface Step {
  icon: string;
  title: string;
  text: string;
  /** ابزارِ لازم؛ برچسبِ دکمه‌اش در نوارِ ابزار همان نامِ ابزار است */
  tool?: keyof typeof UI;
  /** شاخصی که فقط با عملِ واقعیِ بازیکن بالا می‌رود */
  metric: (s: State) => number;
  /** زمینِ هدف روی نقشه */
  tile?: (s: State) => Pt | null;
}

const count = (s: State, f: (t: Tile) => boolean) => s.tiles.reduce((a, t) => a + (f(t) ? 1 : 0), 0);

/** نزدیک‌ترین زمینِ مناسب به مرکزِ زمین‌های خریده‌شده */
function nearest(s: State, ok: (t: Tile) => boolean): Pt | null {
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (s.chunks[chunkOf(x, y)]) (cx += x), (cy += y), n++;
  if (!n) return null;
  cx /= n;
  cy /= n;
  let best: Pt | null = null;
  let bd = Infinity;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!s.chunks[chunkOf(x, y)] || !ok(s.tiles[idx(x, y)])) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bd) (bd = d), (best = { x, y });
    }
  }
  return best;
}

export const TOUR_STEPS: Step[] = [
  {
    icon: "hoe",
    title: "شخم بزن",
    text: "ابزارِ «شخم» را بزن و روی زمینِ چمنی که نشانش داده‌ام ضربه بزن.",
    tool: "hoe",
    metric: (s) => count(s, (t) => t.k === "soil"),
    tile: (s) => nearest(s, (t) => t.k === "grass"),
  },
  {
    icon: "seed",
    title: "بذر بکار",
    text: "با «کاشت» روی خاکِ شخم‌خورده ضربه بزن تا گندم کاشته شود.",
    tool: "seed",
    metric: (s) => count(s, (t) => !!t.crop),
    tile: (s) => nearest(s, (t) => t.k === "soil" && !t.crop),
  },
  {
    icon: "water",
    title: "آبیاری کن",
    text: "با «آب» کشتِ تازه را خیس کن؛ گیاه روی خاکِ خیس زودتر می‌رسد.",
    tool: "water",
    metric: (s) => count(s, (t) => !!t.wet),
    tile: (s) => nearest(s, (t) => !!t.crop && !t.wet),
  },
  {
    icon: "hand",
    title: "برداشت کن",
    text: "گندم‌های طلاییِ کنارِ خانه رسیده‌اند؛ «دست» را بزن و روی یکی ضربه بزن.",
    tool: "hand",
    metric: (s) => s.stats.harvested,
    tile: (s) => nearest(s, (t) => !!t.crop && (t.g || 0) >= 1),
  },
  {
    icon: "market",
    title: "بفروش",
    text: "«بازار» را بزن و کنارِ محصولت «فروش یک» را بزن.",
    metric: (s) => s.stats.earned,
  },
];

export const TOUR_KEY = "farm_onboard";
