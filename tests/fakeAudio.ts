/**
 * tests/fakeAudio.ts — شبیه‌سازِ کوچکِ AudioContext با decodeAudioData، برای تستِ صداهای واقعی (مورد ۱۰)
 * (tests/audio.test.ts شبیه‌سازِ خودش را بی‌decodeAudioData دارد تا مسیرِ جایگزینِ سنتزی را بسنجد)
 */
export class FakeParam {
  value = 0;
  events: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.events.push(["set", v, t]);
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (!(v > 0)) throw new RangeError("exponential ramp target must be > 0");
    this.events.push(["exp", v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(["lin", v, t]);
    return this;
  }
  setTargetAtTime(v: number, t: number) {
    this.events.push(["target", v, t]);
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
  /** آخرین مقدارِ هدف (برای بسترهای محیط) */
  get lastTarget() {
    const t = this.events.filter((e) => e[0] === "target");
    return t.length ? t[t.length - 1][1] : this.value;
  }
}
export class FakeNode {
  out: FakeNode[] = [];
  kind = "node";
  connect<T>(n: T): T {
    this.out.push(n as unknown as FakeNode);
    return n;
  }
  disconnect() {
    this.out = [];
  }
}
export class FakeGain extends FakeNode {
  kind = "gain";
  gain = new FakeParam();
}
class FakeSource extends FakeNode {
  started: number | null = null;
  offset = 0;
  stopped: number | null = null;
  onended: (() => void) | null = null;
  start(t = 0, offset = 0) {
    if (this.started !== null) throw new Error("InvalidStateError: start twice");
    this.started = t;
    this.offset = offset;
  }
  stop(t = 0) {
    if (this.started === null) throw new Error("InvalidStateError: stop before start");
    this.stopped = t;
  }
}
export class FakeOsc extends FakeSource {
  kind = "osc";
  type = "sine";
  frequency = new FakeParam();
  detune = new FakeParam();
}
export class FakeBuffer {
  data: Float32Array;
  constructor(
    public numberOfChannels: number,
    public length: number,
    public sampleRate: number,
    public url = "",
  ) {
    this.data = new Float32Array(Math.max(1, Math.min(length, 64)));
  }
  get duration() {
    return this.length / this.sampleRate;
  }
  getChannelData() {
    return this.data;
  }
}
export class FakeBufferSource extends FakeSource {
  kind = "buffer";
  buffer: FakeBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new FakeParam();
}
class FakeFilter extends FakeNode {
  kind = "filter";
  type = "lowpass";
  frequency = new FakeParam();
  Q = new FakeParam();
  gain = new FakeParam();
}
class FakeComp extends FakeNode {
  kind = "comp";
  threshold = new FakeParam();
  ratio = new FakeParam();
  knee = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
}
class FakeAnalyser extends FakeNode {
  kind = "analyser";
  fftSize = 2048;
  getFloatTimeDomainData(d: Float32Array) {
    d.fill(0);
  }
}

/** مدتِ ساختگیِ هر فایل از روی مسیرش: بستر ۲۴ ثانیه، میان‌پرده ۴۵، باقی ۱ ثانیه */
const fakeDuration = (url: string) => (url.includes("/amb/") ? 24.3 : url.includes("/music/") ? 45.4 : url.includes("/setar/") ? 3.4 : 0.6);

export class FakeDecodingAC {
  static last: FakeDecodingAC | null = null;
  currentTime = 0;
  sampleRate = 8000;
  state: "running" | "suspended" = "running";
  destination = new FakeNode();
  nodes: FakeNode[] = [];
  constructor() {
    FakeDecodingAC.last = this;
  }
  private add<T extends FakeNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }
  createGain() {
    return this.add(new FakeGain());
  }
  createOscillator() {
    return this.add(new FakeOsc());
  }
  createBufferSource() {
    return this.add(new FakeBufferSource());
  }
  createBiquadFilter() {
    return this.add(new FakeFilter());
  }
  createDynamicsCompressor() {
    return this.add(new FakeComp());
  }
  createAnalyser() {
    return this.add(new FakeAnalyser());
  }
  createBuffer(ch: number, len: number, sr: number) {
    return new FakeBuffer(ch, len, sr);
  }
  async decodeAudioData(data: ArrayBuffer) {
    const url = new TextDecoder().decode(data);
    return new FakeBuffer(1, Math.round(fakeDuration(url) * this.sampleRate), this.sampleRate, url);
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  /** همه‌ی منبع‌های بافری که بافرشان از این پوشه است */
  sources(dir: string) {
    return this.nodes.filter((n): n is FakeBufferSource => n instanceof FakeBufferSource && !!n.buffer?.url.includes(dir));
  }
}

/** «دانلودِ» ساختگی: خودِ نشانی را برمی‌گرداند تا decodeAudioData بداند چه فایلی است */
export const fakeFetcher = async (url: string) => new TextEncoder().encode(url).buffer as ArrayBuffer;
