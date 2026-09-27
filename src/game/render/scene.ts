/**
 * src/game/render/scene.ts — یک فریم از بازی (P5.14/P6.6)
 *
 * ترتیب روی بومِ شفاف: ابر ← زمین (کش یا مستقیم؛ پرچین هم در کش) + جاندارهای زمین ← نشانگر
 * ← سایه‌ها (یک fill) ← اشیا به ترتیبِ عمق (درخت/سنگ/محصول از اسپرایت، ساختمان، کارگر) ←
 * تابلوی فروش (اسپرایت) ← افکت‌ها ← نورِ شب (اسپرایت) ← ذره‌های هوا (هر نوع در یک مسیر).
 *
 * لایه‌های صفحه‌ای و کم‌تغییر (آسمان، تیرگیِ آسمان، رنگِ غروب و شب، مه، وینیت) از P6.6 لایه‌ی
 * CSS هستند (ui/ScreenLayers.tsx): ترکیبشان کارِ کامپوزیتور است، نه رشته‌ی اصلی، و فقط وقتی
 * مقدارشان واقعاً عوض شود یک بار سبک نوشته می‌شود (applyScreenFx).
 */
import { N, CH, SEASONS, fmt } from "../data";
import { idx, locked, chunkOf, canExpand, expandCost, type Fx, type State, type Tile } from "../logic";
import { drawIcon } from "../icons";
import { A, B, clamp, diamond, ellipse, glowSprite, hash, lightInfo, makeCanvas, sunLight, tileCenter, type View, type Walker } from "./core";
import { GroundLayer, drawGroundAnim, drawGroundTile } from "./ground";
import { drawCropTile, drawRock, drawTree, drawWalker, objectShadow, setSpriteScale, spriteCount } from "./nature";
import { drawBuilding } from "./buildings";
import { drawAmbient, drawSmoke } from "./ambient";

const ground = new GroundLayer();
let waterMask: HTMLCanvasElement | null = null;
export function waterMaskCanvas(): HTMLCanvasElement | null {
  if (waterMask || !ground.water.length) return waterMask;
  waterMask = makeCanvas(256, 128);
  const c = waterMask.getContext("2d")!;
  c.fillStyle = "#fff";
  const S = 12.375;
  for (const wt of ground.water) {
    const mx = (wt.x + 1584) / S, my = (wt.y + 792) / S;
    c.beginPath();
    c.moveTo(mx, my - 22 / S);
    c.lineTo(mx + 44 / S, my);
    c.lineTo(mx, my + 22 / S);
    c.lineTo(mx - 44 / S, my);
    c.closePath();
    c.fill();
  }
  return waterMask;
}
/** کاشی‌های دیده‌شده به ترتیبِ عمق (قطر به قطر)، یک بار در هر فریم؛ آرایه‌ی ازپیش‌ساخته (بی‌زباله) */
const visList = new Int32Array(N * N);
function collectVisible(x0: number, x1: number, y0: number, y1: number) {
  let n = 0;
  const d0 = Math.max(0, Math.ceil((y0 + N * B) / B - 1)), d1 = Math.min(2 * (N - 1), Math.floor((y1 + N * B) / B - 1));
  const e0 = x0 / A, e1 = x1 / A;
  for (let d = d0; d <= d1; d++) {
    const lo = Math.max(0, d - N + 1, Math.ceil((d + e0) / 2)), hi = Math.min(N - 1, d, Math.floor((d + e1) / 2));
    for (let gx = lo; gx <= hi; gx++) visList[n++] = (d - gx) * N + gx;
  }
  return n;
}
/** وضعیتِ کش‌ها برای سنجش و تست (window.__game.perf) */
export const renderStats = () => ({ ...ground.stats, cacheScale: ground.scale, direct: ground.direct, sprites: spriteCount() });

