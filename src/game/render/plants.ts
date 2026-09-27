/**
 * src/game/render/plants.ts — ظاهرهای عمومیِ محصول‌ها (جدا از nature.ts تا هر فایل کوچک بماند)
 */
import { ellipse, hash, shade } from "./core";

/** ظاهرهای عمومی برای محصول‌های سطح بالا (P6.1): درختِ میوه، بوته، شالیزار، پنبه + W.1: غده، نیشکر، غلاف، رونده، چتر */
export function drawGenericPlant(ctx: CanvasRenderingContext2D, look: string, color: string, leaf: string, x: number, y: number, g: number, sc: number, sw: number, seed: number, seasonId: string) {
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
  if (look === "tuber") {
    /* W.1: سیب‌زمینی، پیاز، سیر و چغندرقند — برگ‌های سیخی؛ غده یا سوخ از خاک بیرون می‌زند */
    ctx.strokeStyle = winter ? "#9e9d24" : leaf; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    for (let i = -2; i <= 2; i++) {
      const hh = (7 + (2 - Math.abs(i)) * 2.6) * sc + 3;
      ctx.beginPath(); ctx.moveTo(x + i * 1.4, y - 1); ctx.quadraticCurveTo(x + i * 2.2, y - hh * 0.6, x + i * 3 + sw * 0.5, y - hh); ctx.stroke();
    }
    if (g > 0.45) {
      const r = (ripe ? 3.6 : 2.4) * (0.6 + sc * 0.5);
      ellipse(ctx, x - 3, y - 0.5, r, r * 0.75, color);
      ellipse(ctx, x + 3.4, y + 0.4, r * 0.85, r * 0.65, shade(color, -0.12));
      if (ripe) ellipse(ctx, x - 3.8, y - 1.4, r * 0.35, r * 0.25, "rgba(255,255,255,0.4)");
    }
    return;
  }
  if (look === "cane") {
    /* W.1: نیشکر — ساقه‌های بلندِ بندبند با برگ‌های باریکِ آویخته */
    const h = 14 + 30 * sc;
    for (let i = -1; i <= 1; i++) {
      const bx = x + i * 4, tx = bx + sw * 0.6 + i;
      ctx.strokeStyle = shade(color, -0.35); ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(tx, y - h); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(tx, y - h); ctx.stroke();
      ctx.strokeStyle = "rgba(90,70,20,0.55)"; ctx.lineWidth = 1;
      for (let k = 1; k <= 3; k++) { const f = k / 4, nx = bx + (tx - bx) * f, ny = y - h * f; ctx.beginPath(); ctx.moveTo(nx - 1.6, ny); ctx.lineTo(nx + 1.6, ny); ctx.stroke(); }
      ctx.strokeStyle = winter ? "#a1887f" : autumn ? "#c0ca33" : leaf; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(tx, y - h); ctx.quadraticCurveTo(tx + 6 + i * 2, y - h - 3, tx + 9 + i * 3, y - h + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, y - h * 0.8); ctx.quadraticCurveTo(tx - 6, y - h * 0.8 - 3, tx - 9, y - h * 0.8 + 6); ctx.stroke();
    }
    return;
  }
  if (look === "pod") {
    /* W.1: نخود و عدس — بوته‌ی کوتاهِ پربرگ با غلاف‌های آویزان */
    const lc = winter ? "#aed581" : leaf;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + seed * 0.7; ellipse(ctx, x + Math.cos(a) * 5 * sc + sw * 0.3, y - 5 * sc - 1 + Math.sin(a) * 2.6 * sc, 2.6 * sc + 0.8, 1.7 * sc + 0.6, i % 2 ? lc : shade(lc, 0.14)); }
    if (g > 0.5) for (let i = 0; i < 4; i++) {
      const px = x + (hash(seed, i + 3) - 0.5) * 11 * sc + sw * 0.3, py = y - 4 * sc - hash(i + 7, seed) * 6 * sc;
      ellipse(ctx, px, py, 2.4 * sc + 0.4, 1.1 * sc + 0.4, ripe ? color : "#c5e1a5");
    }
    return;
  }
  if (look === "vine") {
    /* W.1: خیار و بادمجان — بوته‌ی رونده با برگِ پهن و میوه‌ی کشیده‌ی آویزان */
    ctx.strokeStyle = "#558b2f"; ctx.lineWidth = 1.3;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + i * 5, y - 9 * sc, x + i * 7 * sc + sw * 0.4, y - 13 * sc); ctx.stroke(); }
    const lc = winter ? "#9ccc65" : leaf;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + seed; ellipse(ctx, x + Math.cos(a) * 6 * sc + sw * 0.35, y - 9 * sc + Math.sin(a) * 3.2 * sc, 3.6 * sc + 1, 2.6 * sc + 0.8, i % 2 ? lc : shade(lc, 0.16)); }
    if (g > 0.5) for (let i = 0; i < 3; i++) {
      const fx = x + (i - 1) * 5 * sc + sw * 0.35, fy = y - 5 * sc + (i % 2) * 1.5, L = (ripe ? 4.6 : 3) * sc + 1;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate((i - 1) * 0.35); ellipse(ctx, 0, 0, 1.4 * sc + 0.6, L, ripe ? color : "#9ccc65"); ctx.restore();
    }
    return;
  }
  if (look === "umbel") {
    /* W.1: زیره و کنجد — ساقه‌های باریک با چترِ گل‌های ریز */
    ctx.strokeStyle = winter ? "#9e9d24" : leaf; ctx.lineWidth = 1.1;
    const h = 8 + 16 * sc;
    const tops: [number, number][] = [];
    for (let i = -2; i <= 2; i++) { const tx = x + i * 3 * sc + sw * 0.5, ty = y - h + Math.abs(i) * 2.4 * sc; ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(tx, ty); ctx.stroke(); tops.push([tx, ty]); }
    for (let i = -1; i <= 1; i++) ellipse(ctx, x + i * 3.4, y - 3 * sc, 2.4 * sc + 0.6, 1.2 * sc + 0.4, shade(leaf, 0.1));
    if (g > 0.4) for (const [tx, ty] of tops) for (let k = 0; k < 4; k++) { const a = Math.PI + (k / 3) * Math.PI; ellipse(ctx, tx + Math.cos(a) * 2.2 * sc, ty + Math.sin(a) * 1.2 * sc, sc + 0.5, sc + 0.5, ripe ? color : "#dcedc8"); }
    return;
  }
  // bush
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + seed; ellipse(ctx, x + Math.cos(a) * 6 * sc + sw * 0.3, y - 7 * sc + Math.sin(a) * 3 * sc, 6 * sc + 1, 4.5 * sc + 1, i % 2 ? leaf : shade(leaf, 0.15)); }
  if (g > 0.5) for (let i = 0; i < 5; i++) ellipse(ctx, x + (hash(seed, i + 2) - 0.5) * 14 * sc, y - 6 * sc - hash(i + 5, seed) * 8 * sc, 1.9, 1.9, ripe ? color : shade(color, 0.5));
}
