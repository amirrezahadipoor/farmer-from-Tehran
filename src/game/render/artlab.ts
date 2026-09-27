/**
 * src/game/render/artlab.ts — موتور آرتِ رویه‌ای (ArtLab)
 *
 * همه‌ی جزئیاتِ آرت «ریاضی» است و **تعیینی** (همان بذر = همان رسم) تا بازسازیِ کاملِ کش
 * و وصله‌ی نقطه‌ای بدونِ درز روی هم بنشینند. هیچ فایل تصویری‌ای در کار نیست:
 *  • نویزِ مقدار (value noise) + FBM برای متغیرِ پیوسته‌ی هر کاشی (بدونِ شطرنجی)
 *  • پالت‌های فصلیِ کورّه‌شده (hand-tuned)
 *  • نورِ لکه‌لکه (dapple): هاله‌های ازپیش‌کشیده‌ی روشن/تیره با جای‌گذاریِ نویزی
 *  • سایه‌ی تماس (contact shadow): شکافِ نرم میانِ کاشی‌های هم‌جوارِ متفاوت
 *  • علف: پرهای خمیده‌ی دو‌تنه با جهتِ بادِ نویزی + گلِ فصلی
 */
import { A, B, ellipse, hash, makeCanvas } from "./core";
import type { State } from "../logic";
import { N } from "../data";

/* ------------------------------------------------------------ نویزِ تعیینی */
/** نویزِ مقدارِ نرم: ۰..۱ */
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** FBM (۳ تا ۵ اکتاو): ۰..۱ — ریزِ زمین‌شناسیِ بافت‌ها */
export function fbm(x: number, y: number, oct = 3, freq = 1): number {
  let s = 0, amp = 0.5, f = freq, tot = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2.07; }
  return s / tot;
}

/* ------------------------------------------------------------ پالت‌های فصلی */
export interface Pal {
  grass: [number, number, number]; // HSL پایه‌ی چمن
  soilDry: [string, string]; // گرادیانِ شخمِ خشک
  soilWet: [string, string];
  water: [string, string, string]; // سطح → میانه → عمق (دریاچه)
  shallow: string; // آبِ کم‌عمقِ لبه
  sand: [string, string];
  snowShadow: string;
  flowers: string[]; // گل‌های چمن
  leaf: [string, string, string]; // تاج: روشن / میانه / تیره
  conifer: [string, string]; // سوزنی: نیمه‌ی روشن / تیره
  autumnHues: string[]; // رنگ‌های تاجِ پاییزی (هر لخته یک رنگ)
}
export const PALS: Record<string, Pal> = {
  spring: {
    grass: [104, 46, 46], soilDry: ["#6b3f24", "#8a5a33"], soilWet: ["#3e261a", "#54301e"],
    water: ["#5cc6e8", "#2a9dc8", "#0d5a86"], shallow: "#3fb0dc", sand: ["#f2e2b8", "#d9c08a"],
    snowShadow: "rgba(150,180,215,0.20)",
    flowers: ["#ff80ab", "#fff176", "#ce93d8", "#ffffff"],
    leaf: ["#9ccc65", "#558b2f", "#2e7d32"], conifer: ["#43a047", "#1b5e20"],
    autumnHues: ["#9ccc65", "#7cb342", "#aed581"],
  },
  summer: {
    grass: [88, 56, 36], soilDry: ["#6b3f24", "#8a5a33"], soilWet: ["#3e261a", "#54301e"],
    water: ["#4fc3e4", "#1d7fb4", "#083a5e"], shallow: "#37a8d4", sand: ["#eedfb0", "#d4ba7c"],
    snowShadow: "rgba(150,180,215,0.20)", flowers: ["#ff80ab", "#fff176", "#ffffff"],
    leaf: ["#8bc34a", "#4a8f28", "#2e7d32"], conifer: ["#388e3c", "#1b5e20"],
    autumnHues: ["#8bc34a", "#7cb342", "#9ccc65"],
  },
  autumn: {
    grass: [40, 48, 47], soilDry: ["#6b4526", "#8a5f33"], soilWet: ["#46281a", "#5c3520"],
    water: ["#5fb8d8", "#2585ad", "#0d4a72"], shallow: "#41a4cc", sand: ["#ecd9a8", "#cfae72"],
    snowShadow: "rgba(150,180,215,0.20)", flowers: ["#ef6c00", "#fbc02d", "#ad1457"],
    leaf: ["#ffb74d", "#ef6c00", "#bf360c"], conifer: ["#2e7d32", "#1b5e20"],
    autumnHues: ["#ef6c00", "#d84315", "#f9a825", "#e65100", "#ffb300", "#c62828"],
  },
  winter: {
    grass: [160, 13, 72], soilDry: ["#6d4c33", "#8a6a4a"], soilWet: ["#463022", "#5a4030"],
    water: ["#7cc4dd", "#3d8ab0", "#155a82"], shallow: "#58b4d4", sand: ["#e8e2d0", "#c4b892"],
    snowShadow: "rgba(140,170,210,0.26)", flowers: [],
    leaf: ["#ffffff", "#dfe7ec", "#b0bec5"], conifer: ["#eef4f8", "#c2d2dc"],
    autumnHues: ["#ffffff", "#e8eef2", "#d3dde4"],
  },
};
export const pal = (season: string): Pal => PALS[season] ?? PALS.spring;

