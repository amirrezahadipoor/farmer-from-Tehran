"use client";

/**
 * src/game/ui/Hud.tsx — نوار بالا (سطح، سکه، انبار، منو، داستان، زمان/هوا) + کنترل دوربین
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { CONTRACTS, SEASONS, fmt, xpFor } from "../data";
import { capacity, claimableQuests, invCount, type State } from "../logic";
import { lightInfo } from "../render/core";
import { currentChapter, goalProgress } from "../story";
import { Icon, stripEmoji } from "../icons";
import { sound } from "../audio";
import { zoomBy, recenter } from "../useCanvasInput";
import { game } from "../store";
import type { SaveState } from "../net";
import { LevelRing, Pill, type Panel } from "./common";
import { faPad2 } from "../faNum";

/** ساعت با ارقام فارسی و دو رقمی (۰۷:۲۲) */
const two = faPad2; // بی‌ICU (P6.5)

/** شمارش نشان‌های منو: سفارش آماده، امتیاز مهارت، قرارداد و هدفِ روزانه‌ی قابل‌دریافت */
export function menuBadges(s: State) {
  const readyOrders = s.orders.filter((o) => o.items.every((it) => (s.inv[it.id] || 0) >= it.n)).length;
  const claimableContracts = s.contracts.filter((cs) => {
    const def = CONTRACTS.find((c) => c.id === cs.id);
    return def && !cs.claimed && cs.progress >= def.target;
  }).length;
  return { readyOrders, claimableContracts, skillPoints: s.stats.skillPoints, readyQuests: claimableQuests(s) };
}

/** V.10: پرده‌ی حالتِ عکس فقط با اولین لمسِ دکمه‌ی دوربین بارگذاری می‌شود */
const PhotoMode = dynamic(() => import("./Photo"), { ssr: false });

