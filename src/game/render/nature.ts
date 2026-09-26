/**
 * src/game/render/nature.ts — درخت، سنگ، محصول و کارگرها، با کشِ اسپرایت (P5.14)
 *
 * درخت و سنگ و هر کاشیِ محصول یک بار روی بومی کوچک کشیده می‌شوند و هر فریم فقط یک
 * drawImage هستند (پیش از این: ۴ گرادیانِ شعاعی و ده‌ها شکل برای هر درخت و تا ۹ بوته‌ی
 * جدا برای هر کاشیِ محصول). تکانِ باد با کجیِ (skew) کلِ اسپرایت ساخته می‌شود: پایه ثابت،
 * نوک بیشتر — همان حسِ قبلی. مقیاسِ اسپرایت پله‌ای است و با زوم/رزولوشن عوض می‌شود.
 */
import { CMAP } from "../data";
import type { Tile } from "../logic";
import { A, B, clamp, ellipse, hash, makeCanvas, poly, shade, tileCenter, type Walker } from "./core";

interface Sprite { cv: HTMLCanvasElement; x0: number; y0: number; w: number; h: number }
const sprites = new Map<string, Sprite>();
let SS = 0;
/** پله‌ی مقیاسِ اسپرایت برای مقیاسِ مؤثرِ صفحه (dpr × zoom) */
export const spriteStep = (k: number) => (k <= 0.8 ? 0.8 : k <= 1.6 ? 1.6 : 3);
export function setSpriteScale(k: number) {
  const sc = spriteStep(k);
  if (sc !== SS) { SS = sc; sprites.clear(); }
}
export const spriteCount = () => sprites.size;
function sprite(key: string, x0: number, y0: number, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): Sprite {
  let sp = sprites.get(key);
  if (!sp) {
    const cv = makeCanvas(w * SS, h * SS);
    const c = cv.getContext("2d")!;
    c.setTransform(SS, 0, 0, SS, -x0 * SS, -y0 * SS);
    draw(c);
    sp = { cv, x0, y0, w, h };
    sprites.set(key, sp);
    if (sprites.size > 700) sprites.delete(sprites.keys().next().value!); // قدیمی‌ترین
  }
  return sp;
}
/** اسپرایت با پایه‌ی (x,y)؛ skew > 0 = نوک به راست خم می‌شود */
function blit(ctx: CanvasRenderingContext2D, sp: Sprite, x: number, y: number, skew = 0) {
  if (!skew) { ctx.drawImage(sp.cv, x + sp.x0, y + sp.y0, sp.w, sp.h); return; }
  ctx.save();
  ctx.transform(1, 0, -skew, 1, skew * y, 0);
  ctx.drawImage(sp.cv, x + sp.x0, y + sp.y0, sp.w, sp.h);
  ctx.restore();
}

