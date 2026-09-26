/**
 * src/game/sound/ambient.ts — صدای زنده‌ی دره (P5.12): باد و باران از نویزِ فیلترشده،
 * پرنده‌ها (گنجشک، بلبل، هدهد) و جیرجیرکِ شب با سنتزِ رویدادی. شدتِ هر لایه از
 * ambientMix (ساعت، فصل، هوا) می‌آید و با محوِ نرم عوض می‌شود.
 */
import type { AmbientMix } from "./mix";
import type { Ctx } from "./sfx";

interface Bed {
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

export class Ambience {
  private readonly wind: Bed;
  private readonly rain: Bed;
  private mix: AmbientMix = { wind: 0, rain: 0, birds: 0, crickets: 0 };
  private nextBird = 0;
  private nextCricket = 0;
  /** شمارِ رویدادهای زمان‌بندی‌شده (برای تست و اشکال‌زدایی) */
  events = 0;

  constructor(
    private readonly ac: Ctx,
    private readonly dest: AudioNode,
    noise: AudioBuffer,
    private readonly rand: () => number = Math.random,
  ) {
    this.wind = this.bed(noise, "bandpass", 520, 0.6);
    this.rain = this.bed(noise, "bandpass", 2600, 0.35);
  }

  private bed(noise: AudioBuffer, type: BiquadFilterType, f: number, q: number): Bed {
    const src = this.ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = this.ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = f;
    filter.Q.value = q;
    const gain = this.ac.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.dest);
    src.start(0, this.rand() * 1.5);
    return { src, filter, gain };
  }

  /** شدتِ تازه؛ بادِ تند و ملایم با جابه‌جاییِ تصادفیِ فیلتر «وزش» می‌سازد */
  set(mix: AmbientMix) {
    this.mix = mix;
    const t = this.ac.currentTime;
    this.wind.gain.gain.setTargetAtTime(mix.wind * 1.5, t, 1.6);
    this.wind.filter.frequency.setTargetAtTime(340 + this.rand() * 560, t, 2.4);
    this.rain.gain.gain.setTargetAtTime(mix.rain * 0.5, t, 2);
  }

  /** رویدادهای پرنده و جیرجیرک تا لحظه‌ی until زمان‌بندی می‌شوند */
  schedule(until: number) {
    const now = this.ac.currentTime;
    const { birds, crickets } = this.mix;
    if (birds > 0.02) {
      if (this.nextBird < now) this.nextBird = now + 0.3 + this.rand() * 1.2;
      while (this.nextBird < until) {
        this.bird(this.nextBird, birds);
        this.nextBird += (1.4 + this.rand() * 4.5) / (0.35 + birds);
      }
    }
    if (crickets > 0.02) {
      if (this.nextCricket < now) this.nextCricket = now + 0.2;
      while (this.nextCricket < until) {
        this.cricket(this.nextCricket, crickets);
        this.nextCricket += 0.5 + this.rand() * 0.45;
      }
    }
  }

  private bird(t: number, level: number) {
    const r = this.rand();
    if (r < 0.55) this.sparrow(t, level);
    else if (r < 0.85) this.bulbul(t, level);
    else this.hoopoe(t, level);
  }

  /** یک هجای سوتیِ کوتاه با سُرِش؛ fm = لرزشِ بسامد برای آوازِ پیچیده‌تر */
  private chirp(t: number, f0: number, f1: number, d: number, g: number, fmHz = 0, fmDepth = 0) {
    const o = this.ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    const env = this.ac.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + Math.min(0.02, d / 3));
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (fmHz) {
      const m = this.ac.createOscillator();
      const mg = this.ac.createGain();
      m.frequency.value = fmHz;
      mg.gain.value = fmDepth;
      m.connect(mg).connect(o.frequency);
      m.start(t);
      m.stop(t + d + 0.02);
    }
    o.connect(env).connect(this.dest);
    o.start(t);
    o.stop(t + d + 0.02);
    this.events++;
  }

  /** گنجشک: چند جیکِ تندِ نزولی */
  private sparrow(t: number, level: number) {
    const n = 3 + Math.floor(this.rand() * 3);
    const f = 3700 + this.rand() * 900;
    for (let i = 0; i < n; i++) this.chirp(t + i * 0.12, f * (1 - i * 0.03), f * 0.7, 0.07, 0.3 * level);
  }

  /** بلبل: نغمه‌های لرزان و کشیده */
  private bulbul(t: number, level: number) {
    const n = 2 + Math.floor(this.rand() * 3);
    let at = t;
    for (let i = 0; i < n; i++) {
      const f = 2200 + this.rand() * 1200;
      const d = 0.16 + this.rand() * 0.2;
      this.chirp(at, f, f * (0.85 + this.rand() * 0.3), d, 0.25 * level, 35 + this.rand() * 25, 250 + this.rand() * 200);
      at += d + 0.06;
    }
  }

  /** هدهد: «هو-پو-پو»ی بم و نرم */
  private hoopoe(t: number, level: number) {
    for (let i = 0; i < 3; i++) this.chirp(t + i * 0.24, 540, 500, 0.12, 0.35 * level);
  }

  /** جیرجیرک: قطارِ ضربه‌های کوتاه روی یک بسامدِ بالا */
  private cricket(t: number, level: number) {
    const o = this.ac.createOscillator();
    o.type = "sine";
    o.frequency.value = 4500 + this.rand() * 400;
    const env = this.ac.createGain();
    env.gain.setValueAtTime(0, t);
    const pulses = 8 + Math.floor(this.rand() * 5);
    const g = 0.11 * level;
    for (let i = 0; i < pulses; i++) {
      const p = t + i * 0.026;
      env.gain.setValueAtTime(g, p);
      env.gain.setValueAtTime(0, p + 0.012);
    }
    o.connect(env).connect(this.dest);
    o.start(t);
    o.stop(t + pulses * 0.026 + 0.02);
    this.events++;
  }

  stop() {
    for (const b of [this.wind, this.rain]) {
      try {
        b.src.stop();
      } catch {
        /* قبلاً متوقف شده */
      }
      b.gain.disconnect();
    }
  }
}
