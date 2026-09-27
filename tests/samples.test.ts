import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BED_SAMPLES, INTERLUDES, SETAR_NOTES, SFX_SAMPLES } from "../src/game/sound/samples.gen";
import { SFX_KEYS } from "../src/game/sim/state";
import { nearestSetar } from "../src/game/sound/samples";
import { Engine } from "../src/game/sound/engine";
import { nextInterludeGap } from "../src/game/sound/beds";
import { DEFAULT_AUDIO, DEG_MAX, MODES, degreeFreq, type ModeId } from "../src/game/sound/mix";
import { FakeDecodingAC, fakeFetcher, type FakeGain } from "./fakeAudio";

/** tests/samples.test.ts — صداهای واقعیِ آزاد در موتورِ صدا (نقشه‌ی راه، مورد ۱۰) */
const PUB = join(__dirname, "../public");
const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe("فایل‌های صوتی", () => {
  it("هر ۲۹ کلیدِ منطق جلوه‌ی واقعی دارد و همه‌ی فایل‌ها موجودند", () => {
    expect(Object.keys(SFX_SAMPLES).sort()).toEqual([...SFX_KEYS].sort());
    const all = [
      ...Object.values(SFX_SAMPLES).flatMap((x) => x.files),
      ...SETAR_NOTES.map((n) => n.file),
      ...Object.values(BED_SAMPLES).map((b) => b.file),
      ...INTERLUDES.map((i) => i.file),
    ];
    for (const f of all) expect(existsSync(join(PUB, f)), f).toBe(true);
    for (const x of Object.values(SFX_SAMPLES)) expect(x.gain).toBeGreaterThan(0);
  });

  it("۲۶ نتِ سه‌تار صعودی‌اند و کُرُن و سُری واقعاً ربع‌پرده‌اند", () => {
    expect(SETAR_NOTES).toHaveLength(26);
    for (let i = 1; i < SETAR_NOTES.length; i++) expect(SETAR_NOTES[i].freq).toBeGreaterThan(SETAR_NOTES[i - 1].freq);
    const open = SETAR_NOTES[0].freq;
    // پرده‌ی ۱ «ر کُرُن» ≈ ۱۵۰ سنت، پرده‌ی ۷ «فا سُری» ≈ ۵۵۰، پرده‌ی ۱۶ اکتاو
    expect(Math.abs(cents(SETAR_NOTES[1].freq, open) - 150)).toBeLessThan(40);
    expect(Math.abs(cents(SETAR_NOTES[7].freq, open) - 550)).toBeLessThan(40);
    expect(Math.abs(cents(SETAR_NOTES[16].freq, open) - 1200)).toBeLessThan(40);
  });

  it("بسترها حلقه‌ای درونِ فایل دارند و میان‌پرده مدتِ واقعی", () => {
    for (const b of Object.values(BED_SAMPLES)) {
      expect(b.loopEnd - b.loopStart).toBeGreaterThan(10);
      expect(b.loopStart).toBeGreaterThan(0);
      expect(b.gain).toBeGreaterThan(0);
      expect(b.gain).toBeLessThanOrEqual(1);
    }
    expect(INTERLUDES[0].duration).toBeGreaterThan(30);
  });

  it("حجمِ همه‌ی صداها در بودجه (کمتر از ۳ مگابایت)", () => {
    const walk = (d: string): number => readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? walk(join(d, e.name)) : statSync(join(d, e.name)).size), 0);
    expect(walk(join(PUB, "audio"))).toBeLessThan(3 * 1024 * 1024);
  });
});

describe("نزدیک‌ترین نتِ سه‌تار", () => {
  it("هر نتِ موسیقیِ درونِ بازه‌ی نمونه‌ها با کمتر از ۵۵ سنت تنظیمِ کوک نواخته می‌شود", () => {
    const lo = SETAR_NOTES[0].freq;
    const hi = SETAR_NOTES[SETAR_NOTES.length - 1].freq;
    for (const mode of Object.keys(MODES) as ModeId[]) {
      for (let d = -7; d <= DEG_MAX; d++) {
        const f = degreeFreq(mode, d);
        const n = nearestSetar(f, () => true);
        expect(n).not.toBeNull();
        if (f >= lo && f <= hi) expect(Math.abs(cents(f, n!.freq)), `${mode} ${d}`).toBeLessThan(55);
      }
    }
  });

  it("زیرِ بازه (واخوانِ بم) از دهانه‌ی باز با نرخِ کمتر؛ فقط نت‌های رمزگشایی‌شده", () => {
    expect(nearestSetar(110, () => true)?.file).toBe(SETAR_NOTES[0].file);
    expect(nearestSetar(440, (f) => f === SETAR_NOTES[5].file)?.file).toBe(SETAR_NOTES[5].file);
    expect(nearestSetar(440, () => false)).toBeNull();
  });
});

