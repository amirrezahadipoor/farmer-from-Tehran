/**
 * src/game/juice.ts — حس رضایت (V.3)
 *
 *  • سکه‌های پرنده: پس از فروش/سفارش/قرارداد، چند سکه از میانِ صفحه با شتاب به
 *    قرصِ سکه‌ی HUD می‌روند (هدف با data-coin پیدا می‌شود).
 *  • کاغذرنگی: جشنِ تمام‌صفحه برای سطح/دستاورد/تناسخ با فیزیک ساده.
 *  • لرزشِ ملایم دوربین برای رویدادهای بزرگ (خشکسالی/تناسخ).
 * همه‌ی ذرات در rt.sfx (فضای صفحه) اند و با یک transform جدا رسم می‌شوند.
 */
import { rt, type Sfx } from "./store";

const CONFETTI = ["#ef5350", "#ffca28", "#66bb6a", "#42a5f5", "#ab47bc", "#f06292"];
const GOLD = ["#fdd835", "#fff176", "#ffb300"];

export function shake() {
  rt.shakeT = 0.55;
}

export function celebrate(kind: "level" | "achievement" | "prestige") {
  if (typeof window === "undefined") return;
  const w = window.innerWidth, h = window.innerHeight;
  const n = kind === "prestige" ? 60 : kind === "level" ? 40 : 26;
  const cols = kind === "prestige" ? GOLD : CONFETTI;
  for (let i = 0; i < n; i++) {
    rt.sfx.push({
      kind: "confetti",
      x: w / 2 + (Math.random() - 0.5) * w * 0.7,
      y: h * 0.3 + (Math.random() - 0.5) * h * 0.2,
      vx: (Math.random() - 0.5) * 240,
      vy: -140 - Math.random() * 220,
      tx: 0, ty: 0, t: 0,
      life: 1.3 + Math.random() * 0.9, max: 2.2,
      color: cols[i % cols.length],
      r: 2.5 + Math.random() * 3,
    });
  }
  if (rt.sfx.length > 220) rt.sfx.splice(0, rt.sfx.length - 220);
}

/** سکه‌های پرنده به قرصِ سکه؛ n = تعداد نمادین (سقف ۶) */
export function flyCoins(n: number) {
  if (typeof document === "undefined") return;
  const el = document.querySelector("[data-coin]");
  if (!el) return;
  const r = el.getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < Math.min(6, n); i++) {
    rt.sfx.push({
      kind: "coin",
      x: w / 2 + (Math.random() - 0.5) * 90,
      y: h * 0.55 + (Math.random() - 0.5) * 60,
      vx: 0, vy: 0, tx, ty,
      t: -i * 0.07, // پرتاب پلکانی
      life: 0.8, max: 0.8,
      color: GOLD[i % 3], r: 5,
    });
  }
}

export function stepSfx(dt: number) {
  rt.sfx = rt.sfx.filter((f) => {
    f.t += dt;
    if (f.t < 0) return true; // پرتابِ در صف
    if (f.kind === "coin") {
      f.life -= dt;
      const pull = Math.min(1, dt * 7);
      f.x += (f.tx - f.x) * pull;
      f.y += (f.ty - f.y) * pull - Math.sin((1 - f.life / f.max) * Math.PI) * 2.2;
      return f.life > 0 && Math.hypot(f.tx - f.x, f.ty - f.y) > 6;
    }
    f.life -= dt;
    f.vy += 640 * dt;
    f.vx *= 0.99;
    f.x += f.vx * dt + Math.sin(f.t * 9 + f.r * 7) * 0.7;
    f.y += f.vy * dt;
    return f.life > 0 && f.y < window.innerHeight + 20;
  });
}

export function drawSfx(ctx: CanvasRenderingContext2D, dpr: number) {
  if (!rt.sfx.length) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const f of rt.sfx) {
    if (f.t < 0) continue;
    if (f.kind === "coin") {
      const a = Math.min(1, f.life / 0.25);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#b28704"; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.arc(f.x - 1.5, f.y - 1.5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.min(1, f.life / 0.5);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(Math.sin(f.t * 7 + f.r) * 1.2);
      ctx.fillStyle = f.color;
      ctx.fillRect(-f.r / 2, -f.r / 3, f.r, f.r * 0.66);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}
