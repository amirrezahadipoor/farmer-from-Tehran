import { describe, it, expect } from "vitest";
import { BED_SAMPLES } from "../src/game/sound/samples.gen";
import type { SampleBank } from "../src/game/sound/samples";
import { SampleAmbience, Interlude, BED_IDS, bedFiles, nextInterludeGap } from "../src/game/sound/beds";
import { FakeBuffer, FakeBufferSource, FakeGain, FakeNode } from "./fakeAudio";

/**
 * tests/beds.test.ts — پوششِ مستقیمِ بسترهای محیط و میان‌پرده (کسریِ «فایل کم‌پوشش»).
 * با AudioContextِ جعلی و بانکِ حافظه‌ای، بدونِ مرورگر و بدونِ فایلِ صوتیِ واقعی.
 */

const bufFor = (file: string, seconds = 24) => new FakeBuffer(1, seconds * 8000, 8000, file);

/** بانکِ جعلی: همان شکلِ SampleBank (get/has) با حافظه‌ی داخلی */
function fakeBank(files: string[]): SampleBank {
  const map = new Map(files.map((f) => [f, bufFor(f) as unknown as AudioBuffer]));
  return {
    get: (p: string) => map.get(p) ?? null,
    has: (p: string) => map.has(p),
    size: map.size,
  } as unknown as SampleBank;
}

