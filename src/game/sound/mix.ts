/**
 * src/game/sound/mix.ts — مدلِ خالصِ صدا (P5.12): تنظیمات، منحنیِ حجم، ترکیبِ صدای محیط،
 * دستگاه‌های موسیقی ایرانی و سازنده‌ی جمله‌ی موسیقی. هیچ وابستگی‌ای به WebAudio ندارد
 * تا کاملاً با Vitest تست شود؛ موتورِ پخش در engine.ts است.
 */
import { readLS, writeLS } from "../persist";

/* ------------------------------------------------------------ تنظیمات */
export interface AudioSettings {
  on: boolean;
  master: number;
  music: number;
  sfx: number;
  ambient: number;
}
export const AUDIO_KEY = "farm_audio";
export const LEGACY_SOUND_KEY = "farm_sound";
export const DEFAULT_AUDIO: AudioSettings = { on: true, master: 0.8, music: 0.6, sfx: 0.8, ambient: 0.6 };
export const VOLUME_KEYS = ["master", "music", "sfx", "ambient"] as const;
export type VolumeKey = (typeof VOLUME_KEYS)[number];

export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function loadAudioSettings(): AudioSettings {
  const out: AudioSettings = { ...DEFAULT_AUDIO };
  const raw = readLS(AUDIO_KEY);
  if (raw) {
    try {
      const d = JSON.parse(raw) as Partial<Record<keyof AudioSettings, unknown>>;
      for (const k of VOLUME_KEYS) if (typeof d[k] === "number") out[k] = clamp01(d[k] as number);
      if (typeof d.on === "boolean") out.on = d.on;
    } catch {
      /* تنظیمِ خراب → پیش‌فرض */
    }
  } else if (readLS(LEGACY_SOUND_KEY) === "0") out.on = false; // کلیدِ قدیمیِ پیش از P5.12
  return out;
}

export function saveAudioSettings(a: AudioSettings) {
  writeLS(AUDIO_KEY, JSON.stringify(a));
  writeLS(LEGACY_SOUND_KEY, a.on ? "1" : "0");
}

/** اسلایدرِ خطی → بهره‌ی ادراکی (توانِ ۲؛ نیمه‌ی اسلایدر ≈ −۱۲ دسی‌بل) */
export const volumeGain = (v: number) => (v <= 0 ? 0 : Math.min(1, v * v));

/**
 * بهره‌ی نهاییِ هر گذرگاه؛ موسیقی کمی زیرِ جلوه‌ها می‌نشیند تا بازخوردِ کار گم نشود.
 * ترازِ درونِ لایه‌ها با اندازه‌گیری در Chromium تنظیم شده (پیش‌فرض‌ها): جلوه‌ی اصلی ≈ −۱۵،
 * موسیقی ≈ −۲۸، باران ≈ −۲۷ و پرنده/جیرجیرک ≈ −۳۰ دسی‌بل RMS روی گذرگاهِ کل.
 */
export function busGains(a: AudioSettings) {
  return {
    master: a.on ? volumeGain(a.master) : 0,
    sfx: volumeGain(a.sfx),
    music: volumeGain(a.music) * 0.9,
    ambient: volumeGain(a.ambient),
  };
}

/* ------------------------------------------------------------ محیط */
export interface AmbientEnv {
  /** ساعتِ بازی ۰..۲۴ (طلوع ۶، غروب ۱۸) */
  hour: number;
  season: string;
  weather: string;
}
export interface AmbientMix {
  wind: number;
  rain: number;
  birds: number;
  crickets: number;
}

/** ارتفاعِ خورشید −۱..۱ — همان فرمولِ نورِ رندر (lightInfo) */
export const sunHeight = (hour: number) => Math.sin((hour / 24 - 0.25) * Math.PI * 2);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const bySeason = (season: string, m: Record<string, number>, d: number) => m[season] ?? d;

