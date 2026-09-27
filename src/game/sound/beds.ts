/**
 * src/game/sound/beds.ts — صدای محیطِ ضبط‌شده و میان‌پرده‌ی سه‌تار (نقشه‌ی راه، مورد ۱۰)
 *
 *  • چهار بسترِ حلقه‌ای (پرنده، جیرجیرک، باران، باد) با همان ترکیبِ ساعت/فصل/هوا (ambientMix)؛ هر بستر
 *    از نقطه‌ای تصادفی در حلقه آغاز می‌شود تا هر بار همان ثانیه‌ها شنیده نشود
 *  • میان‌پرده: هر ۸ تا ۱۲ دقیقه‌ی موسیقی، بداهه‌ی سه‌تار در سه‌گاه به‌جای جمله‌های زاینده
 */
import type { AmbientMix } from "./mix";
import type { SampleBank } from "./samples";
import { BED_SAMPLES } from "./samples.gen";

export type BedId = keyof typeof BED_SAMPLES;
export const BED_IDS = Object.keys(BED_SAMPLES) as BedId[];
export const bedFiles = () => BED_IDS.map((b) => BED_SAMPLES[b].file);

type Ctx = Pick<BaseAudioContext, "currentTime" | "createBufferSource" | "createGain">;

export class SampleAmbience {
  private readonly layers = new Map<BedId, { src: AudioBufferSourceNode; gain: GainNode }>();
  private mix: AmbientMix = { wind: 0, rain: 0, birds: 0, crickets: 0 };

  constructor(
    private readonly ac: Ctx,
    private readonly dest: AudioNode,
    private readonly bank: SampleBank,
  ) {}

  static ready(bank: SampleBank) {
    return BED_IDS.every((b) => bank.has(BED_SAMPLES[b].file));
  }

  set(mix: AmbientMix) {
    this.mix = mix;
    const t = this.ac.currentTime;
    for (const b of BED_IDS) {
      if (!this.layers.has(b)) this.start(b);
      this.layers.get(b)?.gain.gain.setTargetAtTime(this.target(b), t, 1.5);
    }
  }

  /** بهره‌ی هدفِ هر بستر (برای تست و اشکال‌زدایی) */
  target(b: BedId) {
    return this.mix[b] * BED_SAMPLES[b].gain;
  }

  private start(b: BedId) {
    const spec = BED_SAMPLES[b];
    const buf = this.bank.get(spec.file);
    if (!buf) return;
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = spec.loopStart;
    src.loopEnd = spec.loopEnd;
    const gain = this.ac.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(this.dest);
    src.start(this.ac.currentTime + 0.05, spec.loopStart + Math.random() * (spec.loopEnd - spec.loopStart));
    this.layers.set(b, { src, gain });
  }

  schedule(_until: number) {
    /* بسترها حلقه‌اند؛ چیزی برای زمان‌بندی نیست */
  }

  stop() {
    const t = this.ac.currentTime;
    for (const { src, gain } of this.layers.values()) {
      gain.gain.setTargetAtTime(0, t, 0.4);
      src.stop(t + 2);
    }
    this.layers.clear();
  }
}

/** فاصله‌ی دو میان‌پرده بر حسبِ ثانیه‌ی پخشِ موسیقی: ۸ تا ۱۲ دقیقه */
export const nextInterludeGap = (r: () => number) => 480 + r() * 240;

export class Interlude {
  private src: AudioBufferSourceNode | null = null;
  endsAt = 0;

  constructor(
    private readonly ac: Ctx,
    private readonly dest: AudioNode,
    private readonly bank: SampleBank,
  ) {}

  get playing() {
    return !!this.src && this.ac.currentTime < this.endsAt;
  }

  /** اگر فایل آماده است پخش می‌کند؛ خروجی = زمانِ پایان (ساعتِ AudioContext) یا null */
  play(file: string, gain = 0.9): number | null {
    const buf = this.bank.get(file);
    if (!buf) return null;
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const g = this.ac.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.dest);
    const t = this.ac.currentTime + 0.1;
    src.start(t);
    this.src = src;
    this.endsAt = t + buf.duration;
    return this.endsAt;
  }

  stop() {
    try {
      this.src?.stop();
    } catch {
      /* شروع نشده بود */
    }
    this.src = null;
    this.endsAt = 0;
  }
}
