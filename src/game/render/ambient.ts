/**
 * src/game/render/ambient.ts — زندگی محیطی دره (V.2)
 *
 * دره باید نفس بکشد: پروانه روزِ بهار/تابستان، کرم شب‌تاب شب، برگ‌ریزان پاییز،
 * شکوفه‌باران بهار، پرندگان گذرنده و دودِ آرام از دودکشِ خانه/آسیاب/نانوایی.
 * همه‌چیز بی‌وضعیت و قطعی از (now + hash) ساخته می‌شود و شکل‌ها دسته‌ای در
 * Path2D انباشته می‌شوند: کلِ این لایه ≤ ۱۴ فرمان fill/stroke در بدترین فریم
 * (بودجه‌ی تستِ رندر: fill+stroke < ۱۰۰). ساعت طلایی طلوع/غروب پیش‌تر با
 * لایه‌ی CSS «dusk» وجود داشت؛ این ماژول مکمل آن است.
 */
import { SEASONS } from "../data";
import type { State } from "../logic";
import { hash, lightInfo, tileCenter } from "./core";

export interface AmbientPlan {
  butterflies: number;
  fireflies: number;
  leaves: number;
  petals: number;
  birds: number;
}

export const isNight = (hour: number) => hour < 5.5 || hour > 19.5;

/** برنامه‌ی قطعیِ عناصر برای هر فصل/ساعت/هوا — تست‌پذیر بدون بوم */
/** q = کیفیتِ سازگارشده با دستگاه (از dprِ خودکار): ۱ کامل، روی پروفایل ضعیف کمتر */
export function ambientPlan(season: string, hour: number, weather: string, q = 1): AmbientPlan {
  const night = isNight(hour);
  const calm = weather === "sun" || weather === "heatwave";
  const n = (base: number) => Math.round(base * q);
  return {
    butterflies: !night && calm && (season === "spring" || season === "summer") ? n(4) : 0,
    fireflies: night && season !== "winter" ? n(6) : 0,
    leaves: season === "autumn" ? n(10) : 0,
    petals: season === "spring" && !night && calm ? n(8) : 0,
    birds: !night && calm ? n(3) : 0,
  };
}

export const ambientTotal = (p: AmbientPlan) => p.butterflies + p.fireflies + p.leaves + p.petals + p.birds;

