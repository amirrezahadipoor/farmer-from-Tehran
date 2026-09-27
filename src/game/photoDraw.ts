/**
 * src/game/photoDraw.ts — V.10: کشیدنِ صحنه‌ی عکس و نقش‌مایه‌های قاب (جدا از photo.ts تا هر فایل کوچک بماند)
 *
 * لایه‌های صفحه همان رنگ‌ها، گرادیان‌ها و اندازه‌های ui/ScreenLayers.tsx را روی بوم بازسازی می‌کنند؛
 * نقش‌مایه‌ها به واحدِ پیکسلِ CSS کشیده می‌شوند و مقیاس بیرون اعمال می‌شود.
 */
import type { SeasonFrame, Snapshot } from "./photo";

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

export function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function wash(c: Ctx, color: string, o: number, w: number, h: number) {
  if (o <= 0.005) return;
  c.globalAlpha = o;
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  c.globalAlpha = 1;
}

/** همان هفت نقطه‌ی الگوی ۲۶۰×۲۲۰ لایه‌ی ستاره‌ها: x٪، y٪، شعاع (px)، روشنایی */
const STAR_DOTS: [number, number, number, number][] = [
  [18, 22, 1.2, 0.95], [62, 12, 1, 0.8], [84, 34, 1.4, 0.9], [38, 48, 1, 0.7], [8, 62, 1.1, 0.75], [74, 58, 1, 0.65], [48, 8, 1.3, 0.85],
];
function stars(c: Ctx, w: number, h: number, k: number, o: number) {
  const tw = 260 * k;
  const th = 220 * k;
  c.fillStyle = "#fff";
  for (let ty = 0; ty < h; ty += th)
    for (let tx = 0; tx < w; tx += tw)
      for (const [px, py, r, a] of STAR_DOTS) {
        c.globalAlpha = a * o;
        c.beginPath();
        c.arc(tx + (px / 100) * tw, ty + (py / 100) * th, r * k, 0, TAU);
        c.fill();
      }
  c.globalAlpha = 1;
}

