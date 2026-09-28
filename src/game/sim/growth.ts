/**
 * src/game/sim/growth.ts — عواملی که رشد و کارِ ماشین‌ها را می‌سازند + رطوبت و رشدِ هر خانه
 * (شکسته‌شده از tick.ts — رفتار و ترتیب کاملاً بدون تغییر)
 */
import { CMAP, N, SEASONS } from "../data";
import { type State, idx, hasTech, hasSkill, WATER_SECONDS, RAIN_SECONDS, DROUGHT } from "./state";
import { festActive } from "./festival";

/** عواملی که رشدِ گلها و شعاع/سرعتِ ماشین‌ها از آن‌ها ساخته می‌شود */
export interface GrowthFactors { dryRate: number; gMult: number; drought: boolean; autoR: number; waterBonus: number; }

export function growthFactors(s: State): GrowthFactors {
  const season = SEASONS[s.seasonIndex];
  const drought = s.currentEvent?.type === "drought";
  // خشکسالی خشک‌شدن را تند و «شبکه‌ی قنات» کُند می‌کند (رطوبت ۵۰٪ ماندگارتر)
  const dryRate = (drought ? DROUGHT.dry : 1) / (hasTech(s, "qanat_net") ? 1.5 : 1);
  let gMult = season.growthRate;
  if (festActive(s, "rest")) gMult *= 1.1; // V.5: آرامش فستیوال
  if (s.currentEvent?.type === "bountiful_harvest") gMult *= 1.2;
  if (s.weather === "heatwave") gMult *= 0.9;
  if (s.weather === "snow") gMult *= 0.82;
  if (s.weather === "fog") gMult *= 0.95;
  if (hasSkill(s, "grow_master")) gMult *= 1.10;
  if (hasTech(s, "biotech")) gMult *= 1.15;

  let autoR = 0;
  if (hasTech(s, "precision_agri")) autoR = 1;
  // مهندسی آبیاری (تحقیق) و «میراب» (مهارت) هر کدام شعاع آبیاری را ۱ خانه بیشتر می‌کنند
  const waterBonus = (hasTech(s, "irrigation_engineering") ? 1 : 0) + (hasSkill(s, "water_wise") ? 1 : 0);
  return { dryRate, gMult, drought, autoR, waterBonus };
}

/**
 * رطوبت و رشدِ یک خانه از زمین.
 * خروجی: اگر محصولِ خانه ناشناس باشد false برمی‌گرداند تا ساختارِ همان خانه هم شبیه‌سازی نشود
 * (همان continueِ نسخه‌ی پیش از شکستن).
 */
export function growTile(s: State, i: number, dt: number, f: GrowthFactors): boolean {
  const t = s.tiles[i]; const x = i % N, y = Math.floor(i / N);
  // ── رطوبتِ زمان‌دار: خاک بعد از مدت محدود خشک می‌شود (P5.6)
  if (t.k === "soil" && t.wet) {
    if (t.dry === undefined) t.dry = WATER_SECONDS;
    t.dry -= dt * f.dryRate;
    if (t.dry <= 0) { t.dry = 0; t.wet = false; }
  }
  if (s.weather === "rain" && t.k === "soil") { t.wet = true; t.dry = Math.max(t.dry ?? 0, RAIN_SECONDS); }
  if (t.crop && (t.g || 0) < 1) {
    const c = CMAP[t.crop]; if (!c) return false;
    let sp = (dt / c.time) * f.gMult;
    if (t.wet) sp *= 1.8;
    else if (f.drought) sp *= DROUGHT.dryGrowth; // خاکِ تشنه در خشکسالی کند رشد می‌کند
    if (t.fert) sp *= 1.2;
    if (hasTech(s, "greenhouse_tech")) sp *= 1.2;
    if (s.workers.some((w) => w.kind === "scientist")) sp *= 1.2;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=N || ny>=N) continue;
      const n = s.tiles[idx(nx, ny)];
      if (n.k === "bld" && n.b === "greenhouse") sp *= 1.25;
    }
    t.g = Math.min(1, (t.g||0) + sp);
  }
  return true;
}
