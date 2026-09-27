import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_AUDIO,
  AUDIO_KEY,
  DEG_MAX,
  DEG_MIN,
  MODES,
  ambientMix,
  busGains,
  degreeFreq,
  ksSamples,
  loadAudioSettings,
  makePhrase,
  musicMode,
  rng,
  saveAudioSettings,
  volumeGain,
} from "../src/game/sound/mix";
import { SFX, playVoices, sfxLength, type Ctx } from "../src/game/sound/sfx";
import { Engine, MAX_SFX, SFX_MERGE } from "../src/game/sound/engine";
import { Ambience } from "../src/game/sound/ambient";
import { Music } from "../src/game/sound/music";
import { SFX_KEYS, newState } from "../src/game/logic";
import { soundEnv } from "../src/game/loop";

/**
 * P5.12 — موتور صدا با یک AudioContextِ شبیه‌سازی‌شده سنجیده می‌شود: هر گره‌ای که ساخته
 * می‌شود ثبت می‌شود و خطاهای واقعیِ WebAudio (رمپِ نمایی به صفر، دوبار start) پرتاب می‌شوند.
 */

/* ------------------------------------------------------------ شبیه‌ساز WebAudio */
class FakeParam {
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
  setTargetAtTime(v: number, t: number) {
    this.events.push(["target", v, t]);
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}
class FakeNode {
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
class FakeGain extends FakeNode {
  kind = "gain";
  gain = new FakeParam();
}
class FakeSource extends FakeNode {
  started: number | null = null;
  stopped: number | null = null;
  start(t = 0) {
    if (this.started !== null) throw new Error("InvalidStateError: start twice");
    this.started = t;
  }
  stop(t = 0) {
    if (this.started === null) throw new Error("InvalidStateError: stop before start");
    this.stopped = t;
  }
}
class FakeOsc extends FakeSource {
  kind = "osc";
  type = "sine";
  frequency = new FakeParam();
}
class FakeBufferSource extends FakeSource {
  kind = "buffer";
  buffer: FakeBuffer | null = null;
  loop = false;
  playbackRate = new FakeParam();
}
class FakeFilter extends FakeNode {
  kind = "filter";
  type = "lowpass";
  frequency = new FakeParam();
  Q = new FakeParam();
}
class FakeComp extends FakeNode {
  threshold = new FakeParam();
  ratio = new FakeParam();
}
class FakeAnalyser extends FakeNode {
  kind = "analyser";
  fftSize = 32;
  getFloatTimeDomainData(d: Float32Array) {
    d.fill(0.5);
  }
}
class FakeBuffer {
  data: Float32Array;
  constructor(
    public numberOfChannels: number,
    public length: number,
    public sampleRate: number,
  ) {
    this.data = new Float32Array(length);
  }
  getChannelData() {
    return this.data;
  }
}
class FakeAC {
  static instances: FakeAC[] = [];
  currentTime = 0;
  sampleRate = 8000; // کوچک تا تست سریع بماند
  state: "running" | "suspended" = "running";
  destination = new FakeNode();
  nodes: FakeNode[] = [];
  constructor() {
    FakeAC.instances.push(this);
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
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  of<K extends string>(kind: K) {
    return this.nodes.filter((n) => n.kind === kind);
  }
}
const AC = FakeAC as unknown as new () => AudioContext;
const asCtx = (a: FakeAC) => a as unknown as Ctx;

/* ------------------------------------------------------------ localStorage */
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  FakeAC.instances.length = 0;
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("تنظیمات صدا", () => {
  it("پیش‌فرض، کلیدِ قدیمی، دادهِ خراب و مقدارِ بیرون از بازه", () => {
    expect(loadAudioSettings()).toEqual(DEFAULT_AUDIO);
    store.set("farm_sound", "0");
    expect(loadAudioSettings().on).toBe(false);
    store.set(AUDIO_KEY, "{not json");
    expect(loadAudioSettings()).toEqual({ ...DEFAULT_AUDIO });
    store.set(AUDIO_KEY, JSON.stringify({ on: false, master: 3, music: -1, sfx: 0.3, ambient: "x" }));
    expect(loadAudioSettings()).toEqual({ on: false, master: 1, music: 0, sfx: 0.3, ambient: DEFAULT_AUDIO.ambient });
  });
  it("ذخیره و بازخوانی رفت‌وبرگشتی است و کلیدِ قدیمی هم هم‌گام می‌ماند", () => {
    const a = { on: true, master: 0.55, music: 0.2, sfx: 0.9, ambient: 0 };
    saveAudioSettings(a);
    expect(loadAudioSettings()).toEqual(a);
    expect(store.get("farm_sound")).toBe("1");
  });
  it("منحنیِ ادراکی و گذرگاه‌ها", () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(0.5)).toBeCloseTo(0.25);
    expect(volumeGain(1)).toBe(1);
    for (let v = 0.05; v < 1; v += 0.05) expect(volumeGain(v + 0.05)).toBeGreaterThan(volumeGain(v));
    expect(busGains({ ...DEFAULT_AUDIO, on: false }).master).toBe(0);
    const g = busGains({ ...DEFAULT_AUDIO, music: 1, sfx: 1, ambient: 1 });
    expect(g.music).toBeLessThan(g.sfx); // موسیقی زیرِ بازخوردِ کار می‌نشیند
    expect(g.ambient).toBeLessThanOrEqual(g.sfx);
  });
});

describe("صدای محیط از ساعت، فصل و هوا", () => {
  it("باران لایه‌ی باران را کامل می‌کند و پرنده‌ها را ساکت", () => {
    const dry = ambientMix({ hour: 10, season: "spring", weather: "clear" });
    const wet = ambientMix({ hour: 10, season: "spring", weather: "rain" });
    expect(wet.rain).toBe(1);
    expect(dry.rain).toBe(0);
    expect(wet.birds).toBeLessThan(dry.birds * 0.3);
  });
  it("جیرجیرکِ شبِ تابستان، نه روز و نه زمستان", () => {
    expect(ambientMix({ hour: 1, season: "summer", weather: "clear" }).crickets).toBeGreaterThan(0.8);
    expect(ambientMix({ hour: 12, season: "summer", weather: "clear" }).crickets).toBe(0);
    expect(ambientMix({ hour: 1, season: "winter", weather: "clear" }).crickets).toBe(0);
    expect(ambientMix({ hour: 1, season: "summer", weather: "clear" }).birds).toBe(0);
  });
  it("آوازِ صبحگاهی از ظهر پرشورتر است و زمستان کم‌پرنده", () => {
    const dawn = ambientMix({ hour: 7, season: "spring", weather: "clear" }).birds;
    const noon = ambientMix({ hour: 12, season: "spring", weather: "clear" }).birds;
    expect(dawn).toBeGreaterThan(noon);
    expect(ambientMix({ hour: 12, season: "winter", weather: "clear" }).birds).toBeLessThan(noon * 0.3);
  });
  it("باد در زمستان و برف تندتر از تابستان", () => {
    const summer = ambientMix({ hour: 12, season: "summer", weather: "clear" }).wind;
    const snow = ambientMix({ hour: 12, season: "winter", weather: "snow" }).wind;
    expect(snow).toBeGreaterThan(summer * 2);
    expect(snow).toBeLessThanOrEqual(1);
  });
  it("soundEnv ساعت/فصل/هوا را از وضعیتِ بازی می‌خواند", () => {
    const s = newState();
    s.time = 60; // ربعِ روز = ساعت ۶
    s.seasonIndex = 2;
    s.weather = "rain";
    expect(soundEnv(s)).toEqual({ hour: 6, season: "autumn", weather: "rain" });
  });
});

describe("موسیقی: دستگاه‌های ایرانی و جمله‌بندی", () => {
  it("کُرُنِ شور واقعاً ربع‌پرده است و اکتاو دو برابر", () => {
    const r = degreeFreq("shur", 1) / degreeFreq("shur", 0);
    expect(r).toBeCloseTo(Math.pow(2, 150 / 1200), 6);
    for (const m of Object.keys(MODES) as (keyof typeof MODES)[]) {
      expect(degreeFreq(m, 7)).toBeCloseTo(degreeFreq(m, 0) * 2, 6);
      expect(degreeFreq(m, -7)).toBeCloseTo(degreeFreq(m, 0) / 2, 6);
      expect(MODES[m].cents).toHaveLength(7);
    }
    expect(MODES.esfahan.cents[5] % 100).toBe(50); // کُرُنِ درجه‌ی ششم اصفهان
  });
  it("دستگاه از حالِ دره: شب شور، پاییز اصفهان، بهار ماهور", () => {
    expect(musicMode({ hour: 1, season: "spring", weather: "clear" }).mode).toBe("shur");
    expect(musicMode({ hour: 12, season: "autumn", weather: "clear" }).mode).toBe("esfahan");
    expect(musicMode({ hour: 12, season: "spring", weather: "clear" }).mode).toBe("mahur");
    expect(musicMode({ hour: 1, season: "spring", weather: "clear" }).tempo).toBeLessThan(musicMode({ hour: 12, season: "spring", weather: "clear" }).tempo);
  });
  it("۳۰۰ جمله: درون بازه، پایان با فرود روی تنیک/پنجم، ریز فقط وسطِ جمله", () => {
    const r = rng(42);
    for (let k = 0; k < 300; k++) {
      const p = makePhrase(r);
      expect(p.length).toBeGreaterThanOrEqual(6);
      expect(p.length).toBeLessThanOrEqual(12);
      for (const n of p) {
        expect(n.deg).toBeGreaterThanOrEqual(DEG_MIN);
        expect(n.deg).toBeLessThanOrEqual(DEG_MAX);
        expect(n.vel).toBeGreaterThan(0);
        expect(n.vel).toBeLessThanOrEqual(1);
      }
      const last = p[p.length - 1];
      expect([0, 4, 7]).toContain(last.deg);
      expect(last.beats).toBe(2);
      expect(last.riz).toBe(0);
    }
  });
  it("تصادفِ قابل‌تکرار: یک بذر = یک جمله", () => {
    expect(makePhrase(rng(7))).toEqual(makePhrase(rng(7)));
    expect(makePhrase(rng(7))).not.toEqual(makePhrase(rng(8)));
  });
  it("زخمه‌ی Karplus–Strong: صدادار، محدود، میرا و متناوب با دوره‌ی N", () => {
    const N = 40;
    const x = ksSamples(N, 8000, 1.2);
    const peak = Math.max(...Array.from(x, Math.abs));
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThanOrEqual(1);
    const energy = (a: number, b: number) => x.slice(a, b).reduce((s, v) => s + v * v, 0);
    expect(energy(x.length - 900, x.length)).toBeLessThan(energy(0, 900) * 0.02);
    const corr = (lag: number) => {
      let s = 0;
      for (let i = 400; i < 2400; i++) s += x[i] * x[i + lag];
      return s;
    };
    expect(corr(N)).toBeGreaterThan(Math.abs(corr(N / 2)) * 2);
  });
});

describe("کتابخانه‌ی جلوه‌ها", () => {
  it("هر کلیدِ منطق دستورِ سنتز دارد (≥ ۱۵؛ اکنون ۲۹) با پارامترهای معقول", () => {
    expect(SFX_KEYS.length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(SFX).sort()).toEqual([...SFX_KEYS].sort());
    for (const k of SFX_KEYS) {
      expect(SFX[k].length, k).toBeGreaterThan(0);
      expect(sfxLength(k), k).toBeLessThan(2.5);
      for (const v of SFX[k]) {
        expect(v.g, k).toBeGreaterThan(0);
        expect(v.g, k).toBeLessThanOrEqual(0.6);
        expect(v.d, k).toBeGreaterThan(0);
        expect(v.f, k).toBeGreaterThanOrEqual(40);
        expect(v.f, k).toBeLessThanOrEqual(8000);
        if (v.to) expect(v.to, k).toBeGreaterThan(0);
      }
    }
  });
  it("هر جلوه روی شبیه‌ساز بی‌خطا پخش می‌شود و همه‌ی منبع‌ها شروع و پایان دارند", () => {
    const ac = new FakeAC();
    const dest = new FakeGain();
    const noise = ac.createBuffer(1, 100, 8000) as unknown as AudioBuffer;
    const kit = { noise, pluck: () => ({ buffer: noise, rate: 1 }) };
    for (const k of SFX_KEYS) {
      const before = ac.nodes.length;
      expect(playVoices(asCtx(ac), dest as unknown as AudioNode, SFX[k], kit)).toBe(SFX[k].length);
      expect(ac.nodes.length).toBeGreaterThan(before);
    }
    const sources = ac.nodes.filter((n): n is FakeSource => n instanceof FakeSource);
    for (const s of sources) {
      expect(s.started).not.toBeNull();
      expect(s.stopped!).toBeGreaterThan(s.started!);
    }
    expect(dest.out).toHaveLength(0); // مقصد خودش به جایی وصل نمی‌شود
    const gainsToDest = ac.of("gain").filter((g) => g.out.includes(dest));
    expect(gainsToDest.length).toBe(SFX_KEYS.reduce((a, k) => a + SFX[k].length, 0));
  });
});

describe("موتور", () => {
  const fresh = (s = DEFAULT_AUDIO) => {
    const e = new Engine(AC, s);
    return { e, ac: FakeAC.instances[FakeAC.instances.length - 1] };
  };

  it("گذرگاه‌ها زنجیرِ کل ← فشرده‌ساز ← خروجی می‌سازند و حجم‌ها اعمال می‌شوند", () => {
    const { ac } = fresh({ ...DEFAULT_AUDIO, master: 0.5 });
    const master = ac.of("gain").find((g) => g.out.some((n) => n instanceof FakeComp)) as FakeGain;
    expect(master.gain.value).toBeCloseTo(0.25);
    const comp = ac.nodes.find((n) => n instanceof FakeComp)!;
    expect(comp.out).toContain(ac.destination);
  });

  it("level() سطحِ RMS خروجی را از آنالایزرِ روی گذرگاهِ کل می‌خواند", () => {
    const { e, ac } = fresh();
    expect(e.level()).toBeCloseTo(0.5);
    expect(e.level()).toBeCloseTo(0.5);
    expect(ac.of("analyser")).toHaveLength(1); // فقط یک بار وصل می‌شود
    expect(e.state).toBe("running");
  });

  it("تکرارِ یک جلوه در کمتر از ۴۵ میلی‌ثانیه ادغام می‌شود", () => {
    const { e, ac } = fresh();
    expect(e.sfx("harvest")).toBe(true);
    expect(e.sfx("harvest")).toBe(false);
    ac.currentTime += SFX_MERGE + 0.01;
    expect(e.sfx("harvest")).toBe(true);
  });

  it(`حداکثر ${MAX_SFX} جلوه‌ی هم‌زمان؛ بعد از پایانشان دوباره جا باز می‌شود`, () => {
    const { e, ac } = fresh();
    const played = SFX_KEYS.map((k) => e.sfx(k)).filter(Boolean).length;
    expect(played).toBe(MAX_SFX);
    ac.currentTime += 3;
    expect(e.sfx("coin")).toBe(true);
  });

  it("لایه‌ی خاموش ساخته/زمان‌بندی نمی‌شود؛ روشن‌کردنش دوباره می‌سازد", () => {
    const { e } = fresh({ ...DEFAULT_AUDIO, music: 0, ambient: 0 });
    expect(e.layers).toMatchObject({ ambient: false, music: false });
    e.apply({ ...DEFAULT_AUDIO });
    expect(e.layers).toMatchObject({ ambient: true, music: true });
    e.apply({ ...DEFAULT_AUDIO, on: false });
    expect(e.layers).toMatchObject({ ambient: false, music: false });
  });

  it("شبِ تابستان: جیرجیرک و موسیقیِ شور زمان‌بندی می‌شوند؛ تعلیق همه را نگه می‌دارد", () => {
    const { e, ac } = fresh();
    e.setEnv({ hour: 1, season: "summer", weather: "clear" });
    e.resume();
    const n0 = ac.nodes.length;
    for (let i = 0; i < 60; i++) {
      ac.currentTime += 0.2;
      e.pump();
    }
    const scheduled = ac.nodes.length - n0;
    expect(scheduled).toBeGreaterThan(20);
    const rates = ac.of("buffer").map((b) => (b as FakeBufferSource).playbackRate.value).filter((r) => r > 0);
    for (const r of rates) {
      expect(r).toBeGreaterThan(0.9); // شبکه‌ی ربع‌اکتاو: حداکثر ±۱.۵ نیم‌پرده جابه‌جایی
      expect(r).toBeLessThan(1.1);
    }
    e.suspend();
    expect(ac.state).toBe("suspended");
    const n1 = ac.nodes.length;
    ac.currentTime += 5;
    e.pump();
    expect(ac.nodes.length).toBe(n1);
    expect(e.layers.running).toBe(false);
  });
});

describe("لایه‌ها جداگانه", () => {
  it("پرنده‌ها فقط وقتی شدت دارند؛ بلبل/گنجشک/هدهد همه ساخته می‌شوند", () => {
    const ac = new FakeAC();
    const noise = ac.createBuffer(1, 10, 8000) as unknown as AudioBuffer;
    let i = 0;
    const seq = [0.1, 0.6, 0.9, 0.5, 0.2, 0.7];
    const amb = new Ambience(asCtx(ac), new FakeGain() as unknown as AudioNode, noise, () => seq[i++ % seq.length]);
    amb.schedule(10);
    expect(amb.events).toBe(0);
    amb.set({ wind: 0.3, rain: 0, birds: 1, crickets: 0 });
    amb.schedule(30);
    expect(amb.events).toBeGreaterThan(10);
    expect(ac.of("osc").length).toBeGreaterThan(10);
    amb.stop();
  });
  it("موسیقی نت‌های دستگاهِ انتخاب‌شده را می‌نوازد", () => {
    const ac = new FakeAC();
    const noise = ac.createBuffer(1, 10, 8000) as unknown as AudioBuffer;
    const freqs: number[] = [];
    const m = new Music(asCtx(ac), new FakeGain() as unknown as AudioNode, (f) => (freqs.push(f), { buffer: noise, rate: 1 }), 5);
    m.setEnv({ mode: "shur", tempo: 60, level: 1 });
    expect(m.currentMode).toBe("shur");
    m.schedule(20);
    expect(m.notes).toBeGreaterThan(10);
    const scale = new Set<number>();
    for (let d = -7; d <= 10; d++) scale.add(Math.round(degreeFreq("shur", d) * 100));
    const main = freqs.filter((_, k) => k % 2 === 0); // سیمِ دوم ۰.۲۵٪ ناکوک است
    for (const f of main) expect(scale.has(Math.round(f * 100)), String(f)).toBe(true);
  });
});

describe("درگاهِ audio.ts", () => {
  it("بدون لمسِ بازیکن هیچ AudioContextی ساخته نمی‌شود؛ بعد از لمس، جلوه و تنظیم کار می‌کنند", async () => {
    vi.resetModules();
    const win = Object.assign(new EventTarget(), { AudioContext: FakeAC });
    const doc = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    const A = await import("../src/game/audio");
    A.sound("harvest");
    expect(A.audioDebug().engine).toBe(false);
    const off = A.armAudio();
    win.dispatchEvent(new Event("pointerdown"));
    // موتور در بارِ اولِ صفحه نیست و با همان لمس بار می‌شود؛ جلوه‌ی خواسته‌شده در این فاصله در صف می‌ماند
    A.sound("harvest");
    await vi.waitFor(() => expect(A.audioDebug().engine).toBe(true));
    expect(A.audioDebug().samplesTotal).toBeGreaterThan(70);
    const ac = FakeAC.instances[0];
    const played = ac.nodes.length;
    expect(played, "جلوه‌ی در صف بعد از آماده‌شدنِ موتور پخش شد").toBeGreaterThan(0);
    const before = ac.nodes.length;
    A.sound("coin");
    expect(ac.nodes.length).toBeGreaterThan(before);
    A.setAudioSettings({ music: 0 });
    expect(A.audioDebug().layers?.music).toBe(false);
    expect(JSON.parse(store.get(AUDIO_KEY)!).music).toBe(0);
    A.ambience({ hour: 12, season: "spring", weather: "clear" });
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(ac.state).toBe("suspended");
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(ac.state).toBe("running");
    A.setSoundOn(false);
    expect(A.isSoundOn()).toBe(false);
    const n = ac.nodes.length;
    A.sound("coin");
    expect(ac.nodes.length).toBe(n);
    off();
    expect(A.getAudioSettings().on).toBe(false);
  });
});
