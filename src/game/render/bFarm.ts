/**
 * src/game/render/bFarm.ts — ساختمان‌های مزرعه و دام (مرغداری، طویله، آسیاب، آب‌پاش، ماشین‌ها) + حیوان‌ها
 * (بخشی از drawBuilding؛ P5.14: شکستنِ render.ts به فایل‌های ≤ ۴۰۰ خط)
 */
import { A, B, box, faceQuad, roofGable, roofPyramid, windowLit, smoke, ellipse, poly, shadowAt, type BArgs } from "./core";

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

/** true = این دسته این ساختمان را کشید */
export function drawFarmBuilding(ctx: CanvasRenderingContext2D, p: BArgs): boolean {
  const { id, x, y, now, dark, sdx, W, R } = p;
  switch (p.draw) {
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
    default:
      return false;
  }
  return true;
}