const mkEngine = async () => {
  const e = new Engine(FakeDecodingAC as unknown as new () => AudioContext, { ...DEFAULT_AUDIO }, { fetcher: fakeFetcher });
  const ac = FakeDecodingAC.last as FakeDecodingAC;
  return { e, ac };
};

describe("موتور با صداهای واقعی (شبیه‌ساز)", () => {
  it("تا رمزگشایی نشده سنتز، بعد از آن جلوه از فایل و بی‌نوسان‌ساز", async () => {
    const { e, ac } = await mkEngine();
    expect(e.layers.ambience).toBe("synth");
    await e.loading;
    const osc0 = ac.nodes.filter((n) => n.kind === "osc").length;
    expect(e.sfx("harvest")).toBe(true);
    const src = ac.sources("/audio/sfx/harvest");
    expect(src).toHaveLength(1);
    expect(src[0].started).not.toBeNull();
    expect(Math.abs(src[0].playbackRate.value - 1)).toBeLessThanOrEqual(0.03);
    expect(ac.nodes.filter((n) => n.kind === "osc").length, "جلوه‌ی سنتزی ساخته نشد").toBe(osc0);
    expect(e.layers.samples).toBe(Object.values(SFX_SAMPLES).reduce((a, x) => a + x.files.length, 0) + 26 + 4);
  });

  it("موسیقی با نت‌های ضبط‌شده‌ی سه‌تار و کوکِ دقیقِ دستگاه", async () => {
    const { e, ac } = await mkEngine();
    await e.loading;
    e.setEnv({ hour: 10, season: "spring", weather: "sun" }); // ماهور
    for (let i = 0; i < 40; i++) {
      ac.currentTime += 0.2;
      e.pump();
    }
    expect(e.layers.pluck).toBe("setar");
    const notes = ac.sources("/audio/setar/");
    expect(notes.length).toBeGreaterThan(5);
    const mahur = new Set(Array.from({ length: DEG_MAX + 8 }, (_, i) => degreeFreq("mahur", i - 7).toFixed(3)));
    for (const s of notes) {
      const n = SETAR_NOTES.find((x) => s.buffer?.url.endsWith(x.file));
      expect(n).toBeDefined();
      expect(mahur.has((s.playbackRate.value * n!.freq).toFixed(3)), "بسامدِ نواخته‌شده درجه‌ای از ماهور است").toBe(true);
    }
  });

  it("محیط: بسترهای ضبط‌شده جای سنتز را می‌گیرند؛ شبِ تابستان جیرجیرک، نه پرنده", async () => {
    const { e, ac } = await mkEngine();
    await e.loading;
    e.setEnv({ hour: 23, season: "summer", weather: "clear" });
    ac.currentTime += 0.2;
    e.pump();
    expect(e.layers.ambience).toBe("samples");
    const bed = (name: string) => ac.sources(`/audio/amb/${name}`)[0];
    for (const b of ["birds", "crickets", "rain", "wind"]) {
      const s = bed(b);
      expect(s.loop, b).toBe(true);
      expect(s.loopEnd - s.loopStart).toBeGreaterThan(10);
    }
    const level = (name: string) => (bed(name).out[0] as FakeGain).gain.lastTarget;
    expect(level("crickets")).toBeGreaterThan(0.1);
    expect(level("crickets")).toBeGreaterThan(level("birds"));
    e.setEnv({ hour: 7, season: "spring", weather: "rain" });
    expect(level("rain")).toBeGreaterThan(0.3);
  });

  it("میان‌پرده‌ی سه‌گاه جمله‌های زاینده را نگه می‌دارد؛ فاصله‌ها ۸ تا ۱۲ دقیقه", async () => {
    const { e, ac } = await mkEngine();
    await e.loading;
    e.setEnv({ hour: 19, season: "autumn", weather: "clear" });
    (e as unknown as { nextInterlude: number }).nextInterlude = 0;
    for (let i = 0; i < 3; i++) {
      ac.currentTime += 0.2;
      e.pump();
      await new Promise((r) => setTimeout(r, 0)); // فایلِ میان‌پرده «دانلود» شود
    }
    ac.currentTime += 0.2;
    e.pump();
    expect(ac.sources("/audio/music/segah")).toHaveLength(1);
    expect(e.layers.interlude).toBe(true);
    const before = ac.sources("/audio/setar/").length;
    for (let i = 0; i < 50; i++) {
      ac.currentTime += 0.2;
      e.pump();
    }
    expect(ac.sources("/audio/setar/").length, "هیچ نتِ تازه‌ای وسطِ میان‌پرده").toBe(before);
    for (const r of [0, 0.5, 0.999]) {
      const g = nextInterludeGap(() => r);
      expect(g).toBeGreaterThanOrEqual(480);
      expect(g).toBeLessThanOrEqual(720);
    }
  });
});
