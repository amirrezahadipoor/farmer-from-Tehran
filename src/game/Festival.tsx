"use client";

/**
 * src/game/Festival.tsx — V.5: پرده‌ی انتخاب فستیوال فصلی دهکده
 * روز اول هر فصل باز می‌شود؛ بازیکن یکی از سه راه را برمی‌گزیند.
 */
import { fmt, SEASONS } from "./data";
import { FEST_CHOICES, holdFestival, type FestChoice } from "./logic";
import type { State, Events } from "./logic";
import { game } from "./store";
import { haptic } from "./mobile";

export default function Festival({ s, ev }: { s: State; ev: Events }) {
  if (!s.fest || s.fest.choice !== null) return null;
  const sea = SEASONS[s.seasonIndex] || SEASONS[0];
  const pick = (c: FestChoice) => {
    if (holdFestival(s, c, ev)) {
      haptic("level");
      game.bump();
    }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" data-testid="festival-modal">
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-[#2b1d0e] to-[#1a1208] p-5 shadow-[0_0_40px_rgba(251,191,36,0.25)]">
        <div className="mb-1 text-center text-lg font-bold text-amber-300">فستیوال فصل {sea.name}</div>
        <p className="mb-4 text-center text-sm leading-6 text-amber-100/80">
          دهکده امروز جشن دارد. یکی از سه راه را برگزین؛ انتخابت تا آخر فصل همراهت می‌ماند.
        </p>
        <div className="space-y-3">
          {FEST_CHOICES.map((c) => {
            const poor = s.coins < c.cost;
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`festival-${c.id}`}
                disabled={poor}
                onClick={() => pick(c.id)}
                className={`block w-full rounded-xl border p-3 text-right transition active:scale-[0.98] ${
                  poor
                    ? "cursor-not-allowed border-white/10 bg-white/5 opacity-50"
                    : "border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200">{c.name}</span>
                  <span className={`text-sm ${c.cost ? "text-amber-300" : "text-emerald-300"}`}>
                    {c.cost ? `${fmt(c.cost)} سکه` : "رایگان"}
                  </span>
                </div>
                <div className="mt-1 text-xs leading-5 text-amber-100/70">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
