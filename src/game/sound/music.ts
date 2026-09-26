/**
 * src/game/sound/music.ts — موسیقیِ زاینده با صدای سنتور (P5.12): جمله‌های تازه روی
 * دستگاهِ متناسب با حالِ دره (ماهور/شور/اصفهان)، با واخوانِ بم در آغازِ هر جمله و
 * سکوتِ نفس‌گیر بینِ جمله‌ها. هیچ حلقه‌ی ضبط‌شده‌ای در کار نیست؛ هر بار تازه است.
 */
import { degreeFreq, makePhrase, rng, type ModeId, type Note } from "./mix";
import type { Ctx, PlayKit } from "./sfx";

export class Music {
  private readonly r: () => number;
  private queue: Note[] = [];
  private next = 0;
  private mode: ModeId = "mahur";
  private beat = 60 / 72;
  private level = 1;
  /** شمارِ نت‌های زمان‌بندی‌شده (برای تست) */
  notes = 0;

  constructor(
    private readonly ac: Ctx,
    private readonly dest: AudioNode,
    private readonly pluck: PlayKit["pluck"],
    seed = Date.now() & 0xffff,
  ) {
    this.r = rng(seed);
  }

  setEnv(m: { mode: ModeId; tempo: number; level: number }) {
    this.mode = m.mode;
    this.beat = 60 / m.tempo;
    this.level = m.level;
  }

  get currentMode() {
    return this.mode;
  }

  schedule(until: number) {
    const now = this.ac.currentTime;
    if (this.next < now) this.next = now + 0.25;
    while (this.next < until) {
      if (!this.queue.length) {
        this.queue = makePhrase(this.r);
        this.drone(this.next);
      }
      const n = this.queue.shift()!;
      this.note(n, this.next);
      this.next += n.beats * this.beat;
      if (!this.queue.length) this.next += this.beat * (1.5 + this.r() * 3); // نفسِ بینِ دو جمله
    }
  }

  private note(n: Note, t: number) {
    const f = degreeFreq(this.mode, n.deg);
    if (n.riz) {
      for (let i = 0; i < n.riz; i++) this.play(f, t + i * 0.075, n.vel * (i % 2 ? 0.6 : 0.9), 0.45);
    } else this.play(f, t, n.vel, 1.5);
  }

  /** واخوان: تنیکِ یک اکتاو پایین‌تر + پنجمش */
  private drone(t: number) {
    this.play(degreeFreq(this.mode, -7), t, 0.4, 2.6);
    this.play(degreeFreq(this.mode, -3), t + 0.03, 0.26, 2.6);
  }

  /** یک ضربه‌ی مضراب: دو سیمِ کمی ناکوک مثلِ سیم‌های چهارتاییِ سنتور */
  private play(f: number, t: number, vel: number, d: number) {
    const g = this.ac.createGain();
    const peak = Math.max(0.0002, vel * 1.8 * this.level);
    g.gain.setValueAtTime(peak, t);
    g.gain.setTargetAtTime(0.0001, t + d * 0.75, d * 0.12);
    g.connect(this.dest);
    for (const [mul, amp] of [[1, 1], [1.0025, 0.55]] as const) {
      const p = this.pluck(f * mul);
      const src = this.ac.createBufferSource();
      src.buffer = p.buffer;
      src.playbackRate.value = p.rate;
      if (amp === 1) src.connect(g);
      else {
        const s2 = this.ac.createGain();
        s2.gain.value = amp;
        src.connect(s2).connect(g);
      }
      src.start(t);
      src.stop(t + d + 0.3);
    }
    this.notes++;
  }
}
