"use client";

/**
 * src/game/ui/panels/Progress.tsx — درخت مهارت و تحقیقات
 */

import { SKILLS, TECH_TREE, fmt } from "../../data";
import { learnSkill, unlockTech, nextUnlock } from "../../logic";
import { Icon, skillIcon, stripEmoji, techIcon } from "../../icons";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";

/** «بازکردنیِ بعدی»: هدفِ روشن برای سطحِ بعد (P5.4) */
function NextUnlockCard({ level }: { level: number }) {
  const nx = nextUnlock(level);
  if (!nx) return null;
  return (
    <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
        <Icon name="target" size={18} />
        بازکردنیِ بعدی · سطح {fmt(nx.level)}
      </div>
      <div className="mt-1 text-[12px] font-bold leading-6 text-emerald-800">{nx.items.map((u) => stripEmoji(u.name)).join("، ")}</div>
    </div>
  );
}

export function SkillsPanel({ s, ui }: PanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-purple-100 p-3 text-purple-950">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-black">
            <Icon name="skills" size={22} />
            درخت مهارت‌های کشاورز
          </div>
          <div className="mt-0.5 text-xs text-purple-800">با هر سطحِ تازه، ۱ امتیاز مهارت می‌گیری.</div>
        </div>
        <div className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-black text-white shadow">موجودی: {fmt(s.stats.skillPoints)} امتیاز</div>
      </div>

      <NextUnlockCard level={s.level} />

      <div className="grid grid-cols-1 gap-2.5">
        {SKILLS.map((sk) => {
          const learned = s.skills.includes(sk.id);
          const reqOk = !sk.req || s.skills.includes(sk.req);
          const canLearn = !learned && reqOk && s.stats.skillPoints >= sk.cost;
          return (
            <div
              key={sk.id}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-3 shadow-md ${learned ? "border-purple-500 bg-purple-50/60 ring-1 ring-purple-300" : "border-slate-200"}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100">
                <Icon name={skillIcon(sk.id)} size={30} />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-800">{sk.name}</span>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">{sk.effect}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-600">{sk.desc}</div>
                {!reqOk && <div className="mt-0.5 text-[10px] text-amber-700">پیش‌نیاز: {SKILLS.find((x) => x.id === sk.req)?.name}</div>}
              </div>
              {learned ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-purple-700">
                  <Icon name="check" size={18} />
                  فعال
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!canLearn}
                  onClick={() => {
                    learnSkill(s, sk.id, ui.ev);
                    game.bump();
                  }}
                  className={`${btn} bg-purple-600 text-xs text-white`}
                >
                  {fmt(sk.cost)} امتیاز
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TechPanel({ s, ui }: PanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-indigo-100 p-2.5 text-xs leading-5 text-indigo-950">
        هر تحقیق برای همیشه (حتی پس از تناسخ) ارزش و سرعتِ تولیدت را بالا می‌برد و تجهیزاتِ پیشرفته را باز می‌کند.
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {TECH_TREE.map((tech) => {
          const unlocked = s.techs.includes(tech.id);
          const reqOk = !tech.req || s.techs.includes(tech.req);
          const lvlOk = (tech.lvl ?? 0) <= s.level;
          return (
            <div
              key={tech.id}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-3 shadow-md ${unlocked ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200"}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                <Icon name={techIcon(tech.id)} size={30} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-black text-slate-800">{tech.name}</div>
                <div className="text-xs text-slate-600">{tech.desc}</div>
                {!reqOk && <div className="text-[10px] text-amber-700">پیش‌نیاز: {TECH_TREE.find((x) => x.id === tech.req)?.name ?? tech.req}</div>}
              </div>
              {unlocked ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
                  <Icon name="check" size={18} />
                  انجام شد
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={lvlOk ? `تحقیق ${tech.name}` : `${tech.name} — سطح ${fmt(tech.lvl ?? 0)}`}
                  disabled={!reqOk || !lvlOk || s.coins < tech.cost}
                  onClick={() => {
                    unlockTech(s, tech.id, ui.ev);
                    game.bump();
                  }}
                  className={`${btn} bg-indigo-600 text-xs text-white`}
                >
                  {lvlOk ? <Coin v={tech.cost} size={14} /> : <>سطح {fmt(tech.lvl ?? 0)}</>}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
