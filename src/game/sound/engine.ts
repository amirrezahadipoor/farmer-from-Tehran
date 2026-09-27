/**
 * src/game/sound/engine.ts — موتورِ صدا (P5.12): یک AudioContext، چهار گذرگاه
 * (کل ← جلوه‌ها/موسیقی/محیط) با فشرده‌سازِ ایمنی، زمان‌بندِ پیش‌نگر برای محیط و موسیقی،
 * سقفِ صداهای هم‌زمان و ادغامِ تکرارهای پشتِ‌سرِهم (برداشتِ گروهی ۹ کاشی = یک صدا).
 *
 * مورد ۱۰: صداهای واقعی (samples.ts): جلوه‌ها از فایل، نت‌های موسیقی از سه‌تارِ ضبط‌شده، محیط از چهار بسترِ
 * حلقه‌ای و گاهی میان‌پرده‌ی سه‌گاه. تا رمزگشایی نشده‌اند (یا در مرورگرِ بی‌decodeAudioData) همان سنتزِ قبلی.
 */
import type { SfxKey } from "../logic";
import { Ambience } from "./ambient";
import { ambientMix, busGains, ksSamples, musicMode, type AmbientEnv, type AudioSettings } from "./mix";
import { Music } from "./music";
import { SFX, playVoices, sfxLength, type PlayKit } from "./sfx";
import { SampleBank, nearestSetar, type Fetcher } from "./samples";
import { Interlude, SampleAmbience, bedFiles, nextInterludeGap } from "./beds";
import { BED_SAMPLES, INTERLUDES, SETAR_NOTES, SFX_SAMPLES } from "./samples.gen";
import { rng } from "./mix";

/** نرخِ نمونه‌ی بافرهای زخمه — نصفِ حافظه با کیفیتِ کافی برای سیم */
const PLUCK_SR = 22050;
/** سقفِ صداهای هم‌زمانِ جلوه‌ها */
export const MAX_SFX = 12;
/** بهره‌ی جبرانیِ جلوه‌ها (دستورها با حاشیه‌ی امن نوشته شده‌اند؛ فشرده‌ساز جلوی اوج را می‌گیرد) */
export const SFX_MAKEUP = 2;
/** دو درخواستِ یکسان در کمتر از این فاصله یکی حساب می‌شوند (ثانیه) */
export const SFX_MERGE = 0.045;
/** بلندیِ نتِ ضبط‌شده‌ی سه‌تار نسبت به زخمه‌ی سنتزی */
export const SETAR_GAIN = 0.6;

/** شمارِ فایل‌هایی که بانک پیش از میان‌پرده بارگذاری می‌کند (برای audioDebug و آزمونِ e2e) */
export const SAMPLE_TOTAL =
  Object.values(SFX_SAMPLES).reduce((a, x) => a + x.files.length, 0) + SETAR_NOTES.length + Object.keys(BED_SAMPLES).length;

export class Engine {
  readonly ac: AudioContext;
  private readonly buses: Record<"master" | "sfx" | "music" | "ambient", GainNode>;
  private readonly kit: PlayKit;
  private readonly plucks = new Map<number, AudioBuffer>();
  private amb: Ambience | null = null;
  private sampleAmb: SampleAmbience | null = null;
  private readonly bank: SampleBank | null = null;
  private readonly interlude: Interlude | null = null;
  /** بارگذاریِ فایل‌ها (برای تست قابلِ انتظار) */
  readonly loading: Promise<void> = Promise.resolve();
  private musicClock = 0;
  private lastPump = 0;
  private nextInterlude: number;
  private readonly r = rng(Date.now() & 0xffff);
  private music: Music | null = null;
  private env: AmbientEnv | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly recent = new Map<SfxKey, number>();
  private active: number[] = [];
  private settings: AudioSettings;
  private analyser: AnalyserNode | null = null;