export function CameraControls() {
  const [photo, setPhoto] = useState(false);
  const items = [
    ["zoomIn", "بزرگ‌نمایی", () => zoomBy(1.25)],
    ["zoomOut", "کوچک‌نمایی", () => zoomBy(0.8)],
    ["center", "بازگشت به مزرعه", recenter],
  ] as const;
  return (
    <>
    <div className="absolute top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 md:gap-2" style={{ right: "max(8px, env(safe-area-inset-right))" }}>
      {items.map(([ic, label, fn]) => (
        <button
          key={ic}
          type="button"
          aria-label={label}
          data-cam={ic}
          onClick={() => {
            fn();
            sound("click");
          }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-amber-900/10 transition active:scale-90 md:h-[52px] md:w-[52px]"
        >
          <Icon name={ic} size={26} />
        </button>
      ))}
      <button
        type="button"
        aria-label="حالت عکس"
        data-cam="photo"
        onClick={() => {
          sound("click");
          setPhoto(true);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-amber-900/10 transition active:scale-90 md:h-[52px] md:w-[52px]"
      >
        <Icon name="camera" size={26} />
      </button>
    </div>
    {/* بیرونِ ستون: transformِ ستون برای position:fixed قابِ مرجع می‌ساخت و پرده را کوچک می‌کرد */}
    {photo && <PhotoMode onClose={() => setPhoto(false)} />}
    </>
  );
}

interface HudProps {
  s: State;
  panel: Panel;
  setPanel: (p: Panel) => void;
  openMenu: () => void;
  saveState: SaveState;
  online: boolean;
}

export default function Hud({ s, panel, setPanel, openMenu, saveState, online }: HudProps) {
  const L = lightInfo(s);
  const hh = Math.floor(L.hour),
    mm = Math.floor((L.hour - hh) * 60);
  const cap = capacity(s),
    used = invCount(s);
  const need = xpFor(s.level);
  const storyCh = currentChapter(s);
  const storyP = goalProgress(s, storyCh);
  const { readyOrders, claimableContracts, skillPoints, readyQuests } = menuBadges(s);
  const weatherIcon =
    s.weather === "rain" ? "rain" : s.weather === "snow" ? "snow" : s.weather === "fog" ? "fog" : s.weather === "heatwave" ? "heat" : L.dark > 0.3 ? "moon" : L.dusk > 0.3 ? "sunset" : "sun";
  const storyPct = storyCh.goal && !s.story.done ? Math.min(1, storyP.cur / storyP.target) : 1;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-1.5"
      style={{ padding: "max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) 8px max(8px, env(safe-area-inset-left))" }}
    >
      <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1.5 md:gap-2">
        <button
          type="button"
          aria-label={`سطح ${fmt(s.level)}`}
          onClick={() => setPanel("skills")}
          className="flex h-11 items-center gap-2 rounded-full bg-white/95 py-0.5 pl-3 pr-0.5 shadow-lg ring-1 ring-amber-900/10 active:scale-95 md:h-11"
        >
          <LevelRing level={s.level} pct={s.xp / need} />
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-[11px] font-black text-amber-950">سطح {fmt(s.level)}</span>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
              <Icon name="star" size={11} />
              {fmt(s.rep)}
            </span>
          </span>
        </button>

        <span data-coin="">
          <Pill icon="coin" label={`${fmt(s.coins)} سکه`}>
            {fmt(s.coins)}
          </Pill>
        </span>

        <Pill
          icon="box"
          label={`انبار ${fmt(used)}/${fmt(cap)}`} // نامِ دسترس‌پذیر متنِ دیدنی را در بر دارد (WCAG 2.5.3)
          onClick={() => setPanel("market")}
          tour="market"
          className={used >= cap ? "animate-pulse !bg-red-100 !text-red-800 ring-red-400" : ""}
        >
          <span className="flex flex-col items-start leading-none">
            <span>
              {fmt(used)}
              <span className="text-[10px] opacity-60">/{fmt(cap)}</span>
            </span>
            <span className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-amber-900/15">
              <span className={`block h-full rounded-full ${used / cap > 0.85 ? "bg-red-500" : "bg-sky-500"}`} style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
            </span>
          </span>
        </Pill>

        {readyQuests > 0 && (
          <Pill icon="calendar" label={`${fmt(readyQuests)} هدف روزانه آماده‌ی دریافت`} onClick={() => setPanel("quests")} className="!bg-orange-100 !text-orange-900 ring-orange-300">
            {fmt(readyQuests)}
          </Pill>
        )}

        {skillPoints > 0 && (
          <Pill icon="skills" label={`${fmt(skillPoints)} امتیاز مهارت`} onClick={() => setPanel("skills")} className="!bg-purple-100 !text-purple-900 ring-purple-300">
            {fmt(skillPoints)}
          </Pill>
        )}

        <button
          type="button"
          aria-label="منو"
          onClick={() => {
            openMenu();
            sound("click");
          }}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-amber-900/10 active:scale-95"
        >
          <Icon name="menu" size={26} />
          {(readyOrders > 0 || skillPoints > 0 || claimableContracts > 0 || readyQuests > 0) && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (s.story.shown) game.bump();
            else setPanel(panel === "story" ? null : "story");
          }}
          className={`flex h-11 max-w-[56vw] items-center gap-2 rounded-full py-0.5 pl-3 pr-1 shadow-lg ring-1 active:scale-95 md:h-11 md:max-w-[300px] ${
            s.story.shown ? "animate-pulse bg-purple-600 text-white ring-purple-300" : "bg-white/95 text-amber-950 ring-amber-900/10"
          }`}
        >
          <span className="relative inline-flex h-8 w-8 items-center justify-center md:h-9 md:w-9">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#00000014" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={94.2} strokeDashoffset={94.2 * (1 - storyPct)} />
            </svg>
            <Icon name="film" size={18} />
          </span>
          <span className="min-w-0 text-right leading-tight">
            <span className="block truncate text-[11px] font-black">{s.story.shown ? "ادامه‌ی داستان" : `فصل ${fmt(storyCh.num)} · ${storyCh.title}`}</span>
            {storyCh.goal && !s.story.done && !s.story.shown && (
              <span className="block truncate text-[9px] font-bold opacity-70">
                {fmt(Math.min(storyP.cur, storyP.target))} از {fmt(storyP.target)}
              </span>
            )}
          </span>
        </button>

        {s.currentEvent && (
          <span className="flex h-11 items-center gap-1.5 rounded-full bg-purple-100 pl-3 pr-1.5 text-[11px] font-black text-purple-900 shadow-lg ring-1 ring-purple-300 md:h-11">
            <Icon name="sparkle" size={24} />
            <span className="hidden max-w-[220px] truncate md:inline">{stripEmoji(s.currentEvent.text)}</span>
          </span>
        )}
      </div>

      <div className="pointer-events-auto flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-slate-900/75 pl-3 pr-1 text-white shadow-lg backdrop-blur-md md:h-11">
        <Icon name={weatherIcon} size={30} />
        <span className="text-right leading-tight">
          <span className="block text-[12px] font-black min-[430px]:text-[13px]">روز {fmt(s.day)}</span>
          <span className="block text-[11px] font-bold tabular-nums opacity-85 min-[430px]:text-[12px]">
            {two(hh)}:{two(mm)}
          </span>
        </span>
        <Icon name={SEASONS[s.seasonIndex].id} size={22} />
        {saveState && <Icon name={saveState === "cloud" ? "cloud" : "save"} size={16} className={saveState === "saving" ? "animate-pulse opacity-60" : "opacity-80"} />}
        {!online && <span className="rounded-full bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-black text-amber-950">آفلاین</span>}
      </div>
    </div>
  );
}
