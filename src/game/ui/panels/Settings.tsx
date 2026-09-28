"use client";

/**
 * src/game/ui/panels/Settings.tsx — صدا (کل/موسیقی/جلوه‌ها/محیط)، لرزش، تمام‌صفحه، قفل جهت،
 * ذخیره و شروع دوباره
 */

import { useState } from "react";
import { fmt } from "../../data";
import { newState } from "../../logic";
import { Icon } from "../../icons";
import { haptic, setHaptics, hapticsEnabled, lockOrientation, unlockOrientation } from "../../mobile";
import { clearAllSaves, readLS, writeLS } from "../../persist";
import { getAudioSettings, setAudioSettings, sound, type AudioSettings } from "../../audio";
import { recenter } from "../../useCanvasInput";
import { game, resetRuntime } from "../../store";
import { QUALITY_MODES, applyQuality, qualityPref, type QualityMode } from "../../quality";
import type { SaveState } from "../../net";
import { SettingRow, Toggle, btn, type PanelProps } from "../common";

export interface SettingsProps extends PanelProps {
  saveState: SaveState;
  online: boolean;
  fs: { supported: boolean; isFullscreen: boolean; toggle: () => Promise<void> | void };
  onReset: () => void;
}

/** اسلایدرهای حجم (P5.12) — برچسب همان aria-label است تا تست و صفحه‌خوان پیدایش کنند */
const VOLUMES: { key: "master" | "music" | "sfx" | "ambient"; icon: string; title: string; hint: string }[] = [
  { key: "master", icon: "sound", title: "حجم کل", hint: "همه‌ی صداهای بازی" },
  { key: "music", icon: "music", title: "موسیقی", hint: "سه‌تارِ واقعی روی ماهور، شور و اصفهان، گاهی بداهه‌ی سه‌گاه" },
  { key: "sfx", icon: "sparkle", title: "جلوه‌های صوتی", hint: "کاشت، برداشت، فروش و ساخت" },
  { key: "ambient", icon: "bird", title: "صدای محیط", hint: "پرنده، جیرجیرک، باران و باد، ضبطِ واقعی" },
];

function VolumeSlider({ icon, title, hint, value, disabled, onChange }: { icon: string; title: string; hint: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <label className={`block rounded-2xl bg-white px-3 pb-1 pt-2.5 shadow ${disabled ? "opacity-50" : ""}`}>
      <span className="flex items-center justify-between gap-2 text-sm font-black text-slate-800">
        <span className="flex min-w-0 items-center gap-2">
          <Icon name={icon} size={24} />
          <span className="flex min-w-0 flex-col">
            {title}
            <span className="truncate text-[11px] font-bold text-slate-500">{hint}</span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{fmt(pct)}٪</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        disabled={disabled}
        aria-label={title}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-11 w-full cursor-pointer accent-emerald-600"
      />
    </label>
  );
}

/** قفل جهت عمودی (ترجیح بازیکن؛ پیش‌فرض روشن) */
export const portraitLockPref = () => readLS("farm_portrait") !== "0";

const saveLabel = (st: SaveState) =>
  st === "cloud" ? "ابری و محلی" : st === "saving" ? "در حال ذخیره" : st === "queued" ? "محلی — در صف ارسال ابری" : "محلی (روی همین دستگاه)";

