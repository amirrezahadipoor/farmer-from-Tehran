import { BMAP, CMAP, ITEMS, N, CH, DAY_LEN, SEASONS } from "./data";
import { State, Tile, Fx, idx, locked, chunkOf, canExpand, expandCost } from "./logic";
import { drawIcon } from "./icons";

export const TW = 88;
export const TH = 44;
const A = TW / 2;
const B = TH / 2;

export interface View {
  w: number; h: number; dpr: number; cam: { x: number; y: number; z: number };
  hover: { x: number; y: number } | null; tool: string; arg: string;
  /** حالت «کاهش حرکت» سیستم: ذره‌ها و انیمیشن‌های اضافه خاموش می‌شوند. */
  reduced?: boolean;
}
export interface Walker { x: number; y: number; tx: number; ty: number; kind: string; face: number; wait: number }

let bgImg: HTMLImageElement | null = null;
if (typeof window !== "undefined") { bgImg = new Image(); bgImg.src = "/images/bg_sky.webp"; }

export const tileCenter = (gx: number, gy: number) => ({ x: (gx - gy) * A, y: (gx + gy + 1) * B - N * B });

export function screenToTile(v: View, sx: number, sy: number) {
  const wx = (sx - v.w / 2 - v.cam.x) / v.cam.z;
  const wy = (sy - v.h / 2 - v.cam.y) / v.cam.z + N * B;
  const fx = (wx / A + wy / B) / 2, fy = (wy / B - wx / A) / 2;
  const gx = Math.floor(fx), gy = Math.floor(fy);
  if (gx < 0 || gy < 0 || gx >= N || gy >= N) return null;
  return { x: gx, y: gy };
}

const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function mix(c1: number[], c2: number[], t: number) { return c1.map((c, i) => Math.round(c + (c2[i] - c) * t)); }
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (c: number) => Math.round(clamp(f < 0 ? c * (1 + f) : c + (255 - c) * f, 0, 255));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number) {
  ctx.beginPath(); ctx.moveTo(x, y - b); ctx.lineTo(x + a, y); ctx.lineTo(x, y + b); ctx.lineTo(x - a, y); ctx.closePath();
}
function poly(ctx: CanvasRenderingContext2D, pts: number[][], fill: string | CanvasGradient) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
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

function box(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, col: string, woodplanks = false) {
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
function faceQuad(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, face: "L" | "R", u0: number, u1: number, h0: number, h1: number, fill: string | CanvasGradient) {
  const P = (u: number, hh: number) => (face === "R" ? [x + a * u, y + b - b * u - hh] : [x - a + a * u, y + b * u - hh]);
  poly(ctx, [P(u0, h0), P(u1, h0), P(u1, h1), P(u0, h1)], fill);
}
function roofGable(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, rh: number, col: string, ov = 1.15) {
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
function roofPyramid(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, rh: number, col: string) {
  a *= 1.15; b *= 1.15;
  const ap = [x, y - h - rh];
  poly(ctx, [ap, [x - a, y - h], [x, y + b - h]], shade(col, -0.18));
  poly(ctx, [ap, [x, y + b - h], [x + a, y - h]], shade(col, 0.25));
}
function windowLit(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, face: "L" | "R", u: number, h: number, dark: number, color = "#ffc107") {
  faceQuad(ctx, x, y, a, b, face, u - 0.1, u + 0.1, h, h + 10, "#3e2723");
  faceQuad(ctx, x, y, a, b, face, u - 0.08, u + 0.08, h + 1, h + 9,
    dark > 0.15 ? color : "#a0dcf8");
  if (dark > 0.2) {
    const P = face === "R" ? [x + a * u, y + b - b * u - (h + 5)] : [x - a + a * u, y + b * u - (h + 5)];
    const rg = ctx.createRadialGradient(P[0], P[1], 1, P[0], P[1], 20);
    rg.addColorStop(0, `rgba(255,200,60,${dark * 0.5})`); rg.addColorStop(1, "rgba(255,200,60,0)");
    ctx.fillStyle = rg; ctx.fillRect(P[0] - 20, P[1] - 20, 40, 40);
  }
}
function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, n = 6, spread = 1) {
  for (let i = 0; i < n; i++) {
    const k = (t * 0.35 + i / n) % 1;
    ellipse(ctx, x + Math.sin(k * 7 + i) * 5 * spread + k * 12 * spread, y - k * 45, 3.5 + k * 8, 3.5 + k * 7, `rgba(240,240,240,${0.55 * (1 - k)})`);
  }
}
function fence(ctx: CanvasRenderingContext2D, p0: number[], p1: number[]) {
  const H = 14;
  for (const t of [0.05, 0.5, 0.95]) {
    const px = p0[0] + (p1[0] - p0[0]) * t, py = p0[1] + (p1[1] - p0[1]) * t;
    ctx.fillStyle = "#4e342e"; ctx.fillRect(px - 1.5, py - H, 3, H);
  }
  ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2.2;
  for (const h of [5, 11]) { ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - h); ctx.lineTo(p1[0], p1[1] - h); ctx.stroke(); }
}

function drawCliffs(ctx: CanvasRenderingContext2D, now: number) {
  const D = 85;
  for (let i = 0; i < N; i++) {
    for (const side of [0, 1]) {
      const gx = side ? N - 1 : i, gy = side ? i : N - 1;
      const { x, y } = tileCenter(gx, gy);
      const p1 = side ? [x, y + B] : [x - A, y], p2 = side ? [x + A, y] : [x, y + B];
      const g = ctx.createLinearGradient(0, Math.min(p1[1], p2[1]), 0, Math.max(p1[1], p2[1]) + D);
      const base = side ? [140, 95, 52] : [108, 70, 40];
      g.addColorStop(0, "#689f38"); g.addColorStop(0.08, "#4c7c24"); g.addColorStop(0.13, rgb(base));
      g.addColorStop(0.6, rgb(mix(base, [58, 40, 30], 0.6)));
      g.addColorStop(1, rgb(mix(base, [28, 30, 44], 0.88)));
      poly(ctx, [p1, p2, [p2[0], p2[1] + D], [p1[0], p1[1] + D]], g);
      for (let k = 0; k < 4; k++) {
        const u = hash(i + k, side), vv = 0.25 + hash(side, i * 3 + k) * 0.65;
        ellipse(ctx, p1[0] + (p2[0] - p1[0]) * u, p1[1] + (p2[1] - p1[1]) * u + D * vv, 7, 3.5, "rgba(0,0,0,0.18)");
      }
    }
  }
  const bl = tileCenter(0, N - 1), br = tileCenter(N - 1, N - 1), tr = tileCenter(N - 1, 0);
  ctx.strokeStyle = `rgba(255,255,255,${0.65 + 0.25 * Math.sin(now * 2)})`; ctx.lineWidth = 3.5;
  const off = D + 4 + Math.sin(now * 1.6) * 2;
  ctx.beginPath(); ctx.moveTo(bl.x - A - 6, bl.y + off); ctx.lineTo(br.x, br.y + B + off + 4); ctx.lineTo(tr.x + A + 6, tr.y + off); ctx.stroke();
}

