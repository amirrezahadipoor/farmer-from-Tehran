/**
 * src/game/render/ground.ts — زمینِ نقشه با کشِ یک‌تکه (P5.14)
 *
 * پیش از این هر فریم برای هر کاشیِ دیده‌شده یک گرادیان ساخته و ده‌ها خط کشیده می‌شد
 * (≈ ۶۰۰ کاشی × ۱۰+ فراخوانِ رسم). حالا کلِ زمین یک بار روی یک بومِ خارج از صفحه کشیده
 * می‌شود و هر فریم فقط یک drawImage است:
 *   • امضای کلی (فصل، برف) یا پله‌ی مقیاس عوض شود ← بازسازیِ کامل
 *   • کاشی‌ای عوض شود (بیل، آب، کود، خرید زمین) ← فقط همان ناحیه با برشِ مستطیلیِ
 *     هم‌تراز با پیکسل و با همان ترتیبِ رسم دوباره کشیده می‌شود (بی‌درز)
 *   • پرچینِ مرزِ زمینِ خریده‌شده هم در کش است (P6.6: ۹۶ فراخوانِ رسم در هر فریم کمتر)
 *   • جاندارها (کف و موجِ آب، ماهی و اردک، درخششِ کود) هر فریم جدا و دسته‌ای کشیده می‌شوند
 *   • زومِ خیلی نزدیک (کاشی‌های کم) ← رسمِ مستقیم، تا زمین تار نشود
 */
import { N, SEASONS } from "../data";
import { idx, locked, type State } from "../logic";
import { A, B, diamond, ellipse, fence, hash, makeCanvas, poly, shade, tileCenter } from "./core";
import { contactEdges, drawBlades, drawContact, drawDapples, drawFlowers, drawSandSpeckle, drawSnowDetail, drawSoilDetail, drawWaterDetail, pal, softBlob, tileVar } from "./artlab";

/** لبه‌هایی از کاشیِ آب که به خشکی (یا لبه‌ی نقشه) می‌رسند: ۱ بالا-چپ، ۲ بالا-راست، ۴ پایین-راست، ۸ پایین-چپ */
function waterEdges(s: State, gx: number, gy: number) {
  const wet = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && s.tiles[idx(x, y)].k === "water";
  return (wet(gx, gy - 1) ? 0 : 1) | (wet(gx + 1, gy) ? 0 : 2) | (wet(gx, gy + 1) ? 0 : 4) | (wet(gx - 1, gy) ? 0 : 8);
}
function edgePath(p: CanvasRenderingContext2D | Path2D, x: number, y: number, e: number) {
  if (e & 1) { p.moveTo(x - A, y); p.lineTo(x, y - B); }
  if (e & 2) { p.moveTo(x, y - B); p.lineTo(x + A, y); }
  if (e & 4) { p.moveTo(x + A, y); p.lineTo(x, y + B); }
  if (e & 8) { p.moveTo(x, y + B); p.lineTo(x - A, y); }
}

/**
 * پوششِ برف: لوزیِ یکدستِ خودِ کاشی + چند توده‌ی نرم در داخلِ آن. (پیش از P6.6 بیضیِ ۰.۹۵
 * بود که از لبه‌ی لوزی بیرون می‌زد و روی هم افتادنِ بیضی‌ها شبکه‌ای توری‌شکل می‌ساخت.)
 */
function snowCover(ctx: CanvasRenderingContext2D, gx: number, gy: number, x: number, y: number, k: number, a: number) {
  diamond(ctx, x, y, A * k + 0.6, B * k + 0.6);
  ctx.fillStyle = `rgba(250,252,255,${a})`;
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const ux = (hash(gx * 5 + i, gy * 3) - 0.5) * A * 0.8, uy = (hash(gy * 7 + i, gx) - 0.5) * B * 0.8;
    if (Math.abs(ux) / A + Math.abs(uy) / B > 0.55) continue; // توده بیرون از کاشی نمی‌زند
    ellipse(ctx, x + ux, y + uy, A * 0.22, B * 0.2, "rgba(255,255,255,0.45)");
  }
}

