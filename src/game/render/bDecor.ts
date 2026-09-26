/**
 * src/game/render/bDecor.ts — دکورها (مجسمه، آلاچیق، فواره، حوض، دیوار و دروازه)
 * (بخشی از drawBuilding؛ P5.14: شکستنِ render.ts به فایل‌های ≤ ۴۰۰ خط)
 */
import { A, B, box, roofPyramid, ellipse, diamond, shadowAt, hash, type BArgs } from "./core";

/** true = این دسته این ساختمان را کشید */
export function drawDecorBuilding(ctx: CanvasRenderingContext2D, p: BArgs): boolean {
  const { x, y, now, sdx, W, R } = p;
  switch (p.draw) {
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
    default:
      return false;
  }
  return true;
}
