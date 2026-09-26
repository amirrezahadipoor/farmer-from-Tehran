/**
 * src/game/render/core.ts — ثابت‌ها، مختصاتِ ایزومتریک و ابزارهای رسمِ پایه
 * (P5.14: render.ts ۱۲۲۸ خطی به ماژول‌های ≤ ۴۰۰ خط شکسته شد؛ این پایه‌ی همه‌ی آن‌هاست)
 */
import { DAY_LEN, N, type BuildingDef } from "../data";
import type { State, Tile } from "../logic";

export const TW = 88;
export const TH = 44;
export const A = TW / 2;
export const B = TH / 2;

export interface View {
  w: number; h: number; dpr: number; cam: { x: number; y: number; z: number };
  hover: { x: number; y: number } | null; tool: string; arg: string;
  /** حالت «کاهش حرکت» سیستم: ذره‌ها و انیمیشن‌های اضافه خاموش می‌شوند. */
  reduced?: boolean;
  /** پرده‌ی تمام‌صفحه (داستان) روی نقشه است: رندر لازم نیست (P6.6) */
  covered?: boolean;
}
export interface Walker { x: number; y: number; tx: number; ty: number; kind: string; face: number; wait: number }
/** ورودیِ رسمِ یک ساختمان (بین دسته‌های bFarm/bCraft/bDecor مشترک) */
export interface BArgs { draw?: string; t: Tile; id: string; def: BuildingDef; x: number; y: number; now: number; dark: number; sdx: number; W: string; R: string }

export const tileCenter = (gx: number, gy: number) => ({ x: (gx - gy) * A, y: (gx + gy + 1) * B - N * B });

export function screenToTile(v: View, sx: number, sy: number) {
  const wx = (sx - v.w / 2 - v.cam.x) / v.cam.z;
  const wy = (sy - v.h / 2 - v.cam.y) / v.cam.z + N * B;
  const fx = (wx / A + wy / B) / 2, fy = (wy / B - wx / A) / 2;
  const gx = Math.floor(fx), gy = Math.floor(fy);
  if (gx < 0 || gy < 0 || gx >= N || gy >= N) return null;
  return { x: gx, y: gy };
}

export const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export function mix(c1: number[], c2: number[], t: number) { return c1.map((c, i) => Math.round(c + (c2[i] - c) * t)); }
export const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (c: number) => Math.round(clamp(f < 0 ? c * (1 + f) : c + (255 - c) * f, 0, 255));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
export function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number) {
  ctx.beginPath(); ctx.moveTo(x, y - b); ctx.lineTo(x + a, y); ctx.lineTo(x, y + b); ctx.lineTo(x - a, y); ctx.closePath();
}
export function poly(ctx: CanvasRenderingContext2D, pts: number[][], fill: string | CanvasGradient) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}
export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}


export function lightInfo(s: State) {
  const p = (s.time % DAY_LEN) / DAY_LEN;
  const e = Math.sin((p - 0.25) * Math.PI * 2);
  let dark = e > 0.12 ? 0 : Math.min(0.68, (0.12 - e) * 0.9);
  if (s.weather === "rain") dark = Math.min(0.72, dark + 0.18);
  if (s.weather === "snow") dark = Math.min(0.65, dark + 0.1);
  if (s.weather === "fog") dark = Math.min(0.55, dark + 0.2);
  if (s.weather === "heatwave") dark = Math.min(0.55, dark + 0.08);
  const dusk = Math.abs(e) < 0.35 ? 1 - Math.abs(e) / 0.35 : 0;
  return { p, e, dark, dusk, hour: (p * 24) % 24 };
}