function drawGround(ctx: CanvasRenderingContext2D, s: State, t: Tile, gx: number, gy: number, now: number) {
  const { x, y } = tileCenter(gx, gy);
  const lk = locked(s, gx, gy);
  const season = SEASONS[s.seasonIndex];
  const isIsland = s.tiles[idx(gx, gy)].k !== "water" || true;

  if (t.k === "water") {
    const lake = t.v > 0.5;
    const nbWater = (dx: number, dy: number) => {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) return false;
      return s.tiles[idx(nx, ny)].k === "water";
    };
    const shoreline = !nbWater(0, -1) || !nbWater(1, 0) || !nbWater(0, 1) || !nbWater(-1, 0);
    const g = ctx.createLinearGradient(x, y - B, x, y + B);
    if (lake) { g.addColorStop(0, shoreline ? "#5cc6e8" : "#1d7fb4"); g.addColorStop(1, shoreline ? "#2a9dc8" : "#0d5a86"); }
    else { g.addColorStop(0, shoreline ? "#3fb0dc" : "#11639b"); g.addColorStop(1, shoreline ? "#1c7fb0" : "#063f6b"); }
    diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = g; ctx.fill();
    if (shoreline) {
      // wet sand shelf hugging the coast
      diamond(ctx, x, y, A + 0.6, B + 0.6);
      ctx.strokeStyle = "rgba(240,225,180,0.55)"; ctx.lineWidth = 3.5; ctx.stroke();
      const foam = 0.5 + 0.4 * Math.sin(now * 2.2 + gx * 0.6 + gy * 0.4);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + foam * 0.4})`; ctx.lineWidth = 2;
      if (!nbWater(0, -1)) { ctx.beginPath(); ctx.moveTo(x - A, y); ctx.lineTo(x, y - B); ctx.stroke(); }
      if (!nbWater(1, 0)) { ctx.beginPath(); ctx.moveTo(x, y - B); ctx.lineTo(x + A, y); ctx.stroke(); }
      if (!nbWater(0, 1)) { ctx.beginPath(); ctx.moveTo(x + A, y); ctx.lineTo(x, y + B); ctx.stroke(); }
      if (!nbWater(-1, 0)) { ctx.beginPath(); ctx.moveTo(x, y + B); ctx.lineTo(x - A, y); ctx.stroke(); }
    }
    if (lake && hash(gx, gy) > 0.72) { ellipse(ctx, x + 9, y + 4, 7, 3.4, "#2e7d32"); ellipse(ctx, x + 11, y + 3, 2.2, 1.6, "#f48fb1"); }
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const ph = now * 1.5 + hash(gx, gy + i) * 6;
      const ox = Math.sin(ph) * 12, oy = (hash(gy, gx + i) - 0.5) * 18;
      ctx.beginPath(); ctx.moveTo(x - 12 + ox, y + oy + 3); ctx.quadraticCurveTo(x + ox, y + oy, x + 12 + ox, y + oy + 3); ctx.stroke();
    }
    if (!lake && hash(gx + 5, gy + 9) > 0.965) { const fx0 = x + Math.sin(now * 0.8 + gx) * 10; ellipse(ctx, fx0, y + 4, 5, 2, "rgba(10,40,70,0.35)"); poly(ctx, [[fx0 + 4, y + 4], [fx0 + 8, y + 1.5], [fx0 + 8, y + 6.5]], "rgba(10,40,70,0.35)"); }
    if (lake && hash(gx + 9, gy + 2) > 0.94) { const dx0 = x - 6 + Math.sin(now * 0.4 + gy) * 8; ellipse(ctx, dx0, y + 3, 5.5, 2.2, "rgba(0,0,0,0.18)"); ellipse(ctx, dx0, y, 5, 3, "#fafafa"); ellipse(ctx, dx0 + 4, y - 3.5, 2.4, 2.2, "#2e7d32"); poly(ctx, [[dx0 + 6, y - 3.5], [dx0 + 9, y - 3], [dx0 + 6, y - 2.5]], "#ffa000"); }
    return;
  }
  if (t.k === "soil") {
    diamond(ctx, x, y, A, B); ctx.fillStyle = "#558b2f"; ctx.fill();
    const base = t.wet ? "#3e261a" : "#6b3f24";
    const g = ctx.createLinearGradient(x - A, y, x + A, y);
    g.addColorStop(0, shade(base, -0.08)); g.addColorStop(1, shade(base, 0.14));
    diamond(ctx, x, y + 1, A * 0.93, B * 0.93); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = t.wet ? "rgba(20,10,0,0.6)" : "rgba(60,32,12,0.55)"; ctx.lineWidth = 2.2;
    for (let i = 1; i < 5; i++) {
      const u = i / 5;
      const p0 = [x - A * 0.93 + A * 0.93 * u, y + 1 - B * 0.93 * u], p1 = [p0[0] + A * 0.93, p0[1] + B * 0.93];
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    if (t.wet) ellipse(ctx, x - 12, y + 4, 9, 3.5, "rgba(120,200,255,0.4)");
    if (t.fert) for (let i = 0; i < 6; i++) {
      const glow = 0.5 + 0.5 * Math.sin(now * 4 + i + gx);
      ellipse(ctx, x + (hash(i, gx) - 0.5) * 55, y + (hash(gy, i) - 0.5) * 24, 1.8, 1.8, `rgba(220,255,100,${glow})`);
    }
    if (s.weather === "snow" && (t.g || 0) < 0.3) ellipse(ctx, x, y, A * 0.9, B * 0.9, "rgba(240,250,255,0.7)");
  } else {
    // Sandy beach wherever land meets water
    const touchesWater =
      (gy > 0 && s.tiles[idx(gx, gy - 1)].k === "water") ||
      (gy < N - 1 && s.tiles[idx(gx, gy + 1)].k === "water") ||
      (gx > 0 && s.tiles[idx(gx - 1, gy)].k === "water") ||
      (gx < N - 1 && s.tiles[idx(gx + 1, gy)].k === "water");
    if (touchesWater && season.id !== "winter") {
      const sg = ctx.createLinearGradient(x, y - B, x, y + B);
      sg.addColorStop(0, "#f2e2b8"); sg.addColorStop(1, "#d9c08a");
      diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = sg; ctx.fill();
      ctx.strokeStyle = "rgba(150,120,70,0.35)"; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const px = x + (hash(gx * 7 + i, gy) - 0.5) * 46, py = y + (hash(gy, gx + i) - 0.5) * 20;
        ellipse(ctx, px, py, 1.6, 1.1, "rgba(190,160,110,0.55)");
      }
      if (lk) { diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = "rgba(10,25,20,0.52)"; ctx.fill(); }
      return;
    }
    let hue = 92 + t.v * 14, sat = 60, l = 44 + t.v * 7 + ((gx + gy) % 2) * 2.5;
    if (season.id === "autumn") { hue = 38 + t.v * 20; sat = 60; l = 50 + t.v * 6; }
    else if (season.id === "winter") { hue = 150 + t.v * 25; sat = 18; l = 78 + t.v * 10; }
    else if (season.id === "summer") { hue = 80 + t.v * 10; sat = 70; }
    const g = ctx.createLinearGradient(x, y - B, x, y + B);
    g.addColorStop(0, `hsl(${hue},${sat}%,${l + 5}%)`); g.addColorStop(1, `hsl(${hue},${sat}%,${l - 4}%)`);
    diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `hsl(${hue},${sat}%,${l - 14}%)`; ctx.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      const ux = (hash(gx * 3 + i, gy) - 0.5) * 60, uy = (hash(gy * 5 + i, gx) - 0.5) * 26;
      if (Math.abs(ux) / A + Math.abs(uy) / B > 0.85) continue;
      const sw = Math.sin(now * 2.2 + gx + i) * 1.5;
      ctx.beginPath(); ctx.moveTo(x + ux - 2, y + uy); ctx.lineTo(x + ux - 3 + sw, y + uy - 6);
      ctx.moveTo(x + ux, y + uy); ctx.lineTo(x + ux + sw, y + uy - 8);
      ctx.moveTo(x + ux + 2, y + uy); ctx.lineTo(x + ux + 3 + sw, y + uy - 5); ctx.stroke();
    }
    if (t.v > 0.78 && t.k === "grass" && season.id !== "winter") {
      const cols = season.id === "autumn" ? ["#ef6c00", "#fbc02d", "#ad1457", "#8d6e63"] : ["#ff80ab", "#fff176", "#ffffff", "#ce93d8", "#80d8ff"];
      for (let i = 0; i < 4; i++) {
        const fx = x + (hash(i, gx + gy * 7) - 0.5) * 50, fy = y + (hash(gy + i, gx) - 0.5) * 20;
        ctx.strokeStyle = "#558b2f"; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 6); ctx.stroke();
        ellipse(ctx, fx, fy - 7, 2.4, 2.0, cols[(gx + i) % cols.length]);
      }
    }
    if (s.weather === "snow") {
      ellipse(ctx, x, y, A * 0.95, B * 0.95, "rgba(255,255,255,0.65)");
    }
  }
  if (lk) { diamond(ctx, x, y, A + 0.6, B + 0.6); ctx.fillStyle = "rgba(10,25,20,0.52)"; ctx.fill(); }
}

function shadowAt(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, sdx: number, a = 0.26) {
  ellipse(ctx, x + sdx, y + 2, rx, rx * 0.45, `rgba(10,20,8,${a})`);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, now: number, sdx: number, seasonId: string) {
  const sw = Math.sin(now * 1.3 + v * 10) * 2;
  shadowAt(ctx, x, y, 28, sdx);
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
function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, sdx: number, snow: boolean) {
  shadowAt(ctx, x, y, 22, sdx * 0.5);
  poly(ctx, [[x - 20, y + 2], [x - 15, y - 14], [x - 2, y - 20], [x + 14, y - 16], [x + 21, y], [x + 7, y + 8], [x - 9, y + 8]], "#607d8b");
  poly(ctx, [[x - 15, y - 14], [x - 2, y - 20], [x + 14, y - 16], [x + 2, y - 7], [x - 9, y - 6]], "#b0bec5");
  poly(ctx, [[x + 2, y - 7], [x + 14, y - 16], [x + 21, y], [x + 7, y + 8]], "#455a64");
  if (snow) ellipse(ctx, x - 3, y - 18, 10, 4, "rgba(255,255,255,0.9)");
  if (v > 0.5 && !snow) ellipse(ctx, x - 7, y - 11, 6, 3, "#8bc34a");
}

function drawPlant(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, g: number, now: number, seed: number, seasonId: string) {
  const c = CMAP[id]; if (!c) return;
  const sw = Math.sin(now * 1.9 + seed * 7) * (1 + g);
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
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + now * 0.12; ellipse(ctx, hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.9, 3.5 * sc, 3.5 * sc, ripe ? c.color : "#eeff41"); }
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
    case "clover": {
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + i * 2, y); ctx.lineTo(x + i * 2, y - 8 * sc); ctx.stroke();
        for (let k = 0; k < 3; k++) { const ang = (k / 3) * Math.PI * 2 + i; ellipse(ctx, x + i * 2 + Math.cos(ang) * 3, y - 10 * sc + Math.sin(ang) * 3, 3 * sc, 3 * sc, g > 0.5 ? "#66bb6a" : "#81c784"); }
      } break;
    }
  }
}

function drawCrop(ctx: CanvasRenderingContext2D, t: Tile, gx: number, gy: number, now: number, seasonId: string) {
  const { x, y } = tileCenter(gx, gy);
  const g = t.g || 0;
  const n = t.crop === "wheat" || t.crop === "carrot" || t.crop === "strawberry" || t.crop === "clover" ? 3 : 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, v = (j + 0.5) / n;
    const px = x + (u - v) * A * 0.85, py = y + (u + v - 1) * B * 0.85;
    drawPlant(ctx, t.crop!, px, py, g, now, hash(gx * 9 + i, gy * 7 + j), seasonId);
  }
  if (g >= 1) {
    const bob = Math.sin(now * 4 + gx) * 3;
    for (let k = 0; k < 3; k++) {
      const a = now * 2 + k * 2.1 + gx;
      const sx = x + Math.cos(a) * 22, sy = y - 22 + Math.sin(a) * 9 + bob;
      ctx.fillStyle = `rgba(255,250,200,${0.6 + 0.4 * Math.sin(now * 6 + k)})`;
      ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 1.5, sy - 1.5); ctx.lineTo(sx + 5, sy); ctx.lineTo(sx + 1.5, sy + 1.5); ctx.lineTo(sx, sy + 5); ctx.lineTo(sx - 1.5, sy + 1.5); ctx.lineTo(sx - 5, sy); ctx.lineTo(sx - 1.5, sy - 1.5); ctx.fill();
    }
  }
}

function chicken(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flip: number) {
  const peck = Math.max(0, Math.sin(t * 3)) * 3;
  ellipse(ctx, x, y + 1, 5.5, 2.2, "rgba(0,0,0,0.25)");
  ellipse(ctx, x, y - 5, 6, 5, "#fafafa");
  ellipse(ctx, x - flip * 2.5, y - 7, 3, 2.5, "#eeeeee");
  const hx = x + flip * 4, hy = y - 9 + peck;
  ellipse(ctx, hx, hy, 3, 3, "#ffffff");
  ellipse(ctx, hx, hy - 3, 1.5, 1.4, "#e53935");
  poly(ctx, [[hx + flip * 2.5, hy], [hx + flip * 5, hy + 0.8], [hx + flip * 2.5, hy + 1.6]], "#ffa000");
  ellipse(ctx, hx + flip, hy - 0.5, 0.8, 0.8, "#111");
}
function cow(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flip: number) {
  ellipse(ctx, x, y + 1, 12, 4.5, "rgba(0,0,0,0.25)");
  ctx.fillStyle = "#4e342e"; for (const lx of [-6, -3, 4, 7]) ctx.fillRect(x + lx, y - 6, 2.2, 6);
  ellipse(ctx, x, y - 10, 12, 6.5, "#fafafa");
  ellipse(ctx, x - 3, y - 12, 4, 3, "#212121"); ellipse(ctx, x + 5, y - 8, 3, 2, "#212121");
  const hx = x + flip * 11, hy = y - 12 + Math.sin(t * 1.5) * 1.2;
  ellipse(ctx, hx, hy, 4.5, 4, "#fafafa"); ellipse(ctx, hx + flip * 2, hy + 2, 3, 2.2, "#f8bbd0");
}
function sheep(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flip: number) {
  ellipse(ctx, x, y + 1, 10, 4, "rgba(0,0,0,0.2)");
  ctx.fillStyle = "#3e2723"; for (const lx of [-5, -2, 3, 6]) ctx.fillRect(x + lx, y - 6, 2, 6);
  ellipse(ctx, x, y - 12, 10, 7, "#fafafa");
  for (let i = -3; i <= 3; i += 2) ellipse(ctx, x + i * 2, y - 12, 4, 4, "#ffffff");
  const hx = x + flip * 9, hy = y - 10 + Math.sin(t * 1.8) * 0.8;
  ellipse(ctx, hx, hy, 3, 3, "#424242");
  ellipse(ctx, hx + flip * 2, hy + 1, 2, 1.4, "#bdbdbd");
}
function pig(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flip: number) {
  ellipse(ctx, x, y + 1, 11, 4, "rgba(0,0,0,0.22)");
  ctx.fillStyle = "#795548"; for (const lx of [-6, -3, 4, 7]) ctx.fillRect(x + lx, y - 6, 2, 6);
  ellipse(ctx, x, y - 10, 11, 6, "#ef9a9a");
  ellipse(ctx, x, y - 12, 10, 5, "#f48fb1");
  const hx = x + flip * 10, hy = y - 9 + Math.sin(t * 1.6) * 0.8;
  ellipse(ctx, hx, hy, 4, 3.5, "#f48fb1");
  ellipse(ctx, hx + flip * 2.5, hy, 1.5, 1.2, "#880e4f");
}
function bee(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const wf = Math.abs(Math.sin(t * 15));
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ellipse(ctx, x, y + 1, 3, 1, ctx.fillStyle);
  ellipse(ctx, x - wf * 2, y - 3, 4 * wf, 3, "rgba(220,255,255,0.7)");
  ellipse(ctx, x + wf * 2, y - 3, 4 * wf, 3, "rgba(220,255,255,0.7)");
  ellipse(ctx, x, y - 2, 3, 2.2, "#fdd835");
  ctx.strokeStyle = "#212121"; ctx.lineWidth = 0.6; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x - 2, y - 2 + i); ctx.lineTo(x + 2, y - 2 + i); ctx.stroke(); }
}

function drawBuilding(ctx: CanvasRenderingContext2D, t: Tile, x: number, y: number, now: number, dark: number, sdx: number, ghost = false, s: State) {
  const id = t.b!; const def = BMAP[id]; if (!def) return;
  if (!ghost) { diamond(ctx, x + sdx * 0.6, y + 4, A * 0.9, B * 0.9); ctx.fillStyle = "rgba(10,20,8,0.28)"; ctx.fill(); }
  diamond(ctx, x, y, A * 0.94, B * 0.94); ctx.fillStyle = "#b0bec5"; ctx.fill();
  diamond(ctx, x, y, A * 0.88, B * 0.88); ctx.fillStyle = "#d7ccc8"; ctx.fill();
  const W = def.wall, R = def.roof;
  const draw = def.draw;
  switch (draw) {
    case "coop": {
      const a = A * 0.54, b = B * 0.54, h = 26;
      const ox = x - 10, oy = y - 5;
      box(ctx, ox, oy, a, b, h, W, true);
      faceQuad(ctx, ox, oy, a, b, "R", 0.35, 0.65, 0, 14, "#4e342e");
      windowLit(ctx, ox, oy, a, b, "L", 0.5, 10, dark);
      roofGable(ctx, ox, oy, a, b, h, 20, R);
      for (let i = 0; i < 3; i++) { const tt = now * 0.4 + i * 2.3; chicken(ctx, x + 16 + Math.sin(tt) * 12 - i * 6, y + 6 + Math.cos(tt * 1.3) * 5 + i * 3, now + i, Math.cos(tt) > 0 ? 1 : -1); }
      break;
    }
    case "barn": {
      const a = A * 0.76, b = B * 0.76, h = 38;
      box(ctx, x - 4, y - 2, a, b, h, W);
      faceQuad(ctx, x - 4, y - 2, a, b, "R", 0.3, 0.7, 0, 26, "#fefefe");
      faceQuad(ctx, x - 4, y - 2, a, b, "R", 0.34, 0.66, 0, 24, "#8e2a20");
      windowLit(ctx, x - 4, y - 2, a, b, "L", 0.5, 20, dark);
      roofGable(ctx, x - 4, y - 2, a, b, h, 26, R);
      cow(ctx, x + 24 + Math.sin(now * 0.3) * 4, y + 12, now, Math.sin(now * 0.3) > 0 ? 1 : -1);
      cow(ctx, x + 28, y + 16, now + 3, -1);
      break;
    }
    case "sheep": {
      const a = A * 0.62, b = B * 0.62, h = 28;
      box(ctx, x, y, a, b, h, "#e0e0e0");
      faceQuad(ctx, x, y, a, b, "R", 0.3, 0.7, 0, 18, "#4e342e");
      windowLit(ctx, x, y, a, b, "L", 0.5, 12, dark);
      roofGable(ctx, x, y, a, b, h, 20, R);
      sheep(ctx, x + 14, y + 12, now, 1);
      sheep(ctx, x - 8, y + 14, now + 2, -1);
      break;
    }
    case "pigpen": {
      const a = A * 0.6, b = B * 0.6, h = 24;
      box(ctx, x, y, a, b, h, "#8d6e63", true);
      faceQuad(ctx, x, y, a, b, "R", 0.3, 0.7, 0, 16, "#3e2723");
      roofGable(ctx, x, y, a, b, h, 16, R);
      pig(ctx, x + 12, y + 10, now, 1);
      pig(ctx, x - 10, y + 12, now + 2, -1);
      break;
    }
    case "beehive": {
      shadowAt(ctx, x, y, 16, sdx);
      const a = A * 0.35, b = B * 0.35, h = 32;
      box(ctx, x, y, a, b, h, "#ffd54f");
      ctx.strokeStyle = "#f9a825"; ctx.lineWidth = 2;
      for (let k = 0; k < h; k += 5) {
        ctx.beginPath();
        ctx.moveTo(x - a * (1 - (k + h) / (h * 2)), y - k);
        ctx.lineTo(x + a * (1 - (k + h) / (h * 2)), y - k);
        ctx.stroke();
      }
      ellipse(ctx, x, y - h - 4, a, b * 0.7, "#8d6e63");
      for (let i = 0; i < 5; i++) {
        const ang = now * 3 + i * 1.3;
        bee(ctx, x + Math.cos(ang) * 20, y - h + Math.sin(ang) * 12, now + i);
      }
      break;
    }
    case "mill": {
      const a = A * 0.44, b = B * 0.44, h = 66;
      box(ctx, x, y, a, b, h, W);
      faceQuad(ctx, x, y, a, b, "R", 0.35, 0.65, 0, 15, "#5d4037");
      windowLit(ctx, x, y, a, b, "L", 0.5, 34, dark);
      roofPyramid(ctx, x, y, a, b, h, 30, R);
      const hx = x - a * 0.5, hy = y + b * 0.5 - h + 6;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(now * 1.3);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = "#4e342e"; ctx.fillRect(-1.5, 0, 3, 44);
        ctx.fillStyle = "rgba(255,250,235,0.95)"; ctx.fillRect(1.5, 8, 10, 34);
        ctx.strokeStyle = "rgba(120,90,60,0.5)"; ctx.lineWidth = 0.8;
        for (let k = 12; k < 42; k += 6) { ctx.beginPath(); ctx.moveTo(1.5, k); ctx.lineTo(11.5, k); ctx.stroke(); }
      }
      ctx.restore();
      ellipse(ctx, hx, hy, 4, 4, "#271c19");
      break;
    }
    case "silo": {
      const r = 24, h = 70, cx = x, cy = y;
      const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
      g.addColorStop(0, "#607d8b"); g.addColorStop(0.35, "#eceff1"); g.addColorStop(1, "#455a64");
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - h, r * 2, h); ellipse(ctx, cx, cy, r, r * 0.5, g);
      ctx.strokeStyle = "rgba(40,60,70,0.45)"; ctx.lineWidth = 1.4;
      for (let k = 12; k < h; k += 12) { ctx.beginPath(); ctx.ellipse(cx, cy - k, r, r * 0.5, 0, 0, Math.PI); ctx.stroke(); }
      const dg = ctx.createRadialGradient(cx - 6, cy - h - 14, 2, cx, cy - h, r * 1.2); dg.addColorStop(0, "#b0bec5"); dg.addColorStop(1, "#263238");
      ctx.beginPath(); ctx.ellipse(cx, cy - h, r, r * 0.9, 0, Math.PI, 0); ctx.fillStyle = dg; ctx.fill();
      ellipse(ctx, cx, cy - h, r, r * 0.3, dg);
      break;
    }
    case "sprinkler": case "mega_sprinkler": case "well": {
      const isMega = id === "mega_sprinkler", isWell = id === "well";
      if (isWell) {
        // stone well with wooden roof
        const a = A * 0.32, b = B * 0.32, h = 10;
        box(ctx, x, y, a, b, h, "#78909c");
        faceQuad(ctx, x, y, a, b, "R", 0.3, 0.7, 0, 8, "#546e7a");
        // roof
        const rh = 14, Wx = x, Wy = y - h;
        poly(ctx, [[Wx - a - 4, Wy], [Wx + a + 4, Wy], [Wx + a * 0.6, Wy - rh], [Wx - a * 0.6, Wy - rh]], "#6d4c41");
        // bucket rope
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, Wy - rh); ctx.lineTo(x, Wy - 4); ctx.stroke();
        ellipse(ctx, x, Wy - 2, 4, 2, "#6d4c41");
      } else {
        ctx.fillStyle = isMega ? "#00838f" : "#546e7a"; ctx.fillRect(x - 2.5, y - (isMega ? 30 : 22), 5, isMega ? 30 : 22);
        ellipse(ctx, x, y - (isMega ? 32 : 24), isMega ? 8 : 5, isMega ? 5 : 3, isMega ? "#00e5ff" : "#90a4ae");
        ctx.save();
        for (let i = 0; i < (isMega ? 28 : 16); i++) {
          const k = (now * 1.1 + i / (isMega ? 28 : 16)) % 1, ang = now * 2.8 + i * 0.4;
          const dist = (isMega ? 88 : 48) * k;
          const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.5;
          ellipse(ctx, x + dx, y - (isMega ? 32 : 22) + dy - Math.sin(k * Math.PI) * (isMega ? 28 : 18), 1.8, 1.8, `rgba(130,220,255,${0.95 * (1 - k)})`);
        }
        ctx.restore();
      }
      break;
    }
    case "composter": {
      const a = A * 0.38, b = B * 0.38, h = 20;
      box(ctx, x, y, a, b, h, W, true);
      faceQuad(ctx, x, y, a, b, "R", 0.3, 0.7, 0, 12, "#3e2723");
      smoke(ctx, x, y - h, now, 4, 0.7);
      for (let i = 0; i < 6; i++) { const ang = now * 1.5 + i; ellipse(ctx, x + Math.cos(ang) * 20, y - h + Math.sin(ang) * 8, 1.8, 1.8, "rgba(160,220,100,0.7)"); }
      break;
    }
    case "feedmill": {
      const a = A * 0.48, b = B * 0.48, h = 40;
      box(ctx, x, y, a, b, h, W);
      roofPyramid(ctx, x, y, a, b, h, 18, R);
      ellipse(ctx, x, y - h - 8, 6, 6, "#ff9800");
      ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 5, y - i * 8); ctx.lineTo(x + 5, y - i * 8); ctx.stroke(); }
      break;
    }
    case "greenhouse": {
      // glass house with steel frame
      const a = A * 0.66, b = B * 0.66, h = 22;
      ctx.save(); ctx.globalAlpha = 0.6;
      poly(ctx, [[x - a, y], [x + a, y], [x, y + b]], "#e1f5fe");
      poly(ctx, [[x - a, y - h], [x + a, y - h], [x + a, y], [x - a, y]], "rgba(129,212,250,0.6)");
      ctx.restore();
      poly(ctx, [[x, y - b - h - 10], [x + a * 1.05, y - h], [x, y + b - h], [x - a * 1.05, y - h]], "#b3e5fc");
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { const t = i / 4; ctx.beginPath(); ctx.moveTo(x - a * t, y - h + b * t); ctx.lineTo(x + a * t, y - h + b * t); ctx.stroke(); }
      poly(ctx, [[x, y - b - h - 10], [x + a * 1.05, y - h], [x - a * 1.05, y - h]], "#e1f5fe");
      break;
    }
    case "harvester": case "auto_planter": case "auto_fertilizer": {
      const isHarv = id === "harvester", isPlan = id === "auto_planter";
      const col = isHarv ? "#455a64" : isPlan ? "#2e7d32" : "#6a1b9a";
      const a = A * 0.52, b = B * 0.52, h = 30;
      box(ctx, x, y, a, b, h, col);
      const rx = x + a * 0.6, ry = y + b * 0.6;
      ctx.save(); ctx.translate(rx, ry - 6);
      ctx.rotate(now * (isHarv ? 4 : 2));
      ctx.fillStyle = isHarv ? "#ffb300" : isPlan ? "#66bb6a" : "#ba68c8";
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-1.5, -isHarv ? 14 : 10, 3, isHarv ? 28 : 20); }
      ctx.restore();
      ellipse(ctx, x, y - h - 4, 3, 3, isHarv ? "#f44336" : isPlan ? "#ff9800" : "#e040fb");
      const blink = 0.5 + 0.5 * Math.sin(now * (isHarv ? 6 : 8));
      ctx.fillStyle = isHarv ? `rgba(244,67,54,${blink})` : isPlan ? `rgba(255,193,7,${blink})` : `rgba(233,30,99,${blink})`;
      ellipse(ctx, x + 8, y - h - 2, 2.8, 2.8, ctx.fillStyle);
      // tiny tractor wheels
      ctx.fillStyle = "#212121";
      ellipse(ctx, x - a * 0.4, y + b * 0.3, 6, 3, "#212121"); ellipse(ctx, x + a * 0.4, y + b * 0.6, 6, 3, "#212121");
      break;
    }
    case "bakery": case "press": case "sweet_shop": {
      const a = A * 0.70, b = B * 0.70, h = id === "sweet_shop" ? 38 : 36;
      box(ctx, x, y, a, b, h, W);
      faceQuad(ctx, x, y, a, b, "R", 0.2, 0.44, 0, 20, "#4e342e");
      windowLit(ctx, x, y, a, b, "R", 0.72, 14, dark);
      windowLit(ctx, x, y, a, b, "L", 0.35, 14, dark);
      windowLit(ctx, x, y, a, b, "L", 0.72, 14, dark);
      roofGable(ctx, x, y, a, b, h, 24, R);
      if (id === "sweet_shop") {
        // awning
        faceQuad(ctx, x, y, a, b, "R", 0.5, 0.95, 26, 30, "#ec407a");
        faceQuad(ctx, x, y, a, b, "L", 0.05, 0.5, 26, 30, "#ad1457");
      }
      if (t.q && t.q.length) { const cx = x + a * 0.35, cy = y - h - 8; ctx.fillStyle = "#6d4c41"; ctx.fillRect(cx - 4.5, cy - 16, 9, 20); smoke(ctx, cx, cy - 20, now); }
      break;
    }
    case "dairy": {
      const a = A * 0.68, b = B * 0.68, h = 34;
      box(ctx, x, y, a, b, h, W);
      faceQuad(ctx, x, y, a, b, "R", 0.2, 0.44, 0, 18, "#37474f");
      windowLit(ctx, x, y, a, b, "R", 0.72, 12, dark);
      windowLit(ctx, x, y, a, b, "L", 0.35, 12, dark);
      roofGable(ctx, x, y, a, b, h, 22, R);
      ellipse(ctx, x + a * 0.55, y - 24, 6, 6, "#fff"); drawIcon(ctx, "item:milk", x + a * 0.55, y - 24, 10);
      break;
    }
    case "statue": { /* marble statue */
      shadowAt(ctx, x, y, 14, sdx);
      // Pedestal
      ctx.fillStyle = "#78909c"; ctx.fillRect(x - 5, y - 6, 10, 6);
      ctx.fillStyle = "#90a4ae"; ctx.fillRect(x - 4, y - 6, 8, 2);
      // Statue body
      ctx.fillStyle = "#cfd8dc"; ctx.beginPath(); ctx.ellipse(x, y - 16, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#eef1f5"; ctx.beginPath(); ctx.ellipse(x - 2, y - 18, 3, 3, 0, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillStyle = "#b0bec5"; ctx.beginPath(); ctx.ellipse(x, y - 19, 1.8, 1.5, 0, 0, Math.PI * 2); ctx.fill(); // head top
      ctx.fillStyle = "#90a4ae"; ctx.fillRect(x - 3, y - 10, 2, 4); ctx.fillRect(x + 1, y - 10, 2, 4); // arms
      // Draped cloth
      ctx.fillStyle = "#e0e0e0"; ctx.beginPath(); ctx.moveTo(x - 5, y - 10); ctx.quadraticCurveTo(x, y - 8, x + 5, y - 10); ctx.lineTo(x + 4, y - 6); ctx.lineTo(x - 4, y - 6); ctx.closePath(); ctx.fill();
      break;
    }
    case "windmill_deco": { /* decorative windmill */
      const a = A * 0.38, b = B * 0.38, h = 30;
      box(ctx, x, y, a, b, h, W);
      roofPyramid(ctx, x, y, a, b, h, 16, R);
      // Turning sails
      ctx.save(); ctx.translate(x, y - h - 6); ctx.rotate(now * 2.2);
      ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.7;
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-1, -16, 2, 32); }
      ctx.globalAlpha = 1; ctx.restore();
      // Hub
      ctx.fillStyle = "#37474f"; ctx.beginPath(); ctx.arc(x, y - h - 6, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "pergola": { /* arbor with vines */
      shadowAt(ctx, x, y, 20, sdx);
      // Wooden frame
      ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 12, y - 4); ctx.lineTo(x + 12, y - 4); ctx.stroke(); // top bar
      ctx.beginPath(); ctx.moveTo(x - 10, y + 4); ctx.lineTo(x - 10, y - 2); ctx.stroke(); // left post
      ctx.beginPath(); ctx.moveTo(x + 10, y + 4); ctx.lineTo(x + 10, y - 2); ctx.stroke(); // right post
      ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x + 10, y - 2); ctx.stroke(); // base
      // Cross beams
      ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(x + i * 8, y - 4); ctx.lineTo(x - i * 6, y + 2); ctx.stroke(); }
      // Vines & leaves
      ctx.fillStyle = "#388e3c"; for (let i = 0; i < 12; i++) { const ang = now * 0.5 + i * 0.8; ellipse(ctx, x + Math.cos(ang) * 7, y - 4 + Math.sin(ang) * 6, 2.5, 2.5, "#388e3c"); }
      ctx.fillStyle = "#66bb6a"; for (let i = 0; i < 18; i++) { const ang = now * 0.7 + i * 0.5; ellipse(ctx, x + Math.cos(ang) * 10, y - 2 + Math.sin(ang) * 8, 2, 2, "#66bb6a"); }
      // Flowers
      const fc = ["#e91e63", "#ffd54f", "#ce93d8", "#fff176"]; for (let i = 0; i < 6; i++) { ellipse(ctx, x + (hash(i, now) - 0.5) * 14, y - 3 + hash(now, i) * 7, 2, 2, fc[i % fc.length]); }
      break;
    }
    case "flowerbed": { /* colorful flower bed */
      shadowAt(ctx, x, y, 18, sdx);
      // Soil patch
      diamond(ctx, x, y, A * 0.7, B * 0.7); ctx.fillStyle = "#785838"; ctx.fill();
      diamond(ctx, x, y, A * 0.65, B * 0.65); ctx.fillStyle = "#8d6e63"; ctx.fill();
      // Flowers in grid
      const colors = ["#f06292", "#ba68c8", "#4dd0e1", "#fff176", "#ef5350", "#a5d6a7"];
      for (let row = -1; row <= 1; row++) { for (let col = -1; col <= 1; col++) {
        const fx = x + col * 6 - (row % 2) * 3, fy = y - 4 + row * 4;
        const col2 = colors[(row * 3 + col + Math.floor(now * 2)) % colors.length];
        ellipse(ctx, fx, fy, 3.5, 3.5, col2); ellipse(ctx, fx - 1, fy - 1, 1.2, 1.2, "#fff"); // center
        ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, fy + 3); ctx.lineTo(fx, fy + 7); ctx.stroke(); // stem
      }}
      break;
    }
    case "pond_deco": { /* small decorative pond */
      diamond(ctx, x, y, A * 0.7, B * 0.7); ctx.fillStyle = "#2e7d32"; ctx.fill(); // grass edge
      const g = ctx.createLinearGradient(x, y - B * 0.6, x, y + B * 0.6);
      g.addColorStop(0, "#4fc3f7"); g.addColorStop(1, "#0284c7"); ctx.fillStyle = g;
      diamond(ctx, x, y + 2, A * 0.65, B * 0.65); ctx.fill();
      // Water ripples
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const ph = now * 1.5 + i * 2; const r = 4 + i * 3; ellipse(ctx, x, y + 2, r, r * 0.5, "transparent"); ctx.beginPath(); ctx.ellipse(x, y + 2, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
      // Lily pads
      ellipse(ctx, x - 6, y + 4, 5, 2.5, "#388e3c"); ellipse(ctx, x + 5, y - 2, 4, 2, "#388e3c");
      ellipse(ctx, x - 6, y + 4, 1.5, 1.5, "#f48fb1"); ellipse(ctx, x + 5, y - 2, 1.2, 1.2, "#f48fb1");
      break;
    }
    case "bamboo": { /* bamboo grove */
      shadowAt(ctx, x, y, 16, sdx);
      for (let i = 0; i < 5; i++) { const bx = x + (hash(i, now) - 0.5) * 18, by = y; const h = 20 + hash(i, now + 1) * 12;
        ctx.fillStyle = "#558b2f"; ctx.fillRect(bx - 1.5, by - h, 3, h); ctx.fillStyle = "#7cb342"; ctx.fillRect(bx - 1.5, by - h, 1.5, h);
        // Segments
        ctx.strokeStyle = "#33691e"; ctx.lineWidth = 1; for (let k = 0; k < h; k += h / 4) { ctx.beginPath(); ctx.moveTo(bx - 2, by - k); ctx.lineTo(bx + 2, by - k); ctx.stroke(); }
        // Leaves
        ctx.fillStyle = "#2e7d32"; for (let j = 0; j < 3; j++) { const ly = by - h * (0.3 + j * 0.2); ellipse(ctx, bx + (j - 1) * 5, ly, 4, 2, "#2e7d32"); ellipse(ctx, bx - (j - 1) * 4, ly + 2, 3, 1.5, "#388e3c"); }
        // Top leaf cluster
        ctx.fillStyle = "#43a047"; ellipse(ctx, bx, by - h - 2, 4, 4, "#43a047"); ellipse(ctx, bx + 2, by - h - 1, 3, 3, "#66bb6a");
      }
      break;
    }
    case "stone_wall": { /* stone wall segment */
      shadowAt(ctx, x, y, 24, sdx);
      ctx.fillStyle = "#757575"; ctx.fillRect(x - 14, y - 6, 28, 6); ctx.fillStyle = "#9e9e9e"; ctx.fillRect(x - 14, y - 6, 28, 2);
      // Stones
      ctx.strokeStyle = "#424242"; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const sx = x - 13 + i * 7; ctx.beginPath(); ctx.moveTo(sx, y - 6); ctx.lineTo(sx, y); ctx.stroke(); }
      ctx.strokeStyle = "#616161"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 13, y - 3); ctx.lineTo(x + 13, y - 3); ctx.stroke();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(x - 14, y - 5, 28, 1);
      break;
    }
    case "gate": { /* wooden gate */
      shadowAt(ctx, x, y, 16, sdx);
      // Posts
      ctx.fillStyle = "#6d4c41"; ctx.fillRect(x - 9, y - 12, 3, 12); ctx.fillRect(x + 6, y - 12, 3, 12); ctx.fillStyle = "#8d6e63"; ctx.fillRect(x - 9, y - 12, 1.5, 12); ctx.fillRect(x + 6, y - 12, 1.5, 12);
      // Top arch
      ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 9, y - 12); ctx.quadraticCurveTo(x - 1.5, y - 18, x + 6, y - 12); ctx.stroke();
      // Gate door
      ctx.fillStyle = "#4e342e"; ctx.fillRect(x - 6, y - 10, 12, 10); ctx.fillStyle = "#5d4037"; ctx.fillRect(x - 6, y - 10, 12, 2); ctx.fillStyle = "#3e2723"; for (let i = 0; i < 3; i++) { ctx.fillRect(x - 5 + i * 4, y - 8, 2, 7); }
      // Handle
      ctx.fillStyle = "#d4a017"; ctx.beginPath(); ctx.arc(x + 2, y - 5, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "fountain": { /* ornate fountain */
      shadowAt(ctx, x, y, 22, sdx);
      // Base
      ctx.fillStyle = "#eceff1"; ctx.beginPath(); ctx.ellipse(x, y - 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#b0bec5"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 6, 12, 5, 0, 0, Math.PI * 2); ctx.stroke();
      // Tiers
      ctx.fillStyle = "#e0e0e0"; ctx.beginPath(); ctx.ellipse(x, y - 14, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y - 18, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      // Central pillar
      ctx.fillStyle = "#bdbdbd"; ctx.fillRect(x - 1.5, y - 20, 3, 8); ctx.fillStyle = "#d7d7d7"; ctx.fillRect(x - 0.5, y - 20, 1, 8);
      // Upper bowl
      ctx.fillStyle = "#e0e0e0"; ctx.beginPath(); ctx.ellipse(x, y - 20, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y - 20, 5, 2, 0, 0, Math.PI * 2); ctx.strokeStyle = "#9e9e9e"; ctx.stroke();
      // Water jet
      ctx.strokeStyle = "rgba(130,220,255,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.quadraticCurveTo(x + Math.sin(now * 2) * 3, y - 28, x + Math.sin(now * 2) * 5, y - 34); ctx.stroke();
      // Falling water
      for (let i = 0; i < 5; i++) { const wy = y - 20 - i * 4 - Math.sin(now + i) * 2; ellipse(ctx, x + Math.sin(now * 2) * 5 + (i - 2) * 2, wy, 1.5, 1.5, "rgba(130,220,255,0.5)"); }
      // Overflow
      ctx.strokeStyle = "rgba(130,220,255,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 6, 11, 2, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "gazebo": { /* small pavilion */
      const a = A * 0.52, b = B * 0.52, h = 16;
      // Floor
      diamond(ctx, x, y, A * 0.6, B * 0.6); ctx.fillStyle = "#a1887f"; ctx.fill(); diamond(ctx, x, y, A * 0.55, B * 0.55); ctx.fillStyle = "#8d6e63"; ctx.fill();
      // Pillars
      ctx.fillStyle = "#6d4c41"; for (const [px, py] of [[-a*0.5, b*0.3], [a*0.5, b*0.3], [-a*0.5, -b*0.3], [a*0.5, -b*0.3]]) { ctx.fillRect(x + px - 1, y + py - 6, 2, 6); }
      // Rooftop
      ctx.fillStyle = "#5d4037"; ctx.beginPath(); ctx.moveTo(x - a*0.7, y - h); ctx.lineTo(x + a*0.7, y - h); ctx.lineTo(x + a*0.5, y - h - 8); ctx.lineTo(x - a*0.5, y - h - 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1; ctx.stroke();
      // Roof cap
      ctx.fillStyle = "#3e2723"; ctx.beginPath(); ctx.ellipse(x, y - h - 8, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#8d6e63"; ctx.beginPath(); ctx.ellipse(x, y - h - 8.5, 1.5, 1, 0, 0, Math.PI * 2); ctx.fill();
      // Curtain hints
      ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1; for (const px of [-a*0.4, a*0.4]) { ctx.beginPath(); ctx.moveTo(x + px, y - h); ctx.lineTo(x + px, y + b*0.4); ctx.stroke(); }
      break;
    }
  }
  if (ghost) return;
  const top = y - 100;
  if (t.out && t.out.length) {
    const bob = Math.sin(now * 3.5) * 3;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8; ellipse(ctx, x, top + bob, 18, 18, "#ffffff"); ctx.restore();
    poly(ctx, [[x - 6, top + 13 + bob], [x + 6, top + 13 + bob], [x, top + 22 + bob]], "#ffffff");
    drawIcon(ctx, "item:" + t.out[0], x, top + bob + 1, 24);
    if (t.out.length > 1) { ellipse(ctx, x + 13, top - 11 + bob, 8, 8, "#e53935"); ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.fillText(String(t.out.length), x + 13, top - 11 + bob); }
  } else if (t.q && t.q.length && def.recipes.length) {
    const p = t.p || 0;
    ellipse(ctx, x, top + 8, 14, 14, "rgba(0,0,0,0.55)");
    ctx.strokeStyle = "#76ff03"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, top + 8, 12, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    drawIcon(ctx, "item:" + def.recipes[t.q[0]].out, x, top + 8, 16);
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, w: Walker, now: number) {
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

export function render(ctx: CanvasRenderingContext2D, s: State, v: View, now: number, fx: Fx[], walkers: Walker[]) {
  const { w, h, dpr, cam } = v; const L = lightInfo(s);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, w, h);
    if (L.dark > 0) { ctx.fillStyle = `rgba(5,15,40,${L.dark * 0.85})`; ctx.fillRect(0, 0, w, h); }
  } else {
    const dayK = 1 - L.dark / 0.68;
    const top = mix([10, 20, 48], [100, 195, 235], dayK), bot = mix([4, 10, 28], [28, 115, 175], dayK);
    const sg = ctx.createLinearGradient(0, 0, 0, h); sg.addColorStop(0, rgb(top)); sg.addColorStop(1, rgb(bot)); ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
  }
  // subtle parallax clouds
  ctx.setTransform(dpr * cam.z * 0.2, 0, 0, dpr * cam.z * 0.2, dpr * (w / 2 + cam.x * 0.2), dpr * (h / 2 + cam.y * 0.2));
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 360 + now * 10) % 2000) - 1000; const cy = -260 + (i % 3) * 30;
    ellipse(ctx, cx, cy, 60, 22, "rgba(255,255,255,0.25)"); ellipse(ctx, cx + 30, cy + 6, 50, 18, "rgba(255,255,255,0.2)");
  }
  ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (w / 2 + cam.x), dpr * (h / 2 + cam.y));
  const sdx = -Math.cos(L.p * Math.PI * 2 - Math.PI / 2) * 12;

  // Viewport culling: with a 32x32 island we only paint what the camera can see
  const pad = 150;
  const wx0 = (-w / 2 - cam.x) / cam.z - pad, wx1 = (w / 2 - cam.x) / cam.z + pad;
  const wy0 = (-h / 2 - cam.y) / cam.z - pad, wy1 = (h / 2 - cam.y) / cam.z + pad;
  const vis = (px: number, py: number) => px > wx0 && px < wx1 && py > wy0 && py < wy1;

  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const c0 = tileCenter(gx, gy);
      if (!vis(c0.x, c0.y)) continue;
      drawGround(ctx, s, s.tiles[idx(gx, gy)], gx, gy, now);
    }
  }

  const hv = v.hover;
  if (hv) {
    const { x, y } = tileCenter(hv.x, hv.y);
    if (locked(s, hv.x, hv.y)) {
      const c = chunkOf(hv.x, hv.y), cx0 = (c % Math.ceil(N / CH)) * CH, cy0 = Math.floor(c / Math.ceil(N / CH)) * CH;
      for (let yy = cy0; yy < cy0 + CH; yy++) for (let xx = cx0; xx < cx0 + CH; xx++) {
        if (yy < N && xx < N) {
          const p = tileCenter(xx, yy); diamond(ctx, p.x, p.y, A, B);
          ctx.fillStyle = canExpand(s, c) ? "rgba(255,235,59,0.28)" : "rgba(244,67,54,0.22)"; ctx.fill();
        }
      }
    } else {
      const ht = s.tiles[idx(hv.x, hv.y)];
      let toolValid = true;
      let strokeCol = "rgba(255,255,255,0.85)";
      let fillCol = "rgba(255,255,255,0.18)";

      if (v.tool === "hoe") {
        toolValid = ht.k === "grass";
        strokeCol = toolValid ? "rgba(217,119,6,0.95)" : "rgba(239,68,68,0.75)";
        fillCol = toolValid ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.2)";
      } else if (v.tool === "seed") {
        toolValid = ht.k === "soil" && !ht.crop;
        strokeCol = toolValid ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.75)";
        fillCol = toolValid ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)";
      } else if (v.tool === "water") {
        toolValid = ht.k === "soil" && !ht.wet;
        strokeCol = toolValid ? "rgba(56,189,248,0.95)" : "rgba(239,68,68,0.75)";
        fillCol = toolValid ? "rgba(56,189,248,0.25)" : "rgba(239,68,68,0.2)";
      } else if (v.tool === "fert") {
        toolValid = ht.k === "soil" && !ht.fert;
        strokeCol = toolValid ? "rgba(234,179,8,0.95)" : "rgba(239,68,68,0.75)";
        fillCol = toolValid ? "rgba(234,179,8,0.25)" : "rgba(239,68,68,0.2)";
      } else if (v.tool === "clear") {
        toolValid = ht.k === "tree" || ht.k === "rock" || ht.k === "bld" || ht.k === "soil";
        strokeCol = toolValid ? "rgba(239,68,68,0.95)" : "rgba(148,163,184,0.5)";
        fillCol = toolValid ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.15)";
      } else if (v.tool === "hand") {
        toolValid = (ht.crop !== undefined && (ht.g || 0) >= 1) || (ht.k === "bld" && (ht.out?.length || 0) > 0);
        strokeCol = toolValid ? "rgba(16,185,129,0.95)" : "rgba(255,255,255,0.7)";
        fillCol = toolValid ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.15)";
      }

      diamond(ctx, x, y, A, B);
      ctx.fillStyle = fillCol; ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Tool cursor badge preview (SVG icon in a small bubble)
      const badgeKey = !toolValid && v.tool !== "build" && v.tool !== "hand"
        ? "ui:close"
        : v.tool === "seed" && v.arg ? "item:" + v.arg : "ui:" + v.tool;
      const by = y - B - 14 + Math.sin(now * 5) * 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 6;
      ellipse(ctx, x, by, 12, 12, !toolValid && v.tool !== "build" && v.tool !== "hand" ? "#e53935" : "#ffffff");
      ctx.restore();
      drawIcon(ctx, badgeKey, x, by, 17);
    }
  }

  for (let d = 0; d <= 2 * (N - 1); d++) {
    for (let gx = Math.max(0, d - N + 1); gx <= Math.min(N - 1, d); gx++) {
      const gy = d - gx;
      const { x, y } = tileCenter(gx, gy);
      if (!vis(x, y)) continue;
      const t = s.tiles[idx(gx, gy)];
      const lk = locked(s, gx, gy);
      if (!lk) {
        if (gy === 0 || locked(s, gx, gy - 1)) fence(ctx, [x, y - B], [x + A, y]);
        if (gx === 0 || locked(s, gx - 1, gy)) fence(ctx, [x - A, y], [x, y - B]);
      }
      if (t.k === "tree") drawTree(ctx, x, y, t.v, now, sdx, SEASONS[s.seasonIndex].id);
      else if (t.k === "rock") drawRock(ctx, x, y, t.v, sdx, SEASONS[s.seasonIndex].id === "winter");
      else if (t.crop) drawCrop(ctx, t, gx, gy, now, SEASONS[s.seasonIndex].id);
      else if (t.k === "bld") drawBuilding(ctx, t, x, y, now, L.dark, sdx, false, s);
      if (hv && hv.x === gx && hv.y === gy && v.tool === "build" && v.arg && !lk && (t.k === "grass" || (t.k === "soil" && !t.crop))) {
        ctx.globalAlpha = 0.65 + 0.15 * Math.sin(now * 4); drawBuilding(ctx, { k: "bld", v: 0, b: v.arg } as Tile, x, y, now, 0, 0, true, s); ctx.globalAlpha = 1;
      }
      for (const wk of walkers) if (Math.floor(wk.x) === gx && Math.floor(wk.y) === gy) drawWalker(ctx, wk, now);
      if (!lk) {
        if (gx === N - 1 || locked(s, gx + 1, gy)) fence(ctx, [x + A, y], [x, y + B]);
        if (gy === N - 1 || locked(s, gx, gy + 1)) fence(ctx, [x, y + B], [x - A, y]);
      }
    }
  }

  // For sale signs
  const NCH = Math.ceil(N / CH);
  for (let c = 0; c < NCH * NCH; c++) {
    if (!canExpand(s, c)) continue;
    const cxi = c % NCH, cyi = Math.floor(c / NCH);
    const p = tileCenter(cxi * CH + CH / 2 - 0.5, cyi * CH + CH / 2 - 0.5);
    const bob = Math.sin(now * 2.2 + c) * 3;
    ctx.fillStyle = "#5d4037"; ctx.fillRect(p.x - 2, p.y - 32, 4, 32);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 10; ctx.fillStyle = "#fffde7"; ctx.beginPath(); ctx.roundRect(p.x - 48, p.y - 66 + bob, 96, 34, 10); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(p.x - 48, p.y - 66 + bob, 96, 34, 10); ctx.stroke();
    ctx.fillStyle = "#451a03"; ctx.font = "bold 11px Vazirmatn, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("زمین قابل خرید", p.x, p.y - 54 + bob);
    ctx.fillStyle = "#d97706"; ctx.fillText(expandCost(s).toLocaleString("fa-IR"), p.x + 7, p.y - 41 + bob); drawIcon(ctx, "ui:coin", p.x - 26, p.y - 41 + bob, 13);
  }

  for (const f of fx) {
    const a = clamp(f.life / f.max);
    if (f.kind === "text") {
      ctx.font = "bold 16px Vazirmatn, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = f.text ? ctx.measureText(f.text).width : 0;
      const tx = f.icon ? f.x - 10 : f.x;
      ctx.globalAlpha = a;
      if (f.text) {
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,10,0,0.8)"; ctx.strokeText(f.text, tx, f.y);
        ctx.fillStyle = f.color; ctx.fillText(f.text, tx, f.y);
      }
      if (f.icon) drawIcon(ctx, f.icon, tx + tw / 2 + 12, f.y, 22);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a; ellipse(ctx, f.x, f.y, f.kind === "leaf" ? 3.5 : 2.5, f.kind === "leaf" ? 2 : 2.5, f.color); ctx.globalAlpha = 1;
    }
  }

  if (L.dark > 0.12) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i]; if (t.k !== "bld" || ["sprinkler", "mega_sprinkler", "well", "harvester", "auto_planter", "auto_fertilizer", "composter"].includes(t.b!)) continue;
      const { x, y } = tileCenter(i % N, Math.floor(i / N));
      const r = 95 + Math.sin(now * 5 + i) * 4;
      const g = ctx.createRadialGradient(x, y - 14, 0, x, y - 14, r);
      g.addColorStop(0, `rgba(255,190,90,${L.dark * 0.6})`); g.addColorStop(1, "rgba(255,170,70,0)");
      ctx.fillStyle = g; ctx.fillRect(x - r, y - 14 - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // Weather particles in screen space
  // تعداد ذره‌ها با مساحت صفحه مقیاس می‌گیرد تا موبایل ضعیف هم ۵۵+ FPS بدهد
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pk = Math.max(0.28, Math.min(1, (w * h) / (390 * 844)));
  if (v.reduced) {
    // دسترس‌پذیری: با «کاهش حرکت»، فقط ته‌رنگ هوا می‌ماند و ذره‌ای رسم نمی‌شود
  } else if (s.weather === "rain") {
    ctx.strokeStyle = "rgba(190,225,255,0.5)"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 0; i < Math.round(300 * pk) + 40; i++) { const rx = (hash(i, 7) * w + now * 80) % w, ry = (hash(7, i) * h + now * 780 * (0.8 + hash(i, i) * 0.4)) % h; ctx.moveTo(rx, ry); ctx.lineTo(rx - 5, ry + 16); }
    ctx.stroke();
  } else if (s.weather === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < Math.round(200 * pk) + 32; i++) { const sx = (hash(i, 11) * w + Math.sin(now + i) * 20) % w, sy = (hash(13, i) * h + now * 70) % h; ellipse(ctx, sx, sy, 2.8, 2.8, "rgba(255,255,255,0.8)"); }
  } else if (s.weather === "fog") {
    const fg = ctx.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, "rgba(240,245,255,0.35)"); fg.addColorStop(1, "rgba(230,235,245,0.05)"); ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);
  } else if (s.weather === "heatwave") {
    ctx.strokeStyle = "rgba(255,180,80,0.12)"; ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const y = (i * 22 + (now * 20) % 22); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.sin(now + i) * 6); ctx.stroke(); }
  }
  if (L.dusk > 0) { ctx.fillStyle = `rgba(255,140,60,${0.14 * L.dusk})`; ctx.fillRect(0, 0, w, h); }
  if (L.dark > 0) { ctx.fillStyle = `rgba(10,20,60,${L.dark})`; ctx.fillRect(0, 0, w, h); }
  ctx.fillStyle = vignette(ctx, w, h); ctx.fillRect(0, 0, w, h);
}

/** گرادیان وینیت که هر فریم دوباره ساخته می‌شد؛ حالا بر اساس اندازه‌ی صفحه کش می‌شود. */
let vignetteCache: { key: string; grad: CanvasGradient | null } = { key: "", grad: null };
function vignette(ctx: CanvasRenderingContext2D, w: number, h: number): string | CanvasGradient {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  if (vignetteCache.key !== key || !vignetteCache.grad) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.8);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    vignetteCache = { key, grad: g };
  }
  return vignetteCache.grad!;
}


/** Draws a single building at the centre of a small canvas (used for UI cards). */
export function drawBuildingThumb(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, now = 1.2) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / (A * 2.1), h / 120);
  ctx.save();
  ctx.translate(w / 2, h * 0.78);
  ctx.scale(scale, scale);
  diamond(ctx, 0, 0, A * 1.02, B * 1.02); ctx.fillStyle = "#7cb342"; ctx.fill();
  drawBuilding(ctx, { k: "bld", v: 0.5, b: id } as Tile, 0, 0, now, 0, 4, true, null as unknown as State);
  ctx.restore();
}
