"use client";

/**
 * src/game/ui/Splash.tsx — صفحه‌ی آغاز (فقط بار اول؛ بازگشت به اپ مستقیم وارد بازی می‌شود)
 */

import Image from "next/image";
import { BUILDINGS, SKILLS, fmt } from "../data";
import type { State } from "../logic";
import { Icon } from "../icons";
import { Coin } from "./common";

const DECOR_COUNT = BUILDINGS.filter((b) => b.isDecor).length;

export default function Splash({ s, onStart }: { s: State; onStart: () => void }) {
  const features: [string, string][] = [
    ["target", "ابزارهای دقیق"],
    ["skills", `${fmt(SKILLS.length)} مهارت`],
    ["decor", `${fmt(DECOR_COUNT)} دکور`],
    ["spring", "چهار فصل"],
    ["crown", "نسل‌های بی‌پایان"],
    ["cloud", "بازی آفلاین"],
  ];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="mx-3 max-w-lg rounded-[2rem] border-2 border-amber-400 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 p-5 text-center shadow-2xl md:mx-4 md:rounded-[2.5rem] md:border-4 md:p-8">
        <div className="mb-2 flex justify-center">
          <Image src="/images/logo_badge.png" alt="نشان مزرعه طلایی" width={112} height={112} priority className="h-20 w-20 animate-pulse drop-shadow-2xl md:h-28 md:w-28" />
        </div>
        <h1 className="bg-gradient-to-l from-emerald-700 via-amber-600 to-yellow-600 bg-clip-text text-3xl font-black text-transparent md:text-4xl">مزرعه طلایی</h1>
        <p className="mt-2 text-sm font-bold text-amber-950">داستانِ یک کارمندِ اخراج‌شده که مزرعه‌ی بابابزرگ را در «دره زرین» دوباره زنده می‌کند.</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black text-amber-950">
          {features.map(([ic, label]) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-white/80 p-2 shadow-sm">
              <Icon name={ic} size={28} />
              {label}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 w-full rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-4 text-2xl font-black text-white shadow-[0_6px_0_#1b5e20] transition-all active:translate-y-1 active:shadow-none"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Icon name="play" size={30} />
            آغاز داستان
          </span>
        </button>
        <p className="mt-3 text-[11px] font-bold text-amber-900/70">
          <span className="inline-flex items-center gap-2">
            سطح {fmt(s.level)} · <Coin v={s.coins} size={13} />
          </span>
        </p>
      </div>
    </div>
  );
}