/** شدتِ هر لایه‌ی محیطی ۰..۱ از ساعت، فصل و هوا */
export function ambientMix(env: AmbientEnv): AmbientMix {
  const sun = sunHeight(env.hour);
  const day = smooth(-0.05, 0.25, sun);
  const night = 1 - smooth(-0.25, 0.05, sun);
  // اوجِ آوازِ صبحگاهی (و کمی شامگاهی) روی شدتِ پایه‌ی روز
  const dawn = Math.exp(-(((env.hour - 6.5) / 1.2) ** 2));
  const dusk = Math.exp(-(((env.hour - 17.5) / 1.2) ** 2));
  const w = env.weather;
  const birdWeather = w === "rain" ? 0.12 : w === "snow" ? 0.2 : w === "fog" ? 0.5 : w === "heatwave" ? 0.6 : 1;
  const chorus = 0.5 + 0.5 * dawn + 0.25 * dusk;
  const birds = day * bySeason(env.season, { spring: 1, summer: 0.8, autumn: 0.45, winter: 0.12 }, 0.6) * chorus * birdWeather;
  const crickets = night * bySeason(env.season, { spring: 0.35, summer: 1, autumn: 0.65, winter: 0 }, 0.5) * (w === "rain" ? 0.15 : w === "snow" ? 0 : 1);
  const wind =
    bySeason(env.season, { spring: 0.22, summer: 0.15, autumn: 0.4, winter: 0.5 }, 0.25) +
    (w === "snow" ? 0.3 : 0) + (w === "rain" ? 0.15 : 0) + (w === "fog" ? 0.05 : 0) - (w === "heatwave" ? 0.1 : 0) + night * 0.05;
  return { wind: clamp01(wind), rain: w === "rain" ? 1 : 0, birds: clamp01(birds), crickets: clamp01(crickets) };
}

/* ------------------------------------------------------------ موسیقی */
export type ModeId = "mahur" | "shur" | "esfahan" | "chahargah" | "dashti";
/** دستگاه‌ها با فاصله‌ی سِنت از تُنیک — «کُرُن» (ربع‌پرده) واقعاً ۱۵۰ یا ۸۵۰ سنت است، نه تقریبِ غربی */
export const MODES: Record<ModeId, { name: string; tonic: number; cents: number[] }> = {
  mahur: { name: "ماهور", tonic: 261.63, cents: [0, 200, 400, 500, 700, 900, 1100] },
  shur: { name: "شور", tonic: 293.66, cents: [0, 150, 300, 500, 700, 800, 1000] },
  esfahan: { name: "اصفهان", tonic: 220, cents: [0, 200, 300, 500, 700, 850, 1100] },
  chahargah: { name: "چهارگاه", tonic: 246.94, cents: [0, 100, 400, 500, 700, 800, 1100] }, // V.9: حماسیِ سپیده‌دم
  dashti: { name: "دشتی", tonic: 293.66, cents: [0, 100, 300, 500, 700, 800, 1000] }, // V.9: لالاییِ شب
};

/** بسامدِ درجه‌ی deg (۰ = تنیک، ۷ = اکتاوِ بالا، منفی = پایین) */
export function degreeFreq(mode: ModeId, deg: number) {
  const m = MODES[mode];
  const oct = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return m.tonic * Math.pow(2, oct + m.cents[i] / 1200);
}

/** V.9: انتخابِ خالصِ دستگاه از ساعت/فصل/هوا — سپیده‌دم «چهارگاه»، شب «دشتی»، شبِ بارانی «شور» */
export function selectMode(hour: number, season: string, weather = "sun"): ModeId {
  if (hour >= 5 && hour < 8) return "chahargah";
  const night = hour >= 20 || hour < 5;
  if (night) return weather === "rain" || weather === "snow" ? "shur" : "dashti";
  return season === "autumn" || season === "winter" ? "esfahan" : "mahur";
}

const TEMPO: Record<ModeId, number> = { mahur: 72, esfahan: 64, shur: 54, chahargah: 60, dashti: 56 };

/** دستگاه، تمپو و بلندیِ موسیقی از حالِ دره (V.9: پنج دستگاه) */
export function musicMode(env: AmbientEnv): { mode: ModeId; tempo: number; level: number } {
  const mode = selectMode(env.hour, env.season, env.weather);
  const wet = env.weather === "rain" || env.weather === "snow";
  const night = env.hour >= 20 || env.hour < 5;
  const level = night ? (wet ? 0.6 : 0.75) : wet ? 0.8 : 1;
  // B/T4: شب‌ها جمله‌ها کُندتر و خواب‌آلودتر
  return { mode, tempo: Math.round(TEMPO[mode] * (night ? 0.85 : 1)), level };
}