const NO_GLOW = new Set(["sprinkler", "mega_sprinkler", "well", "harvester", "auto_planter", "auto_fertilizer", "composter", "scarecrow", "seesaw", "haystack", "flower_arch", "rock_spring"]);
const TOOL_OK: Record<string, (t: Tile) => boolean> = {
  hoe: (t) => t.k === "grass",
  seed: (t) => t.k === "soil" && !t.crop,
  water: (t) => t.k === "soil" && !t.wet,
  fert: (t) => t.k === "soil" && !t.fert,
  clear: (t) => t.k === "tree" || t.k === "rock" || t.k === "bld" || t.k === "soil",
  hand: (t) => (t.crop !== undefined && (t.g || 0) >= 1) || (t.k === "bld" && (t.out?.length || 0) > 0),
};
const TOOL_COL: Record<string, [string, string]> = {
  hoe: ["217,119,6", "245,158,11"], seed: ["34,197,94", "34,197,94"], water: ["56,189,248", "56,189,248"],
  fert: ["234,179,8", "234,179,8"], clear: ["239,68,68", "239,68,68"], hand: ["16,185,129", "16,185,129"],
};

function drawHover(ctx: CanvasRenderingContext2D, s: State, v: View, now: number) {
  const hv = v.hover!;
  const { x, y } = tileCenter(hv.x, hv.y);
  if (locked(s, hv.x, hv.y)) {
    const c = chunkOf(hv.x, hv.y), cx0 = (c % Math.ceil(N / CH)) * CH, cy0 = Math.floor(c / Math.ceil(N / CH)) * CH;
    ctx.fillStyle = canExpand(s, c) ? "rgba(255,235,59,0.28)" : "rgba(244,67,54,0.22)";
    for (let yy = cy0; yy < cy0 + CH; yy++) for (let xx = cx0; xx < cx0 + CH; xx++) {
      if (yy < N && xx < N) { const p = tileCenter(xx, yy); diamond(ctx, p.x, p.y, A, B); ctx.fill(); }
    }
    return;
  }
  const ht = s.tiles[idx(hv.x, hv.y)];
  const ok = TOOL_OK[v.tool] ? TOOL_OK[v.tool](ht) : true;
  let strokeCol = "rgba(255,255,255,0.85)", fillCol = "rgba(255,255,255,0.18)";
  const col = TOOL_COL[v.tool];
  if (col && ok) { strokeCol = `rgba(${col[0]},0.95)`; fillCol = `rgba(${col[1]},${v.tool === "clear" ? 0.3 : 0.25})`; }
  else if (col && v.tool === "clear") { strokeCol = "rgba(148,163,184,0.5)"; fillCol = "rgba(148,163,184,0.15)"; }
  else if (col && v.tool === "hand") { strokeCol = "rgba(255,255,255,0.7)"; fillCol = "rgba(255,255,255,0.15)"; }
  else if (col) { strokeCol = "rgba(239,68,68,0.75)"; fillCol = "rgba(239,68,68,0.2)"; }
  diamond(ctx, x, y, A, B);
  ctx.fillStyle = fillCol; ctx.fill();
  ctx.strokeStyle = strokeCol; ctx.lineWidth = 3; ctx.stroke();
  // نشانِ ابزار روی کاشی (آیکونِ SVG در حباب)
  const bad = !ok && v.tool !== "build" && v.tool !== "hand";
  const badgeKey = bad ? "ui:close" : v.tool === "seed" && v.arg ? "item:" + v.arg : "ui:" + v.tool;
  const by = y - B - 14 + Math.sin(now * 5) * 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 6;
  ellipse(ctx, x, by, 12, 12, bad ? "#e53935" : "#ffffff");
  ctx.restore();
  drawIcon(ctx, badgeKey, x, by, 17);
}

