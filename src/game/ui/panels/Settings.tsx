"use client";

/**
 * src/game/ui/panels/Settings.tsx — صدا، لرزش، تمام‌صفحه، قفل جهت، ذخیره و شروع دوباره
 */

import { useState } from "react";
import { fmt } from "../../data";
import { newState } from "../../logic";
import { Icon } from "../../icons";
import { haptic, setHaptics, hapticsEnabled, lockOrientation, unlockOrientation } from "../../mobile";
import { dropLS, readLS, writeLS, SAVE_KEY, BACKUP_KEY } from "../../persist";
import { isSoundOn, setSoundOn, sound } from "../../audio";
import { recenter } from "../../useCanvasInput";
import { game, resetRuntime } from "../../store";
import type { SaveState } from "../../net";
import { SettingRow, Toggle, btn, type PanelProps } from "../common";

export interface SettingsProps extends PanelProps {
  saveState: SaveState;
  online: boolean;
  fs: { supported: boolean; isFullscreen: boolean; toggle: () => Promise<void> | void };
  onReset: () => void;
}

/** قفل جهت عمودی (ترجیح بازیکن؛ پیش‌فرض روشن) */
export const portraitLockPref = () => readLS("farm_portrait") !== "0";

const saveLabel = (st: SaveState) =>
  st === "cloud" ? "ابری و محلی" : st === "saving" ? "در حال ذخیره" : st === "queued" ? "محلی — در صف ارسال ابری" : "محلی (روی همین دستگاه)";

export function SettingsPanel({ s, ui, saveState, online, fs, onReset }: SettingsProps) {
  const [sfx, setSfx] = useState(isSoundOn);
  const [haptics, setHapticsState] = useState(hapticsEnabled);
  const [portrait, setPortrait] = useState(portraitLockPref);
  const [armReset, setArmReset] = useState(false);

  return (
    <div className="space-y-3">
      <SettingRow icon={sfx ? "sound" : "mute"} title="جلوه‌های صوتی">
        <Toggle
          on={sfx}
          label="روشن/خاموش کردن صدا"
          onChange={() => {
            const v = !sfx;
            setSfx(v);
            setSoundOn(v);
            if (v) sound("click");
          }}
        />
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
          dropLS(SAVE_KEY);
          dropLS(BACKUP_KEY);
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