/** زمینِ یک کاشی، بدون انیمیشن (برای کش و رسمِ مستقیم) + پرچینِ مرزِ زمینِ خریده‌شده */
export function drawGroundTile(ctx: CanvasRenderingContext2D, s: State, gx: number, gy: number, season: string, snow: boolean, d = 1) {
  const { x, y } = tileCenter(gx, gy);
  const lk = locked(s, gx, gy);
  groundBase(ctx, s, gx, gy, x, y, lk, season, snow, d);
  if (lk) return;
  if (gy === 0 || locked(s, gx, gy - 1)) fence(ctx, [x, y - B], [x + A, y]);
  if (gx === 0 || locked(s, gx - 1, gy)) fence(ctx, [x - A, y], [x, y - B]);
  if (gx === N - 1 || locked(s, gx + 1, gy)) fence(ctx, [x + A, y], [x, y + B]);
  if (gy === N - 1 || locked(s, gx, gy + 1)) fence(ctx, [x, y + B], [x - A, y]);
}
/** رسمِ پایه‌ی یک کاشی با انجینِ ArtLab؛ d>1 = جزئیاتِ کامل (برای وصله‌ی نزدیک) */
export function groundBase(ctx: CanvasRenderingContext2D, s: State, gx: number, gy: number, x: number, y: number, lk: boolean, season: string, snow: boolean, d = 1) {
  const t = s.tiles[idx(gx, gy)];
  const P = pal(season);
  const seed = gx * 7.31 + gy * 13.17;
  if (t.k === "water") {
    const lake = t.v > 0.5;
    const e = waterEdges(s, gx, gy);
    const g = ctx.createLinearGradient(x, y - B, x, y + B);
    g.addColorStop(0, e ? P.water[0] : P.water[1]);
    g.addColorStop(1, e ? P.water[1] : P.water[2]);
    diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = g; ctx.fill();
    drawWaterDetail(ctx, x, y, A, B, lake, seed);
    if (e) { ctx.strokeStyle = "rgba(240,225,180,0.55)"; ctx.lineWidth = 3.5; ctx.stroke(); } // لبه‌ی شنیِ خیس
    if (lake && hash(gx, gy) > 0.72) { ellipse(ctx, x + 9, y + 4, 7, 3.4, "#2e7d32"); ellipse(ctx, x + 11, y + 3, 2.2, 1.6, "#f48fb1"); }
    return;
  }
  if (t.k === "soil") {
    diamond(ctx, x, y, A, B); ctx.fillStyle = "#558b2f"; ctx.fill();
    const base = t.wet ? P.soilWet : P.soilDry;
    const g = ctx.createLinearGradient(x - A, y, x + A, y);
    g.addColorStop(0, shade(base[0], -0.08)); g.addColorStop(1, shade(base[1], 0.14));
    diamond(ctx, x, y + 1, A * 0.93, B * 0.93); ctx.fillStyle = g; ctx.fill();
    drawSoilDetail(ctx, x, y, A, B, seed, d);
    if (t.wet) { // براقیتِ خیس: هاله‌ی آبیِ نرم
      const s2 = A * 1.15;
      ctx.drawImage(softBlob("rgba(130,205,255,0.24)"), x - A * 0.55, y - s2 * 0.18, s2 * 0.75, s2 * 0.42);
    }
    if (snow && (t.g || 0) < 0.3) { snowCover(ctx, gx, gy, x, y, 0.93, 0.7); drawSnowDetail(ctx, x, y, A, B, seed, season, d); }
    drawContact(ctx, x, y, A, B, contactEdges(s, gx, gy));
    return;
  }
  const touchesWater =
    (gy > 0 && s.tiles[idx(gx, gy - 1)].k === "water") || (gy < N - 1 && s.tiles[idx(gx, gy + 1)].k === "water") ||
    (gx > 0 && s.tiles[idx(gx - 1, gy)].k === "water") || (gx < N - 1 && s.tiles[idx(gx + 1, gy)].k === "water");
  if (touchesWater && season !== "winter") { // ساحلِ شنی هرجا خشکی به آب می‌رسد
    const sg = ctx.createLinearGradient(x, y - B, x, y + B);
    sg.addColorStop(0, P.sand[0]); sg.addColorStop(1, P.sand[1]);
    diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = sg; ctx.fill();
    drawSandSpeckle(ctx, x, y, A, B, seed, d);
    if (lk) { diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = "rgba(10,25,20,0.52)"; ctx.fill(); }
    return;
  }
  // چمن: متغیرِ پیوسته‌ی FBM (نه شطرنجی) + گرادیانِ سه‌پله + نورِ لکه‌لکه + علف + گل
  const [h0, s0, l0] = P.grass;
  const tv = tileVar(gx, gy);
  const hue = h0 + tv.dh, sat = s0, l = l0 + tv.dl + (t.v || 0) * 5;
  const g = ctx.createLinearGradient(x, y - B, x, y + B);
  g.addColorStop(0, `hsl(${hue},${sat}%,${l + 5}%)`);
  g.addColorStop(0.55, `hsl(${hue},${sat}%,${l}%)`);
  g.addColorStop(1, `hsl(${hue},${sat + 4}%,${l - 5}%)`);
  diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = g; ctx.fill();
  drawDapples(ctx, x, y, A, B, seed, d);
  drawBlades(ctx, x, y, A, B, seed, d, season);
  if ((t.v || 0) > 0.55 && t.k === "grass" && season !== "winter") drawFlowers(ctx, x, y, A, B, seed + 3, season, d);
  if (snow) { snowCover(ctx, gx, gy, x, y, 1, 0.62); drawSnowDetail(ctx, x, y, A, B, seed, season, d); }
  drawContact(ctx, x, y, A, B, contactEdges(s, gx, gy));
  if (lk) { diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = "rgba(10,25,20,0.52)"; ctx.fill(); }
}

