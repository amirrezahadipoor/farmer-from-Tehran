/**
 * src/game/render/flora.ts — درخت و سنگ با نوردهیِ جهت‌دار (فازِ انجینِ آرت)
 *
 * درختِ برگ‌دار: سه لایه‌ی لخته (پشت تیره ← میانه ← جلو روشنِ متمایل به سمتِ نور)؛
 * هر لخته گرادیانِ شعاعیِ با هایلایتِ جابه‌جاشده است تا گویِ نوردهی‌شده به نظر برسد.
 * پاییز: هر لخته رنگِ خود را از پالتِ پاییزی می‌گیرد (تاجِ چندرنگِ طبیعی).
 * درختِ سوزنی: طبقاتِ دندانه‌دار با نیمه‌ی روشن/تیره (نور از چپ-بالا).
 * سنگ: چندوجهیِ با ضلعِ نویزی + گرادیانِ هرِ وجه + ماس و برف.
 * همه‌چیز تعیینی است (اسپرایتِ کش = یک‌بار رسم، بعد drawImage).
 */
import { ellipse, poly, shade } from "./core";
import { pal, vnoise } from "./artlab";

type Ctx = CanvasRenderingContext2D;

/** تنه‌ی درخت: مخروطی، گرادیانِ چپ‌روشن/راست‌تیره، ترکِ تنه و ریشه */
function trunk(ctx: Ctx, x: number, y: number, hgt: number, w: number) {
  const g = ctx.createLinearGradient(x - w, y, x + w, y);
  g.addColorStop(0, "#7a5236"); g.addColorStop(0.55, "#5d4037"); g.addColorStop(1, "#3e2a20");
  poly(ctx, [[x - w * 0.7, y], [x - w * 0.42, y - hgt], [x + w * 0.42, y - hgt], [x + w * 0.7, y]], g);
  ctx.strokeStyle = "rgba(30,18,10,0.35)"; ctx.lineWidth = 0.9;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.35, y - 2);
    ctx.quadraticCurveTo(x + i * w * 0.35 + i, y - hgt * 0.5, x + i * w * 0.3, y - hgt + 2);
    ctx.stroke();
  }
  ellipse(ctx, x - w * 0.8, y - 1, 4.5, 2.2, "rgba(40,24,14,0.5)");
  ellipse(ctx, x + w * 0.8, y - 1, 4.5, 2.2, "rgba(40,24,14,0.5)");
}

/** یک لخته‌ی تاج: گرادیانِ شعاعی با هایلایتِ متمایل به چپ-بالا (جهتِ نور) */
function blob(ctx: Ctx, x: number, y: number, r: number, cLight: string, cMid: string, cDark: string, seed: number) {
  const jx = (vnoise(seed, seed * 1.7) - 0.5) * 3, jy = (vnoise(seed * 1.3, seed) - 0.5) * 3;
  const g = ctx.createRadialGradient(x + jx - r * 0.35, y + jy - r * 0.42, r * 0.12, x + jx, y + jy, r * 1.05);
  g.addColorStop(0, cLight); g.addColorStop(0.62, cMid); g.addColorStop(1, cDark);
  ellipse(ctx, x + jx, y + jy, r, r * 0.92, g);
}

/** تاجِ برگ‌دار با سه لایه‌ی عمق + حاشیه‌ی نور + درخششِ برگ + میوه */
function broadleaf(ctx: Ctx, x: number, y: number, v: number, seasonId: string) {
  const P = pal(seasonId);
  const [l0, l1, l2] = P.leaf;
  const fruit = v > 0.35 && seasonId !== "winter";
  const scale = 0.9 + 0.35 * v;
  // لایه‌ی پشت (میانه-تیره؛ مرکزِ روشن تا تاج غنچه‌نما نشود) — پایینِ تاج با تنه درگیر است
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + v * 6;
    blob(ctx, x + Math.cos(a) * 13 * scale, y - 32 * scale + Math.sin(a) * 7 * scale, (17 + 4 * vnoise(i, v * 9)) * scale, shade(l1, 0.18), l1, l2, v * 100 + i);
  }
  // لایه‌ی میانه
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 1.1;
    const hue = seasonId === "autumn" ? P.autumnHues[i % P.autumnHues.length] : l1;
    blob(ctx, x + Math.cos(a) * 10 * scale, y - 36 * scale + Math.sin(a) * 6 * scale, (13 + 2.5 * vnoise(i + 4, v * 7)) * scale, shade(hue, 0.1), hue, l1, v * 130 + i);
  }
  // لایه‌ی جلو (روشن، متمایل به چپ-بالا = سمتِ نور)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 2.2;
    const hue = seasonId === "autumn" ? P.autumnHues[(i + 2) % P.autumnHues.length] : l0;
    blob(ctx, x - 4 * scale + Math.cos(a) * 8 * scale, y - 40 * scale + Math.sin(a) * 5 * scale, (11 + 2.5 * vnoise(i + 8, v * 5)) * scale, shade(hue, 0.22), hue, l1, v * 160 + i);
  }
  // حفره‌های سایه (عمق) در نیمه‌ی پایین
  for (let i = 0; i < 5; i++) {
    const u = vnoise(v * 7 + i * 3.1, i * 1.9), w2 = vnoise(i * 2.3, v * 9 + i);
    ellipse(ctx, x + (u - 0.5) * 26 * scale, y - 26 * scale + w2 * 9 * scale, 3.4 * scale, 2.4 * scale, "rgba(10,20,6,0.18)");
  }
  // درخششِ برگ: دانه‌های روشنِ ریز (نور از میانِ برگ)
  for (let i = 0; i < 14; i++) {
    const u = vnoise(v * 11 + i * 4.7, i * 3.3), w2 = vnoise(i * 5.1, v * 13 + i * 2.9);
    if (u < 0.4) continue;
    ellipse(ctx, x - 8 * scale + u * 24 * scale, y - 48 * scale + w2 * 20 * scale, 1.1, 0.9, "rgba(255,255,220,0.4)");
  }
  // میوه: نقطه‌ی براق (رنگ + جرقه‌ی سفید)
  if (fruit) {
    for (let i = 0; i < 7; i++) {
      const u = vnoise(v * 17 + i * 6.1, i * 4.1), w2 = vnoise(i * 3.7, v * 19 + i);
      const fx = x + (u - 0.35) * 26 * scale, fy = y - 28 * scale + (w2 - 0.2) * 14 * scale;
      ellipse(ctx, fx, fy, 2.4, 2.4, seasonId === "winter" ? "#cfd8dc" : "#d84315");
      ellipse(ctx, fx - 0.8, fy - 0.9, 0.8, 0.8, "rgba(255,255,255,0.85)");
    }
  }
}

