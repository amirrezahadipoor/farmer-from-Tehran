/**
 * src/game/photo.ts — V.10: حالتِ عکس
 *
 * عکس دقیقاً همان چیزی است که بازیکن می‌بیند: آسمانِ CSS زیرِ بوم، خودِ بومِ نقشه و لایه‌های
 * رنگیِ صفحه (ستاره، خورشید، ماه، غروب، شب، مه، وینیت) روی یک بومِ خارج از صفحه ترکیب می‌شوند؛
 * HUD و دکمه‌ها در عکس نیستند. یکی از چهار قابِ فصلی (یا بی‌قاب) دورش کشیده می‌شود و PNGِ
 * بی‌واترمارک دانلود یا اشتراک می‌شود. همه‌چیز سمتِ کاربر است: در دموی ایستا (بدونِ API) هم کار
 * می‌کند. تزئینِ قاب با PRNGِ دانه‌دار کشیده می‌شود، پس هر بار یکسان است.
 */
import { fmt } from "./data";

export type FrameId = "spring" | "summer" | "autumn" | "winter" | "none";
type SeasonFrame = Exclude<FrameId, "none">;

const SEASON_IDS = ["spring", "summer", "autumn", "winter"] as const;

export const FRAMES: { id: FrameId; name: string }[] = [
  { id: "spring", name: "بهار" },
  { id: "summer", name: "تابستان" },
  { id: "autumn", name: "پاییز" },
  { id: "winter", name: "زمستان" },
  { id: "none", name: "بی‌قاب" },
];

interface Palette {
  bg: [string, string];
  line: string;
  text: string;
}
export const PALETTES: Record<SeasonFrame, Palette> = {
  spring: { bg: ["#fde4ec", "#e3f4d7"], line: "#b0607e", text: "#6d3a4d" },
  summer: { bg: ["#fff3c4", "#ffd978"], line: "#b7791f", text: "#6b4a12" },
  autumn: { bg: ["#ffd8b0", "#e9a06a"], line: "#9c4a1a", text: "#5d2b0c" },
  winter: { bg: ["#f1f7fd", "#c9dcf0"], line: "#5b7fa6", text: "#2f4a68" },
};
const SEEDS: Record<SeasonFrame, number> = {
  spring: 1403,
  summer: 2718,
  autumn: 3141,
  winter: 4669,
};

const wrap4 = (i: number) => (((Math.floor(i) || 0) % 4) + 4) % 4;

/** قابِ پیش‌فرض: فصلِ جاری */
export const frameForSeason = (seasonIndex: number): FrameId =>
  SEASON_IDS[wrap4(seasonIndex)];

export interface Insets {
  top: number;
  side: number;
  bottom: number;
}
/** حاشیه‌های قاب به پیکسلِ بوم؛ k = پیکسلِ بوم به ازای هر پیکسلِ CSS */
export function frameInsets(frame: FrameId, k: number): Insets {
  if (frame === "none") return { top: 0, side: 0, bottom: 0 };
  return {
    top: Math.round(18 * k),
    side: Math.round(18 * k),
    bottom: Math.round(46 * k),
  };
}

/** نامِ فایلِ ASCII (بی‌فاصله و بی‌حرفِ فارسی تا در همه‌ی سیستم‌عامل‌ها سالم بماند) */
export function photoFileName(day: number, seasonIndex: number): string {
  const d = Number.isFinite(day) && day >= 1 ? Math.floor(day) : 1;
  return `golden-valley-day-${d}-${SEASON_IDS[wrap4(seasonIndex)]}.png`;
}

/** نوشته‌ی پایینِ قاب: نامِ بازیکن و تاریخِ بازی — بی‌نشان و بی‌آدرس، پس واترمارک نیست */
export function photoCaption(
  name: string,
  day: number,
  seasonName: string,
): string {
  const who = (name || "").trim().slice(0, 24);
  const when = `روز ${fmt(Math.max(1, Number.isFinite(day) ? day : 1))}، ${seasonName}`;
  return who ? `${who} — ${when}` : when;
}