const KIND: Record<string, number> = { grass: 1, soil: 2, water: 3, tree: 4, rock: 5, bld: 6 };
/** کلیدِ ظاهرِ زمینِ یک کاشی: هر چیزی که drawGroundTile به آن وابسته است */
export function groundKey(s: State, i: number, snow: boolean) {
  const t = s.tiles[i];
  let k = (KIND[t.k] ?? 7) | (t.wet ? 16 : 0) | (t.fert ? 32 : 0) | (locked(s, i % N, (i / N) | 0) ? 64 : 0);
  if (snow && t.k === "soil" && (t.g || 0) < 0.3) k |= 128;
  return k | (Math.round((t.v || 0) * 255) << 8);
}

/** مستطیلِ جهانیِ کش (کلِ جزیره + حاشیه برای علف‌ها و تیرکِ پرچین در لبه‌ی نقشه) */
export const X0 = -N * A - 4, Y0 = -N * B - 18, GW = 2 * N * A + 8, GH = 2 * N * B + 22;
const STEPS = [0.35, 0.5, 0.7, 1, 1.28]; // ۱.۲۸ ≈ ۸.۳ مگاپیکسل: زیرِ سقفِ ۱۶.۷ مگاپیکسلیِ بومِ iOS
/** پله‌ی مقیاسِ کش برای مقیاسِ مؤثرِ صفحه (dpr × zoom)؛ تا ۵٪ بزرگ‌نمایی پذیرفته است */
export function cacheStep(k: number) {
  for (const st of STEPS) if (st >= k * 0.95) return st;
  return STEPS[STEPS.length - 1];
}
/** زومِ نزدیک ← رسمِ مستقیم (با پسماند تا مرز چشمک نزند) */
export const wantsDirect = (k: number, wasDirect: boolean) => (wasDirect ? k > 1.3 : k > 1.45);

interface WaterTile { gx: number; gy: number; x: number; y: number; e: number; lake: boolean; r: number[]; fish: boolean; duck: boolean }

export class GroundLayer {
  cv: HTMLCanvasElement | null = null;
  private cx: CanvasRenderingContext2D | null = null;
  scale = 0;
  direct = false;
  private want = 0;
  private wantSince = 0;
  private sig = "";
  private keys = new Int32Array(N * N).fill(-1);
  water: WaterTile[] = [];
  fert: number[] = [];
  /** شمارنده‌ها برای سنجش و تست */
  stats = { rebuilds: 0, patches: 0 };