/** تابلوی «زمین قابل خرید»: اسپرایت با سایه‌ی ازپیش‌کشیده؛ کلید شاملِ آماده‌بودنِ فونت است */
const signs = new Map<string, HTMLCanvasElement>();
function signSprite(cost: string) {
  const fontsReady = typeof document !== "undefined" && document.fonts?.status === "loaded";
  const key = cost + (fontsReady ? "|f" : "");
  let c = signs.get(key);
  if (!c) {
    const S = 2.5;
    c = makeCanvas(120 * S, 56 * S);
    const x = c.getContext("2d")!;
    x.setTransform(S, 0, 0, S, 60 * S, 28 * S); // مبدأ = مرکزِ تابلو
    x.save(); x.shadowColor = "rgba(0,0,0,0.4)"; x.shadowBlur = 10 * S; x.fillStyle = "#fffde7"; x.beginPath(); x.roundRect(-48, -17, 96, 34, 10); x.fill(); x.restore();
    x.strokeStyle = "#f59e0b"; x.lineWidth = 2.5; x.beginPath(); x.roundRect(-48, -17, 96, 34, 10); x.stroke();
    x.fillStyle = "#451a03"; x.font = "bold 11px Vazirmatn, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("زمین قابل خرید", 0, -5);
    x.fillStyle = "#d97706"; x.fillText(cost, 7, 8);
    if (signs.size > 24) signs.clear();
    signs.set(key, c);
  }
  return c;
}

/** جای خورشید/ماه روی قوسِ آسمان (درصدِ صفحه) — خالص و تست‌پذیر (آسمانِ زنده) */
export function skyBodies(p: number) {
  const dayT = (p - 0.25) / 0.5; // ۰..۱ در طولِ روز
  const nightT = ((((p + 0.25) % 1) + 1) % 1) / 0.5; // ۰..۱ در طولِ شب
  const arc = (t: number) => ({
    x: 8 + 84 * t,
    y: 84 - 72 * Math.sin(Math.PI * clamp(t)),
    o: t > 0 && t < 1 ? clamp(Math.sin(Math.PI * t) * 1.5) : 0,
  });
  return { sun: arc(dayT), moon: arc(nightT) };
}

/** مقدارِ لایه‌های CSSِ صفحه برای این لحظه (خالص؛ تست‌پذیر) */
export function screenFx(s: State) {
  const L = lightInfo(s);
  const { sun, moon } = skyBodies(L.p);
  return {
    sky: L.dark * 0.85, dusk: 0.14 * L.dusk, dark: L.dark, fog: s.weather === "fog" ? 1 : 0,
    stars: clamp((L.dark - 0.25) / 0.4),
    sunX: sun.x, sunY: sun.y, sun: sun.o,
    moonX: moon.x, moonY: moon.y, moon: moon.o * clamp((L.dark - 0.08) / 0.3),
  };
}
export type ScreenFx = ReturnType<typeof screenFx>;
/** فقط وقتی مقدارِ گردشده عوض شود سبکِ لایه نوشته می‌شود (بدون محاسبه‌ی سبک در هر فریم).
 *  کلیدهای ساده = شفافیت؛ کلیدهای *X/*Y = جای افقی/عمودیِ همان عنصر (خورشید/ماه). */