/** تاجِ سوزنی: طبقاتِ دندانه‌دار با دو نیمه (روشن/تیره) + برف */
function conifer(ctx: Ctx, x: number, y: number, v: number, seasonId: string) {
  const P = pal(seasonId);
  const [cL, cD] = P.conifer;
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const y0 = y - 8 - i * 15;
    const w = 25 - i * 5.5, hh = 21;
    const jag = (s: number) => (vnoise(i * 7.1 + s * 3.3, s * 2.1) - 0.5) * 4;
    // نیمه‌ی چپ (روشن)
    poly(ctx, [[x - w / 2, y0], [x + jag(0) * 0.4, y0 - hh * 0.55], [x, y0 - hh], [x, y0]], cL);
    // نیمه‌ی راست (تیره) با دندانه
    poly(ctx, [[x, y0 - hh], [x + w / 2 + jag(1), y0], [x + w * 0.28, y0 - hh * 0.28], [x, y0]], cD);
    // لبه‌ی نوریِ نوک
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y0 - hh); ctx.lineTo(x - w * 0.3, y0 - hh * 0.45); ctx.stroke();
    if (seasonId === "winter") {
      ellipse(ctx, x, y0 - hh + 1, w * 0.3, 2.4, "rgba(255,255,255,0.9)");
    }
  }
  ellipse(ctx, x, y - 1, 6, 2.6, "rgba(20,30,10,0.35)");
}

/** شکلِ کاملِ درخت (برای اسپرایت؛ x,y = پایه) */
export function drawTreeShape(ctx: Ctx, x: number, y: number, v: number, seasonId: string) {
  const isConifer = v > 0.55;
  trunk(ctx, x, y, 30, 4.5);
  if (isConifer) conifer(ctx, x, y - 4, v, seasonId);
  else broadleaf(ctx, x, y - 20, v, seasonId);
}

/** سنگ: چندوجهیِ نویزی + گرادیان + شکاف + ماس/برف */
export function drawRockShape(ctx: Ctx, x: number, y: number, v: number, snow: boolean) {
  const n = 8;
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (13 + 7 * vnoise(i * 3.3, 7.7)) * (1 + 0.18 * Math.cos(a));
    pts.push([x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 0.72]);
  }
  const g = ctx.createLinearGradient(x - 18, y - 16, x + 16, y + 10);
  g.addColorStop(0, "#b8c4cc"); g.addColorStop(0.55, "#7d909c"); g.addColorStop(1, "#4d5d68");
  poly(ctx, pts, g);
  // شکاف‌های وجه
  ctx.strokeStyle = "rgba(30,42,50,0.4)"; ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 4); ctx.lineTo(x + 2, y - 1); ctx.lineTo(x + 13, y - 7);
  ctx.moveTo(x + 2, y - 1); ctx.lineTo(x - 1, y + 8);
  ctx.stroke();
  // وجهِ بالاییِ روشن
  poly(ctx, [[pts[6][0], pts[6][1]], [x, y - 16], [pts[1][0], pts[1][1]]], "rgba(235,242,246,0.5)");
  // ماس
  if (v > 0.5 && !snow) {
    ellipse(ctx, x - 7, y - 9, 6, 3.4, "rgba(90,140,50,0.55)");
    ellipse(ctx, x - 3, y - 11, 3.4, 2, "rgba(120,170,70,0.6)");
  }
  if (snow) {
    ellipse(ctx, x - 1, y - 13, 10.5, 4.6, "rgba(255,255,255,0.95)");
    ellipse(ctx, x - 5, y - 14, 5, 2.6, "rgba(230,240,250,0.9)");
  }
}