export function box(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, col: string, woodplanks = false) {
  const L = ctx.createLinearGradient(x - a, y, x, y + b); L.addColorStop(0, shade(col, -0.22)); L.addColorStop(1, shade(col, -0.38));
  poly(ctx, [[x - a, y - h], [x, y + b - h], [x, y + b], [x - a, y]], L);
  const R = ctx.createLinearGradient(x, y + b, x + a, y); R.addColorStop(0, shade(col, 0.05)); R.addColorStop(1, shade(col, 0.18));
  poly(ctx, [[x + a, y - h], [x, y + b - h], [x, y + b], [x + a, y]], R);
  poly(ctx, [[x, y - b - h], [x + a, y - h], [x, y + b - h], [x - a, y - h]], shade(col, 0.28));
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + b - h); ctx.lineTo(x, y + b); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x - a, y - h); ctx.lineTo(x, y - b - h); ctx.lineTo(x + a, y - h); ctx.stroke();
  if (woodplanks) {
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.8;
    for (let i = 1; i < 4; i++) {
      const tt = i / 4;
      ctx.beginPath(); ctx.moveTo(x - a * (1 - tt), y - h + b * tt - 0); ctx.lineTo(x - a * (1 - tt), y + b * tt); ctx.stroke();
    }
  }
}
export function faceQuad(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, face: "L" | "R", u0: number, u1: number, h0: number, h1: number, fill: string | CanvasGradient) {
  const P = (u: number, hh: number) => (face === "R" ? [x + a * u, y + b - b * u - hh] : [x - a + a * u, y + b * u - hh]);
  poly(ctx, [P(u0, h0), P(u1, h0), P(u1, h1), P(u0, h1)], fill);
}
export function roofGable(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, rh: number, col: string, ov = 1.15) {
  a *= ov; b *= ov;
  const Nn = [x, y - b - h], E = [x + a, y - h], S = [x, y + b - h], W = [x - a, y - h];
  const M1 = [x - a / 2, y - b / 2 - h - rh], M2 = [x + a / 2, y + b / 2 - h - rh];
  poly(ctx, [Nn, E, M2, M1], shade(col, -0.32));
  const g = ctx.createLinearGradient(W[0], W[1], M1[0], M1[1]);
  g.addColorStop(0, shade(col, -0.12)); g.addColorStop(1, shade(col, 0.15));
  poly(ctx, [W, S, M2, M1], g);
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    ctx.beginPath();
    ctx.moveTo(W[0] + (M1[0] - W[0]) * t, W[1] + (M1[1] - W[1]) * t);
    ctx.lineTo(S[0] + (M2[0] - S[0]) * t, S[1] + (M2[1] - S[1]) * t);
    ctx.stroke();
  }
  poly(ctx, [S, E, M2], shade(col, 0.32));
  ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M1[0], M1[1]); ctx.lineTo(M2[0], M2[1]); ctx.stroke();
}
export function roofPyramid(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, rh: number, col: string) {
  a *= 1.15; b *= 1.15;
  const ap = [x, y - h - rh];
  poly(ctx, [ap, [x - a, y - h], [x, y + b - h]], shade(col, -0.18));
  poly(ctx, [ap, [x, y + b - h], [x + a, y - h]], shade(col, 0.25));
}
/* ------------------------------------------------------------ اسپرایت‌ها (P5.14) */
/** بومِ خارج از صفحه برای کش (فقط سمتِ کاربر) */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
const glows = new Map<string, HTMLCanvasElement>();
/** هاله‌ی شعاعیِ ازپیش‌کشیده (جای createRadialGradient در هر فریم): مرکز رنگِ c0، لبه c1 با آلفای صفر */
export function glowSprite(c0: string, c1: string): HTMLCanvasElement {
  const key = c0 + c1;
  let g = glows.get(key);
  if (!g) {
    g = makeCanvas(64, 64);
    const x = g.getContext("2d")!;
    const rg = x.createRadialGradient(32, 32, 1, 32, 32, 32);
    rg.addColorStop(0, c0);
    rg.addColorStop(1, c1);
    x.fillStyle = rg;
    x.fillRect(0, 0, 64, 64);
    glows.set(key, g);
  }
  return g;
}

export function windowLit(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, face: "L" | "R", u: number, h: number, dark: number, color = "#ffc107") {
  faceQuad(ctx, x, y, a, b, face, u - 0.1, u + 0.1, h, h + 10, "#3e2723");
  faceQuad(ctx, x, y, a, b, face, u - 0.08, u + 0.08, h + 1, h + 9,
    dark > 0.15 ? color : "#a0dcf8");
  if (dark > 0.2) {
    const P = face === "R" ? [x + a * u, y + b - b * u - (h + 5)] : [x - a + a * u, y + b * u - (h + 5)];
    ctx.globalAlpha = dark * 0.5;
    ctx.drawImage(glowSprite("rgba(255,200,60,1)", "rgba(255,200,60,0)"), P[0] - 20, P[1] - 20, 40, 40);
    ctx.globalAlpha = 1;
  }
}
export function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, n = 6, spread = 1) {
  for (let i = 0; i < n; i++) {
    const k = (t * 0.35 + i / n) % 1;
    ellipse(ctx, x + Math.sin(k * 7 + i) * 5 * spread + k * 12 * spread, y - k * 45, 3.5 + k * 8, 3.5 + k * 7, `rgba(240,240,240,${0.55 * (1 - k)})`);
  }
}
/** پرچینِ مرزِ زمینِ خریده‌شده: ۳ تیرک در یک مسیر و ۲ نرده در یک مسیر (به‌جای ۵ فراخوانِ رسم) */
export function fence(ctx: CanvasRenderingContext2D, p0: number[], p1: number[]) {
  const H = 14;
  ctx.beginPath();
  for (const t of [0.05, 0.5, 0.95]) {
    const px = p0[0] + (p1[0] - p0[0]) * t, py = p0[1] + (p1[1] - p0[1]) * t;
    ctx.rect(px - 1.5, py - H, 3, H);
  }
  ctx.fillStyle = "#4e342e"; ctx.fill();
  ctx.beginPath();
  for (const h of [5, 11]) { ctx.moveTo(p0[0], p0[1] - h); ctx.lineTo(p1[0], p1[1] - h); }
  ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2.2; ctx.stroke();
}
export function shadowAt(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, sdx: number, a = 0.26) {
  ellipse(ctx, x + sdx, y + 2, rx, rx * 0.45, `rgba(10,20,8,${a})`);
}
