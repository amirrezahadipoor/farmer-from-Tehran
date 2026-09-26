"use client";

/**
 * src/game/ui/panels/Quests.tsx — اهداف روزانه و هفتگی، زنجیره و نشان‌ها (P6.2)
 */

import { useEffect, useState } from "react";
import { fmt } from "../../data";
import {
  STREAK_BADGES,
  claimQuest,
  dayBonus,
  ensureQuests,
  questIcon,
  questProgress,
  questTitle,
  secondsToMidnight,
  type QuestEntry,
  type State,
} from "../../logic";
import { Icon, ItemIcon } from "../../icons";
import { haptic } from "../../mobile";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";

function QuestIcon({ e }: { e: QuestEntry }) {
  const k = questIcon(e);
  return k.startsWith("item:") ? <ItemIcon id={k.slice(5)} size={30} /> : <Icon name={k.slice(3)} size={30} />;
}

function QuestCard({ s, e, weekly, onClaim }: { s: State; e: QuestEntry; weekly?: boolean; onClaim: () => void }) {
  const p = questProgress(s, e);
  const done = p >= e.target;
  const title = questTitle(e);
  const tone = e.claimed ? "border-emerald-200 bg-emerald-50/60" : done ? "border-amber-300 bg-white" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border-2 p-3 shadow-md ${tone} ${weekly ? "ring-2 ring-purple-200" : ""}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${weekly ? "bg-purple-50" : "bg-amber-50"}`}>
          <QuestIcon e={e} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black leading-5 text-slate-800">{title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-amber-800">
            <Coin v={e.coins} size={13} />
            <span>+{fmt(e.xp)} تجربه</span>
            {e.sp > 0 && <span className="text-purple-700">+{fmt(e.sp)} امتیاز مهارت</span>}
          </div>
        </div>
        {e.claimed ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-black text-emerald-700">
            <Icon name="check" size={20} /> گرفته شد
          </span>
        ) : (
          <button
            type="button"
            disabled={!done}
            onClick={onClaim}
            aria-label={`دریافت پاداش: ${title}`}
            className={`${btn} min-h-11 shrink-0 text-sm text-white ${weekly ? "bg-purple-600" : "bg-emerald-600"}`}
          >
            دریافت
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={e.target}
          aria-valuenow={p}
        >
          <div className={`h-full bg-gradient-to-l ${weekly ? "from-purple-400 to-purple-600" : "from-amber-400 to-orange-500"}`} style={{ width: `${(p / e.target) * 100}%` }} />
        </div>
        <span className="shrink-0 text-[11px] font-black text-slate-500">
          {fmt(p)} از {fmt(e.target)}
        </span>
      </div>
    </div>
  );
}

export function QuestsPanel({ s, ui }: PanelProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  // اگر پنل پیش از اولین تیکِ حلقه باز شد، اهداف همین‌جا (بیرون از رندر) ساخته می‌شوند
  useEffect(() => {
    if (!s.quests && ensureQuests(s, new Date())) game.bump();
  }, [s]);
  const q = s.quests;
  if (!q) return <div className="p-4 text-center text-sm font-bold text-slate-500">در حال آماده‌سازیِ اهدافِ امروز</div>;
  const left = secondsToMidnight(new Date(now));
  const claim = (which: number | "weekly") => {
    if (claimQuest(s, which, ui.ev)) haptic("success");
    game.bump();
  };
  const doneCount = q.daily.filter((e) => e.claimed).length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-l from-orange-100 to-amber-50 p-3 shadow ring-1 ring-orange-200">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-black text-orange-950">
            <Icon name="flame" size={30} />
            زنجیره‌ی {fmt(q.streak)} روزه
          </span>
          <span className="text-[11px] font-bold text-orange-800">بهترین: {fmt(q.best)} روز</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {STREAK_BADGES.map((b) => {
            const got = q.badges.includes(b.days);
            return (
              <div
                key={b.days}
                className={`flex flex-col items-center rounded-xl bg-white/85 px-1 py-1.5 text-center ${got ? "ring-2 ring-amber-300" : "opacity-50 grayscale"}`}
                aria-label={`نشان «${b.title}» برای زنجیره‌ی ${fmt(b.days)} روزه${got ? " — گرفته شد" : ""}`}
              >
                <Icon name={`badge${b.days}`} size={36} />
                <span className="mt-0.5 text-[10px] font-black leading-4 text-slate-700">{fmt(b.days)} روز</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] font-bold leading-5 text-orange-900">هر روز هر سه هدف را کامل کن تا زنجیره ادامه پیدا کند؛ هر نشان امتیاز مهارت و سکه‌ی دائمی می‌دهد.</p>
      </div>

      <div className="flex items-center justify-between px-1 text-xs font-black text-slate-700">
        <span className="flex items-center gap-1.5">
          <Icon name="calendar" size={20} /> اهداف امروز ({fmt(doneCount)} از {fmt(q.daily.length)})
        </span>
        <span className="font-bold text-slate-500">
          تازه‌شدن تا {fmt(Math.floor(left / 3600))} ساعت و {fmt(Math.floor((left % 3600) / 60))} دقیقه
        </span>
      </div>
      {q.daily.map((e, i) => (
        <QuestCard key={e.id} s={s} e={e} onClaim={() => claim(i)} />
      ))}

      <div className={`flex items-center gap-2 rounded-2xl p-3 text-xs font-black shadow ${q.bonus ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>
        <Icon name={q.bonus ? "check" : "gift"} size={24} />
        {q.bonus ? "جایزه‌ی امروز گرفته شد؛ فردا زنجیره را ادامه بده" : `هر سه هدف = جایزه‌ی روز: +${fmt(dayBonus(s))} سکه و یک روز به زنجیره`}
      </div>

      {q.weekly && (
        <>
          <div className="flex items-center gap-1.5 px-1 pt-1 text-xs font-black text-purple-900">
            <Icon name="trophy" size={20} /> هدفِ این هفته
          </div>
          <QuestCard s={s} e={q.weekly} weekly onClaim={() => claim("weekly")} />
        </>
      )}
    </div>
  );
}