/**
 * شدتِ لایه‌ی آرامش (B/T4): پدِ درونِ گرم و بسترِ «جریانِ آب».
 * شب پد گرم‌تر می‌شود؛ باران/برف جریانِ آب را پیش می‌برد؛ روزِ آفتابی نرم‌ترین حال است.
 * خالص و تست‌پذیر؛ پخش در sound/calm.ts.
 */
export function calmMix(env: AmbientEnv): { pad: number; stream: number } {
  const night = env.hour >= 19 || env.hour < 6;
  const wet = env.weather === "rain" || env.weather === "snow";
  const misty = env.weather === "fog";
  const pad = night ? 1 : misty ? 0.8 : wet ? 0.7 : 0.55;
  const stream = wet ? 1 : misty ? 0.6 : night ? 0.5 : 0.35;
  return { pad, stream };
}

/** تولیدکننده‌ی تصادفیِ قابل‌تکرار (mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(r: () => number, table: [T, number][]): T {
  let x = r() * table.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of table) if ((x -= w) <= 0) return v;
  return table[table.length - 1][0];
}

export interface Note {
  deg: number;
  beats: number;
  vel: number;
  /** «ریز»: تکرارِ تندِ همان نت (تکنیکِ سنتور) */
  riz: number;
}
export const DEG_MIN = -3;
export const DEG_MAX = 10;

/**
 * یک جمله‌ی موسیقی: گامِ تصادفیِ بیشتر پله‌ای روی درجه‌های دستگاه، گاهی «ریز»،
 * و پایان با «فرود» روی تنیک/پنجم — همان منطقِ جمله‌بندیِ ردیف.
 */
export function makePhrase(r: () => number, len = 6 + Math.floor(r() * 7)): Note[] {
  const notes: Note[] = [];
  let deg = r() < 0.6 ? 0 : 4;
  for (let i = 0; i < len; i++) {
    const last = i === len - 1;
    if (last) deg = deg >= 6 ? 7 : deg >= 3 ? 4 : 0;
    const beats = last ? 2 : pick<number>(r, [[0.5, 0.3], [1, 0.45], [1.5, 0.15], [2, 0.1]]);
    const riz = !last && r() < 0.1 ? 3 + Math.floor(r() * 3) : 0;
    notes.push({ deg, beats, vel: Math.min(1, 0.55 + r() * 0.35 + (i === 0 ? 0.1 : 0)), riz });
    const step = pick<number>(r, [[-2, 0.12], [-1, 0.32], [1, 0.3], [2, 0.12], [0, 0.06], [3, 0.04], [-3, 0.04]]);
    deg = Math.max(DEG_MIN, Math.min(DEG_MAX, deg + step));
  }
  return notes;
}

/* ------------------------------------------------------------ سنتز زخمه */
/**
 * نمونه‌های یک سیمِ زخمه‌ای (Karplus–Strong): نویزِ نرم‌شده در حلقه‌ای با طولِ دوره‌ی
 * تناوب؛ میانگین‌گیری هارمونیک‌های بالا را زودتر خاموش می‌کند — رنگِ سنتور/سه‌تار.
 * طولِ حلقه صحیح است؛ کوکِ دقیق با playbackRate در موتور انجام می‌شود.
 */
export function ksSamples(period: number, sampleRate: number, dur: number, seed = 7, bright = 0.55): Float32Array {
  const N = Math.max(2, Math.round(period));
  const len = Math.max(N, Math.floor(sampleRate * dur));
  const out = new Float32Array(len);
  const loop = new Float32Array(N);
  const r = rng(seed);
  let prev = 0;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    prev += bright * (r() * 2 - 1 - prev);
    loop[i] = prev;
    peak = Math.max(peak, Math.abs(prev));
  }
  for (let i = 0; i < N; i++) loop[i] /= peak || 1;
  const freq = sampleRate / N;
  const rho = Math.pow(0.001, 1 / Math.max(1, dur * freq)); // −۶۰ دسی‌بل در انتهای dur
  let p = 0;
  for (let n = 0; n < len; n++) {
    const a = loop[p];
    const b = loop[(p + 1) % N];
    out[n] = a;
    loop[p] = rho * 0.5 * (a + b);
    p = (p + 1) % N;
  }
  const fade = Math.min(len, Math.floor(sampleRate * 0.03));
  for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
  return out;
}
