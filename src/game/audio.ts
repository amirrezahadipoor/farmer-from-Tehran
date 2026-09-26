"use client";

/**
 * src/game/audio.ts — جلوه‌های صوتیِ سنتزی (WebAudio، بدون فایل؛ کاملاً آفلاین)
 * در P5.12 به موتور کامل (لایه‌ی محیطی + موسیقی + تنظیم حجم) گسترش می‌یابد.
 */

import { readLS, writeLS } from "./persist";

let audioCtx: AudioContext | null = null;
let soundOn = readLS("farm_sound") !== "0";

export function isSoundOn() {
  return soundOn;
}

export function setSoundOn(v: boolean) {
  soundOn = v;
  writeLS("farm_sound", v ? "1" : "0");
}

const NOTES: Record<string, number[]> = {
  harvest: [660, 880],
  plant: [440],
  coin: [988, 1319],
  dig: [180, 140],
  water: [520, 600, 700],
  lvl: [523, 659, 784, 1047],
  build: [262, 330, 392],
  err: [200, 150],
  click: [800],
};

export function sound(k: string) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ac = audioCtx;
    (NOTES[k] || [600]).forEach((f, i) => {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = k === "dig" || k === "err" ? "triangle" : "sine";
      o.frequency.value = f;
      const t0 = ac.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + 0.2);
    });
  } catch {
    /* audio unavailable */
  }
}
