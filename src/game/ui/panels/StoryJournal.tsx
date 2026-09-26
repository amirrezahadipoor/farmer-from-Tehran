"use client";

/**
 * src/game/ui/panels/StoryJournal.tsx — دفتر داستان: فصل جاری، هدف و فهرست فصل‌ها
 */

import { fmt } from "../../data";
import { TRAIT_NAME, currentHeir, joinFa, lineageChain, setLineageShown, setStoryShown, type State } from "../../logic";
import { CHAPTERS, currentChapter, goalProgress } from "../../story";
import { lineageChapter, lineageProgress, ordinalFa } from "../../lineageStory";
import { Icon } from "../../icons";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";

const PHASE_NOTE = {
  name: "نامِ وارث هنوز نوشته نشده",
  scenes: "صحنه‌های آغازِ فصل نیمه‌کاره مانده",
  goal: "",
  end: "قول عملی شد؛ صحنه‌ی پایانی آماده است",
  done: "این فصل تمام شد؛ فصلِ بعد با تناسخِ بعدی",
} as const;

/** فصل‌های نسل و شجره‌ی نام‌ها (P6.4) */
function LineageCard({ s, onOpen }: { s: State; onOpen: () => void }) {
  const L = s.lineage;
  const ch = lineageChapter(s);
  const h = currentHeir(s);
  if (!L || !ch || !h) return null;
  const p = lineageProgress(s);
  const open = L.phase === "name" || L.phase === "scenes" || L.phase === "end";
  return (
    <div className="space-y-2 rounded-2xl border-2 border-amber-400 bg-gradient-to-l from-amber-50 to-orange-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-black text-amber-950">
            <Icon name="tree" size={20} />
            فصل {fmt(ch.num)}: {ch.title}
          </div>
          <div className="text-[11px] font-bold text-amber-800">{ch.subtitle}</div>
        </div>
        {open && (
          <button type="button" onClick={onOpen} className={`${btn} shrink-0 bg-amber-600 text-xs text-white`}>
            ادامه‌ی فصلِ نسل
          </button>
        )}
      </div>
      {L.phase === "goal" ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-600" style={{ width: `${Math.min(100, (p.cur / p.target) * 100)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-bold text-amber-900">
            <span className="inline-flex items-center gap-1"><Icon name="target" size={12} />{p.label}</span>
            <span>{fmt(Math.min(p.cur, p.target))}/{fmt(p.target)}</span>
          </div>
        </div>
      ) : (
        <div className="text-[11px] font-black text-amber-800">{PHASE_NOTE[L.phase]}</div>
      )}
      <div className="rounded-xl bg-white/70 p-2 text-[11px] font-bold leading-6 text-amber-950">
        <span className="font-black">روی تنه‌ی گردو: </span>
        {joinFa(lineageChain(s))}
      </div>
      <ul className="space-y-1">
        {L.heirs.map((x) => (
          <li key={x.gen} className="flex items-center justify-between rounded-lg bg-white/60 px-2 py-1 text-[11px] font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Icon name={L.completed.includes(x.gen) ? "check" : x.gen === h.gen ? "story" : "clock"} size={14} />
              نسلِ {ordinalFa(x.gen + 1)}: {x.name || "بی‌نام"}
            </span>
            <span className="text-slate-500">میراثِ {TRAIT_NAME[x.trait]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
      <LineageCard
        s={s}
        onOpen={() => {
          setLineageShown(s, true);
          ui.setPanel(null);
          game.bump();
        }}
      />
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