/* ------------------------------------------------------------ درخت و سنگ */
function treeShape(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, seasonId: string) {
  const sw = 0;
  ctx.fillStyle = "#3e2723"; ctx.fillRect(x - 3.5, y - 26, 7, 26);
  ctx.fillStyle = "#5d4037"; ctx.fillRect(x - 3.5, y - 26, 3.5, 26);
  if (v > 0.55) {
    for (let i = 0; i < 3; i++) {
      const w = 28 - i * 7, yy = y - 18 - i * 18;
      const leafColor = seasonId === "winter" ? "#ffffff" : seasonId === "autumn" ? "#ff7043" : "#1b5e20";
      poly(ctx, [[x + sw * (i + 1) * 0.4, yy - 28], [x - w, yy], [x, yy + 6]], leafColor);
      poly(ctx, [[x + sw * (i + 1) * 0.4, yy - 28], [x, yy + 6], [x + w, yy]], shade(leafColor === "#ffffff" ? "#ffffff" : leafColor === "#ff7043" ? "#ef6c00" : "#2e7d32", 0.2));
      if (seasonId === "winter") { ellipse(ctx, x + sw * (i + 1) * 0.4, yy - 28, 10, 5, "#fff"); }
    }
  } else {
    const blobs = [[-14, -36, 17], [14, -38, 17], [0, -54, 19], [0, -34, 18]];
    for (const [bx, by, r] of blobs) {
      let c1 = "#9ccc65", c2 = "#2e7d32", c3 = "#1b5e20";
      if (seasonId === "autumn") { c1 = "#ffcc80"; c2 = "#ef6c00"; c3 = "#bf360c"; }
      if (seasonId === "winter") { c1 = "#ffffff"; c2 = "#cfd8dc"; c3 = "#b0bec5"; }
      const g = ctx.createRadialGradient(x + bx - r * 0.4 + sw, y + by - r * 0.4, 2, x + bx + sw, y + by, r);
      g.addColorStop(0, c1); g.addColorStop(0.6, c2); g.addColorStop(1, c3);
      ellipse(ctx, x + bx + sw, y + by, r, r * 0.92, g);
    }
    if (v > 0.35 && seasonId !== "winter") for (let i = 0; i < 5; i++) ellipse(ctx, x + (hash(v, i) - 0.5) * 36 + sw, y - 32 - hash(i, v) * 28, 2.8, 2.8, seasonId === "autumn" ? "#d84315" : "#d32f2f");
  }
}
/** now < 0 = بدونِ تکانِ باد (دور از دوربین) */
export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, now: number, seasonId: string) {
  const conifer = v > 0.55, fruit = !conifer && v > 0.35 && seasonId !== "winter";
  const vb = Math.floor(v * 16);
  const vq = fruit ? (vb + 0.5) / 16 : v;
  const sp = sprite(`t|${seasonId}|${conifer ? "c" : fruit ? "f" + vb : "b"}`, -36, -88, 72, 94, (c) => treeShape(c, 0, 0, vq, seasonId));
  blit(ctx, sp, x, y, now < 0 ? 0 : (Math.sin(now * 1.3 + v * 10) * 2) / 55);
}
function rockShape(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, snow: boolean) {
  poly(ctx, [[x - 20, y + 2], [x - 15, y - 14], [x - 2, y - 20], [x + 14, y - 16], [x + 21, y], [x + 7, y + 8], [x - 9, y + 8]], "#607d8b");
  poly(ctx, [[x - 15, y - 14], [x - 2, y - 20], [x + 14, y - 16], [x + 2, y - 7], [x - 9, y - 6]], "#b0bec5");
  poly(ctx, [[x + 2, y - 7], [x + 14, y - 16], [x + 21, y], [x + 7, y + 8]], "#455a64");
  if (snow) ellipse(ctx, x - 3, y - 18, 10, 4, "rgba(255,255,255,0.9)");
  if (v > 0.5 && !snow) ellipse(ctx, x - 7, y - 11, 6, 3, "#8bc34a");
}
export function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, snow: boolean) {
  const moss = v > 0.5 && !snow;
  blit(ctx, sprite(`r|${snow ? 1 : 0}|${moss ? 1 : 0}`, -24, -24, 48, 36, (c) => rockShape(c, 0, 0, moss ? 1 : 0, snow)), x, y);
}
/** سایه‌ی درخت‌ها و سنگ‌های دیده‌شده، همه در یک مسیر و یک fill (پیش از این یک fill برای هر کدام) */
export function objectShadow(p: Path2D, t: Tile, x: number, y: number, sdx: number) {
  const rx = t.k === "tree" ? 28 : 22, dx = t.k === "tree" ? sdx : sdx * 0.5;
  p.moveTo(x + dx + rx, y + 2);
  p.ellipse(x + dx, y + 2, rx, rx * 0.45, 0, 0, Math.PI * 2);
}

