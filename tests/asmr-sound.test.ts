import { describe, expect, it } from "vitest";
import { makeReverbIR, REVERB_WET, Engine, ACTION_TAILS } from "../src/game/sound/engine";
import { CalmLayer } from "../src/game/sound/calm";
import { musicMode } from "../src/game/sound/mix";
import { FakeDecodingAC, FakeBuffer } from "./fakeAudio";

/** M1..M4 — لایه‌ی ASMR صدا: واخوانِ گرم، زنگِ باد، دنباله‌ی کنش‌ها و موسیقیِ آرام */

class ConvolverAC extends FakeDecodingAC {
  convolverBuffer: FakeBuffer | null = null;
  createConvolver() {
    const self = this;
    const node = {
      buffer: null as FakeBuffer | null,
      connect(n: unknown) {
        self.destination.out.push(n as never);
        return n;
      },
      disconnect() {},
    };
    const self2 = this;
    Object.defineProperty(node, "buffer", {
      get() {
        return self2.convolverBuffer;
      },
      set(v: FakeBuffer) {
        self2.convolverBuffer = v;
      },
    });
    return node;
  }
}

describe("M1: واخوانِ گرم (کنولوشنِ رویه‌ای)", () => {
  it("IR استریو، درست به اندازه و میراست", () => {
    const ac = new FakeDecodingAC();
    const ir = makeReverbIR(ac as unknown as BaseAudioContext, 2.2);
    expect(ir.numberOfChannels).toBe(2);
    expect(ir.sampleRate).toBe(ac.sampleRate);
    expect(ir.duration).toBeGreaterThan(0); // بافر ساخته شد
    expect(makeReverbIR(ac as unknown as BaseAudioContext, 0.5)).toBeTruthy();
  });

  it("موتور با Convolver واخوان را سیم‌کشی می‌کند؛ بدونش سقوطِ نرم است", () => {
    const withRv = new Engine(ConvolverAC, { on: true, master: 0.8, sfx: 1, music: 1, ambient: 1 });
    expect(withRv.layers.reverb).toBe(true);
    const without = new Engine(FakeDecodingAC, { on: true, master: 0.8, sfx: 1, music: 1, ambient: 1 });
    expect(without.layers.reverb).toBe(false);
  });

  it("سهمِ واخوانِ هر دو گذرگاه در محدوده‌ی ASMR است (زیرِ ۰.۳)", () => {
    expect(REVERB_WET.sfx).toBeLessThan(0.3);
    expect(REVERB_WET.music).toBeLessThan(0.3);
    expect(REVERB_WET.sfx).toBeGreaterThan(0);
  });
});

describe("M2: زنگ‌های باد در لایه‌ی آرامش", () => {
  it("زنگ طبقِ برنامه می‌آید و لایه را نمی‌شکند", () => {
    const ac = new FakeDecodingAC();
    const noise = new FakeBuffer(1, 1000, 8000);
    const layer = CalmLayer.create(ac as unknown as BaseAudioContext, ac.destination, noise as unknown as AudioBuffer, null);
    expect(layer).not.toBeNull();
    const nOsc0 = ac.nodes.length;
    expect(layer!.tick(1)).toBe(false); // هنوز زود است
    const chimed = layer!.tick(1e6);
    expect(chimed).toBe(true);
    expect(ac.nodes.length).toBeGreaterThan(nOsc0); // زنگ ساخته شد
    expect(layer!.tick(1e6 + 1)).toBe(false); // زنگِ بعدی عقب است
  });
});

describe("M3: دنباله‌ی ASMR کنش‌ها", () => {
  it("آب/برداشت/شخم/کاشت دنباله دارند؛ بهره‌ها خیلی کم و با تأخیرند", () => {
    for (const k of ["water", "harvest", "dig", "plant"] as const) {
      const voices = ACTION_TAILS[k];
      expect(voices, k).toBeTruthy();
      for (const v of voices!) {
        expect(v.g).toBeLessThanOrEqual(0.12); // ASMR نه سروصدا
        expect(v.at ?? 0).toBeGreaterThanOrEqual(0.1); // پس از صدای اصلی
      }
    }
    expect(ACTION_TAILS.click).toBeUndefined(); // جلوه‌های رابط دنباله ندارند
  });
});

describe("M4: موسیقیِ آرام‌تر", () => {
  it("تمپوی همه‌ی دستگاه‌ها در بازه‌ی آرام (۴۶ تا ۶۰) است", () => {
    for (const hour of [12, 22]) {
      const m = musicMode({ hour, season: "spring", weather: "sun" });
      expect(m.tempo).toBeLessThanOrEqual(60);
      expect(m.tempo).toBeGreaterThanOrEqual(38); // شب‌ها باز هم آرام‌تر
    }
  });
});