/** متغیرِ رنگِ هر کاشی: پیوسته (FBM) تا هیچ دو کاشیِ هم‌سایه یکسان نباشند و شطرنجی نشود */
export function tileVar(gx: number, gy: number): { dl: number; dh: number } {
  return {
    dl: (fbm(gx * 0.37 + 31.7, gy * 0.37 + 17.3, 3) - 0.5) * 10,
    dh: (fbm(gx * 0.53 + 9.1, gy * 0.53 + 41.9, 2) - 0.5) * 12,
  };
}

/* ------------------------------------------------------------ هاله‌های ازپیش‌کشیده */
const blobs = new Map<string, HTMLCanvasElement>();
/** هاله‌ی شعاعیِ نرم (مرکزِ رنگ → شفاف) برای نورِ لکه‌لکه و سایه‌ی نرم؛ هر رنگ یک‌بار */
export function softBlob(color: string, size = 64): HTMLCanvasElement {
  let c = blobs.get(color);
  if (!c) {
    c = makeCanvas(size, size);
    const x = c.getContext("2d")!;
    const rg = x.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    // لبه‌ی رنگِ منبع روی آلفای صفر: به‌جای سیاهِ مات، رنگِ خودِ هاله محو شود
    x.globalCompositeOperation = "source-over";
    x.fillStyle = rg;
    x.fillRect(0, 0, size, size);
    blobs.set(color, c);
  }
  return c;
}
/** نورِ لکه‌لکه: ۴ هاله (۲ روشن، ۲ تیره) با جای‌گذاریِ نویزیِ تعیینی */
export function drawDapples(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, d: number) {
  const n = d > 1 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const u = vnoise(seed + i * 3.7, i * 2.1), v = vnoise(i * 5.3, seed + i * 1.7);
    const dx = (u - 0.5) * w * 1.15, dy = (v - 0.5) * h * 1.05;
    const light = i % 2 === 0;
    const s = w * (0.45 + 0.3 * vnoise(i, seed * 2));
    ctx.drawImage(light ? softBlob("rgba(255,246,200,0.16)") : softBlob("rgba(20,40,10,0.13)"), x + dx - s / 2, y + dy - s * 0.5, s, s * 0.5);
  }
}