export function SettingsPanel({ s, ui, saveState, online, fs, onReset }: SettingsProps) {
  const [audio, setAudio] = useState<AudioSettings>(getAudioSettings);
  const patchAudio = (p: Partial<AudioSettings>) => {
    setAudioSettings(p);
    setAudio(getAudioSettings());
  };
  const [haptics, setHapticsState] = useState(hapticsEnabled);
  const [portrait, setPortrait] = useState(portraitLockPref);
  const [quality, setQuality] = useState<QualityMode>(qualityPref);
  const [armReset, setArmReset] = useState(false);

  return (
    <div className="space-y-3">
      <SettingRow icon={audio.on ? "sound" : "mute"} title="صدا" hint="صداهای واقعی با مجوزِ آزاد؛ در تبِ پنهان خاموش می‌شود">
        <Toggle
          on={audio.on}
          label="روشن/خاموش کردن صدا"
          onChange={() => {
            const v = !audio.on;
            patchAudio({ on: v });
            if (v) sound("click");
          }}
        />
      </SettingRow>

      {VOLUMES.map((v) => (
        <VolumeSlider
          key={v.key}
          icon={v.icon}
          title={v.title}
          hint={v.hint}
          value={audio[v.key]}
          disabled={!audio.on}
          onChange={(x) => {
            patchAudio({ [v.key]: x });
            if (v.key === "sfx" || v.key === "master") sound("tap");
          }}
        />
      ))}

      <SettingRow icon="sparkle" title="کیفیت تصویر" hint={QUALITY_MODES.find((m) => m.id === quality)?.hint}>
        <div className="flex gap-1" role="group" aria-label="کیفیت تصویر">
          {QUALITY_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={quality === m.id}
              title={m.hint}
              onClick={() => {
                setQuality(m.id);
                applyQuality(m.id, Math.min(2, window.devicePixelRatio || 1));
                haptic("tap");
                sound("click");
              }}
              className={`min-h-[44px] rounded-xl px-2.5 text-xs font-black transition-colors ${
                quality === m.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow icon="target" title="لرزش لمسی (هپتیک)">
        <Toggle
          on={haptics}
          label="روشن/خاموش کردن لرزش لمسی"
          onChange={() => {
            const v = !haptics;
            setHapticsState(v);
            setHaptics(v);
            if (v) haptic("success");
          }}
        />
      </SettingRow>

      <SettingRow
        icon="center"
        title="تمام‌صفحه‌ی موبایل"
        hint={
          fs.supported
            ? fs.isFullscreen
              ? "روشن — صفحه بدون نوار مرورگر"
              : "خاموش — نوار مرورگر دیده می‌شود"
            : "مرورگر شما پشتیبانی نمی‌کند (iOS: دکمه‌ی اشتراک‌گذاری ← افزودن به صفحه‌ی خانه)"
        }
      >
        <Toggle
          on={fs.isFullscreen}
          disabled={!fs.supported}
          label="روشن/خاموش کردن تمام‌صفحه"
          onChange={() => {
            void fs.toggle();
            haptic("tap");
          }}
        />
      </SettingRow>

      <SettingRow icon="sun" title="قفل جهت عمودی" hint="برای بازی با یک دست، صفحه را عمودی نگه می‌دارد">
        <Toggle
          on={portrait}
          label="قفل جهت صفحه"
          onChange={() => {
            const v = !portrait;
            setPortrait(v);
            writeLS("farm_portrait", v ? "1" : "0");
            if (v) void lockOrientation("portrait");
            else unlockOrientation();
            haptic("tap");
          }}
        />
      </SettingRow>

      <button
        type="button"
        className={`${btn} w-full bg-sky-600 text-white`}
        onClick={() => {
          void ui.save();
          ui.toast("بازی ذخیره شد", "ok");
        }}
      >
        <Icon name="save" size={18} /> ذخیره دستی
      </button>

      <button
        type="button"
        className={`${btn} w-full bg-amber-600 text-white`}
        onClick={() => {
          recenter();
          ui.setPanel(null);
        }}
      >
        <Icon name="center" size={18} /> بازگشت دوربین به مزرعه
      </button>

      <div className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-700 shadow">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-black text-slate-800">
          <Icon name="info" size={20} />
          وضعیت بازی
        </div>
        روز {fmt(s.day)} · نسل {fmt(s.prestige)} · {fmt(s.bought)} قطعه زمین خریداری‌شده
        <br />
        ذخیره‌سازی: {saveLabel(saveState)} — هر ۱۲ ثانیه خودکار
        <br />
        اتصال: {online ? "آنلاین" : "آفلاین — بازی کامل ادامه دارد و سیو در صف می‌ماند"}
      </div>

      <button
        type="button"
        className={`${btn} w-full text-white ${armReset ? "bg-red-800" : "bg-red-600"}`}
        onClick={() => {
          // تأیید دو مرحله‌ای درون‌برنامه‌ای به‌جای confirm() مرورگر
          if (!armReset) {
            setArmReset(true);
            haptic("tap");
            ui.toast("برای پاک شدن همه‌ی پیشرفت، دوباره بزن", "err");
            return;
          }
          setArmReset(false);
          clearAllSaves(); // localStorage و IndexedDB (مورد ۳)
          resetRuntime();
          game.set(newState());
          onReset();
          void ui.save();
        }}
      >
        <Icon name="trash" size={18} /> {armReset ? "مطمئنی؟ همه‌چیز پاک می‌شود" : "شروع دوباره از ابتدا"}
      </button>
    </div>
  );
}