  constructor(AC: new (o?: AudioContextOptions) => AudioContext, s: AudioSettings, opts: { fetcher?: Fetcher } = {}) {
    this.ac = new AC({ latencyHint: "interactive" });
    const ac = this.ac;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 6;
    comp.connect(ac.destination);
    const bus = () => ac.createGain();
    this.buses = { master: bus(), sfx: bus(), music: bus(), ambient: bus() };
    this.buses.master.connect(comp);
    for (const k of ["sfx", "music", "ambient"] as const) this.buses[k].connect(this.buses.master);
    const len = ac.sampleRate * 2;
    const noise = ac.createBuffer(1, len, ac.sampleRate);
    const ch = noise.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    this.kit = { noise, pluck: (f) => this.pluck(f) };
    this.settings = s;
    this.nextInterlude = nextInterludeGap(this.r);
    if (typeof (ac as Partial<BaseAudioContext>).decodeAudioData === "function" && (opts.fetcher || typeof fetch !== "undefined")) {
      this.bank = new SampleBank(ac, opts.fetcher);
      this.interlude = new Interlude(ac, this.buses.music, this.bank);
      // اولویت: جلوه‌ها (کوچک و فوری)، نت‌های سه‌تار، بسترهای محیط؛ میان‌پرده هنگامِ نیاز
      const sfx = Object.values(SFX_SAMPLES).flatMap((x) => x.files);
      this.loading = this.bank.load([...sfx, ...SETAR_NOTES.map((n) => n.file), ...bedFiles()]);
    }
    this.apply(s, true);
  }

  /** بافرِ زخمه روی شبکه‌ی ربع‌اکتاو ساخته و نگه داشته می‌شود؛ کوکِ دقیق با playbackRate */
  private pluck(freq: number): { buffer: AudioBuffer; rate: number; gain?: number; single?: boolean } {
    const bank = this.bank;
    const note = bank ? nearestSetar(freq, (file) => bank.has(file)) : null;
    const sample = note && bank ? bank.get(note.file) : null;
    if (note && sample) return { buffer: sample, rate: freq / note.freq, gain: SETAR_GAIN, single: true };
    const f = Math.min(3000, Math.max(55, freq));
    const base = 110 * Math.pow(2, Math.round(Math.log2(f / 110) * 4) / 4);
    const N = Math.round(PLUCK_SR / base);
    let buf = this.plucks.get(N);
    if (!buf) {
      const dur = Math.min(2.4, Math.max(0.7, 2.4 - Math.log2(base / 200) * 0.45));
      const data = ksSamples(N, PLUCK_SR, dur, 11 + N);
      buf = this.ac.createBuffer(1, data.length, PLUCK_SR);
      buf.getChannelData(0).set(data);
      this.plucks.set(N, buf);
    }
    return { buffer: buf, rate: freq / (PLUCK_SR / N) };
  }

  /** حجم‌ها با محوِ کوتاه اعمال می‌شوند؛ لایه‌ی خاموش اصلاً زمان‌بندی نمی‌شود (باتری) */
  apply(s: AudioSettings, instant = false) {
    this.settings = s;
    const g = busGains(s);
    const t = this.ac.currentTime;
    for (const k of ["master", "sfx", "music", "ambient"] as const) {
      if (instant) this.buses[k].gain.value = g[k];
      else this.buses[k].gain.setTargetAtTime(g[k], t, 0.08);
    }
    const on = s.on && s.master > 0;
    if (on && s.ambient > 0) {
      if (!this.amb && !this.sampleAmb) this.startAmbience();
    } else {
      this.amb?.stop();
      this.amb = null;
      this.sampleAmb?.stop();
      this.sampleAmb = null;
    }
    if (on && s.music > 0) {
      if (!this.music) {
        this.music = new Music(this.ac, this.buses.music, this.kit.pluck);
        if (this.env) this.music.setEnv(musicMode(this.env));
      }
    } else {
      this.music = null;
      this.interlude?.stop();
    }
  }

  /** بسترهای ضبط‌شده اگر رمزگشایی شده‌اند، وگرنه محیطِ سنتزی (بعداً در pump جابه‌جا می‌شود) */
  private startAmbience() {
    if (this.bank && SampleAmbience.ready(this.bank)) {
      this.sampleAmb = new SampleAmbience(this.ac, this.buses.ambient, this.bank);
      if (this.env) this.sampleAmb.set(ambientMix(this.env));
    } else {
      this.amb = new Ambience(this.ac, this.buses.ambient, this.kit.noise);
      if (this.env) this.amb.set(ambientMix(this.env));
    }
  }