/* ------------------------------------------------------------ سایه‌ی تماس */
const KIND2: Record<string, number> = { grass: 1, soil: 2, water: 3, tree: 4, rock: 5, bld: 6 };
/** لبه‌هایی که کاشی در آن‌ها با «نوعِ» دیگری هم‌سایه است: ۱ بالا-چپ، ۲ بالا-راست، ۴ پایین-راست، ۸ پایین-چپ */
export function contactEdges(s: State, gx: number, gy: number): number {
  const k = KIND2[s.tiles[gy * N + gx].k] ?? 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : KIND2[s.tiles[y * N + x].k] ?? 0);
  let e = 0;
  if (at(gx, gy - 1) !== k) e |= 1;
  if (at(gx + 1, gy) !== k) e |= 2;
  if (at(gx, gy + 1) !== k) e |= 4;
  if (at(gx - 1, gy) !== k) e |= 8;
  return e;
}
/** شکافِ نرمِ مرزی: خطِ تیره‌ی کوتاهِ درونی + لبه‌ی روشنِ یک‌پیکسلی (حسِ ارتفاعِ واقعی) */
export function drawContact(ctx: CanvasRenderingContext2D, x: number, y: number, A: number, B: number, e: number) {
  if (!e) return;
  const seg = (bit: number, p0: number[], p1: number[]) => {
    if (!(e & bit)) return;
    const [x0, y0] = p0, [x1, y1] = p1;
    ctx.strokeStyle = "rgba(24,16,6,0.12)"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,200,0.10)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(x0 - 0.8, y0 + 1.4); ctx.lineTo(x1 - 0.8, y1 + 1.4); ctx.stroke();
  };
  seg(1, [x - A * 0.97, y - B * 0.97], [x - 1, y - B * 0.28]);
  seg(2, [x + A * 0.97, y - B * 0.97], [x + 1, y - B * 0.28]);
  seg(4, [x + A * 0.97, y + B * 0.97], [x + 1, y + B * 0.30]);
  seg(8, [x - A * 0.97, y + B * 0.97], [x - 1, y + B * 0.30]);
}

/* ------------------------------------------------------------ علف و گل */
/** علف: پرهای خمیده؛ d>1 = پرهای بیشتر + نوکِ روشن (پایه‌ی تیره، نوکِ روشن = عمق) */
export function drawBlades(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, d: number, season: string) {
  const P = pal(season);
  const [hh, ss] = P.grass;
  const dark = `hsl(${hh - 6},${ss + 6}%,26%)`;
  const light = `hsl(${hh + 8},${ss}%,58%)`;
  const n = d > 1 ? 30 : 17;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const u = vnoise(seed + i * 3.1, i * 1.3), v = vnoise(i * 2.7, seed + i * 0.9);
    const bx = (u - 0.5) * w * 1.62, by = (v - 0.5) * h * 1.5;
    if (Math.abs(bx) / w + Math.abs(by) / h > 0.9) continue;
    const len = 4 + fbm(u * 5, v * 5, 2) * 5.5;
    const lean = (0.3 + 0.6 * vnoise(i * 1.1, seed)) * (u > 0.5 ? 1 : -1);
    ctx.strokeStyle = dark; ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x + bx, y + by);
    ctx.quadraticCurveTo(x + bx + lean * 1.6, y + by - len * 0.6, x + bx + lean * 3.2, y + by - len);
    ctx.stroke();
    if (d > 1) {
      ctx.strokeStyle = light; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + bx + lean * 2.1, y + by - len * 0.55);
      ctx.lineTo(x + bx + lean * 3.2, y + by - len);
      ctx.stroke();
    }
  }
}
/** گل‌های چمن: بهار چگال، بقیه‌ی فصول پراکنده */
export function drawFlowers(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, season: string, d: number) {
  const cols = pal(season).flowers;
  if (!cols.length) return;
  const n = season === "spring" ? (d > 1 ? 6 : 4) : 2;
  for (let i = 0; i < n; i++) {
    const gate = season === "spring" ? 0.45 : 0.7;
    if (vnoise(seed + i * 7.3, i * 3.7) < gate) continue;
    const fx = (vnoise(i * 5.1, seed + 2) - 0.5) * w * 1.45, fy = (vnoise(seed + 5, i * 9.2) - 0.5) * h * 1.35;
    ellipse(ctx, x + fx, y + fy - 3.5, 1.7, 1.5, cols[(i + Math.floor(seed)) % cols.length]);
    ellipse(ctx, x + fx, y + fy - 4.6, 0.8, 0.8, "rgba(255,255,255,0.9)");
  }
}

