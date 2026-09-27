/**
 * src/game/sound/sfx.ts — دستورِ سنتزِ ۲۹ جلوه‌ی صوتی (P5.12). بدون هیچ فایل صوتی:
 * هر جلوه چند «صدا» است — نوسان‌ساز، نویزِ فیلترشده یا زخمه‌ی سنتوری — با پوشِ دامنه.
 */
import type { SfxKey } from "../logic";

export interface Voice {
  /** شکلِ موج؛ noise = نویزِ سفید از فیلتر، pluck = سیمِ زخمه‌ای */
  w: OscillatorType | "noise" | "pluck";
  /** بسامدِ شروع (برای نویز: بسامدِ فیلتر) */
  f: number;
  /** بسامدِ پایان (سُرِشِ نمایی) */
  to?: number;
  /** شروع نسبت به لحظه‌ی پخش (ثانیه) */
  at?: number;
  /** طول (ثانیه) */
  d: number;
  /** بیشینه‌ی بهره */
  g: number;
  /** زمانِ حمله (ثانیه) */
  a?: number;
  /** نویز: Q فیلترِ میان‌گذر؛ نبودنش = پایین‌گذر */
  q?: number;
  /** نویز: بالاگذر به‌جای پایین‌گذر */
  hp?: boolean;
}

const pl = (f: number, at = 0, g = 0.45, d = 0.9): Voice => ({ w: "pluck", f, at, g, d });
const knock = (at: number): Voice[] => [
  { w: "noise", f: 1300, q: 2.2, at, d: 0.05, g: 0.5 },
  { w: "triangle", f: 230, to: 150, at, d: 0.07, g: 0.28 },
];
/** نت‌های دستگاه شور (با کُرُن) برای موتیفِ پایانِ فصل */
const SHUR = { D: 293.66, Ek: 293.66 * Math.pow(2, 150 / 1200), F: 349.23, G: 392 };

export const SFX: Record<SfxKey, Voice[]> = {
  click: [{ w: "sine", f: 1800, to: 1150, d: 0.045, g: 0.22 }],
  tap: [{ w: "triangle", f: 950, to: 700, d: 0.05, g: 0.18 }],
  err: [
    { w: "square", f: 220, to: 170, d: 0.14, g: 0.08 },
    { w: "square", f: 175, to: 120, at: 0.12, d: 0.2, g: 0.08 },
  ],
  swoosh: [{ w: "noise", f: 900, to: 2600, q: 0.9, d: 0.17, g: 0.1, a: 0.05 }],
  page: [{ w: "noise", f: 3200, to: 1500, q: 0.7, d: 0.2, g: 0.13, a: 0.02 }],
  start: [pl(261.63), pl(329.63, 0.1), pl(392, 0.2), pl(523.25, 0.3, 0.5, 1.4), { w: "sine", f: 130.8, d: 1.6, g: 0.12, a: 0.3 }],

  harvest: [pl(784, 0, 0.5, 0.6), pl(1047, 0.07, 0.45, 0.7), { w: "noise", f: 3000, to: 6000, q: 1.2, d: 0.12, g: 0.1 }],
  plant: [{ w: "sine", f: 190, to: 90, d: 0.12, g: 0.4 }, { w: "noise", f: 2400, q: 2, at: 0.03, d: 0.07, g: 0.12 }],
  water: [
    { w: "sine", f: 480, to: 900, d: 0.07, g: 0.22 },
    { w: "sine", f: 600, to: 1100, at: 0.07, d: 0.07, g: 0.2 },
    { w: "sine", f: 700, to: 1300, at: 0.14, d: 0.08, g: 0.18 },
    { w: "noise", f: 1500, q: 0.8, d: 0.3, g: 0.07, a: 0.04 },
  ],
  fert: [
    { w: "sine", f: 1200, to: 2400, d: 0.25, g: 0.1 },
    { w: "sine", f: 1600, to: 3200, at: 0.06, d: 0.25, g: 0.09 },
    { w: "sine", f: 2000, to: 4000, at: 0.12, d: 0.25, g: 0.08 },
  ],
  dig: [{ w: "noise", f: 420, d: 0.18, g: 0.45 }, { w: "sine", f: 120, to: 60, d: 0.15, g: 0.35 }],
  chop: [...knock(0), { w: "noise", f: 1900, q: 1.5, at: 0.17, d: 0.05, g: 0.45 }, { w: "triangle", f: 280, to: 170, at: 0.17, d: 0.08, g: 0.26 }],
  rock: [{ w: "noise", f: 3200, q: 3, d: 0.04, g: 0.42 }, { w: "sine", f: 900, to: 480, d: 0.07, g: 0.18 }, { w: "noise", f: 700, at: 0.03, d: 0.22, g: 0.3 }],
  build: [...knock(0), ...knock(0.13), ...knock(0.26)],
  demolish: [{ w: "noise", f: 320, d: 0.5, g: 0.45, a: 0.02 }, { w: "sine", f: 95, to: 40, d: 0.45, g: 0.38 }],
  collect: [{ w: "sine", f: 660, to: 880, d: 0.08, g: 0.26 }, pl(1318.5, 0.06, 0.34, 0.5)],

  coin: [{ w: "sine", f: 1976, d: 0.25, g: 0.2 }, { w: "sine", f: 2637, at: 0.06, d: 0.35, g: 0.18 }, { w: "sine", f: 5274, d: 0.08, g: 0.04 }],
  sell: [{ w: "noise", f: 5000, q: 0.7, d: 0.12, g: 0.09 }, { w: "sine", f: 1568, at: 0.05, d: 0.22, g: 0.19 }, { w: "sine", f: 2093, at: 0.12, d: 0.35, g: 0.19 }],
  order: [
    { w: "sine", f: 1047, d: 0.5, g: 0.2 },
    { w: "sine", f: 1319, at: 0.12, d: 0.5, g: 0.18 },
    { w: "sine", f: 1568, at: 0.24, d: 0.8, g: 0.2 },
    { w: "sine", f: 3136, at: 0.24, d: 0.3, g: 0.035 },
  ],
  contract: [pl(523.25), pl(659.25, 0.1), pl(784, 0.2), pl(1046.5, 0.3, 0.5, 1.2)],
  expand: [{ w: "noise", f: 600, to: 3000, q: 0.7, d: 0.5, g: 0.13, a: 0.15 }, pl(392, 0.3), pl(523.25, 0.38), pl(659.25, 0.46), pl(784, 0.54, 0.5, 1.2)],
  hire: [{ w: "sine", f: 880, to: 1175, d: 0.12, g: 0.18 }, { w: "sine", f: 1175, to: 1568, at: 0.15, d: 0.18, g: 0.18 }],

  unlock: [{ w: "sine", f: 400, to: 1600, d: 0.45, g: 0.12, a: 0.1 }, pl(1318.5, 0.4, 0.4, 0.9)],
  skill: [{ w: "triangle", f: 523, to: 1047, d: 0.3, g: 0.13 }, pl(1568, 0.25, 0.32, 0.9)],
  lvl: [pl(523.25), pl(659.25, 0.09), pl(784, 0.18), pl(1046.5, 0.27), pl(1318.5, 0.36, 0.5, 1.3)],
  achievement: [pl(523.25), pl(659.25, 0.08), pl(784, 0.16), pl(1046.5, 0.3, 0.55, 1.5), { w: "sine", f: 2093, at: 0.3, d: 0.6, g: 0.045 }],
  prestige: [
    { w: "sine", f: 130.8, d: 1.8, g: 0.18, a: 0.35 },
    ...[261.63, 329.63, 392, 523.25, 659.25, 784, 1046.5].map((f, i) => pl(f, i * 0.1, 0.42, 1.2)),
  ],
  chapter: [pl(SHUR.G, 0, 0.42, 1), pl(SHUR.F, 0.16, 0.42, 1), pl(SHUR.Ek, 0.32, 0.42, 1), pl(SHUR.D, 0.48, 0.5, 1.6)],
  goal: [pl(587.33, 0, 0.45, 0.8), pl(880, 0.12, 0.45, 1), { w: "sine", f: 1760, at: 0.12, d: 0.3, g: 0.05 }],
};