/* ------------------------------------------------------------ محصول */
/** یک بوته؛ sw = خمیدگیِ باد (در اسپرایت صفر است و باد با کجیِ کلِ اسپرایت ساخته می‌شود) */
function drawPlant(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, g: number, sw: number, seed: number, seasonId: string) {
  const c = CMAP[id]; if (!c) return;
  const sc = 0.3 + 0.7 * clamp(g / 0.9);
  const ripe = g >= 1;
  ellipse(ctx, x + 2, y + 1, 8 * sc + 2, 3.5 * sc + 1, "rgba(25,10,0,0.3)");
  if (g < 0.12) {
    ctx.strokeStyle = seasonId === "winter" ? "#a1887f" : "#8bc34a"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.stroke();
    ellipse(ctx, x - 3, y - 5.5, 3, 1.5, "#9ccc65"); ellipse(ctx, x + 3, y - 5.5, 3, 1.5, "#9ccc65");
    return;
  }
  const leaf = c.leaf;
  switch (id) {
    case "wheat": {
      const col = ripe ? "#f59e0b" : g > 0.6 ? "#b5c24a" : "#7fb33a";
      ctx.strokeStyle = col; ctx.lineWidth = 1.8;
      for (let i = -2; i <= 2; i++) {
        const h = (22 + Math.abs(i) * -2) * sc, tx = x + i * 2.5 + sw;
        ctx.beginPath(); ctx.moveTo(x + i, y); ctx.quadraticCurveTo(x + i, y - h * 0.6, tx, y - h); ctx.stroke();
        if (g > 0.55) { ctx.save(); ctx.translate(tx, y - h - 3); ctx.rotate(sw * 0.06); ellipse(ctx, 0, 0, 2, 5 * sc, ripe ? "#fbbf24" : "#c6cf5a"); ctx.restore(); }
      } break; }
    case "carrot": {
      ctx.strokeStyle = leaf; ctx.lineWidth = 2.0;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.quadraticCurveTo(x + i * 3.5, y - 9 * sc, x + i * 6 * sc + sw, y - 17 * sc); ctx.stroke(); ellipse(ctx, x + i * 6 * sc + sw, y - 17 * sc, 3, 1.8, shade(leaf, 0.2)); }
      if (g > 0.5) poly(ctx, [[x - 4.5 * sc, y - 2], [x + 4.5 * sc, y - 2], [x, y + 4]], c.color);
      break;
    }
    case "corn": {
      const h = 44 * sc;
      ctx.strokeStyle = shade(leaf, -0.12); ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw * 0.6, y - h); ctx.stroke();
      for (let i = 0; i < 4; i++) { const yy = y - h * (0.25 + i * 0.18), d = i % 2 ? 1 : -1; ctx.strokeStyle = leaf; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + sw * 0.3, yy); ctx.quadraticCurveTo(x + d * 11 * sc, yy - 7, x + d * 15 * sc + sw, yy + 3); ctx.stroke(); }
      if (g > 0.6) {
        const ccol = ripe ? c.color : "#d4e157";
        ellipse(ctx, x + 4 + sw * 0.4, y - h * 0.55, 3.5, 8 * sc, ccol);
        for (let i = 0; i < 4; i++) { ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 1, y - h * 0.55 - 6 + i * 3); ctx.lineTo(x + 7, y - h * 0.55 - 5 + i * 3); ctx.stroke(); }
      }
      break;
    }
    case "tomato": {
      ctx.fillStyle = "#8d6e63"; ctx.fillRect(x - 1, y - 28 * sc, 2, 28 * sc);
      for (let i = 0; i < 5; i++) ellipse(ctx, x + (hash(seed, i) - 0.5) * 16 * sc + sw * 0.5, y - 7 - hash(i, seed) * 18 * sc, 6.5 * sc, 5.5 * sc, i % 2 ? leaf : shade(leaf, 0.18));
      if (g > 0.55) for (let i = 0; i < 4; i++) {
        const fx = x + (hash(i + 3, seed) - 0.5) * 16 * sc + sw * 0.5, fy = y - 6 - hash(seed, i + 9) * 16 * sc;
        const col = ripe ? c.color : g > 0.8 ? "#fb923c" : "#a3e635";
        ellipse(ctx, fx, fy, 3.6, 3.6, col); ellipse(ctx, fx - 1, fy - 1, 1.2, 1.2, "rgba(255,255,255,0.7)");
      } break;
    }
    case "strawberry": {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ellipse(ctx, x + Math.cos(a) * 7 * sc + sw * 0.3, y - 4 + Math.sin(a) * 3 * sc, 5.5 * sc, 3.5 * sc, leaf); }
      if (g > 0.5) for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * 6 * sc, fy = y - 1 + (i % 2) * 2;
        poly(ctx, [[fx - 3, fy - 2], [fx + 3, fy - 2], [fx, fy + 4]], ripe ? c.color : "#fef08a");
        ellipse(ctx, fx, fy - 2, 3, 1.6, ripe ? c.color : "#fef08a");
      } break;
    }
    case "sunflower": {
      const h = 46 * sc;
      ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - h / 2, x + sw, y - h); ctx.stroke();
      ellipse(ctx, x - 6, y - h * 0.4, 5.5 * sc, 2.5 * sc, leaf); ellipse(ctx, x + 6, y - h * 0.6, 5.5 * sc, 2.5 * sc, leaf);
      if (g > 0.6) {
        const hx = x + sw, hy = y - h - 4, r = (ripe ? 9 : 6) * sc;
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + seed; ellipse(ctx, hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.9, 3.5 * sc, 3.5 * sc, ripe ? c.color : "#eeff41"); }
        ellipse(ctx, hx, hy, r * 0.75, r * 0.7, "#4e342e");
        ellipse(ctx, hx - r * 0.2, hy - r * 0.2, r * 0.25, r * 0.25, "#8d6e63");
      } break;
    }
    case "pumpkin": {
      ctx.strokeStyle = "#43a047"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x - 14 * sc, y + 2); ctx.bezierCurveTo(x - 5, y - 7, x + 5, y + 7, x + 14 * sc, y - 2); ctx.stroke();
      if (g > 0.45) {
        const r = (ripe ? 11 : 5 + g * 5) * sc + 1, col = ripe ? c.color : "#84cc16";
        ellipse(ctx, x - r * 0.45, y - r * 0.5, r * 0.65, r * 0.7, col);
        ellipse(ctx, x + r * 0.45, y - r * 0.5, r * 0.65, r * 0.7, col);
        ellipse(ctx, x, y - r * 0.55, r * 0.65, r * 0.75, shade(col, 0.15));
        ctx.fillStyle = "#4e342e"; ctx.fillRect(x - 1.2, y - r * 1.3 - 3, 2.4, 5);
      }
      break;
    }
    case "grape": {
      ctx.fillStyle = "#5d4037"; ctx.fillRect(x - 8, y - 30 * sc, 2, 30 * sc); ctx.fillRect(x + 6, y - 30 * sc, 2, 30 * sc); ctx.fillRect(x - 9, y - 25 * sc, 18, 2);
      if (g > 0.5) for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { ellipse(ctx, x - 6 + j * 6 + i * 0.5, y - 16 * sc + i * 6, 3 * sc, 4 * sc, ripe ? c.color : "#a3e635"); }
      break;
    }
    case "melon": {
      ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 6, 9 * sc, 0, Math.PI); ctx.stroke();
      if (g > 0.5) { ellipse(ctx, x, y - 6, 10 * sc, 8 * sc, ripe ? c.color : "#84cc16"); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 6, 9 * sc, 0.4, Math.PI - 0.4); ctx.stroke(); }
      break;
    }
    case "saffron": {
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + i * 2, y); ctx.lineTo(x + i * 3 + sw * 0.3, y - 18 * sc); ctx.stroke();
        if (g > 0.5) {
          ellipse(ctx, x + i * 3 + sw * 0.3, y - 20 * sc, 3.5 * sc, 5.5 * sc, ripe ? c.color : "#ce93d8");
          if (ripe) { ctx.strokeStyle = "#ff1744"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x + i * 3, y - 20 * sc); ctx.lineTo(x + i * 3 + 2, y - 26 * sc); ctx.stroke(); }
        }
      } break;
    }
    case "poplar": {
      // نهال صنوبر: تنه‌ی باریک و تاجِ کشیده که با رشد بلند می‌شود
      const h = 16 + 34 * sc;
      ctx.fillStyle = "#6d4424"; ctx.fillRect(x - 1.4, y - h * 0.45, 2.8, h * 0.45);
      const leafCol = seasonId === "autumn" ? "#f9a825" : seasonId === "winter" ? "#cfd8dc" : ripe ? "#558b2f" : leaf;
      ellipse(ctx, x + sw * 0.5, y - h * 0.62, 5 + 3 * sc, h * 0.42, leafCol);
      ellipse(ctx, x + sw * 0.5 - 1.8, y - h * 0.7, 2 + sc, h * 0.26, shade(leafCol, 0.22));
      if (ripe) { ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + sw * 0.5, y - h * 0.95); ctx.lineTo(x + sw * 0.5, y - h * 0.3); ctx.stroke(); }
      break;
    }
    case "clover": {
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + i * 2, y); ctx.lineTo(x + i * 2, y - 8 * sc); ctx.stroke();
        for (let k = 0; k < 3; k++) { const ang = (k / 3) * Math.PI * 2 + i; ellipse(ctx, x + i * 2 + Math.cos(ang) * 3, y - 10 * sc + Math.sin(ang) * 3, 3 * sc, 3 * sc, g > 0.5 ? "#66bb6a" : "#81c784"); }
      } break;
    }
    default:
      drawGenericPlant(ctx, c.look ?? "bush", c.color, leaf, x, y, g, sc, sw, seed, seasonId);
  }
}

