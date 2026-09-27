/**
 * src/game/render/buildings.ts — رسمِ ساختمان: پایه + یکی از سه دسته (مزرعه، کارگاه، دکور)
 * + حبابِ «آماده» یا حلقه‌ی پیشرفت. حباب حالا اسپرایتِ ازپیش‌کشیده است: shadowBlur در هر
 * فریم برای هر ساختمانِ آماده، در رندرِ نرم‌افزاری از گران‌ترین فراخوان‌ها بود (P5.14).
 */
import { BMAP } from "../data";
import type { Tile } from "../logic";
import { drawIcon } from "../icons";
import { blitAtlasWorld, resolveAtlas } from "./atlas";
import { A, B, diamond, ellipse, makeCanvas, poly, type BArgs } from "./core";
import { drawFarmBuilding } from "./bFarm";
import { drawCraftBuilding } from "./bCraft";
import { drawDecorBuilding } from "./bDecor";

let bubble: HTMLCanvasElement | null = null;
function bubbleSprite() {
  if (!bubble) {
    const S = 3;
    bubble = makeCanvas(56 * S, 64 * S);
    const c = bubble.getContext("2d")!;
    c.setTransform(S, 0, 0, S, 28 * S, 28 * S);
    c.save();
    c.shadowColor = "rgba(0,0,0,0.35)";
    c.shadowBlur = 8 * S; // shadowBlur با تبدیل بزرگ نمی‌شود
    ellipse(c, 0, 0, 18, 18, "#ffffff");
    c.restore();
    poly(c, [[-6, 13], [6, 13], [0, 22]], "#ffffff");
  }
  return bubble;
}

export function drawBuilding(ctx: CanvasRenderingContext2D, t: Tile, x: number, y: number, now: number, dark: number, sdx: number, ghost = false) {
  const id = t.b!;
  const def = BMAP[id];
  if (!def) return;
  // آرتِ AI (نقشه‌ی راه، فاز C): تصویرِ کامل شاملِ سایه‌ی زمین است؛ نبودش = رسمِ رویه‌ای
  const hit = ghost ? null : resolveAtlas(`b|${id}`);
  if (hit) {
    blitAtlasWorld(ctx, hit, x + sdx * 0.6, y, A * 1.9, 100);
  } else {
    if (!ghost) { diamond(ctx, x + sdx * 0.6, y + 4, A * 0.9, B * 0.9); ctx.fillStyle = "rgba(10,20,8,0.28)"; ctx.fill(); }
    diamond(ctx, x, y, A * 0.94, B * 0.94); ctx.fillStyle = "#b0bec5"; ctx.fill();
    diamond(ctx, x, y, A * 0.88, B * 0.88); ctx.fillStyle = "#d7ccc8"; ctx.fill();
    const p: BArgs = { draw: def.draw, t, id, def, x, y, now, dark, sdx, W: def.wall, R: def.roof };
    if (!drawFarmBuilding(ctx, p) && !drawCraftBuilding(ctx, p)) drawDecorBuilding(ctx, p);
  }
  if (ghost) return;
  const top = y - 100;
  if (t.out && t.out.length) {
    const bob = Math.sin(now * 3.5) * 3;
    ctx.drawImage(bubbleSprite(), x - 28, top + bob - 28, 56, 64);
    drawIcon(ctx, "item:" + t.out[0], x, top + bob + 1, 24);
    if (t.out.length > 1) { ellipse(ctx, x + 13, top - 11 + bob, 8, 8, "#e53935"); ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.fillText(String(t.out.length), x + 13, top - 11 + bob); }
  } else if (t.q && t.q.length && def.recipes.length) {
    const pr = t.p || 0;
    ellipse(ctx, x, top + 8, 14, 14, "rgba(0,0,0,0.55)");
    ctx.strokeStyle = "#76ff03"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, top + 8, 12, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.stroke();
    drawIcon(ctx, "item:" + def.recipes[t.q[0]].out, x, top + 8, 16);
  }
}

/** یک ساختمان وسطِ بومی کوچک (کارت‌های رابط کاربری) */
export function drawBuildingThumb(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, now = 1.2) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / (A * 2.1), h / 120);
  ctx.save();
  ctx.translate(w / 2, h * 0.78);
  ctx.scale(scale, scale);
  diamond(ctx, 0, 0, A * 1.02, B * 1.02); ctx.fillStyle = "#7cb342"; ctx.fill();
  drawBuilding(ctx, { k: "bld", v: 0.5, b: id } as Tile, 0, 0, now, 0, 4, true);
  ctx.restore();
}
