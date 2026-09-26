"use client";

/**
 * src/game/audio.ts — درگاهِ صدای بازی (P5.12). سنتزِ کامل با WebAudio، بدون حتی یک فایل صوتی
 * (کاملاً آفلاین): ۲۹ جلوه، صدای زنده‌ی محیط (باد، باران، پرنده، جیرجیرک) و موسیقیِ زاینده‌ی
 * سنتور روی دستگاه‌های ایرانی. حجمِ کل/موسیقی/جلوه‌ها/محیط جدا تنظیم و ذخیره می‌شود.
 * موتور فقط پس از اولین لمسِ بازیکن ساخته می‌شود (سیاستِ پخشِ خودکارِ مرورگرها) و در تبِ
 * پنهان معلق می‌ماند تا باتری مصرف نشود.
 */

import type { SfxKey } from "./logic";
import { loadAudioSettings, saveAudioSettings, type AmbientEnv, type AudioSettings } from "./sound/mix";
import { Engine } from "./sound/engine";

export type { AudioSettings, AmbientEnv } from "./sound/mix";

let settings = loadAudioSettings();
let engine: Engine | null = null;
let env: AmbientEnv | null = null;
let gestured = false;

type ACtor = new (o?: AudioContextOptions) => AudioContext;
function ctor(): ACtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** آیا بازیکن تا حالا با صفحه تعامل کرده؟ (بدون آن مرورگر اجازه‌ی پخش نمی‌دهد) */
function userActive() {
  const ua = typeof navigator !== "undefined" ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation : undefined;
  return gestured || !!ua?.hasBeenActive;
}

function ensure(): Engine | null {
  if (engine) return engine;
  if (!settings.on || !userActive()) return null;
  const AC = ctor();
  if (!AC) return null;
  try {
    engine = new Engine(AC, settings);
    if (env) engine.setEnv(env);
    if (typeof document === "undefined" || !document.hidden) engine.resume();
  } catch {
    engine = null; // مرورگر بدون WebAudio: بازی بی‌صدا ادامه دارد
  }
  return engine;
}

export function getAudioSettings(): AudioSettings {
  return { ...settings };
}

export function setAudioSettings(patch: Partial<AudioSettings>) {
  settings = { ...settings, ...patch };
  saveAudioSettings(settings);
  if (engine) {
    engine.apply(settings);
    if (settings.on) engine.resume();
  } else ensure();
}

export const isSoundOn = () => settings.on;
export const setSoundOn = (v: boolean) => setAudioSettings({ on: v });

/** یک جلوه‌ی صوتی (فقط کلیدهای تعریف‌شده در SFX_KEYS) */
export function sound(k: SfxKey) {
  if (!settings.on || settings.master <= 0 || settings.sfx <= 0) return;
  ensure()?.sfx(k);
}

/** حالِ دره برای صدای محیط و انتخابِ دستگاهِ موسیقی (حلقه‌ی بازی هر ثانیه صدا می‌زند) */
export function ambience(e: AmbientEnv) {
  env = e;
  engine?.setEnv(e);
}

/** فعال‌سازی با اولین لمس/کلید و تعلیق در تبِ پنهان؛ خروجی = پاک‌سازی */
export function armAudio(): () => void {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    gestured = true;
    ensure()?.resume();
  };
  const vis = () => {
    if (!engine) return;
    if (document.hidden) engine.suspend();
    else if (settings.on) engine.resume();
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", vis);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    document.removeEventListener("visibilitychange", vis);
  };
}

/** فقط برای تست/اشکال‌زدایی (window.__game.audio در مرورگر) */
export const audioDebug = () => ({
  engine: !!engine,
  state: engine?.state ?? null,
  layers: engine?.layers ?? null,
  level: engine ? engine.level() : 0,
  settings: getAudioSettings(),
});