/* ------------------------------------------------------------ خاکِ شخم‌خورده */
/** شخم: ردیف‌های حکاکی‌شده (خطِ تیره + لبه‌ی روشن) + سنگریزه */
export function drawSoilDetail(ctx: CanvasRenderingContext2D, x: number, y: number, A: number, B: number, seed: number, d: number) {
  const a0 = A * 0.88, b0 = B * 0.88;
  const rows = d > 1 ? 6 : 5;
  for (let i = 1; i < rows; i++) {
    const u = i / rows;
    const sx = x - a0 + a0 * u, sy = y + 1 - b0 * u;
    ctx.strokeStyle = "rgba(40,22,8,0.5)"; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + a0, sy + b0); ctx.stroke();
    ctx.strokeStyle = "rgba(255,222,170,0.13)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 1.1, sy + 1.3); ctx.lineTo(sx + a0 - 1.1, sy + b0 + 1.3); ctx.stroke();
  }
  const n = d > 1 ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const cx = (vnoise(seed + i * 4.7, i * 2.3) - 0.5) * A * 1.5, cy = (vnoise(i * 3.9, seed + i) - 0.5) * B * 1.3;
    ellipse(ctx, x + cx, y + 1 + cy, 1.4 + vnoise(i, i * 3) * 1.7, 0.9 + vnoise(i * 2, i) * 1.1, i % 2 ? "rgba(30,16,6,0.42)" : "rgba(170,118,64,0.5)");
  }
}

/* ------------------------------------------------------------ آب */
/** آب: کاستیکِ ازپیش‌پخت + عمقِ دریاچه */
export function drawWaterDetail(ctx: CanvasRenderingContext2D, x: number, y: number, A: number, B: number, lake: boolean, seed: number) {
  for (let i = 0; i < 5; i++) {
    const wx = (vnoise(seed + i * 6.1, i * 1.9) - 0.5) * A * 1.25, wy = (vnoise(i * 4.3, seed + i * 2.7) - 0.5) * B * 1.05;
    const s = A * (0.3 + 0.35 * vnoise(i * 2.2, seed + i));
    ctx.drawImage(softBlob("rgba(215,242,255,0.20)"), x + wx - s / 2, y + wy - s * 0.28, s, s * 0.56);
  }
  if (lake) {
    ctx.fillStyle = "rgba(5,35,64,0.30)";
    ctx.beginPath();
    ctx.moveTo(x, y - B * 0.55); ctx.lineTo(x + A * 0.55, y); ctx.lineTo(x, y + B * 0.55); ctx.lineTo(x - A * 0.55, y); ctx.closePath();
    ctx.fill();
  }
}

/* ------------------------------------------------------------ شن و برف */
/** شن: دانه‌بندیِ سه‌تنه (نور/تیره/میانه) */
export function drawSandSpeckle(ctx: CanvasRenderingContext2D, x: number, y: number, A: number, B: number, seed: number, d: number) {
  const cols = ["rgba(255,250,225,0.5)", "rgba(150,120,70,0.35)", "rgba(230,205,150,0.55)"];
  const n = d > 1 ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const sx = (vnoise(seed + i * 3.3, i * 1.1) - 0.5) * A * 1.7, sy = (vnoise(i * 2.9, seed + i * 1.9) - 0.5) * B * 1.55;
    if (Math.abs(sx) / A + Math.abs(sy) / B > 0.92) continue;
    ellipse(ctx, x + sx, y + sy, 1.1 + vnoise(i, i) * 1.2, 0.7 + vnoise(i * 3, i) * 0.8, cols[i % 3]);
  }
}
/** برف: سایه‌ی سردِ نرم + درخشش */
export function drawSnowDetail(ctx: CanvasRenderingContext2D, x: number, y: number, A: number, B: number, seed: number, season: string, d: number) {
  const s = A * 1.05;
  ctx.drawImage(softBlob(pal(season).snowShadow), x - s * 0.3, y - s * 0.18, s * 0.7, s * 0.42);
  const n = d > 1 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    if (vnoise(seed * 2 + i * 4.1, i * 3.3) < 0.35) continue;
    const sx = (vnoise(seed + i * 5.7, i * 2.2) - 0.5) * A, sy = (vnoise(i * 4.4, seed + i * 3.1) - 0.5) * B;
    ellipse(ctx, x + sx, y + sy, 1.1, 0.8, "rgba(255,255,255,0.85)");
  }
}
