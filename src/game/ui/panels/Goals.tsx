"use client";

/**
 * src/game/ui/panels/Goals.tsx — قراردادها و دستاوردها
 */

import { ACHIEVEMENTS, CONTRACTS, fmt } from "../../data";
import { claimContract } from "../../logic";
import { Icon, achIcon } from "../../icons";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";

export function ContractsPanel({ s, ui }: PanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-amber-100 p-2.5 text-xs leading-5 text-amber-950">
        قراردادهای بزرگِ آبادانیِ دره زرین: با کامل کردن هر هدف، پاداشِ کلانِ سکه و اعتبار بگیر.
      </div>
      {CONTRACTS.map((c) => {
        const cs = s.contracts.find((x) => x.id === c.id) || { progress: 0, claimed: false };
        const isDone = cs.progress >= c.target;
        return (
          <div key={c.id} className="rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-800">{c.title}</span>
              <span className="text-xs font-bold text-amber-700">
                <Coin v={c.rewardCoins} size={14} />
              </span>
            </div>
            <div className="my-1 text-xs text-slate-600">{c.desc}</div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={c.title}
              aria-valuemin={0}
              aria-valuemax={c.target}
              aria-valuenow={Math.min(cs.progress, c.target)}
            >
              <div className="h-full bg-gradient-to-l from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, (cs.progress / c.target) * 100)}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                {fmt(cs.progress)} / {fmt(c.target)}
              </span>
              {cs.claimed ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500">
                  <Icon name="check" size={16} />
                  وصول شد
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!isDone}
                  onClick={() => {
                    claimContract(s, c.id, ui.ev);
                    game.bump();
                  }}
                  className={`${btn} bg-emerald-600 text-xs text-white`}
                >
                  دریافت پاداش
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AchievementsPanel({ s }: PanelProps) {
  return (
    <div className="space-y-2.5">
      {ACHIEVEMENTS.map((ach) => {
        const done = !!s.achievements[ach.id];
        return (
          <div key={ach.id} className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${done ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white opacity-60"}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
              <Icon name={achIcon(ach.id)} size={30} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-black text-slate-800">{ach.title}</div>
              <div className="text-xs text-slate-600">{ach.desc}</div>
            </div>
            <span className="text-xs font-black text-amber-700">
              <Coin v={ach.reward} size={14} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