  /** کش را با وضعیت هم‌گام می‌کند؛ خروجی: آیا این فریم از کش کشیده شود */
  sync(s: State, k: number, now: number): boolean {
    const season = SEASONS[s.seasonIndex]?.id ?? "spring", snow = s.weather === "snow";
    const changed: number[] = [];
    let nChanged = 0;
    for (let i = 0; i < N * N; i++) {
      const key = groundKey(s, i, snow);
      if (key !== this.keys[i]) {
        this.keys[i] = key;
        if (nChanged++ < 24) changed.push(i);
      }
    }
    if (nChanged) this.lists(s);
    this.direct = wantsDirect(k, this.direct);
    const step = cacheStep(k);
    if (step !== this.want) { this.want = step; this.wantSince = now; }
    const sig = `${season}|${snow ? 1 : 0}`;
    const rescale = !this.cv || (this.want !== this.scale && now - this.wantSince > 0.3);
    if (rescale || sig !== this.sig || nChanged > 24) this.rebuild(s, rescale || !this.cv ? this.want : this.scale, season, snow, sig);
    else for (const i of changed) this.patch(s, i % N, (i / N) | 0, season, snow);
    return !this.direct;
  }

  private lists(s: State) {
    this.water = [];
    this.fert = [];
    for (let i = 0; i < N * N; i++) {
      const t = s.tiles[i], gx = i % N, gy = (i / N) | 0;
      if (t.fert && t.k === "soil") this.fert.push(i);
      if (t.k !== "water") continue;
      const { x, y } = tileCenter(gx, gy), lake = t.v > 0.5;
      const r = [0, 1].flatMap((j) => [hash(gx, gy + j) * 6, (hash(gy, gx + j) - 0.5) * 18]);
      this.water.push({ gx, gy, x, y, e: waterEdges(s, gx, gy), lake, r, fish: !lake && hash(gx + 5, gy + 9) > 0.965, duck: lake && hash(gx + 9, gy + 2) > 0.94 });
    }
  }

  private rebuild(s: State, sc: number, season: string, snow: boolean, sig: string) {
    const w = Math.ceil(GW * sc), h = Math.ceil(GH * sc);
    if (!this.cv || this.cv.width !== w || this.cv.height !== h) {
      this.cv = makeCanvas(w, h);
      this.cx = this.cv.getContext("2d");
    }
    const cx = this.cx!;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, w, h);
    cx.setTransform(sc, 0, 0, sc, -X0 * sc, -Y0 * sc);
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) drawGroundTile(cx, s, gx, gy, season, snow);
    this.scale = sc;
    this.sig = sig;
    this.stats.rebuilds++;
  }

  /** فقط ناحیه‌ی ۳×۳ دورِ کاشیِ عوض‌شده؛ برشِ مستطیلیِ پیکسل‌-درست و همان ترتیبِ رسمِ کامل */
  private patch(s: State, gx: number, gy: number, season: string, snow: boolean) {
    const cx = this.cx!, sc = this.scale, c = tileCenter(gx, gy);
    const px0 = Math.max(0, Math.floor((c.x - 3 * A - X0) * sc)), py0 = Math.max(0, Math.floor((c.y - 3 * B - 16 - Y0) * sc));
    const px1 = Math.min(this.cv!.width, Math.ceil((c.x + 3 * A - X0) * sc)), py1 = Math.min(this.cv!.height, Math.ceil((c.y + 3 * B + 2 - Y0) * sc));
    const wx0 = px0 / sc + X0, wx1 = px1 / sc + X0, wy0 = py0 / sc + Y0, wy1 = py1 / sc + Y0;
    cx.save();
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.beginPath(); cx.rect(px0, py0, px1 - px0, py1 - py0); cx.clip();
    cx.clearRect(px0, py0, px1 - px0, py1 - py0);
    cx.setTransform(sc, 0, 0, sc, -X0 * sc, -Y0 * sc);
    for (let yy = Math.max(0, gy - 5); yy <= Math.min(N - 1, gy + 5); yy++) {
      for (let xx = Math.max(0, gx - 5); xx <= Math.min(N - 1, gx + 5); xx++) {
        const p = tileCenter(xx, yy);
        if (p.x + A + 2 < wx0 || p.x - A - 2 > wx1 || p.y + B + 1 < wy0 || p.y - B - 16 > wy1) continue;
        drawGroundTile(cx, s, xx, yy, season, snow, 2); // وصله‌ی نزدیک = جزئیاتِ کامل
      }
    }
    cx.restore();
    this.stats.patches++;
  }

  /** یک drawImage: فقط بخشِ دیده‌شده‌ی کش (مختصاتِ جهانی) */
  blit(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    if (!this.cv) return;
    const sx0 = Math.max(X0, x0), sy0 = Math.max(Y0, y0), sx1 = Math.min(X0 + GW, x1), sy1 = Math.min(Y0 + GH, y1);
    if (sx1 <= sx0 || sy1 <= sy0) return;
    const sc = this.scale;
    ctx.drawImage(this.cv, (sx0 - X0) * sc, (sy0 - Y0) * sc, (sx1 - sx0) * sc, (sy1 - sy0) * sc, sx0, sy0, sx1 - sx0, sy1 - sy0);
  }
}