class FakeCtx {
  currentTime = 0;
  sources: FakeBufferSource[] = [];
  gains: FakeGain[] = [];
  dest = new FakeNode();
  createBufferSource() {
    const s = new FakeBufferSource();
    this.sources.push(s);
    return s;
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
}

const ALL_BEDS = Object.values(BED_SAMPLES).map((b) => b.file);

describe("بسترهای محیطی ضبط‌شده", () => {
  it("شناسه‌ها و فایل‌ها از جدولِ نمونه‌ها می‌آیند", () => {
    expect(BED_IDS).toHaveLength(4);
    expect(bedFiles()).toEqual(ALL_BEDS);
  });

  it("فقط وقتی آماده است که همه‌ی چهار فایل رمزگشایی شده باشند", () => {
    expect(SampleAmbience.ready(fakeBank(ALL_BEDS))).toBe(true);
    expect(SampleAmbience.ready(fakeBank(ALL_BEDS.slice(0, 3)))).toBe(false);
    expect(SampleAmbience.ready(fakeBank([]))).toBe(false);
  });

  it("با هر تغییرِ mix چهار بسترِ حلقه‌ای می‌سازد و بهره‌ی هدف را نرم می‌گذارد", () => {
    const ac = new FakeCtx();
    const amb = new SampleAmbience(ac as never, ac.dest as never, fakeBank(ALL_BEDS));
    amb.set({ wind: 0.5, rain: 0.25, birds: 1, crickets: 0 });

    expect(ac.sources).toHaveLength(4);
    for (const s of ac.sources) {
      expect(s.loop).toBe(true);
      expect(s.loopStart).toBe(BED_SAMPLES[BED_IDS[0]].loopStart);
      // نقطه‌ی آغاز تصادفی داخلِ حلقه است (تا هر بار همان ثانیه‌ها شنیده نشود)
      expect(s.offset).toBeGreaterThanOrEqual(0);
    }
    const levels = (id: keyof typeof BED_SAMPLES) =>
      (ac.sources[BED_IDS.indexOf(id)].out[0] as FakeGain).gain.lastTarget;
    expect(levels("birds")).toBeCloseTo(1 * BED_SAMPLES.birds.gain, 5);
    expect(levels("wind")).toBeCloseTo(0.5 * BED_SAMPLES.wind.gain, 5);
    expect(levels("crickets")).toBe(0);
    expect(amb.target("rain")).toBeCloseTo(0.25 * BED_SAMPLES.rain.gain, 5);
  });

  it("set دوم لایه‌ی تکراری نمی‌سازد و فقط بهره‌ها را جابه‌جا می‌کند", () => {
    const ac = new FakeCtx();
    const amb = new SampleAmbience(ac as never, ac.dest as never, fakeBank(ALL_BEDS));
    amb.set({ wind: 1, rain: 1, birds: 1, crickets: 1 });
    const before = ac.sources.length;
    amb.set({ wind: 0, rain: 0, birds: 0, crickets: 0 });
    expect(ac.sources.length).toBe(before);
    const level = (id: keyof typeof BED_SAMPLES) =>
      (ac.sources[BED_IDS.indexOf(id)].out[0] as FakeGain).gain.lastTarget;
    expect(level("wind")).toBe(0);
  });

  it("فایلِ ناقص هیچ لایه‌ای نمی‌سازد و بازی بی‌صدا نمی‌مانَد (سنتز جایگزین است)", () => {
    const ac = new FakeCtx();
    const amb = new SampleAmbience(ac as never, ac.dest as never, fakeBank([]));
    amb.set({ wind: 1, rain: 1, birds: 1, crickets: 1 });
    expect(ac.sources).toHaveLength(0);
    expect(amb.target("wind")).toBe(BED_SAMPLES.wind.gain); // هدف محاسبه می‌شود، فقط پخش نیست
  });

  it("schedule کاری ندارد (بسترها حلقه‌اند) و stop همه را خاموش و پاک می‌کند", () => {
    const ac = new FakeCtx();
    const amb = new SampleAmbience(ac as never, ac.dest as never, fakeBank(ALL_BEDS));
    amb.set({ wind: 1, rain: 1, birds: 1, crickets: 1 });
    expect(amb.schedule(ac.currentTime + 60)).toBeUndefined();

    amb.stop();
    for (const s of ac.sources) {
      expect(s.stopped).not.toBeNull(); // stop با زمانِ انحطاطِ ۰.۴ ثانیه
      expect((s.out[0] as FakeGain).gain.lastTarget).toBe(0);
    }
    // بعد از stop، set دوباره لایه‌ها را از نو می‌سازد
    const before = ac.sources.length;
    amb.set({ wind: 0.2, rain: 0.2, birds: 0.2, crickets: 0.2 });
    expect(ac.sources.length).toBe(before + 4);
  });
});

describe("میان‌پرده", () => {
  it("فاصله‌ی میان‌پرده‌ها بین ۸ تا ۱۲ دقیقه است", () => {
    for (const r of [0, 0.25, 0.5, 0.999, 1]) {
      const g = nextInterludeGap(() => r);
      expect(g).toBeGreaterThanOrEqual(480);
      expect(g).toBeLessThanOrEqual(720);
    }
  });

  it("فایلِ آماده پخش می‌شود و زمانِ پایان برمی‌گردد؛ فایلِ ناقص null", () => {
    const ac = new FakeCtx();
    const bank = fakeBank(["/audio/music/segah.mp3"]);
    const il = new Interlude(ac as never, ac.dest as never, bank as never);

    expect(il.playing).toBe(false);
    expect(il.play("/audio/music/nope.mp3")).toBeNull();
    expect(ac.sources).toHaveLength(0);

    const ends = il.play("/audio/music/segah.mp3");
    expect(ends).toBeCloseTo(ac.currentTime + 0.1 + 24, 5);
    expect(il.playing).toBe(true);
    expect(ac.sources).toHaveLength(1);
  });

  it("playing وقتی پایانِ میان‌پرده گذشت false می‌شود", () => {
    const ac = new FakeCtx();
    const il = new Interlude(ac as never, ac.dest as never, fakeBank(["/audio/music/segah.mp3"]));
    il.play("/audio/music/segah.mp3");
    ac.currentTime += 30;
    expect(il.playing).toBe(false);
  });

  it("stop همیشه بی‌استثنا کار می‌کند — حتی اگر منبع شروع نشده باشد", () => {
    const ac = new FakeCtx();
    const il = new Interlude(ac as never, ac.dest as never, fakeBank(["/audio/music/segah.mp3"]));
    il.stop(); // هیچ‌وقت پخش نشده
    il.play("/audio/music/segah.mp3");
    il.stop();
    expect(il.playing).toBe(false);
    il.stop(); // دوباره، بدون پرتاب
    expect(il.endsAt).toBe(0);
  });
});