  /** یک جلوه؛ false یعنی ادغام یا سقفِ هم‌زمانی مانعش شد */
  sfx(k: SfxKey): boolean {
    const now = this.ac.currentTime;
    if (now - (this.recent.get(k) ?? -1) < SFX_MERGE) return false;
    this.recent.set(k, now);
    this.active = this.active.filter((e) => e > now);
    if (this.active.length >= MAX_SFX) return false;
    const spec = SFX_SAMPLES[k];
    const bank = this.bank;
    const ready = bank ? spec.files.filter((f) => bank.has(f)) : [];
    const buf = ready.length && bank ? bank.get(ready[Math.floor(Math.random() * ready.length)]) : null;
    if (buf) {
      // صدای واقعی: یکی از گونه‌ها با تغییرِ ریزِ زیروبمی تا تکرار خسته‌کننده نباشد
      const src = this.ac.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.06;
      const g = this.ac.createGain();
      g.gain.value = spec.gain;
      src.connect(g).connect(this.buses.sfx);
      src.start(now + 0.005);
      this.active.push(now + buf.duration);
      return true;
    }
    playVoices(this.ac, this.buses.sfx, SFX[k], this.kit, SFX_MAKEUP, 1 + (Math.random() - 0.5) * 0.04);
    this.active.push(now + sfxLength(k));
    return true;
  }

  setEnv(e: AmbientEnv) {
    this.env = e;
    this.amb?.set(ambientMix(e));
    this.sampleAmb?.set(ambientMix(e));
    this.music?.setEnv(musicMode(e));
  }

  /** زمان‌بندِ پیش‌نگر: هر ۲۰۰ میلی‌ثانیه رویدادهای ۶۰۰ میلی‌ثانیه‌ی بعد */
  pump() {
    if (this.ac.state !== "running") return;
    const now = this.ac.currentTime;
    const until = now + 0.6;
    // بسترهای ضبط‌شده که رسیدند، جای محیطِ سنتزی را می‌گیرند
    if (this.amb && this.bank && SampleAmbience.ready(this.bank)) {
      this.amb.stop();
      this.amb = null;
      this.startAmbience();
    }
    this.amb?.schedule(until);
    if (this.music) {
      this.musicClock += Math.min(1, Math.max(0, now - (this.lastPump || now)));
      if (this.musicClock >= this.nextInterlude) this.tryInterlude();
      this.music.schedule(until);
    }
    this.lastPump = now;
  }

  /** میان‌پرده‌ی سه‌تار: اگر فایلش هنوز نیامده، درخواستش می‌دهد و نوبتِ بعد امتحان می‌کند */
  private tryInterlude() {
    const bank = this.bank;
    const it = INTERLUDES[0];
    if (!bank || !this.interlude || !this.music || !it) return;
    if (!bank.has(it.file)) {
      void bank.load([it.file], 1);
      return;
    }
    const end = this.interlude.play(it.file);
    if (end === null) return;
    this.music.holdUntil = end + 3;
    this.nextInterlude = this.musicClock + it.duration + nextInterludeGap(this.r);
  }

  resume() {
    if (this.ac.state === "suspended") void this.ac.resume().catch(() => {});
    if (!this.timer) this.timer = setInterval(() => this.pump(), 200);
  }

  suspend() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ac.state === "running") void this.ac.suspend().catch(() => {});
  }

  /** سطحِ لحظه‌ایِ خروجی (RMS) برای تستِ مرورگر؛ آنالایزر فقط با اولین درخواست وصل می‌شود */
  level(): number {
    if (!this.analyser) {
      this.analyser = this.ac.createAnalyser();
      this.analyser.fftSize = 2048;
      this.buses.master.connect(this.analyser);
    }
    const d = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(d);
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
    return Math.sqrt(sum / d.length);
  }

  get state() {
    return this.ac.state;
  }

  get layers() {
    return {
      ambient: !!this.amb || !!this.sampleAmb,
      music: !!this.music,
      running: !!this.timer,
      /** مورد ۱۰: شمارِ فایل‌های رمزگشایی‌شده و منبعِ هر لایه */
      samples: this.bank?.size ?? 0,
      ambience: this.sampleAmb ? "samples" : this.amb ? "synth" : null,
      pluck: this.bank && SETAR_NOTES.some((n) => this.bank?.has(n.file)) ? "setar" : "synth",
      interlude: !!this.interlude?.playing,
    };
  }
}
