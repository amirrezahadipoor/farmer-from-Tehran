/**
 * src/game/sim/tick.ts — شبیه‌سازیِ زمان: هماهنگ‌کننده‌ی تیک (R/T8)
 *
 * P5.11: منطقِ تیک در چند ماژولِ موضوعی شکسته شد و اینجا فقط ترتیبِ کارها را می‌بندد:
 *   sim/daycycle.ts ... روز و حقوق، آب‌وهوا، رویدادهای فصلی، فستیوال
 *   sim/growth.ts ..... عواملی (خشکی، رشد، شعاع) + رطوبت و رشدِ هر خانه
 *   sim/machines.ts ... ساختارها: آبیاری، کمپوست، دروگر، بذرپاش، کودپاش، تولیدِ کارگاه
 *   sim/workers.ts .... کارگرِ مزرعه و اپراتور
 *   sim/market.ts ..... اشباعِ بازار، تاریخچه‌ی قیمت و سفارش‌ها
 * همه‌ی واردکننده‌ها همچنان از "./logic" می‌خوانند (logic.ts این ماژول را دوباره صادر می‌کند).
 */
import { N } from "../data";
import { type State, type Events } from "./state";
import { stepDay } from "./daycycle";
import { growthFactors, growTile } from "./growth";
import { runBuilding } from "./machines";
import { runWorkers } from "./workers";
import { updateMarket, updateOrders } from "./market";

// برای سازگاریِ مسیرهای قبلیِ واردات (logic.ts → tick.ts)
export { isAnimalBuilding, animalTimeFactor } from "./machines";

/** یک تیکِ شبیه‌سازی: ترتیبِ کارها عیناً همان نسخه‌ی پیش از شکستن است */
export function tick(s: State, dt: number, ev: Events) {
  stepDay(s, dt, ev);
  const f = growthFactors(s);
  for (let i = 0; i < s.tiles.length; i++) {
    if (!growTile(s, i, dt, f)) continue;
    runBuilding(s, i, dt, f, ev);
  }
  updateMarket(s, dt);
  updateOrders(s);
  runWorkers(s, dt, ev);
}