/** PRNGِ دانه‌دار (mulberry32) */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── وضعیتِ لایه‌های صفحه ─────────────────────────────────────────────

/** x و y کسری از پهنا و ارتفاعِ نما؛ o شفافیت */
export interface Orb {
  x: number;
  y: number;
  o: number;
}
export interface FxSnap {
  sky: number;
  stars: number;
  dusk: number;
  dark: number;
  fog: number;
  sun: Orb;
  moon: Orb;
}
export type FxQuery = (
  sel: string,
) => { style: { opacity: string; left: string; top: string } } | null;

/** شفافیت‌ها و جایِ خورشید و ماه، همان مقادیری که حلقه‌ی بازی روی لایه‌های data-fx نوشته */
export function readFx(q: FxQuery): FxSnap {
  const op = (k: string) => {
    const v = parseFloat(q(`[data-fx="${k}"]`)?.style.opacity ?? "");
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  };
  const pct = (v: string | undefined, d: number) => {
    const n = parseFloat(v ?? "");
    return (Number.isFinite(n) ? n : d) / 100;
  };
  const orb = (k: string, dx: number, dy: number): Orb => {
    const el = q(`[data-fx="${k}"]`);
    return { x: pct(el?.style.left, dx), y: pct(el?.style.top, dy), o: op(k) };
  };
  return {
    sky: op("sky"),
    stars: op("stars"),
    dusk: op("dusk"),
    dark: op("dark"),
    fog: op("fog"),
    sun: orb("sun", 50, 84),
    moon: orb("moon", 50, 70),
  };
}

export interface Snapshot {
  /** کپیِ بومِ نقشه در لحظه‌ی زدنِ دکمه */
  scene: HTMLCanvasElement;
  /** پیکسلِ بوم به ازای هر پیکسلِ CSS (همان DPRِ حلقه، حداکثر ۲) */
  k: number;
  fx: FxSnap;
  sky: HTMLImageElement | null;
}

/** عکسِ لحظه‌ای از نمای فعلی؛ اگر نقشه هنوز کشیده نشده null */
export function takeSnapshot(doc: Document): Snapshot | null {
  const cv = doc.querySelector<HTMLCanvasElement>("canvas[data-map]");
  if (!cv || !cv.width || !cv.height) return null;
  const scene = doc.createElement("canvas");
  scene.width = cv.width;
  scene.height = cv.height;
  scene.getContext("2d")?.drawImage(cv, 0, 0);
  const k = cv.clientWidth ? cv.width / cv.clientWidth : 1;
  return {
    scene,
    k,
    fx: readFx((sel) => doc.querySelector<HTMLElement>(sel)),
    sky: null,
  };
}

/** تصویرِ آسمان (همان که پشتِ بوم است و در کش مرورگر هست)؛ خطا یعنی گرادیانِ جایگزین */
export function loadSky(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

// ── کشیدن ────────────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function wash(c: Ctx, color: string, o: number, w: number, h: number) {
  if (o <= 0.005) return;
  c.globalAlpha = o;
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  c.globalAlpha = 1;
}

/** همان هفت نقطه‌ی الگوی ۲۶۰×۲۲۰ لایه‌ی ستاره‌ها: x٪، y٪، شعاع (px)، روشنایی */
const STAR_DOTS: [number, number, number, number][] = [
  [18, 22, 1.2, 0.95],
  [62, 12, 1, 0.8],
  [84, 34, 1.4, 0.9],
  [38, 48, 1, 0.7],
  [8, 62, 1.1, 0.75],
  [74, 58, 1, 0.65],
  [48, 8, 1.3, 0.85],
];
function stars(c: Ctx, w: number, h: number, k: number, o: number) {
  const tw = 260 * k;
  const th = 220 * k;
  c.fillStyle = "#fff";
  for (let ty = 0; ty < h; ty += th)
    for (let tx = 0; tx < w; tx += tw)
      for (const [px, py, r, a] of STAR_DOTS) {
        c.globalAlpha = a * o;
        c.beginPath();
        c.arc(tx + (px / 100) * tw, ty + (py / 100) * th, r * k, 0, TAU);
        c.fill();
      }
  c.globalAlpha = 1;
}

