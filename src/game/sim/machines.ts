/**
 * src/game/sim/machines.ts — ساختارهای زمین: آب‌پاش و چاه، کمپوست‌کار، دروگر، بذرپاش، کودپاش و تولیدِ کارگاه‌ها
 * (شکسته‌شده از tick.ts — رفتار و ترتیب کاملاً بدون تغییر)
 */
import { BMAP, CROPS, N, FERT_COST } from "../data";
import { type State, type Events, idx, capacity, invCount, has, hasTech, hasSkill, SPRINKLER_SECONDS } from "./state";
import { addXp } from "./economy";
import { workshopTimeFactor } from "./legacy";
import { harvest, plant, collect, queueRecipe } from "./actions";
import { type GrowthFactors } from "./growth";
import { rng } from "./rng";

/** کارگاه‌های دامی (مرغدانی، گاوداری، …) — هدفِ دامپزشک، دامپروری پیشرفته و دامدار مهربان */
const ANIMAL_OUT = new Set(["egg", "milk", "wool", "pork", "honey"]);
export const isAnimalBuilding = (b: { recipes: { out: string }[] }) => b.recipes.some((r) => ANIMAL_OUT.has(r.out));

/** ضریب زمانِ تولید دامی: دامپزشک ۱۵٪، «دامپروری پیشرفته» ۲۵٪ و «دامدار مهربان» ۱۵٪ سریع‌تر */
export function animalTimeFactor(s: State): number {
  let f = 1;
  if (s.workers.some((w) => w.kind === "vet")) f *= 0.85;
  if (hasTech(s, "animal_husbandry")) f /= 1.25;
  if (hasSkill(s, "animal_tamer")) f /= 1.15;
  return f;
}

/** شبیه‌سازیِ یک ساختار در خانه‌ی i (اگر خانه ساختار نباشد یا ساختار ناشناس باشد، کاری انجام نمی‌شود) */
export function runBuilding(s: State, i: number, dt: number, f: GrowthFactors, ev: Events): void {
  const t = s.tiles[i];
  if (t.k !== "bld" || !t.b) return;
  const b = BMAP[t.b]; if (!b) return;
  const x = i % N, y = Math.floor(i / N);
  const r = (b.radius || 0) + f.autoR;
  if (t.b === "sprinkler" || t.b === "mega_sprinkler" || t.b === "well" || t.b === "qanat") {
    // چاه و قنات = لوزی (فاصله‌ی منهتن)؛ آب‌پاش‌ها = مربعِ کامل (۸ و ۲۴ زمین)
    const diamondShape = t.b === "well" || t.b === "qanat";
    const wr = r + f.waterBonus;
    for (let dy = -wr; dy <= wr; dy++) for (let dx = -wr; dx <= wr; dx++) {
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
      if (diamondShape && Math.abs(dx)+Math.abs(dy) > wr) continue;
      const n = s.tiles[idx(nx, ny)];
      if (n.k === "soil") { n.wet = true; n.dry = Math.max(n.dry ?? 0, SPRINKLER_SECONDS); }
    }
  }
  if (t.b === "composter") {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
      if (Math.abs(dx)+Math.abs(dy) > r) continue;
      const n = s.tiles[idx(nx, ny)];
      if (n.k === "soil" && !n.fert && rng() < dt * 0.2) n.fert = true;
    }
  }
  if (t.b === "harvester") {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
      const n = s.tiles[idx(nx, ny)];
      if (n.crop && (n.g||0) >= 1 && invCount(s) < capacity(s)) harvest(s, nx, ny, ev, true);
    }
  }
  if (t.b === "auto_planter") {
    // P5.5: بذرپاش باید بذرِ واقعی از انبار مصرف کند؛ وگرنه با یک بذرِ ذخیره‌شده
    // می‌شد بی‌نهایت زمین کاشت و حلقه‌ی سود بی‌پایان ساخت.
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
      const n = s.tiles[idx(nx, ny)];
      if (n.k !== "soil" || n.crop) continue;
      const cPick = CROPS.filter((c) => (s.inv[c.id] || 0) > 0)[0];
      if (!cPick) break; // بذر در انبار نیست → ماشین می‌ایستد
      const before = s.inv[cPick.id];
      if (plant(s, nx, ny, cPick.id, ev, true)) s.inv[cPick.id] = Math.max(0, before - 1); // یک بذر مصرف شد
    }
  }
  if (t.b === "auto_fertilizer") {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
      const n = s.tiles[idx(nx, ny)];
      if (n.k === "soil" && !n.fert && rng() < dt * 0.1) {
        if (s.coins >= Math.ceil(FERT_COST * 0.4)) { s.coins -= Math.ceil(FERT_COST * 0.4); s.stats.spent += Math.ceil(FERT_COST * 0.4); n.fert = true; }
      }
    }
  }
  if (b.recipes.length && t.q && t.q.length && (t.out?.length || 0) < 6) {
    const rIndex = t.q[0];
    const r = b.recipes[rIndex]; if (!r) return;
    let timeR = r.time;
    if (hasTech(s, "speed_ovens")) timeR *= 0.75;
    if (hasSkill(s, "artisan")) timeR *= 0.85;
    if (isAnimalBuilding(b)) timeR *= animalTimeFactor(s);
    timeR *= workshopTimeFactor(s.prestige); // P6.3: نسل‌های بعد تندترند (پیش از این کُندتر می‌شدند)
    t.p = (t.p||0) + dt / timeR;
    if (t.p >= 1) {
      t.out = [...(t.out||[]), ...Array<string>(Math.max(1, r.n || 1)).fill(r.out)];
      t.q = t.q.slice(1); t.p = 0;
      addXp(s, r.xp, ev);
      if (t.autoMode && t.lr !== undefined && has(s, b.recipes[t.lr].inp)) queueRecipe(s, t, t.lr, ev, true);
    }
  }
}