/** خورشید یا ماه: هاله (box-shadow) + گویِ گرادیانی (radial-gradient در CSS) */
function orb(c: Ctx, x: number, y: number, r: number, glow: number, cols: [string, string, string], hl: [number, number], glowRgb: string, glowA: number, o: number) {
  c.globalAlpha = o;
  const g = c.createRadialGradient(x, y, r * 0.5, x, y, r + glow);
  g.addColorStop(0, `rgba(${glowRgb},${glowA})`);
  g.addColorStop(1, `rgba(${glowRgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r + glow, 0, TAU);
  c.fill();
  const hx = x - r + 2 * r * hl[0];
  const hy = y - r + 2 * r * hl[1];
  const b = c.createRadialGradient(hx, hy, 0, hx, hy, r * 1.6);
  b.addColorStop(0, cols[0]);
  b.addColorStop(0.6, cols[1]);
  b.addColorStop(1, cols[2]);
  c.fillStyle = b;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
}

/** صحنه (آسمان + نقشه + لایه‌های صفحه به ترتیبِ DOM) با گوشه‌ی بالا-چپِ (x, y) */
export function drawScene(c: Ctx, snap: Snapshot, x: number, y: number) {
  const { scene, k, fx } = snap;
  const w = scene.width;
  const h = scene.height;
  c.save();
  c.translate(x, y);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#64c3eb");
  sky.addColorStop(1, "#1c73af");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  const img = snap.sky;
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight); // bg-cover bg-center
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    c.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }
  wash(c, "rgb(5,15,40)", fx.sky, w, h);
  c.drawImage(scene, 0, 0);
  if (fx.stars > 0.01) stars(c, w, h, k, fx.stars);
  if (fx.sun.o > 0.01) orb(c, fx.sun.x * w, fx.sun.y * h, 28 * k, 60 * k, ["#fff7c0", "#ffd54f", "#ffb300"], [0.35, 0.35], "255,213,79", 0.45, fx.sun.o);
  if (fx.moon.o > 0.01) orb(c, fx.moon.x * w, fx.moon.y * h, 22 * k, 40 * k, ["#f8fafc", "#cfd8dc", "#90a4ae"], [0.62, 0.38], "215,235,255", 0.35, fx.moon.o);
  wash(c, "rgb(255,140,60)", fx.dusk, w, h);
  wash(c, "rgb(10,20,60)", fx.dark, w, h);
  if (fx.fog > 0.01) {
    const f = c.createLinearGradient(0, 0, 0, h);
    f.addColorStop(0, "rgba(240,245,255,0.35)");
    f.addColorStop(1, "rgba(230,235,245,0.05)");
    c.globalAlpha = fx.fog;
    c.fillStyle = f;
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 1;
  }
  // وینیت: شفاف تا ۳۵vmin، تا ۸۰vmax تیرگیِ ۴۲٪
  const vmin = Math.min(w, h) / 100;
  const vmax = Math.max(w, h) / 100;
  const v = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 80 * vmax);
  v.addColorStop(Math.min(0.99, (35 * vmin) / (80 * vmax)), "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.42)");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  c.restore();
}

// ── نقش‌مایه‌های قاب ─────────────────────────────────────────────────

function oval(c: Ctx, x: number, y: number, rx: number, ry: number, rot: number) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function blossom(c: Ctx, rnd: () => number) {
  const r = rnd();
  const col = r < 0.45 ? "#f8bbd0" : r < 0.8 ? "#f48fb1" : "#fff5f8";
  c.fillStyle = "#8bc34a";
  oval(c, -7, 5, 5, 2.4, -0.5);
  c.fill();
  oval(c, 7, 5, 5, 2.4, 0.5);
  c.fill();
  c.fillStyle = col;
  c.strokeStyle = "rgba(160,60,100,0.35)";
  c.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    oval(c, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 4.2, 3.2, a);
    c.fill();
    c.stroke();
  }
  c.fillStyle = "#ffd54f";
  c.beginPath();
  c.arc(0, 0, 2.2, 0, TAU);
  c.fill();
}

function sunflower(c: Ctx) {
  c.fillStyle = "#ffca28";
  c.strokeStyle = "rgba(150,90,0,0.4)";
  c.lineWidth = 0.7;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    oval(c, Math.cos(a) * 6, Math.sin(a) * 6, 3.6, 1.8, a);
    c.fill();
    c.stroke();
  }
  c.fillStyle = "#6d4c41";
  c.beginPath();
  c.arc(0, 0, 3.8, 0, TAU);
  c.fill();
  c.fillStyle = "#4e342e";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    c.beginPath();
    c.arc(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0.6, 0, TAU);
    c.fill();
  }
}

function wheat(c: Ctx) {
  c.strokeStyle = "#b8860b";
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(0, 10);
  c.lineTo(0, -9);
  c.stroke();
  c.fillStyle = "#e0b050";
  for (let i = 0; i < 5; i++) {
    const y = -8 + i * 3.4;
    oval(c, -2.2, y, 2.6, 1.3, -0.6);
    c.fill();
    oval(c, 2.2, y, 2.6, 1.3, 0.6);
    c.fill();
  }
}

const AUTUMN = ["#e65100", "#d84315", "#f9a825", "#8d6e63", "#bf360c"];
function leaf(c: Ctx, col: string) {
  c.fillStyle = col;
  c.strokeStyle = "rgba(80,30,0,0.45)";
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(0, -9);
  c.quadraticCurveTo(8, -3, 0, 9);
  c.quadraticCurveTo(-8, -3, 0, -9);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(0, -7);
  c.lineTo(0, 11);
  c.moveTo(0, -1);
  c.lineTo(3.5, -4);
  c.moveTo(0, 2.5);
  c.lineTo(-3.5, -0.5);
  c.stroke();
}

function snowflake(c: Ctx) {
  c.lineCap = "round";
  // گذرِ اول سایه‌ی آبی زیرِ برف تا روی زمینه‌ی روشن دیده شود
  for (let pass = 0; pass < 2; pass++) {
    c.strokeStyle = pass === 0 ? "rgba(70,110,160,0.45)" : "#ffffff";
    c.lineWidth = pass === 0 ? 2.4 : 1.3;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i / 6) * TAU);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -8);
      c.moveTo(0, -4.5);
      c.lineTo(-2.4, -6.6);
      c.moveTo(0, -4.5);
      c.lineTo(2.4, -6.6);
      c.stroke();
      c.restore();
    }
  }
}

/** یک نقش‌مایه‌ی فصل در (x, y) با مقیاسِ s و چرخشِ rot؛ گونه‌ها با rnd (PRNGِ دانه‌دار) انتخاب می‌شوند */
export function motif(c: Ctx, f: SeasonFrame, x: number, y: number, s: number, rot: number, rnd: () => number) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  if (f === "spring") blossom(c, rnd);
  else if (f === "summer") {
    if (rnd() < 0.6) sunflower(c);
    else wheat(c);
  } else if (f === "autumn") leaf(c, AUTUMN[Math.floor(rnd() * AUTUMN.length)]);
  else if (rnd() < 0.72) snowflake(c);
  else {
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.beginPath();
    c.arc(0, 0, 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
}
