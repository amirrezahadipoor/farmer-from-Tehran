"use client";

/**
 * src/game/ui/panels/Goals.tsx — قراردادها و دستاوردها
 */


import { ACHIEVEMENTS, CONTRACTS, fmt } from "../../data";
import { achievementProgress, claimContract } from "../../logic";
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

/** V.8: دیوار مدال‌ها — مدال خاکستری با نوار پیشرفت زنده، مدال گرفته‌شده با تاریخِ روز؛
 * مدالِ همین امروزِ بازی یک‌بار می‌چرخد (medal-new) */
export function AchievementsPanel({ s }: PanelProps) {
  const doneCount = ACHIEVEMENTS.filter((a) => !!s.achievements[a.id]).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-amber-100 p-3 text-amber-950">
        <div className="flex items-center gap-1.5 text-sm font-black">
          <Icon name="trophy" size={22} />
          دیوار مدال‌های دره زرین
        </div>
        <div className="rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-black text-white shadow">
          {fmt(doneCount)} / {fmt(ACHIEVEMENTS.length)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {ACHIEVEMENTS.map((ach) => {
          const got = s.achievements[ach.id];
          const done = !!got;
          const p = achievementProgress(s, ach.id);
          return (
            <div
              key={ach.id}
              data-testid={`medal-${ach.id}`}
              className={`rounded-2xl border-2 p-3 text-center ${done ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}
            >
              <span
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-2 ${
                  done ? "bg-amber-200 ring-amber-500" : "bg-slate-100 ring-slate-200 grayscale opacity-60"
                } ${typeof got === "number" && got === s.day ? "medal-new" : ""}`}
              >
                <Icon name={achIcon(ach.id)} size={32} />
              </span>
              <div className="mt-2 text-xs font-black text-slate-800">{ach.title}</div>
              <div className="mt-0.5 min-h-8 text-[11px] leading-4 text-slate-500">{ach.desc}</div>
              {done ? (
                <div className="mt-1 text-[11px] font-black text-amber-700">
                  {typeof got === "number" ? `روز ${fmt(got)}` : "گرفته شده"}
                </div>
              ) : (
                <div className="mt-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={ach.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
                    <div className="h-full bg-gradient-to-l from-amber-400 to-amber-600" style={{ width: `${Math.round(p * 100)}%` }} />
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-400">{fmt(Math.round(p * 100))}٪</div>
                </div>
              )}
              <span className="mt-1 inline-block text-xs font-black text-amber-700">
                <Coin v={ach.reward} size={14} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