/** ظاهرهای عمومی برای محصول‌های سطح بالا (P6.1): درختِ میوه، بوته، شالیزار، پنبه */
function drawGenericPlant(ctx: CanvasRenderingContext2D, look: string, color: string, leaf: string, x: number, y: number, g: number, sc: number, sw: number, seed: number, seasonId: string) {
  const ripe = g >= 1;
  const autumn = seasonId === "autumn", winter = seasonId === "winter";
  if (look === "tree") {
    const h = 20 + 26 * sc;
    ctx.fillStyle = "#5d4037"; ctx.fillRect(x - 2.4, y - h * 0.55, 4.8, h * 0.55);
    const canopy = winter ? "#b0bec5" : autumn ? "#c0a030" : leaf;
    ellipse(ctx, x + sw * 0.4, y - h * 0.72, 13 * sc + 4, 10 * sc + 3, canopy);
    ellipse(ctx, x - 5 * sc + sw * 0.4, y - h * 0.8, 7 * sc + 2, 5 * sc + 2, shade(canopy, 0.18));
    if (g > 0.55) for (let i = 0; i < 6; i++) {
      const fx = x + (hash(seed, i) - 0.5) * 22 * sc + sw * 0.4, fy = y - h * 0.72 + (hash(i, seed) - 0.5) * 14 * sc;
      ellipse(ctx, fx, fy, 2.6 * sc + 0.6, 2.6 * sc + 0.6, ripe ? color : shade(color, 0.45));
    }
    return;
  }
  if (look === "paddy") {
    ellipse(ctx, x, y + 1, 9, 3.5, "rgba(79,195,247,0.45)");
    const col = ripe ? "#e0c060" : leaf;
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 1.6, y); ctx.quadraticCurveTo(x + i * 2, y - 10 * sc, x + i * 3.2 + sw, y - 20 * sc); ctx.stroke(); }
    if (g > 0.6) for (let i = -1; i <= 1; i++) ellipse(ctx, x + i * 5 + sw, y - 20 * sc, 1.8, 3.6 * sc, ripe ? "#f5e6a8" : "#c5e1a5");
    return;
  }
  if (look === "boll") {
    ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 3, y); ctx.lineTo(x + i * 4 + sw * 0.4, y - 18 * sc); ctx.stroke(); }
    for (let i = -1; i <= 1; i++) ellipse(ctx, x + i * 5 + sw * 0.4, y - 12 * sc, 4 * sc, 2.4 * sc, leaf);
    if (g > 0.55) for (let i = -1; i <= 1; i++) { const px = x + i * 4 + sw * 0.4, py = y - 19 * sc; ellipse(ctx, px, py, (ripe ? 4 : 2.5) * sc + 0.6, (ripe ? 3.4 : 2) * sc + 0.6, ripe ? color : "#dcedc8"); }
    return;
  }
  // bush
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + seed; ellipse(ctx, x + Math.cos(a) * 6 * sc + sw * 0.3, y - 7 * sc + Math.sin(a) * 3 * sc, 6 * sc + 1, 4.5 * sc + 1, i % 2 ? leaf : shade(leaf, 0.15)); }
  if (g > 0.5) for (let i = 0; i < 5; i++) ellipse(ctx, x + (hash(seed, i + 2) - 0.5) * 14 * sc, y - 6 * sc - hash(i + 5, seed) * 8 * sc, 1.9, 1.9, ripe ? color : shade(color, 0.5));
}


