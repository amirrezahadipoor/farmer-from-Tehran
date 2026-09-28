/**
 * src/game/sound/calm.ts — لایه‌ی آرامش و ASMR (B/T4 — بازخوردِ «بازی آهنگِ آرام نداشت»)
 *
 * دو جزءِ پیوسته و بسیار ملایم روی گذرگاهِ موسیقی (با اسلایدرِ «موسیقی» خاموش/روشن می‌شود):
 *  • پدِ درون: دو نوسان‌سازِ سینوسیِ پایه و پنجمش (اکتاوِ بم) با فیلترِ پایین‌گذر و
 *    نفس‌کشیدنِ آهسته (LFOِ ۰.۰۶ هرتز) — همان حسِ «پس‌زمینه‌ی گرم» بدونِ ملودی.
 *  • جریانِ آب: نویزِ حلقه‌ای از میانِ میان‌گذر و پایین‌گذر — ASMRِ ملایم که در باران و شب پیش می‌آید.
 *
 * هیچ فایلِ صوتیِ جدیدی نیست: نویز از همان بافرِ مشترکِ موتور می‌آید و نتِ پایه از
 * دستگاهِ همان لحظه (degreeFreq) — پس حجمِ مخزن ثابت می‌ماند و دستگاهِ موسیقی هم‌اول است.
 * هر شکستِ WebAudio = سقوطِ نرم (لایه ساخته نمی‌شود؛ بقیه‌ی صدا دست‌نخورده).
 */
import { calmMix, degreeFreq, musicMode, type AmbientEnv } from "./mix";
import type { Ctx } from "./sfx";

/** بهره‌ی نهاییِ اجزا روی گذرگاهِ موسیقی — با اندازه‌گیریِ گوش تنظیم شده (خیلی زیرِ سه‌تار) */
const PAD_GAIN = 0.05;
const STREAM_GAIN = 0.035;

export class CalmLayer {
  private readonly nodes: AudioNode[] = [];
  private readonly sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private readonly params: { p: AudioParam; base: number }[] = [];
  private stopped = false;

  private constructor(
    private readonly ac: Ctx,
    dest: AudioNode,
    noise: AudioBuffer,
    env: AmbientEnv | null,
  ) {
    const t = this.ac.currentTime;
    const out = this.ac.createGain();
    out.gain.value = 1;
    out.connect(dest);

    // ── پدِ درون: پایه + پنجم، فیلترِ گرم، نفسِ آهسته
    const filter = this.ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.4;
    filter.connect(out);

    const padGain = this.ac.createGain();
    padGain.gain.setValueAtTime(0, t);
    padGain.gain.setTargetAtTime(PAD_GAIN, t, 2.5); // ورودِ چهارثانیه‌ای — هیچ‌گاه «می‌پرد» توی گوش
    padGain.connect(filter);
    this.params.push({ p: padGain.gain, base: PAD_GAIN });

    // C/T5: نتِ اولیه از دستگاهِ ماهور (نه ۴۴۰ پیش‌فرض) — تا ثانیه‌ی اول «پرش» شنیدنی نباشد
    const f0 = degreeFreq(musicMode({ hour: 12, season: "spring", weather: "sun" }).mode, -7);
    const root = this.oscOf("sine");
    root.frequency.value = f0;
    const fifth = this.oscOf("sine");
    fifth.frequency.value = f0 * 1.5;
    const rootG = this.ac.createGain();
    rootG.gain.value = 0.6;
    const fifthG = this.ac.createGain();
    fifthG.gain.value = 0.35;
    root.connect(rootG).connect(padGain);
    fifth.connect(fifthG).connect(padGain);
    this.sources.push(root, fifth);

    // نفسِ آهسته: LFO روی بهره‌ی پد (عمقِ ۳۰٪)
    const lfo = this.oscOf("sine");
    lfo.frequency.value = 0.06;
    const lfoG = this.ac.createGain();
    lfoG.gain.value = PAD_GAIN * 0.3;
    lfo.connect(lfoG).connect(padGain.gain);
    this.sources.push(lfo);

    // ── جریانِ آب: نویزِ حلقه‌ای با میان‌گذرِ ~۵۵۰ هرتز
    const src = this.ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const band = this.ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 550;
    band.Q.value = 0.7;
    const low = this.ac.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 1100;
    const streamGain = this.ac.createGain();
    streamGain.gain.setValueAtTime(0, t);
    streamGain.gain.setTargetAtTime(STREAM_GAIN, t, 2.5);
    src.connect(band).connect(low).connect(streamGain).connect(out);
    this.params.push({ p: streamGain.gain, base: STREAM_GAIN });
    this.sources.push(src);

    this.nodes.push(out, filter, padGain, rootG, fifthG, lfoG, band, low, streamGain);
    for (const s of this.sources) s.start(t);

    if (env) this.setEnv(env);
  }

  private oscOf(type: OscillatorType): OscillatorNode {
    const o = this.ac.createOscillator();
    o.type = type;
    return o;
  }

  /** ساختِ ایمن: هر خطایی = بدونِ لایه (سقوطِ نرم) */
  static create(ac: Ctx, dest: AudioNode, noise: AudioBuffer, env: AmbientEnv | null): CalmLayer | null {
    try {
      return new CalmLayer(ac, dest, noise, env);
    } catch {
      return null;
    }
  }

  /** پیروی از حالِ دره: نتِ پایه از دستگاهِ موسیقیِ همان لحظه + شدت‌های calmMix */
  setEnv(e: AmbientEnv) {
    if (this.stopped) return;
    try {
      const t = this.ac.currentTime;
      const f0 = degreeFreq(musicMode(e).mode, -7);
      const oscs = this.sources.filter((x): x is OscillatorNode => typeof (x as OscillatorNode).frequency === "object");
      const [padRoot, padFifth] = oscs;
      padRoot?.frequency.setTargetAtTime(f0, t, 0.8);
      padFifth?.frequency.setTargetAtTime(f0 * 1.5, t, 0.8);
      const mix = calmMix(e);
      for (const { p, base } of this.params) {
        const isStream = base === STREAM_GAIN;
        p.setTargetAtTime(base * (isStream ? mix.stream : mix.pad), t, 1.5);
      }
    } catch {
      /* حالِ تازه اعمال نشد؛ لایه به همان حال می‌ماند */
    }
  }

  /** محوِ دوثانیه‌ای، قطعِ منابع و جداسازیِ گره‌ها (C/T5 — بدونِ نشت) */
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    try {
      const t = this.ac.currentTime;
      for (const n of this.nodes) {
        const g = (n as GainNode).gain;
        if (g && typeof g.setTargetAtTime === "function") g.setTargetAtTime(0.0001, t, 0.5);
      }
      for (const s of this.sources) s.stop(t + 2);
    } catch {
      /* بی‌صدا */
    }
    setTimeout(() => {
      for (const n of [...this.nodes, ...this.sources]) {
        try {
          n.disconnect();
        } catch {
          /* بی‌صدا */
        }
      }
    }, 2300);
  }
}
