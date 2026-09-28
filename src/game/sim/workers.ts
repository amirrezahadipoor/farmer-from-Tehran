/**
 * src/game/sim/workers.ts — کارگرها: کارگرِ مزرعه (درو، کاشتِ دوباره، آبیاری) و اپراتور (برداشت و صفِ کارگاه‌ها)
 * (شکسته‌شده از tick.ts — رفتار و ترتیب کاملاً بدون تغییر)
 */
import { BMAP, N } from "../data";
import { type State, type Events, locked, SPRINKLER_SECONDS } from "./state";
import { harvest, plant, collect, queueRecipe } from "./actions";

/** گام‌های کارگرها: هر ۲٫۲ ثانیه یک بار، به ترتیبِ فهرست کارکنان */
export function runWorkers(s: State, dt: number, ev: Events): void {
  s.wAcc += dt;
  while (s.wAcc > 2.2) {
    s.wAcc -= 2.2;
    for (const w of s.workers) {
      if (w.kind === "farmhand") {
        for (let a = 0; a < 3; a++) {
          const i = s.tiles.findIndex((t, j) => t.crop && (t.g||0) >= 1 && !locked(s, j % N, Math.floor(j / N)));
          if (i >= 0) {
            const crop = s.tiles[i].crop!; const x = i % N, y = Math.floor(i / N);
            // P5.5: کاشتِ دوباره‌ی کارگر هم بذر می‌خواهد (یک عدد از همان محصول در انبار)
            if (harvest(s, x, y, ev, true) && (s.inv[crop] || 0) >= 1) {
              if (plant(s, x, y, crop, ev, true)) s.inv[crop] -= 1;
            }
          }
          const d = s.tiles.find((t) => t.crop && !t.wet); if (d) { d.wet = true; d.dry = Math.max(d.dry ?? 0, SPRINKLER_SECONDS); }
        }
      } else if (w.kind === "operator") {
        s.tiles.forEach((t, i) => {
          if (t.k !== "bld") return;
          if (t.out?.length) collect(s, t, i % N, Math.floor(i / N), ev, true);
          if ((t.q?.length || 0) === 0 && t.lr !== undefined && BMAP[t.b!].recipes[t.lr]) queueRecipe(s, t, t.lr, ev, true);
        });
      }
    }
  }
}
