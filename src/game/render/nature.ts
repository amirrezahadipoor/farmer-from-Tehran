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
import { drawGenericPlant } from "./plants";
import { drawRockShape, drawTreeShape } from "./flora";

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
  drawTreeShape(ctx, x, y, v, seasonId);
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
  drawRockShape(ctx, x, y, v, snow);
}
export function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, snow: boolean) {
  const moss = v > 0.5 && !snow;
  blit(ctx, sprite(`r|${snow ? 1 : 0}|${moss ? 1 : 0}`, -24, -24, 48, 36, (c) => rockShape(c, 0, 0, moss ? 1 : 0, snow)), x, y);
}
/** سایه‌ی درخت‌ها و سنگ‌های دیده‌شده، همه در یک مسیر و یک fill (پیش از این یک fill برای هر کدام) */
export function objectShadow(p: Path2D, t: Tile, x: number, y: number, sdx: number, scale = 1) {
  const rx = (t.k === "tree" ? 28 : 22) * scale, dx = (t.k === "tree" ? sdx : sdx * 0.5) * scale;
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
      // انجین: ساقه‌های خمیده + دانه‌ی واقعی (زنجیرِ دانه‌ها + ساقه‌های سبوس)
      const col = ripe ? "#f59e0b" : g > 0.6 ? "#b5c24a" : "#7fb33a";
      const colHi = ripe ? "#fcd34d" : g > 0.6 ? "#d6df7d" : "#a9c765";
      ctx.lineCap = "round";
      for (let i = -2; i <= 2; i++) {
        const h = (24 - Math.abs(i) * 2.5) * sc, tx = x + i * 2.6 + sw * 0.8;
        ctx.strokeStyle = i % 2 ? col : shade(col, -0.15); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + i * 0.9, y);
        ctx.quadraticCurveTo(x + i * 1.3, y - h * 0.6, tx, y - h); ctx.stroke();
        if (g > 0.4) {
          for (let k = 0; k < 5; k++) {
            const gy2 = y - h - 1 - k * 2.1 * sc, go = (k % 2 ? 1 : -1) * 1.3 * sc * 0.8;
            ellipse(ctx, tx + go * 0.75, gy2, 1.25 * sc + 0.45, 1.85 * sc + 0.45, k % 2 ? colHi : col);
          }
          ctx.strokeStyle = "rgba(255,244,190,0.5)"; ctx.lineWidth = 0.7;
          for (let k = 0; k < 4; k++) {
            ctx.beginPath(); ctx.moveTo(tx, y - h - 2 * sc);
            ctx.lineTo(tx + (k - 1.5) * 1.7 * sc, y - h - (4.5 + 3 * sc) * sc); ctx.stroke();
          }
        }
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
    case "watermelon": { /* هندوانه: پیچ و برگ و توپِ راه‌راه */
      ctx.strokeStyle = "#33691e"; ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + i * 6, y - 5 * sc, x + i * 9 * sc, y - 2); ctx.stroke(); }
      for (let i = 0; i < 3; i++) ellipse(ctx, x + (i - 1) * 6 * sc, y - 3 - (i % 2) * 2, 3 * sc + 1, 2 * sc + 0.8, "#388e3c");
      if (g > 0.35) { const r = 3 + 5.5 * sc; ellipse(ctx, x + 2, y - 2, r, r * 0.82, "#2e7d32");
        ctx.strokeStyle = "#1b5e20"; ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + 2 + i * r * 0.5, y - 2 - r * 0.75); ctx.quadraticCurveTo(x + 2 + i * r * 0.7, y - 2, x + 2 + i * r * 0.5, y - 2 + r * 0.75); ctx.stroke(); }
        if (ripe) ellipse(ctx, x + 2 - r * 0.3, y - 2 - r * 0.35, r * 0.3, r * 0.2, "rgba(255,255,255,0.35)"); }
      break; }
    default:
      drawGenericPlant(ctx, c.look ?? "bush", c.color, leaf, x, y, g, sc, sw, seed, seasonId);
  }
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