/** خورشید یا ماه: هاله (box-shadow) + گویِ گرادیانی (radial-gradient در CSS) */
function orb(
  c: Ctx,
  x: number,
  y: number,
  r: number,
  glow: number,
  cols: [string, string, string],
  hl: [number, number],
  glowRgb: string,
  glowA: number,
  o: number,
) {
  c.globalAlpha = o;
  const g = c.createRadialGradient(x, y, r * 0.5, x, y, r + glow);
  g.addColorStop(0, `rgba(${glowRgb},${glowA})`);
  g.addColorStop(1, `rgba(${glowRgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r + glow, 0, TAU);
  c.fill();
  const hx = x - r + 2 * r * hl[0];
  const hy = y - r + 2 * r * hl[1];
  const b = c.createRadialGradient(hx, hy, 0, hx, hy, r * 1.6);
  b.addColorStop(0, cols[0]);
  b.addColorStop(0.6, cols[1]);
  b.addColorStop(1, cols[2]);
  c.fillStyle = b;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
}

/** صحنه (آسمان + نقشه + لایه‌های صفحه به ترتیبِ DOM) با گوشه‌ی بالا-چپِ (x, y) */
function drawScene(c: Ctx, snap: Snapshot, x: number, y: number) {
  const { scene, k, fx } = snap;
  const w = scene.width;
  const h = scene.height;
  c.save();
  c.translate(x, y);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#64c3eb");
  sky.addColorStop(1, "#1c73af");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  const img = snap.sky;
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight); // bg-cover bg-center
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    c.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }
  wash(c, "rgb(5,15,40)", fx.sky, w, h);
  c.drawImage(scene, 0, 0);
  if (fx.stars > 0.01) stars(c, w, h, k, fx.stars);
  if (fx.sun.o > 0.01)
    orb(
      c,
      fx.sun.x * w,
      fx.sun.y * h,
      28 * k,
      60 * k,
      ["#fff7c0", "#ffd54f", "#ffb300"],
      [0.35, 0.35],
      "255,213,79",
      0.45,
      fx.sun.o,
    );
  if (fx.moon.o > 0.01)
    orb(
      c,
      fx.moon.x * w,
      fx.moon.y * h,
      22 * k,
      40 * k,
      ["#f8fafc", "#cfd8dc", "#90a4ae"],
      [0.62, 0.38],
      "215,235,255",
      0.35,
      fx.moon.o,
    );
  wash(c, "rgb(255,140,60)", fx.dusk, w, h);
  wash(c, "rgb(10,20,60)", fx.dark, w, h);
  if (fx.fog > 0.01) {
    const f = c.createLinearGradient(0, 0, 0, h);
    f.addColorStop(0, "rgba(240,245,255,0.35)");
    f.addColorStop(1, "rgba(230,235,245,0.05)");
    c.globalAlpha = fx.fog;
    c.fillStyle = f;
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 1;
  }
  // وینیت: شفاف تا ۳۵vmin، تا ۸۰vmax تیرگیِ ۴۲٪
  const vmin = Math.min(w, h) / 100;
  const vmax = Math.max(w, h) / 100;
  const v = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 80 * vmax);
  v.addColorStop(Math.min(0.99, (35 * vmin) / (80 * vmax)), "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.42)");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  c.restore();
}

// ── نقش‌مایه‌های قاب (واحد: پیکسلِ CSS؛ مقیاس بیرون اعمال می‌شود) ──────────

function oval(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function blossom(c: Ctx, rnd: () => number) {
  const r = rnd();
  const col = r < 0.45 ? "#f8bbd0" : r < 0.8 ? "#f48fb1" : "#fff5f8";
  c.fillStyle = "#8bc34a";
  oval(c, -7, 5, 5, 2.4, -0.5);
  c.fill();
  oval(c, 7, 5, 5, 2.4, 0.5);
  c.fill();
  c.fillStyle = col;
  c.strokeStyle = "rgba(160,60,100,0.35)";
  c.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    oval(c, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 4.2, 3.2, a);
    c.fill();
    c.stroke();
  }
  c.fillStyle = "#ffd54f";
  c.beginPath();
  c.arc(0, 0, 2.2, 0, TAU);
  c.fill();
}

function sunflower(c: Ctx) {
  c.fillStyle = "#ffca28";
  c.strokeStyle = "rgba(150,90,0,0.4)";
  c.lineWidth = 0.7;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    oval(c, Math.cos(a) * 6, Math.sin(a) * 6, 3.6, 1.8, a);
    c.fill();
    c.stroke();
  }
  c.fillStyle = "#6d4c41";
  c.beginPath();
  c.arc(0, 0, 3.8, 0, TAU);
  c.fill();
  c.fillStyle = "#4e342e";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    c.beginPath();
    c.arc(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0.6, 0, TAU);
    c.fill();
  }
}

function wheat(c: Ctx) {
  c.strokeStyle = "#b8860b";
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(0, 10);
  c.lineTo(0, -9);
  c.stroke();
  c.fillStyle = "#e0b050";
  for (let i = 0; i < 5; i++) {
    const y = -8 + i * 3.4;
    oval(c, -2.2, y, 2.6, 1.3, -0.6);
    c.fill();
    oval(c, 2.2, y, 2.6, 1.3, 0.6);
    c.fill();
  }
}

const AUTUMN = ["#e65100", "#d84315", "#f9a825", "#8d6e63", "#bf360c"];
function leaf(c: Ctx, col: string) {
  c.fillStyle = col;
  c.strokeStyle = "rgba(80,30,0,0.45)";
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(0, -9);
  c.quadraticCurveTo(8, -3, 0, 9);
  c.quadraticCurveTo(-8, -3, 0, -9);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(0, -7);
  c.lineTo(0, 11);
  c.moveTo(0, -1);
  c.lineTo(3.5, -4);
  c.moveTo(0, 2.5);
  c.lineTo(-3.5, -0.5);
  c.stroke();
}

function snowflake(c: Ctx) {
  c.strokeStyle = "#ffffff";
  c.lineWidth = 1.3;
  c.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    // گذرِ اول سایه‌ی آبی زیرِ برف تا روی زمینه‌ی روشن دیده شود
    c.strokeStyle = pass === 0 ? "rgba(70,110,160,0.45)" : "#ffffff";
    c.lineWidth = pass === 0 ? 2.4 : 1.3;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i / 6) * TAU);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -8);
      c.moveTo(0, -4.5);
      c.lineTo(-2.4, -6.6);
      c.moveTo(0, -4.5);
      c.lineTo(2.4, -6.6);
      c.stroke();
      c.restore();
    }
  }
}

function motif(
  c: Ctx,
  f: SeasonFrame,
  x: number,
  y: number,
  s: number,
  rot: number,
  rnd: () => number,
) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  if (f === "spring") blossom(c, rnd);
  else if (f === "summer") {
    if (rnd() < 0.6) sunflower(c);
    else wheat(c);
  } else if (f === "autumn") leaf(c, AUTUMN[Math.floor(rnd() * AUTUMN.length)]);
  else if (rnd() < 0.72) snowflake(c);
  else {
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.beginPath();
    c.arc(0, 0, 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
}

/** جای نقش‌مایه‌ها روی نوارِ قاب؛ وسطِ نوارِ پایین برای نوشته خالی می‌ماند */
export function motifSpots(
  W: number,
  H: number,
  ins: Insets,
  k: number,
  rnd: () => number,
): [number, number][] {
  const pts: [number, number][] = [];
  const step = 34 * k;
  for (let x = ins.side / 2; x < W; x += step)
    pts.push([x + (rnd() - 0.5) * 8 * k, ins.top / 2 + (rnd() - 0.5) * 4 * k]);
  for (let y = ins.top + step * 0.8; y < H - ins.bottom; y += step) {
    pts.push([ins.side / 2 + (rnd() - 0.5) * 4 * k, y]);
    pts.push([W - ins.side / 2 + (rnd() - 0.5) * 4 * k, y]);
  }
  const corner = 64 * k;
  for (let x = ins.side / 2; x < corner; x += step * 0.7) {
    pts.push([x, H - ins.bottom / 2 + (rnd() - 0.5) * 10 * k]);
    pts.push([W - x, H - ins.bottom / 2 + (rnd() - 0.5) * 10 * k]);
  }
  return pts;
}

/**
 * ترکیبِ کامل روی بومِ out: زمینه‌ی قاب + صحنه با گوشه‌ی گرد + نقش‌مایه‌های فصل + نوشته.
 * اندازه‌ی خروجی = بومِ نقشه + حاشیه‌های قاب.
 */
export function composePhoto(
  out: HTMLCanvasElement,
  snap: Snapshot,
  frame: FrameId,
  caption: string,
): HTMLCanvasElement {
  const { k } = snap;
  const ins = frameInsets(frame, k);
  const sw = snap.scene.width;
  const sh = snap.scene.height;
  const W = sw + ins.side * 2;
  const H = sh + ins.top + ins.bottom;
  out.width = W;
  out.height = H;
  const c = out.getContext("2d");
  if (!c) throw new Error("canvas 2d unavailable");
  if (frame === "none") {
    drawScene(c, snap, 0, 0);
    return out;
  }
  const pal = PALETTES[frame];
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, pal.bg[0]);
  bg.addColorStop(1, pal.bg[1]);
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  const r = 12 * k;
  c.save();
  rrect(c, ins.side, ins.top, sw, sh, r);
  c.clip();
  drawScene(c, snap, ins.side, ins.top);
  c.restore();
  c.lineWidth = 2.5 * k;
  c.strokeStyle = pal.line;
  rrect(c, ins.side, ins.top, sw, sh, r);
  c.stroke();
  const rnd = seeded(SEEDS[frame]);
  for (const [x, y] of motifSpots(W, H, ins, k, rnd))
    motif(c, frame, x, y, k * (0.8 + rnd() * 0.45), rnd() * TAU, rnd);
  if (caption) {
    c.fillStyle = pal.text;
    c.font = `bold ${Math.round(15 * k)}px Vazirmatn, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.direction = "rtl";
    c.fillText(
      caption,
      W / 2,
      H - ins.bottom / 2,
      Math.max(40 * k, W - 2 * 72 * k),
    );
  }
  return out;
}

// ── خروجی ────────────────────────────────────────────────────────────

export function canvasToPng(cv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) =>
    cv.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type ShareNav = Navigator & { canShare?: (d: ShareData) => boolean };

/** اشتراکِ فایل (Web Share سطحِ ۲) فقط وقتی مرورگر واقعاً فایل را می‌پذیرد */
export function canShareFiles(): boolean {
  try {
    const nav = navigator as ShareNav;
    return (
      typeof nav.share === "function" &&
      !!nav.canShare?.({
        files: [new File([new Blob()], "x.png", { type: "image/png" })],
      })
    );
  } catch {
    return false;
  }
}

export async function sharePng(
  blob: Blob,
  name: string,
  title: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  const nav = navigator as ShareNav;
  const file = new File([blob], name, { type: "image/png" });
  if (typeof nav.share !== "function" || !nav.canShare?.({ files: [file] }))
    return "unsupported";
  try {
    await nav.share({ files: [file], title });
    return "shared";
  } catch {
    return "cancelled";
  }
}