/**
 * جاندارهای زمین، هر فریم و دسته‌ای: کفِ ساحل در ۳ پله‌ی شفافیت، همه‌ی موج‌ها در یک مسیر،
 * ماهی و اردک، درخششِ کود. detail=false (دور): یک موج برای هر کاشی به‌جای دو.
 */
export function drawGroundAnim(ctx: CanvasRenderingContext2D, layer: GroundLayer, now: number, x0: number, y0: number, x1: number, y1: number, detail = true) {
  const foam = [new Path2D(), new Path2D(), new Path2D()];
  const rip = new Path2D();
  const inView = (x: number, y: number) => x > x0 - A && x < x1 + A && y > y0 - B && y < y1 + B;
  for (const w of layer.water) {
    const { x, y } = w;
    if (!inView(x, y)) continue;
    if (w.e) {
      const f = 0.5 + 0.4 * Math.sin(now * 2.2 + w.gx * 0.6 + w.gy * 0.4);
      edgePath(foam[f < 0.37 ? 0 : f < 0.63 ? 1 : 2], x, y, w.e);
    }
    for (let j = 0; j < (detail ? 4 : 2); j += 2) {
      const ox = Math.sin(now * 1.5 + w.r[j]) * 12, oy = w.r[j + 1];
      rip.moveTo(x - 12 + ox, y + oy + 3); rip.quadraticCurveTo(x + ox, y + oy, x + 12 + ox, y + oy + 3);
    }
    if (w.fish) { const fx0 = x + Math.sin(now * 0.8 + w.gx) * 10; ellipse(ctx, fx0, y + 4, 5, 2, "rgba(10,40,70,0.35)"); poly(ctx, [[fx0 + 4, y + 4], [fx0 + 8, y + 1.5], [fx0 + 8, y + 6.5]], "rgba(10,40,70,0.35)"); }
    if (w.duck) { const dx0 = x - 6 + Math.sin(now * 0.4 + w.gy) * 8; ellipse(ctx, dx0, y + 3, 5.5, 2.2, "rgba(0,0,0,0.18)"); ellipse(ctx, dx0, y, 5, 3, "#fafafa"); ellipse(ctx, dx0 + 4, y - 3.5, 2.4, 2.2, "#2e7d32"); poly(ctx, [[dx0 + 6, y - 3.5], [dx0 + 9, y - 3], [dx0 + 6, y - 2.5]], "#ffa000"); }
  }
  ctx.lineWidth = 2;
  [0.45, 0.55, 0.66].forEach((a, i) => { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.stroke(foam[i]); });
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.4; ctx.stroke(rip);
  for (const i of layer.fert) {
    const gx = i % N, gy = (i / N) | 0, { x, y } = tileCenter(gx, gy);
    if (!inView(x, y)) continue;
    for (let k = 0; k < 6; k++) {
      const glow = 0.5 + 0.5 * Math.sin(now * 4 + k + gx);
      ellipse(ctx, x + (hash(k, gx) - 0.5) * 55, y + (hash(gy, k) - 0.5) * 24, 1.8, 1.8, `rgba(220,255,100,${glow})`);
    }
  }
}