/** طولِ کلِ یک جلوه (برای محدودکردنِ صداهای هم‌زمان) */
export const sfxLength = (k: SfxKey) => Math.max(...SFX[k].map((v) => (v.at || 0) + v.d));

/** زیرمجموعه‌ای از AudioContext که پخش لازم دارد (تستِ واحد با شبیه‌ساز) */
export type Ctx = Pick<BaseAudioContext, "currentTime" | "sampleRate" | "createOscillator" | "createGain" | "createBiquadFilter" | "createBufferSource">;
export interface PlayKit {
  noise: AudioBuffer;
  /** بافرِ زخمه برای یک بسامد + نرخِ پخشِ لازم برای کوکِ دقیق */
  pluck: (freq: number) => { buffer: AudioBuffer; rate: number; gain?: number; single?: boolean };
}

/** یک جلوه را روی گذرگاهِ dest پخش می‌کند. detune = ضریبِ کوچکِ تصادفی تا تکرار خسته‌کننده نباشد. */
export function playVoices(ac: Ctx, dest: AudioNode, voices: Voice[], kit: PlayKit, gain = 1, detune = 1): number {
  const t0 = ac.currentTime + 0.005;
  let n = 0;
  for (const v of voices) {
    const t = t0 + (v.at || 0);
    const end = t + v.d;
    const g = ac.createGain();
    const peak = Math.max(0.0002, v.g * gain);
    g.connect(dest);
    if (v.w === "pluck") {
      // زخمه پوشِ طبیعیِ خودش را دارد؛ فقط دنباله نرم بسته می‌شود
      const src = ac.createBufferSource();
      const p = kit.pluck(v.f * detune);
      src.buffer = p.buffer;
      src.playbackRate.value = p.rate;
      g.gain.setValueAtTime(peak, t);
      g.gain.setTargetAtTime(0.0001, t + v.d * 0.7, v.d * 0.2);
      src.connect(g);
      src.start(t);
      src.stop(end + v.d * 0.6);
    } else {
      const atk = Math.min(v.a ?? 0.006, v.d * 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      if (v.w === "noise") {
        const src = ac.createBufferSource();
        src.buffer = kit.noise;
        src.loop = true;
        const f = ac.createBiquadFilter();
        f.type = v.hp ? "highpass" : v.q ? "bandpass" : "lowpass";
        f.Q.value = v.q ?? 0.7;
        f.frequency.setValueAtTime(v.f, t);
        if (v.to) f.frequency.exponentialRampToValueAtTime(v.to, end);
        src.connect(f).connect(g);
        src.start(t, Math.random() * 1.5);
        src.stop(end + 0.02);
      } else {
        const o = ac.createOscillator();
        o.type = v.w;
        o.frequency.setValueAtTime(v.f * detune, t);
        if (v.to) o.frequency.exponentialRampToValueAtTime(v.to * detune, end);
        o.connect(g);
        o.start(t);
        o.stop(end + 0.02);
      }
    }
    n++;
  }
  return n;
}
