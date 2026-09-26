"use client";

/**
 * src/game/ui/panels/StoryJournal.tsx — دفتر داستان: فصل جاری، هدف و فهرست فصل‌ها
 */

import { fmt } from "../../data";
import { setStoryShown } from "../../logic";
import { CHAPTERS, currentChapter, goalProgress } from "../../story";
import { Icon } from "../../icons";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";

export function StoryPanel({ s, ui }: PanelProps) {
  const storyCh = currentChapter(s);
  const storyP = goalProgress(s, storyCh);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-l from-amber-100 to-orange-100 p-3 text-xs font-bold leading-6 text-amber-950">
        داستانِ تو: از یک کارمندِ اخراج‌شده تا کشاورزی که سندِ «دره زرین» به نامِ اوست. هر فصل یک هدفِ واقعی در بازی دارد؛ با کامل شدنش، صحنه‌ی پایانیِ آن
        فصل پخش می‌شود.
      </div>
      <div className="flex items-center justify-between rounded-2xl border-2 border-purple-300 bg-purple-50 p-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-black text-purple-950">
            <Icon name="film" size={20} />
            فصل جاری: {storyCh.title}
          </div>
          <div className="text-xs font-bold text-purple-800">{storyCh.subtitle}</div>
          {storyCh.goal && (
            <div className="mt-1 text-[11px] font-black text-emerald-700">
              <span className="inline-flex items-center gap-1">
                <Icon name="target" size={14} />
                {storyCh.goal.label}: {fmt(Math.min(storyP.cur, storyP.target))}/{fmt(storyP.target)}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setStoryShown(s, true);
            ui.setPanel(null);
            game.bump();
          }}
          className={`${btn} bg-purple-600 text-xs text-white`}
        >
          {storyP.cur >= storyP.target && storyCh.goal ? "دیدن صحنه‌ی پایانی" : "مرور صحنه‌ها"}
        </button>
      </div>
      {CHAPTERS.map((c) => {
        const done = s.story.completed.includes(c.id);
        const active = c.id === storyCh.id;
        const lockedCh = !done && !active;
        const gp = goalProgress(s, c);
        return (
          <div
            key={c.id}
            className={`rounded-2xl border-2 p-3 ${done ? "border-emerald-400 bg-emerald-50" : active ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white opacity-70"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name={done ? "check" : active ? "story" : "lock"} size={28} />
                <div>
                  <div className="text-sm font-black text-slate-800">
                    فصل {fmt(c.num)}: {lockedCh ? "؟؟؟" : c.title}
                  </div>
                  <div className="text-[11px] text-slate-500">{lockedCh ? "با پیشرفت در داستان باز می‌شود" : c.subtitle}</div>
                </div>
              </div>
              {c.reward.coins > 0 && (
                <span className="shrink-0 rounded-lg bg-amber-200 px-2 py-1 text-[10px] font-black text-amber-900">
                  <Coin v={c.reward.coins} size={12} />
                </span>
              )}
            </div>
            {!lockedCh && c.goal && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, (gp.cur / gp.target) * 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="target" size={12} />
                    {c.goal.label}
                  </span>
                  <span>
                    {fmt(Math.min(gp.cur, gp.target))}/{fmt(gp.target)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
