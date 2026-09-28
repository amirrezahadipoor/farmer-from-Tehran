import { describe, expect, it } from "vitest";
import { calmMix, musicMode, DEFAULT_AUDIO } from "../src/game/sound/mix";
import { CalmLayer } from "../src/game/sound/calm";
import { Engine } from "../src/game/sound/engine";
import type { Ctx } from "../src/game/sound/sfx";
import { FakeDecodingAC, FakeGain } from "./fakeAudio";

const env = (hour: number, weather = "sun") => ({ hour, season: "spring", weather });
const AC = FakeDecodingAC as unknown as new (o?: AudioContextOptions) => AudioContext;

describe("لایه‌ی آرامش (B/T4) — پدِ درون و جریانِ آب", () => {
  it("calmMix: شب پدِ گرم‌تر، باران جریانِ پیش، روزِ آفتابی نرم‌ترین", () => {
    const day = calmMix(env(12));
    const night = calmMix(env(22));
    const rain = calmMix(env(12, "rain"));
    expect(night.pad).toBeGreaterThan(day.pad);
    expect(rain.stream).toBeGreaterThan(day.stream);
    expect(day.pad).toBeLessThan(1);
    expect(day.stream).toBeGreaterThan(0);
  });

  it("musicMode: تمپوی شب کُندتر از روز در همان دستگاه است (B/T4)", () => {
    const day = musicMode(env(12));
    const night = musicMode(env(22));
    expect(night.tempo).toBeLessThan(day.tempo);
    expect(night.tempo).toBeGreaterThan(30);
  });

  it("ساخته می‌شود، به حالِ دره جواب می‌دهد و stop دوباره‌بی‌خطر است", () => {
    const fake = new FakeDecodingAC();
    const ac = fake as unknown as Ctx;
    const noise = fake.createBuffer(1, 1000, 8000) as unknown as AudioBuffer;
    const dest = ac.createGain();
    const calm = CalmLayer.create(ac, dest, noise, env(12));
    expect(calm).not.toBeNull();
    expect(() => calm!.setEnv(env(23, "rain"))).not.toThrow();
    expect(() => calm!.stop()).not.toThrow();
    expect(() => calm!.stop()).not.toThrow();
    expect(() => calm!.setEnv(env(12))).not.toThrow();
  });

  it("ورود نرم: بهره‌ی پد و جریان از صفر با setTargetAtTime بالا می‌آید (بدون پرش به گوش)", () => {
    const fake = new FakeDecodingAC();
    const ac = fake as unknown as Ctx;
    const noise = fake.createBuffer(1, 1000, 8000) as unknown as AudioBuffer;
    CalmLayer.create(ac, ac.createGain(), noise, null);
    const soft = fake.nodes.filter((n) => n instanceof FakeGain && n.gain.events.some((e) => e[0] === "target"));
    expect(soft.length).toBeGreaterThanOrEqual(2); // پد + جریان
  });

  it("در موتور: با موسیقی روشن ساخته می‌شود و خاموشی/روشنِ دوباره بدون خطاست — بدونِ فایلِ جدید", () => {
    const e = new Engine(AC, { ...DEFAULT_AUDIO, on: true, music: 0.6 });
    expect(e.state).toBe("running");
    expect(() => e.apply({ ...DEFAULT_AUDIO, on: true, music: 0 })).not.toThrow();
    expect(() => e.apply({ ...DEFAULT_AUDIO, on: true, music: 0.6 })).not.toThrow();
  });
});