export function applyScreenFx(root: ParentNode, fx: ScreenFx) {
  for (const [k, val] of Object.entries(fx)) {
    const base = k.endsWith("X") || k.endsWith("Y") ? k.slice(0, -1) : k;
    const el = root.querySelector<HTMLElement>(`[data-fx="${base}"]`);
    const o = val.toFixed(3);
    if (!el || el.dataset["o" + k] === o) continue;
    el.dataset["o" + k] = o; // روی خودِ عنصر: عنصرِ تازه (سوار شدنِ دوباره) حتماً به‌روز می‌شود
    if (k.endsWith("X")) el.style.left = `${val.toFixed(1)}%`;
    else if (k.endsWith("Y")) el.style.top = `${val.toFixed(1)}%`;
    else el.style.opacity = o;
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State, v: View, now: number, fx: Fx[], walkers: Walker[]) {
  const { w, h, dpr, cam } = v; const L = lightInfo(s);
  const season = SEASONS[s.seasonIndex].id;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // آسمان زیرِ بوم، لایه‌ی CSS است
  // ابرهای کم‌رنگِ پارالاکس (دو مسیر به‌جای ۱۶ fill)
  ctx.setTransform(dpr * cam.z * 0.2, 0, 0, dpr * cam.z * 0.2, dpr * (w / 2 + cam.x * 0.2), dpr * (h / 2 + cam.y * 0.2));
  const c1 = new Path2D(), c2 = new Path2D();
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 360 + now * 10) % 2000) - 1000, cy = -260 + (i % 3) * 30;
    c1.moveTo(cx + 60, cy); c1.ellipse(cx, cy, 60, 22, 0, 0, Math.PI * 2);
    c2.moveTo(cx + 80, cy + 6); c2.ellipse(cx + 30, cy + 6, 50, 18, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fill(c1);
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill(c2);

  const k = dpr * cam.z;
  const sway = k >= 0.9 && v.w >= 700;
  ctx.setTransform(k, 0, 0, k, dpr * (w / 2 + cam.x), dpr * (h / 2 + cam.y));
  const SL = sunLight(L.p, L.e, L.dark);
  const sdx = SL.sdx;
  // مستطیلِ دیده‌شده در مختصاتِ جهان؛ اشیا با حاشیه (بلندیِ ساختمان‌ها)
  const vx0 = (-w / 2 - cam.x) / cam.z, vx1 = (w / 2 - cam.x) / cam.z, vy0 = (-h / 2 - cam.y) / cam.z, vy1 = (h / 2 - cam.y) / cam.z;
  const pad = 150;
  const vis = (px: number, py: number) => px > vx0 - pad && px < vx1 + pad && py > vy0 - pad && py < vy1 + pad;
  const nVis = collectVisible(vx0 - pad, vx1 + pad, vy0 - pad, vy1 + pad);

  // زمین: کشِ یک‌تکه، یا در زومِ نزدیک رسمِ مستقیمِ همان کاشی‌ها
  if (ground.sync(s, k, now)) ground.blit(ctx, vx0 - 2, vy0 - 2, vx1 + 2, vy1 + 2);
  else {
    const snow = s.weather === "snow";
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const c0 = tileCenter(gx, gy);
      if (c0.x > vx0 - A && c0.x < vx1 + A && c0.y > vy0 - B && c0.y < vy1 + B + 12) drawGroundTile(ctx, s, gx, gy, season, snow);
    }
  }
  drawGroundAnim(ctx, ground, now, vx0, vy0, vx1, vy1, sway);
  if (v.hover) drawHover(ctx, s, v, now);

  setSpriteScale(k);
  // سایه‌ی نرم: دو گذار — هاله‌ی بیرونیِ کم‌رنگ + هسته‌ی تیره ≈ فالloffِ گاوسی.
  // هاله یک «سقفِ پسماند» است: فقط در کیفیتِ کامل (dpr نزدیکِ سقف) روشن است؛ در حالتِ
  // تنزل‌یافته‌ی رزولوشنِ خودکار، تک‌گذرِ خطِ پایه می‌ماند (قاعده‌ی ۵۵ فریمِ موبایل)
  const soft = v.w >= 700 && (v.maxDpr ?? 2) - v.dpr < 0.05;
  const shadows = new Path2D();
  const shadowsSoft = soft ? new Path2D() : null;
  for (let n = 0; n < nVis; n++) {
    const i = visList[n], t = s.tiles[i];
    if (t.k !== "tree" && t.k !== "rock") continue;
    const gx = i % N, gy = (i / N) | 0;
    const x = (gx - gy) * A, y = (gx + gy + 1) * B - N * B;
    objectShadow(shadows, t, x, y, sdx);
    if (shadowsSoft) objectShadow(shadowsSoft, t, x, y, sdx, 1.4);
  }
  const shCol = SL.night ? "6,12,26" : "10,20,8";
  if (shadowsSoft) { ctx.fillStyle = `rgba(${shCol},${(SL.alpha * 0.5).toFixed(3)})`; ctx.fill(shadowsSoft); }
  ctx.fillStyle = `rgba(${shCol},${SL.alpha.toFixed(3)})`; ctx.fill(shadows);

  const byTile = new Map<number, Walker[]>();
  for (const wk of walkers) { const key = idx(Math.floor(wk.x), Math.floor(wk.y)); byTile.set(key, [...(byTile.get(key) ?? []), wk]); }
  const sparkle = new Path2D();
  let ripe = false;
  const hv = v.hover;
  {
    for (let n = 0; n < nVis; n++) {
      const i = visList[n], gx = i % N, gy = (i / N) | 0;
      const x = (gx - gy) * A, y = (gx + gy + 1) * B - N * B;
      const t = s.tiles[i];
      if (t.k === "tree") drawTree(ctx, x, y, t.v, sway ? now : -1, season);
      else if (t.k === "rock") drawRock(ctx, x, y, t.v, season === "winter");
      else if (t.crop) { drawCropTile(ctx, t, gx, gy, now, season, sparkle, sway); ripe ||= (t.g || 0) >= 1; }
      else if (t.k === "bld") {
        drawBuilding(ctx, t, x, y, now, L.dark, sdx);
        // V.2: دودِ آرام از دودکشِ خانه/آسیاب/نانوایی (در زومِ خیلی دور خاموش)
        if (k >= 0.5) {
          if (t.b === "house") drawSmoke(ctx, x + 7, y, now, i, 42);
          else if (t.b === "mill") drawSmoke(ctx, x + 8, y, now, i, 74);
          else if (t.b === "bakery") drawSmoke(ctx, x + 6, y, now, i, 48);
        }
      }
      if (hv && hv.x === gx && hv.y === gy && v.tool === "build" && v.arg && !locked(s, gx, gy) && (t.k === "grass" || (t.k === "soil" && !t.crop))) {
        ctx.globalAlpha = 0.65 + 0.15 * Math.sin(now * 4); drawBuilding(ctx, { k: "bld", v: 0, b: v.arg } as Tile, x, y, now, 0, 0, true); ctx.globalAlpha = 1;
      }
      const ws = byTile.get(i);
      if (ws) for (const wk of ws) drawWalker(ctx, wk, now);
    }
  }
  if (ripe) { ctx.fillStyle = `rgba(255,250,200,${0.75 + 0.25 * Math.sin(now * 6)})`; ctx.fill(sparkle); }
  // V.2: پروانه/شب‌تاب/برگ/برگ‌گل/پرنده — تراکم با کیفیتِ خودکارِ دستگاه و زوم
  // (k<۰٫۵ یعنی موجودیت‌ها زیرِ یک پیکسل‌اند یا دستگاه ضعیف است: خاموشِ خودکار)
  drawAmbient(ctx, s, now, k >= 0.9 ? 1 : k >= 0.6 ? 0.6 : k >= 0.5 ? 0.4 : 0);

  // تابلوهای فروشِ زمین
  const NCH = Math.ceil(N / CH);
  for (let c = 0; c < NCH * NCH; c++) {
    if (!canExpand(s, c)) continue;
    const cxi = c % NCH, cyi = Math.floor(c / NCH);
    const p = tileCenter(cxi * CH + CH / 2 - 0.5, cyi * CH + CH / 2 - 0.5);
    if (!vis(p.x, p.y)) continue;
    const bob = Math.sin(now * 2.2 + c) * 3;
    ctx.fillStyle = "#5d4037"; ctx.fillRect(p.x - 2, p.y - 32, 4, 32);
    ctx.drawImage(signSprite(fmt(expandCost(s))), p.x - 60, p.y - 49 + bob - 28, 120, 56);
    drawIcon(ctx, "ui:coin", p.x - 26, p.y - 41 + bob, 13);
  }

  for (const f of fx) {
    const a = clamp(f.life / f.max);
    if (f.kind === "text") {
      ctx.font = "bold 16px Vazirmatn, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = f.text ? ctx.measureText(f.text).width : 0;
      const tx = f.icon ? f.x - 10 : f.x;
      ctx.globalAlpha = a;
      if (f.text) { ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,10,0,0.8)"; ctx.strokeText(f.text, tx, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, tx, f.y); }
      if (f.icon) drawIcon(ctx, f.icon, tx + tw / 2 + 12, f.y, 22);
      ctx.globalAlpha = 1;
    } else if (f.kind === "ring") {
      // V.3: حلقه‌ی ضربه روی کاشی — بیضی ایزومتریکِ رونده
      const rr = 8 + (1 - a) * 22;
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, rr, rr * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a; ellipse(ctx, f.x, f.y, f.kind === "leaf" ? 3.5 : 2.5, f.kind === "leaf" ? 2 : 2.5, f.color); ctx.globalAlpha = 1;
    }
  }

  const hq = v.w >= 700 || (v.maxDpr ?? 2) - v.dpr < 0.05;
  if (L.dark > 0.12 && hq) { // نورِ گرمِ خانه‌ها در شب: یک اسپرایتِ هاله به‌جای گرادیانِ تازه برای هر ساختمان
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = L.dark * 0.6;
    const glow = glowSprite("rgba(255,190,90,1)", "rgba(255,170,70,0)");
    for (let n = 0; n < nVis; n++) {
      const i = visList[n], t = s.tiles[i];
      if (t.k !== "bld" || NO_GLOW.has(t.b!)) continue;
      const x = ((i % N) - ((i / N) | 0)) * A, y = ((i % N) + ((i / N) | 0) + 1) * B - N * B;
      const r = 95 + Math.sin(now * 5 + i) * 4;
      ctx.drawImage(glow, x - r, y - 14 - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  if (L.dusk > 0.02 && !SL.night && hq) {
    const sb = skyBodies(L.p).sun;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = (sb.x / 100) * w, cy = (sb.y / 100) * h;
    const a = 0.13 * L.dusk * sb.o;
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
    gr.addColorStop(0, `rgba(255,158,64,${a.toFixed(3)})`);
    gr.addColorStop(0.45, `rgba(255,120,50,${(a * 0.45).toFixed(3)})`);
    gr.addColorStop(1, "rgba(255,110,40,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
  // ذره‌های هوا در فضای صفحه، هر نوع در یک مسیر؛ تعداد با مساحتِ صفحه مقیاس می‌گیرد و روی
  // دستگاهِ ضعیف (رزولوشنِ خودکار ≤ ۰.۷) کمتر است؛ دانه‌ی برفِ ریز مربع است (رسمِ ارزان‌تر از کمان)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pk = Math.max(0.28, Math.min(1, (w * h) / (390 * 844)));
  const lite = dpr <= 0.7;
  if (v.gpu || v.reduced) {
    // دسترس‌پذیری: با «کاهش حرکت»، فقط ته‌رنگِ هوا می‌ماند
  } else if (s.weather === "rain") {
    ctx.strokeStyle = "rgba(190,225,255,0.5)"; ctx.lineWidth = 1.3; ctx.beginPath();
    const n = Math.round((300 * pk + 40) * (lite ? 0.5 : 1));
    for (let i = 0; i < n; i++) { const rx = (hash(i, 7) * w + now * 80) % w, ry = (hash(7, i) * h + now * 780 * (0.8 + hash(i, i) * 0.4)) % h; ctx.moveTo(rx, ry); ctx.lineTo(rx - 5, ry + 16); }
    ctx.stroke();
  } else if (s.weather === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath();
    const n = Math.round((200 * pk + 32) * (lite ? 0.6 : 1)), sq = dpr <= 1;
    for (let i = 0; i < n; i++) {
      const sx = (hash(i, 11) * w + Math.sin(now + i) * 20) % w, sy = (hash(13, i) * h + now * 70) % h;
      if (sq) ctx.rect(sx - 2.4, sy - 2.4, 4.8, 4.8);
      else { ctx.moveTo(sx + 2.8, sy); ctx.arc(sx, sy, 2.8, 0, Math.PI * 2); }
    }
    ctx.fill();
  } else if (s.weather === "heatwave") {
    ctx.strokeStyle = "rgba(255,180,80,0.12)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 40; i++) { const y = i * 22 + ((now * 20) % 22); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.sin(now + i) * 6); }
    ctx.stroke();
  }
  // مه، رنگِ غروب و شب و وینیت: لایه‌های CSS (applyScreenFx)
}