/** کاشیِ محصول: همه‌ی بوته‌ها در یک اسپرایت (رشد در ۲۰ پله، ۳ گونه‌ی چینش)؛ درخششِ «رسیده» به مسیرِ مشترک اضافه می‌شود */
export function drawCropTile(ctx: CanvasRenderingContext2D, t: Tile, gx: number, gy: number, now: number, seasonId: string, sparkle: Path2D, sway = true) {
  const { x, y } = tileCenter(gx, gy);
  const g = t.g || 0;
  const q = g >= 1 ? 20 : Math.min(19, Math.floor(g * 20));
  const gq = q === 20 ? 1 : q / 20;
  const vr = (gx * 3 + gy * 5) % 3;
  const crop = t.crop!;
  const sp = sprite(`c|${crop}|${q}|${seasonId}|${vr}`, -52, -86, 104, 112, (c) => {
    const n = crop === "wheat" || crop === "carrot" || crop === "strawberry" || crop === "clover" ? 3 : CMAP[crop]?.look === "tree" ? 1 : 2;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, v = (j + 0.5) / n;
      drawPlant(c, crop, (u - v) * A * 0.85, (u + v - 1) * B * 0.85, gq, 0, hash(vr * 9 + i, vr * 7 + j), seasonId);
    }
  });
  blit(ctx, sp, x, y, sway ? (Math.sin(now * 1.9 + hash(gx, gy) * 7) * (1 + g)) / 26 : 0);
  if (g >= 1) {
    const bob = Math.sin(now * 4 + gx) * 3;
    for (let k = 0; k < 3; k++) {
      const a = now * 2 + k * 2.1 + gx;
      const sx = x + Math.cos(a) * 22, sy = y - 22 + Math.sin(a) * 9 + bob;
      sparkle.moveTo(sx, sy - 5); sparkle.lineTo(sx + 1.5, sy - 1.5); sparkle.lineTo(sx + 5, sy); sparkle.lineTo(sx + 1.5, sy + 1.5);
      sparkle.lineTo(sx, sy + 5); sparkle.lineTo(sx - 1.5, sy + 1.5); sparkle.lineTo(sx - 5, sy); sparkle.lineTo(sx - 1.5, sy - 1.5); sparkle.closePath();
    }
  }
}

