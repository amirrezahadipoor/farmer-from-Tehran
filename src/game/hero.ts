/**
 * src/game/hero.ts — قهرمان روی نقشه (V.1)
 *
 * آواتارِ بازیکن کنار خانه می‌ایستد و با هر کنشِ ابزار به کاشی هدف می‌رود و
 * انیمیشنِ همان کنش را پخش می‌کند. منطقِ بازی بی‌درنگ می‌ماند (کنش فوری در
 * toolAction) و آواتار فقط «حس» حضور می‌دهد — بدون هیچ تغییری در شبیه‌سازی.
 * وضعیتِ آواتار در سیو ذخیره نمی‌شود؛ هر بار از کنار خانه سر می‌گیرد.
 */
import { locked, type State } from "./logic";
import { rt } from "./store";
import { N } from "./data";

const HERO_SPEED = 4.2; // کاشی در ثانیه — تندتر از کارگرها تا پاسخ‌گو حس شود
const ACT_SECONDS = 0.7;

/** کاشیِ خانه‌ی رحیم (نقطه‌ی آغاز آواتار)؛ اگر نبود، مرکز نقشه */
function homeTile(s: State): { x: number; y: number } {
  for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].b === "house") return { x: i % N, y: Math.floor(i / N) };
  return { x: Math.floor(N / 2), y: Math.floor(N / 2) };
}

/** همگام‌سازی ظاهر با جنسیتِ انتخابی بازیکن */
export function syncHeroLook(s: State) {
  rt.hero.look = s.story.gender;
}

/** فرمان حرکت + کنش: از useCanvasInput پس از هر toolAction موفق صدا زده می‌شود */
export function sendHero(s: State, x: number, y: number, tool: string) {
  const h = rt.hero;
  if (!h.init) {
    const hm = homeTile(s);
    h.x = hm.x + 0.5;
    h.y = hm.y + 1.5;
    h.tx = h.x;
    h.ty = h.y;
    h.init = true;
    h.look = s.story.gender;
  }
  h.tx = x + 0.5;
  h.ty = y + 0.5;
  h.act = tool;
  h.actT = 0; // انیمیشن پس از رسیدن پخش می‌شود
}

/** گامِ هر فریم: رسیدن به هدف، سپس پخشِ کنش */
export function stepHero(s: State | null, dt: number) {
  const h = rt.hero;
  if (!s) return;
  if (!h.init) {
    const hm = homeTile(s);
    h.x = hm.x + 0.5;
    h.y = hm.y + 1.5;
    h.tx = h.x;
    h.ty = h.y;
    h.init = true;
    h.look = s.story.gender;
    return;
  }
  if (h.look !== s.story.gender) h.look = s.story.gender;
  if (h.actT > 0) {
    h.actT -= dt;
    if (h.actT <= 0) {
      h.actT = 0;
      h.act = "";
    }
    return;
  }
  const dx = h.tx - h.x,
    dy = h.ty - h.y,
    d = Math.hypot(dx, dy);
  if (d < 0.06) {
    if (h.act) h.actT = ACT_SECONDS; // رسید: کنش پخش شود
    return;
  }
  const sp = HERO_SPEED * dt;
  h.x += (dx / d) * Math.min(sp, d);
  h.y += (dy / d) * Math.min(sp, d);
  h.face = dx - dy > 0 ? 1 : -1;
  // هرگز وارد آب یا کاشی قفل نشه (مسیر مستقیمِ تزیینی؛ اگر گیر کرد، کنش همان‌جا پخش می‌شود)
  const cx = Math.floor(h.x),
    cy = Math.floor(h.y);
  if (cx < 0 || cy < 0 || cx >= N || cy >= N || locked(s, cx, cy)) {
    h.x -= (dx / d) * Math.min(sp, d);
    h.y -= (dy / d) * Math.min(sp, d);
    if (h.act) h.actT = ACT_SECONDS;
  }
}