/* ------------------------------------------------------------ قهرمان (V.1) */
/** آواتار بازیکن: ظاهر به جنسیتِ انتخابی، انیمیشن کنش با toolِ فعال */
function drawHero(ctx: CanvasRenderingContext2D, w: Walker, now: number) {
  const { x, y } = tileCenter(w.x - 0.5, w.y - 0.5);
  const actT = w.actT ?? 0;
  const acting = actT > 0;
  const moving = !acting && Math.hypot(w.tx - w.x, w.ty - w.y) > 0.06;
  const step = moving ? Math.sin(now * 13) : 0;
  const bob = moving ? Math.abs(step) * 2.5 : acting ? Math.abs(Math.sin((0.7 - actT) * 14)) * 1.5 : 0;
  const look = w.look ?? "n";
  ellipse(ctx, x, y, 8, 3.4, "rgba(0,0,0,0.32)");
  // پاها
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(x - 3.5, y - 9, 2.6, 9 - step * 2.5);
  ctx.fillRect(x + 1, y - 9, 2.6, 9 + step * 2.5);
  // تنه و پیش‌بند
  if (look === "f") {
    ellipse(ctx, x, y - 13 - bob, 7, 8.5, "#00897b");
    ellipse(ctx, x, y - 8 - bob, 7.5, 5, "#00897b"); // دامن
    ellipse(ctx, x, y - 12 - bob, 4.5, 6, "#ffe082");
  } else {
    ellipse(ctx, x, y - 14 - bob, 6.8, 7.8, "#43a047");
    ellipse(ctx, x, y - 12 - bob, 4.5, 5.5, "#ffe082");
  }
  // سر
  ellipse(ctx, x, y - 23 - bob, 4.8, 4.8, "#ffcc80");
  if (look === "f") {
    // روسری: کمان روی سر + دنباله‌ی پشت
    ctx.fillStyle = "#d81b60";
    ctx.beginPath(); ctx.arc(x, y - 24 - bob, 5.2, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.fillRect(x - 5.2, y - 24 - bob, 2.2, 7);
    ellipse(ctx, x, y - 27.5 - bob, 2.2, 2.2, "#d81b60");
  } else if (look === "m") {
    ctx.fillStyle = "#5d4037"; ctx.fillRect(x - 4.8, y - 27 - bob, 9.6, 3.4); // مو
    ellipse(ctx, x, y - 27.5 - bob, 9, 2.6, "#e6c36a"); // کلاه کاهی
    ellipse(ctx, x, y - 29.5 - bob, 5, 3, "#e6c36a");
  } else {
    ctx.fillStyle = "#5d4037"; ctx.beginPath(); ctx.arc(x, y - 24.5 - bob, 5, Math.PI, Math.PI * 2); ctx.fill();
    ellipse(ctx, x, y - 27 - bob, 7.5, 2.2, "#607d8b"); // کلاه ساده
  }
  // دست‌ها و ابزارِ کنش
  const p = acting ? 1 - actT / 0.7 : 0;
  const sw = acting ? Math.sin(p * Math.PI) : 0; // ۰→۱→۰
  const hx = x + 6 * (w.face || 1), hy = y - 14 - bob;
  const act = w.act ?? "";
  if (act === "hoe" || act === "clear") {
    const a = -1.9 + sw * 1.5; // بالا آوردن و کوبیدن
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a * (w.face || 1));
    ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, 0); ctx.stroke();
    ctx.fillStyle = act === "hoe" ? "#90a4ae" : "#b0bec5"; ctx.fillRect(9.5, -3.5, 3, 7);
    ctx.restore();
  } else if (act === "water") {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.5 * sw * (w.face || 1));
    ctx.fillStyle = "#42a5f5"; ctx.fillRect(-1, -4, 8, 6); ctx.fillRect(6, -6, 4, 3);
    ctx.restore();
    if (sw > 0.25) {
      ctx.fillStyle = "rgba(66,165,245,0.85)";
      for (let k = 0; k < 3; k++) ellipse(ctx, hx + 9 + k * 3, hy + 2 + k * 3 + sw * 4, 1.3, 1.8, "rgba(66,165,245,0.85)");
    }
  } else if (act === "seed" || act === "fert") {
    ctx.strokeStyle = "#ffcc80"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(hx + sw * 3, hy - 2 - sw * 3); ctx.stroke();
    if (sw > 0.2) {
      const c = act === "seed" ? "#8d6e63" : "#66bb6a";
      for (let k = 0; k < 3; k++) ellipse(ctx, hx + 4 + k * 4, hy - 4 + Math.abs(k - 1) * 3 + sw * 6, 1.4, 1.4, c);
    }
  } else {
    // دست‌های ساده؛ هنگام برداشت یک جرقه
    ctx.strokeStyle = "#ffcc80"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x - 5, hy); ctx.lineTo(x - 8, hy + 4 - (acting ? sw * 8 : 0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, hy); ctx.lineTo(x + 8, hy + 4 - (acting ? sw * 8 : 0)); ctx.stroke();
    if (acting && sw > 0.5) {
      ctx.fillStyle = "rgba(255,235,130,0.9)";
      const sy = hy - 10;
      ctx.beginPath(); ctx.moveTo(hx, sy - 4); ctx.lineTo(hx + 1.5, sy - 1.5); ctx.lineTo(hx + 4, sy); ctx.lineTo(hx + 1.5, sy + 1.5);
      ctx.lineTo(hx, sy + 4); ctx.lineTo(hx - 1.5, sy + 1.5); ctx.lineTo(hx - 4, sy); ctx.lineTo(hx - 1.5, sy - 1.5); ctx.closePath(); ctx.fill();
    }
  }
}