/* ------------------------------------------------------------ کارگرها */
export function drawWalker(ctx: CanvasRenderingContext2D, w: Walker, now: number) {
  const { x, y } = tileCenter(w.x - 0.5, w.y - 0.5);
  const moving = w.wait <= 0;
  const bob = moving ? Math.abs(Math.sin(now * 11)) * 2.5 : 0;
  ellipse(ctx, x, y, 7.5, 3.2, "rgba(0,0,0,0.3)");
  const shirt = w.kind === "farmhand" ? "#1e88e5" : w.kind === "operator" ? "#fb8c00" : w.kind === "scientist" ? "#8e24aa" : w.kind === "vet" ? "#00796b" : "#37474f";
  ctx.fillStyle = "#3e2723"; ctx.fillRect(x - 3.5, y - 9, 2.5, 9 - (moving ? Math.sin(now * 11) * 2.5 : 0)); ctx.fillRect(x + 1, y - 9, 2.5, 9 + (moving ? Math.sin(now * 11) * 2.5 : 0) - 2);
  ellipse(ctx, x, y - 14 - bob, 6.5, 7.5, shirt);
  ellipse(ctx, x, y - 22 - bob, 4.5, 4.5, "#ffcc80");
  if (w.kind === "trader") { ctx.fillStyle = "#212121"; ctx.fillRect(x - 4, y - 30 - bob, 8, 5); ctx.fillRect(x - 7, y - 25.5 - bob, 14, 2); }
  else if (w.kind === "scientist") { ctx.fillStyle = "#00e5ff"; ctx.fillRect(x - 4, y - 23 - bob, 8, 2); }
  else { ellipse(ctx, x, y - 25 - bob, 9, 3, w.kind === "farmhand" ? "#e6c36a" : w.kind === "vet" ? "#00acc1" : "#fbc02d"); }
}