/** بیضی در مسیرِ دسته‌ای بدون خطِ اتصال: Path2D.ellipse از نقطه‌ی قبلی خط می‌کشد */
function ell(path: Path2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  path.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  path.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

const BUTTERFLY_COLORS = ["#ff8a65", "#f06292", "#fff176", "#81d4fa"];
const LEAF_COLORS = ["#e65100", "#ff8f00", "#bf360c"];

/** پروانه/برگ/برگ‌گل/شب‌تاب در فضای جهان (روی مزرعه) + پرندگان در آسمانِ نقشه */
export function drawAmbient(ctx: CanvasRenderingContext2D, s: State, now: number, quality = 1) {
  const season = SEASONS[s.seasonIndex]?.id ?? "spring";
  const L = lightInfo(s);
  const plan = ambientPlan(season, L.hour, s.weather, quality);
  const C = tileCenter(18, 18); // حوالی مرکز مزرعه

  // پروانه‌ها: سایه‌ها یک مسیر، بال‌ها به تفکیک رنگ، تنه‌ها یک مسیر
  if (plan.butterflies) {
    const shadow = new Path2D();
    const body = new Path2D();
    const wings = BUTTERFLY_COLORS.map(() => new Path2D());
    for (let k = 0; k < plan.butterflies; k++) {
      const p1 = hash(k, 1), p2 = hash(k, 2), p3 = hash(k, 3);
      const x = C.x + (p1 - 0.5) * 420 + Math.sin(now * (0.5 + p3 * 0.4) + k * 2) * 46;
      const y = C.y - 26 + (p2 - 0.5) * 240 + Math.sin(now * (0.8 + p2) + k) * 22;
      const flap = Math.abs(Math.sin(now * 16 + k * 1.7)) * 2.6 + 0.7;
      ell(shadow, x, y + 3, 3.5, 1.2, 0);
      ell(wings[k % 4], x - 2.4, y - 2, flap, 3.4, 0);
      ell(wings[k % 4], x + 2.4, y - 2, flap, 3.4, 0);
      body.rect(x - 0.7, y - 4, 1.4, 5);
    }
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill(shadow);
    BUTTERFLY_COLORS.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(wings[i]); });
    ctx.fillStyle = "#4e342e"; ctx.fill(body);
  }

  // کرم شب‌تاب: هاله یک مسیر، هسته یک مسیر (چشمک = حذف از مسیر)
  if (plan.fireflies) {
    const halo = new Path2D(), core = new Path2D();
    for (let k = 0; k < plan.fireflies; k++) {
      const p1 = hash(k + 9, 1), p2 = hash(k + 9, 2);
      const x = C.x + (p1 - 0.5) * 520 + Math.sin(now * 0.35 + k * 1.3) * 30;
      const y = C.y - 34 + (p2 - 0.5) * 260 + Math.cos(now * 0.5 + k) * 16;
      if (Math.sin(now * 1.8 + k * 2.4) < 0.15) continue;
      ell(halo, x, y, 5.5, 5.5, 0);
      ell(core, x, y, 1.7, 1.7, 0);
    }
    ctx.fillStyle = "rgba(220,255,120,0.10)"; ctx.fill(halo);
    ctx.fillStyle = "rgba(240,255,160,0.8)"; ctx.fill(core);
  }

  // برگ‌ریزان و شکوفه‌باران: به تفکیک رنگ در پنج مسیر
  if (plan.leaves || plan.petals) {
    const paths = [...LEAF_COLORS.map(() => new Path2D()), new Path2D(), new Path2D()];
    for (let k = 0; k < plan.leaves + plan.petals; k++) {
      const leaf = k < plan.leaves;
      const p1 = hash(k + 21, 1), p2 = hash(k + 21, 2), p3 = hash(k + 21, 3);
      const x = C.x + (p1 - 0.5) * 560 + Math.sin(now * (0.9 + p3) + k * 2) * 26;
      const drop = ((now * (16 + p2 * 14) + p3 * 320) % 300) - 130;
      const y = C.y - 60 + drop * 0.62 + (p2 - 0.5) * 120;
      const rot = Math.sin(now * (leaf ? 2.2 : 3.1) + k) * 0.9;
      const path = leaf ? paths[k % 3] : paths[3 + (k % 2)];
      ell(path, x, y, leaf ? 3.4 : 2.4, leaf ? 2 : 1.6, rot);
    }
    LEAF_COLORS.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(paths[i]); });
    ctx.fillStyle = "#f8bbd0"; ctx.fill(paths[3]);
    ctx.fillStyle = "#fce4ec"; ctx.fill(paths[4]);
  }

  // پرندگان گذرنده: یک مسیرِ بال‌زن
  if (plan.birds) {
    const sky = new Path2D();
    for (let k = 0; k < plan.birds; k++) {
      const period = 26 + k * 7;
      const t = ((now + k * 11) % period) / period;
      if (t > 0.62) continue;
      const x = C.x - 620 + (t / 0.62) * 1240;
      const y = C.y - 330 - k * 26 + Math.sin(now * 1.2 + k) * 8;
      const flap = Math.sin(now * 7 + k * 2) * 4;
      sky.moveTo(x - 7, y - flap * 0.4);
      sky.quadraticCurveTo(x - 2.5, y - 4 - flap, x, y);
      sky.quadraticCurveTo(x + 2.5, y - 4 - flap, x + 7, y - flap * 0.4);
    }
    ctx.strokeStyle = "rgba(38,50,56,0.8)";
    ctx.lineWidth = 1.8;
    ctx.stroke(sky);
  }
}

/** دودِ آرام از دودکش: سه پفِ بالا‌رونده در یک مسیر — برای خانه/آسیاب/نانوایی */
export function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, now: number, seed: number, top = 62) {
  const p = new Path2D();
  for (let j = 0; j < 3; j++) {
    const t = (now / 2.6 + j / 3 + hash(seed, 7)) % 1;
    const py = y - top - t * 44;
    const px = x + Math.sin(now * 0.9 + j * 2 + seed) * 3 + t * 9;
    ell(p, px, py, 2.6 + t * 6.5, 2 + t * 5, 0);
  }
  ctx.fillStyle = "rgba(236,239,241,0.24)";
  ctx.fill(p);
}
