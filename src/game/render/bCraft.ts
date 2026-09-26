/**
 * src/game/render/bCraft.ts — کارگاه‌ها و بناهای ایرانی (قنات، کاروانسرا، بادگیر، نانوایی، لبنیات)
 * (بخشی از drawBuilding؛ P5.14: شکستنِ render.ts به فایل‌های ≤ ۴۰۰ خط)
 */
import { A, B, box, faceQuad, roofGable, roofPyramid, windowLit, smoke, ellipse, poly, diamond, shade, shadowAt, type BArgs } from "./core";
import { drawIcon } from "../icons";
/** true = این دسته این ساختمان را کشید */
export function drawCraftBuilding(ctx: CanvasRenderingContext2D, p: BArgs): boolean {
  const { t, id, def, x, y, now, dark, sdx, W, R } = p;
  switch (p.draw) {
    case "workshop": {
      // کارگاهِ عمومیِ سطح بالا: ساختمانِ آجری با تابلوی کالای اصلی و دودکش هنگام تولید
      const a = A * 0.66, b = B * 0.66, h = 32;
      box(ctx, x, y, a, b, h, W);
      faceQuad(ctx, x, y, a, b, "R", 0.38, 0.62, 0, 18, "#4e342e");
      windowLit(ctx, x, y, a, b, "L", 0.3, 14, dark);
      windowLit(ctx, x, y, a, b, "L", 0.7, 14, dark);
      windowLit(ctx, x, y, a, b, "R", 0.82, 14, dark);
      roofGable(ctx, x, y, a, b, h, 22, R);
      const sx = x + a * 0.5, sy = y - h * 0.62;
      ellipse(ctx, sx, sy, 9, 9, "#fff8e1"); ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(sx, sy, 9, 9, 0, 0, Math.PI * 2); ctx.stroke();
      if (def.recipes[0]) drawIcon(ctx, "item:" + def.recipes[0].out, sx, sy, 13);
      if (t.q && t.q.length) { const cx = x - a * 0.35, cy = y - h - 6; ctx.fillStyle = "#6d4c41"; ctx.fillRect(cx - 4, cy - 14, 8, 18); smoke(ctx, cx, cy - 18, now); }
      break;
    }
    case "qanat": {
      // قنات: آب‌انبارِ گنبدی + جوی روان
      ctx.strokeStyle = `rgba(79,195,247,${0.75 + 0.2 * Math.sin(now * 3)})`; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x + 4, y + 6); ctx.quadraticCurveTo(x + 22, y + 10, x + 34, y + 2); ctx.stroke(); ctx.lineCap = "butt";
      const a = A * 0.42, b = B * 0.42, h = 14;
      box(ctx, x - 6, y - 2, a, b, h, W);
      ctx.fillStyle = shade(W, -0.1); ctx.beginPath(); ctx.ellipse(x - 6, y - 2 - h, a * 0.82, a * 0.72, 0, Math.PI, 0); ctx.fill();
      ellipse(ctx, x - 6, y - 2 - h - a * 0.66, 2.6, 2.6, R);
      faceQuad(ctx, x - 6, y - 2, a, b, "R", 0.35, 0.65, 0, 9, "#263238");
      for (let k = 0; k < 3; k++) { const kx = x + 12 + k * 7; ellipse(ctx, kx, y + 8 - k * 2, 3.6, 1.8, "#8d6e63"); ellipse(ctx, kx, y + 7.6 - k * 2, 2.2, 1, "#3e2723"); }
      break;
    }
    case "caravanserai": {
      // کاروانسرا: بنای پهنِ طاق‌دار با گنبدِ کوچک
      const a = A * 0.86, b = B * 0.86, h = 22;
      box(ctx, x, y, a, b, h, W);
      for (let k = 0; k < 4; k++) faceQuad(ctx, x, y, a, b, "L", 0.1 + k * 0.22, 0.24 + k * 0.22, 0, 14, "#4e342e");
      for (let k = 0; k < 4; k++) faceQuad(ctx, x, y, a, b, "R", 0.1 + k * 0.22, 0.24 + k * 0.22, 0, 14, "#5d4037");
      poly(ctx, [[x, y - b - h], [x + a, y - h], [x, y + b - h], [x - a, y - h]], shade(W, 0.12));
      ctx.fillStyle = "#26a69a"; ctx.beginPath(); ctx.ellipse(x, y - h - 4, 10, 10, 0, Math.PI, 0); ctx.fill();
      ellipse(ctx, x, y - h - 14, 2, 2, R);
      if (t.q && t.q.length) { const cx = x + a * 0.55 + Math.sin(now * 0.8) * 6; ellipse(ctx, cx, y + 14, 6, 3, "#c8a27a"); ctx.fillStyle = "#c8a27a"; ctx.fillRect(cx + 3, y + 5, 2.4, 8); }
      break;
    }
    case "tiled_pool": {
      shadowAt(ctx, x, y, 26, sdx * 0.4);
      diamond(ctx, x, y, A * 0.78, B * 0.78); ctx.fillStyle = "#e0f2f1"; ctx.fill();
      diamond(ctx, x, y, A * 0.66, B * 0.66); ctx.fillStyle = "#00897b"; ctx.fill();
      diamond(ctx, x, y, A * 0.58, B * 0.58); ctx.fillStyle = `rgba(77,208,225,${0.85 + 0.1 * Math.sin(now * 2)})`; ctx.fill();
      for (let k = 0; k < 8; k++) { const an = (k / 8) * Math.PI * 2; ellipse(ctx, x + Math.cos(an) * A * 0.72, y + Math.sin(an) * B * 0.72, 2.2, 1.2, k % 2 ? "#1565c0" : "#fdd835"); }
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.quadraticCurveTo(x + Math.sin(now * 2) * 3, y - 16, x + Math.sin(now * 2) * 4, y - 20); ctx.stroke();
      break;
    }
    case "windcatcher": {
      shadowAt(ctx, x, y, 16, sdx);
      const a = A * 0.3, b = B * 0.3, h = 64;
      box(ctx, x, y, a, b, h, W);
      for (let k = 0; k < 3; k++) { faceQuad(ctx, x, y, a, b, "L", 0.18 + k * 0.28, 0.3 + k * 0.28, h - 22, h - 4, "#4e342e"); faceQuad(ctx, x, y, a, b, "R", 0.18 + k * 0.28, 0.3 + k * 0.28, h - 22, h - 4, "#3e2723"); }
      roofPyramid(ctx, x, y, a, b, h, 6, R);
      break;
    }
    case "tiled_portal": {
      shadowAt(ctx, x, y, 24, sdx);
      const a = A * 0.62, b = B * 0.2, h = 58;
      box(ctx, x, y, a, b, h, W);
      faceQuad(ctx, x, y, a, b, "R", 0.28, 0.72, 0, 34, "#0d47a1");
      faceQuad(ctx, x, y, a, b, "R", 0.34, 0.66, 0, 28, "#3e2723");
      faceQuad(ctx, x, y, a, b, "R", 0, 1, h - 8, h, R);
      faceQuad(ctx, x, y, a, b, "L", 0, 1, h - 8, h, shade(R, -0.1));
      for (let k = 0; k < 5; k++) faceQuad(ctx, x, y, a, b, "R", 0.06 + k * 0.2, 0.12 + k * 0.2, 38, 46, "#fdd835");
      break;
    }
    case "sawmill": {
      // نجاری: کارگاه تخته‌ای + توده‌ی الوار + تیغه‌ی اره‌ی گردان
      const a = A * 0.62, b = B * 0.62, h = 28;
      box(ctx, x - 6, y - 3, a, b, h, W, true);
      faceQuad(ctx, x - 6, y - 3, a, b, "R", 0.3, 0.62, 0, 18, "#4e342e");
      windowLit(ctx, x - 6, y - 3, a, b, "L", 0.5, 12, dark);
      roofGable(ctx, x - 6, y - 3, a, b, h, 18, R);
      for (let i = 0; i < 3; i++) { const lx = x + 22 - i * 3, ly = y + 10 - i * 5; ctx.fillStyle = "#8d5a2b"; ctx.fillRect(lx - 11, ly - 4, 20, 7); ellipse(ctx, lx + 9, ly - 0.5, 3.5, 3.6, "#e0b57e"); }
      if (t.q && t.q.length) {
        ctx.save(); ctx.translate(x + 26, y - 14); ctx.rotate(now * 9);
        ctx.fillStyle = "#cfd8dc"; ctx.beginPath(); for (let k = 0; k < 12; k++) { const r = k % 2 ? 6 : 8.5, an = (k / 12) * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.fill();
        ellipse(ctx, 0, 0, 2, 2, "#546e7a"); ctx.restore();
      }
      break;
    }
    case "quarry": {
      // معدن: دیواره‌ی سنگی، داربست چوبی و واگن سنگ
      poly(ctx, [[x - 34, y + 2], [x - 26, y - 26], [x - 6, y - 40], [x + 16, y - 34], [x + 30, y - 12], [x + 24, y + 6], [x - 10, y + 12]], "#78909c");
      poly(ctx, [[x - 26, y - 26], [x - 6, y - 40], [x + 16, y - 34], [x + 2, y - 20], [x - 14, y - 18]], "#b0bec5");
      poly(ctx, [[x + 2, y - 20], [x + 16, y - 34], [x + 30, y - 12], [x + 18, y - 4]], "#546e7a");
      ctx.strokeStyle = "#8d5a2b"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x - 10, y - 22); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 6, y - 20); ctx.moveTo(x - 13, y - 20); ctx.lineTo(x + 9, y - 22); ctx.stroke();
      ctx.fillStyle = "#212121"; ctx.fillRect(x - 7, y - 14, 10, 14);
      const cartX = x + 20 + (t.q && t.q.length ? Math.sin(now * 1.4) * 5 : 0);
      ctx.fillStyle = "#6d4c41"; ctx.fillRect(cartX - 8, y + 4, 16, 7);
      ellipse(ctx, cartX - 5, y + 12, 2.4, 2.4, "#37474f"); ellipse(ctx, cartX + 5, y + 12, 2.4, 2.4, "#37474f");
      ellipse(ctx, cartX - 2, y + 3, 4, 2.6, "#90a4ae"); ellipse(ctx, cartX + 3, y + 2, 3.4, 2.2, "#b0bec5");
      break;
    }
    case "stonemason": {
      // سنگ‌تراشی: کارگاه سنگی با سقف تخت + بلوک‌های تراش‌خورده
      const a = A * 0.6, b = B * 0.6, h = 26;
      box(ctx, x - 5, y - 2, a, b, h, W);
      for (let r = 1; r < 4; r++) faceQuad(ctx, x - 5, y - 2, a, b, "L", 0, 1, r * 6.5 - 0.6, r * 6.5 + 0.6, "rgba(69,90,100,0.35)");
      faceQuad(ctx, x - 5, y - 2, a, b, "R", 0.32, 0.62, 0, 16, "#37474f");
      windowLit(ctx, x - 5, y - 2, a, b, "L", 0.55, 12, dark);
      roofPyramid(ctx, x - 5, y - 2, a, b, h, 10, R);
      for (let i = 0; i < 3; i++) box(ctx, x + 18 + (i % 2) * 7, y + 8 - Math.floor(i / 2) * 7, 5, 3, 6, i === 2 ? "#eceff1" : "#cfd8dc");
      if (t.q && t.q.length && Math.sin(now * 10) > 0.6) for (let k = 0; k < 3; k++) ellipse(ctx, x + 20 + Math.cos(now * 20 + k) * 6, y - 2 - k * 3, 1.2, 1.2, "rgba(236,239,241,0.9)");
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
    default:
      return false;
  }
  return true;
}
