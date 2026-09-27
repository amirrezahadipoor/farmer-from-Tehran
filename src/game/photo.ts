/**
 * src/game/photo.ts — V.10: حالتِ عکس
 *
 * عکس دقیقاً همان چیزی است که بازیکن می‌بیند: آسمانِ CSS زیرِ بوم، خودِ بومِ نقشه و لایه‌های
 * رنگیِ صفحه (ستاره، خورشید، ماه، غروب، شب، مه، وینیت) روی یک بومِ خارج از صفحه ترکیب می‌شوند؛
 * HUD و دکمه‌ها در عکس نیستند. یکی از چهار قابِ فصلی (یا بی‌قاب) دورش کشیده می‌شود و PNGِ
 * بی‌واترمارک دانلود یا اشتراک می‌شود. همه‌چیز سمتِ کاربر است: در دموی ایستا (بدونِ API) هم کار
 * می‌کند. تزئینِ قاب با PRNGِ دانه‌دار کشیده می‌شود، پس هر بار یکسان است. کشیدنِ صحنه و
 * نقش‌مایه‌ها در photoDraw.ts است.
 */
import { fmt } from "./data";
import { drawScene, motif, rrect } from "./photoDraw";

export type FrameId = "spring" | "summer" | "autumn" | "winter" | "none";
export type SeasonFrame = Exclude<FrameId, "none">;

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
const SEEDS: Record<SeasonFrame, number> = { spring: 1403, summer: 2718, autumn: 3141, winter: 4669 };

const wrap4 = (i: number) => (((Math.floor(i) || 0) % 4) + 4) % 4;

/** قابِ پیش‌فرض: فصلِ جاری */
export const frameForSeason = (seasonIndex: number): FrameId => SEASON_IDS[wrap4(seasonIndex)];

export interface Insets {
  top: number;
  side: number;
  bottom: number;
}
/** حاشیه‌های قاب به پیکسلِ بوم؛ k = پیکسلِ بوم به ازای هر پیکسلِ CSS */
export function frameInsets(frame: FrameId, k: number): Insets {
  if (frame === "none") return { top: 0, side: 0, bottom: 0 };
  return { top: Math.round(18 * k), side: Math.round(18 * k), bottom: Math.round(46 * k) };
}

/** نامِ فایلِ ASCII (بی‌فاصله و بی‌حرفِ فارسی تا در همه‌ی سیستم‌عامل‌ها سالم بماند) */
export function photoFileName(day: number, seasonIndex: number): string {
  const d = Number.isFinite(day) && day >= 1 ? Math.floor(day) : 1;
  return `golden-valley-day-${d}-${SEASON_IDS[wrap4(seasonIndex)]}.png`;
}

/** نوشته‌ی پایینِ قاب: نامِ بازیکن و تاریخِ بازی — بی‌نشان و بی‌آدرس، پس واترمارک نیست */
export function photoCaption(name: string, day: number, seasonName: string): string {
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
export type FxQuery = (sel: string) => { style: { opacity: string; left: string; top: string } } | null;

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
  return { sky: op("sky"), stars: op("stars"), dusk: op("dusk"), dark: op("dark"), fog: op("fog"), sun: orb("sun", 50, 84), moon: orb("moon", 50, 70) };
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
  return { scene, k, fx: readFx((sel) => doc.querySelector<HTMLElement>(sel)), sky: null };
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

/** جای نقش‌مایه‌ها روی نوارِ قاب؛ وسطِ نوارِ پایین برای نوشته خالی می‌ماند */
export function motifSpots(W: number, H: number, ins: Insets, k: number, rnd: () => number): [number, number][] {
  const pts: [number, number][] = [];
  const step = 34 * k;
  for (let x = ins.side / 2; x < W; x += step) pts.push([x + (rnd() - 0.5) * 8 * k, ins.top / 2 + (rnd() - 0.5) * 4 * k]);
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
export function composePhoto(out: HTMLCanvasElement, snap: Snapshot, frame: FrameId, caption: string): HTMLCanvasElement {
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
  for (const [x, y] of motifSpots(W, H, ins, k, rnd)) motif(c, frame, x, y, k * (0.8 + rnd() * 0.45), rnd() * Math.PI * 2, rnd);
  if (caption) {
    c.fillStyle = pal.text;
    c.font = `bold ${Math.round(15 * k)}px Vazirmatn, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.direction = "rtl";
    c.fillText(caption, W / 2, H - ins.bottom / 2, Math.max(40 * k, W - 2 * 72 * k));
  }
  return out;
}

// ── خروجی ────────────────────────────────────────────────────────────

export function canvasToPng(cv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
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
    return typeof nav.share === "function" && !!nav.canShare?.({ files: [new File([new Blob()], "x.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

export async function sharePng(blob: Blob, name: string, title: string): Promise<"shared" | "cancelled" | "unsupported"> {
  const nav = navigator as ShareNav;
  const file = new File([blob], name, { type: "image/png" });
  if (typeof nav.share !== "function" || !nav.canShare?.({ files: [file] })) return "unsupported";
  try {
    await nav.share({ files: [file], title });
    return "shared";
  } catch {
    return "cancelled";
  }
}