/* ------------------------------------------------------------ کارگرها */
export function drawWalker(ctx: CanvasRenderingContext2D, w: Walker, now: number) {
  if (w.kind === "hero") return drawHero(ctx, w, now);
  const { x, y } = tileCenter(w.x - 0.5, w.y - 0.5);
  const moving = w.wait <= 0;
  const bob = moving ? Math.abs(Math.sin(now * 11)) * 2.5 : 0;
  ellipse(ctx, x, y, 7.5, 3.2, "rgba(0,0,0,0.3)");
  const shirt = w.kind === "farmhand" ? "#1e88e5" : w.kind === "operator" ? "#fb8c00" : w.kind === "scientist" ? "#8e24aa" : w.kind === "vet" ? "#00796b" : w.kind === "guest" ? "#7b1fa2" : "#37474f";
  ctx.fillStyle = "#3e2723"; ctx.fillRect(x - 3.5, y - 9, 2.5, 9 - (moving ? Math.sin(now * 11) * 2.5 : 0)); ctx.fillRect(x + 1, y - 9, 2.5, 9 + (moving ? Math.sin(now * 11) * 2.5 : 0) - 2);
  ellipse(ctx, x, y - 14 - bob, 6.5, 7.5, shirt);
  ellipse(ctx, x, y - 22 - bob, 4.5, 4.5, "#ffcc80");
  if (w.kind === "trader") { ctx.fillStyle = "#212121"; ctx.fillRect(x - 4, y - 30 - bob, 8, 5); ctx.fillRect(x - 7, y - 25.5 - bob, 14, 2); }
  else if (w.kind === "scientist") { ctx.fillStyle = "#00e5ff"; ctx.fillRect(x - 4, y - 23 - bob, 8, 2); }
  else if (w.kind !== "guest") { ellipse(ctx, x, y - 25 - bob, 9, 3, w.kind === "farmhand" ? "#e6c36a" : w.kind === "vet" ? "#00acc1" : "#fbc02d"); }
  if (w.kind === "guest") { // شالِ رنگیِ مهمان
    ctx.fillStyle = "#f06292"; ctx.beginPath(); ctx.ellipse(x, y - 25 - bob, 4.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (w.say) { // حبابِ دیالوگِ سپاس (V.6)
    ctx.font = "bold 9.5px Vazirmatn, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(w.say).width, by = y - 44 - bob;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 4; ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.beginPath(); ctx.roundRect(x - tw / 2 - 6, by - 9, tw + 12, 17, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3.5, by + 7); ctx.lineTo(x + 3.5, by + 7); ctx.lineTo(x, by + 12); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.fillStyle = "#4e342e"; ctx.fillText(w.say, x, by);
  }
}
