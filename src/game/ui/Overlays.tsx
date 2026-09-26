"use client";

/**
 * src/game/ui/Overlays.tsx — لایه‌های روی نقشه: پیام‌ها، بنر سیو، آموزش اولین‌بار،
 * گزارش «در غیاب شما» و منوی اصلی موبایل.
 */

import { useCallback, useState } from "react";
import { fmt } from "../data";
import type { State } from "../logic";
import { Icon, stripEmoji } from "../icons";
import { haptic } from "../mobile";
import { sound } from "../audio";
import { readLS, writeLS } from "../persist";
import type { AwayReport } from "../usePersistence";
import { PANEL_META, TOAST_ICON, type PanelId } from "./common";
import { menuBadges } from "./Hud";

export interface Toast {
  id: number;
  m: string;
  t: string;
}

/** آخرین پیام (ضد تکرارِ پیام یکسان در کمتر از ۱.۴ ثانیه) — بیرون از رندر نگه داشته می‌شود */
let lastToast = { text: "", at: 0 };

/** صف پیام‌ها: حداکثر دو پیام، خطای قبلی با خطای تازه جایگزین می‌شود. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((raw: string, t = "info") => {
    const m = stripEmoji(raw);
    if (!m) return;
    if (t === "err") haptic("error");
    else if (t === "lvl" || t === "prestige") haptic("level");
    else if (t === "ok") haptic("success");
    const now = Date.now();
    if (lastToast.text === m && now - lastToast.at < 1400) return;
    lastToast = { text: m, at: now };
    const id = Math.random();
    setToasts((a) => [...a.filter((x) => x.t !== "err").slice(-1), { id, m, t }]);
    if (t === "err") sound("err");
    setTimeout(() => setToasts((a) => a.filter((x) => x.id !== id)), t === "lvl" || t === "prestige" ? 3600 : 2200);
  }, []);
  return { toasts, toast };
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[58px] z-40 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-1.5 md:top-[68px]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex w-full animate-[fadein_.2s] items-center gap-2 rounded-2xl py-1.5 pl-3 pr-1.5 text-[12px] font-bold shadow-xl backdrop-blur-md md:text-[13px] ${
            t.t === "err" ? "bg-red-600/95 text-white" : t.t === "lvl" || t.t === "prestige" ? "bg-slate-900/90 text-amber-100 ring-1 ring-amber-400/60" : "bg-white/95 text-slate-900"
          }`}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${t.t === "err" ? "bg-white/20" : "bg-amber-100"}`}>
            <Icon name={TOAST_ICON[t.t] || "sparkle"} size={20} />
          </span>
          <span className="line-clamp-2">{t.m}</span>
        </div>
      ))}
    </div>
  );
}

/** سیوِ معیوب بازیابی شد — بنر صادق (P5.1). فقط داخل بازی، نه روی اسپلش/داستان. */
export function SaveIssueBanner({
  issue,
  canRestore,
  onRestore,
  onDismiss,
}: {
  issue: string;
  canRestore: boolean;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="status" className="absolute inset-x-3 top-[max(8px,env(safe-area-inset-top))] z-[65] rounded-2xl bg-amber-50 p-3 shadow-xl ring-1 ring-amber-300">
      <div className="flex items-start gap-2">
        <Icon name="alert" size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black text-amber-900">سیوِ قبلی سالم نبود — بازی از دست نرفت</p>
          <p className="mt-0.5 text-[11px] font-bold leading-5 text-amber-800">
            {issue}.{" "}
            {canRestore ? "نسخه‌ی خراب قرنطینه شد و قابل بازیابی است." : "نسخه‌ی خراب برای بررسی قرنطینه شد و بازی بی‌وقفه ادامه دارد."}
          </p>
          <div className="mt-2 flex gap-2">
            {canRestore && (
              <button type="button" className="rounded-xl bg-amber-600 px-3 py-2 text-[11px] font-black text-white active:scale-95" onClick={onRestore}>
                بازیابی از پشتیبان
              </button>
            )}
            <button
              type="button"
              aria-label="بستن هشدار سیو"
              className="rounded-xl bg-white px-3 py-2 text-[11px] font-black text-amber-800 ring-1 ring-amber-300 active:scale-95"
              onClick={() => {
                onDismiss();
                haptic("tap");
              }}
            >
              ادامه با همین بازی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ONBOARD_STEPS = [
  {
    icon: "hand",
    title: "ضربه = یک زمین",
    body: "با ابزارِ انتخاب‌شده در نوار پایین، روی هر زمین ضربه بزن: شخم، کاشت، آبیاری یا برداشت.",
  },
  {
    icon: "sparkle",
    title: "نگه‌داشتن انگشت = ۳×۳",
    body: "انگشتت را نیم‌ثانیه روی زمین نگه دار تا همان کار روی ۹ زمین اطراف انجام شود — برای کاشتِ ردیفی، عالی است.",
  },
  {
    icon: "menu",
    title: "ابزارها و منو",
    body: "کاشت/آب/کود/شخم/ساخت در نوار پایینِ شست‌رس است؛ منو و وضعیت بازی در بالای صفحه، و بزرگ/کوچک‌نمایی کنارِ نقشه.",
  },
];

/** آموزش تعاملی اولین‌بار (۳ گام، یک‌بار برای همیشه). */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(() => (readLS("farm_onboard") === "1" ? 0 : 1));
  if (step === 0) return null;
  const cur = ONBOARD_STEPS[step - 1];
  const finish = () => {
    writeLS("farm_onboard", "1");
    setStep(0);
  };
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className="mb-[max(84px,env(safe-area-inset-bottom))] w-full max-w-[440px] rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-black text-emerald-700">آموزش سریع · گام {fmt(step)} از ۳</span>
          <button
            type="button"
            aria-label="رد کردن آموزش"
            className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600"
            onClick={() => {
              finish();
              haptic("tap");
            }}
          >
            رد کردن
          </button>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
            <Icon name={cur.icon} size={34} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900">{cur.title}</h3>
            <p className="mt-0.5 text-[12px] font-bold leading-6 text-slate-600">{cur.body}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {step > 1 && (
            <button
              type="button"
              className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700 active:scale-95"
              onClick={() => {
                setStep(step - 1);
                haptic("tap");
              }}
            >
              قبلی
            </button>
          )}
          <button
            type="button"
            className="flex h-12 flex-[1.6] items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg active:scale-95"
            onClick={() => {
              haptic("tap");
              if (step < 3) setStep(step + 1);
              else {
                finish();
                onDone();
              }
            }}
          >
            {step < 3 ? "بعدی" : "بزن بریم!"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** گزارش «در غیاب شما» — آفلاین‌تایم باید دیده شود، نه اینکه در سکوت بگذرد. */
export function AwayCard({ away, onClose }: { away: AwayReport; onClose: () => void }) {
  const sign = (n: number) => (n >= 0 ? "+" : "−");
  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-[96px] z-40 rounded-3xl bg-white/97 p-3 shadow-2xl ring-1 ring-emerald-900/10 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-black text-emerald-900">
          <Icon name="moon" size={22} /> در غیاب شما
        </span>
        <button
          type="button"
          aria-label="بستن گزارش غیاب"
          onClick={() => {
            haptic("tap");
            onClose();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-600"
        >
          ✕
        </button>
      </div>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500">{fmt(away.minutes)} دقیقه بیرون بودی؛ مزرعه خواب نماند:</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] font-black text-slate-700">
        <span className="flex items-center gap-1 rounded-xl bg-amber-50 px-2 py-1">
          <Icon name="sprout" size={16} /> {fmt(away.ready)} محصول رسیده
        </span>
        <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2 py-1">
          <Icon name="coin" size={16} /> {sign(away.coins)}
          {fmt(Math.abs(away.coins))} سکه
        </span>
        <span className="flex items-center gap-1 rounded-xl bg-sky-50 px-2 py-1">
          <Icon name="star" size={16} /> {sign(away.xp)}
          {fmt(Math.abs(away.xp))} تجربه
        </span>
        <span className="flex items-center gap-1 rounded-xl bg-purple-50 px-2 py-1">
          <Icon name="calendar" size={16} /> {fmt(away.days)} روز گذشته{away.levels > 0 ? ` · ${fmt(away.levels)} سطح` : ""}
        </span>
      </div>
    </div>
  );
}

export const MENU_ITEMS: PanelId[] = ["story", "market", "orders", "biz", "skills", "tech", "decor", "contracts", "achievements", "help", "settings"];

/** منوی اصلی موبایل — گرید لمسی با برچسب. */
export function MainMenu({ s, onPick, onClose }: { s: State; onPick: (p: PanelId) => void; onClose: () => void }) {
  const { readyOrders, claimableContracts, skillPoints } = menuBadges(s);
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[560px] rounded-t-3xl bg-gradient-to-b from-amber-50 to-orange-100 p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-amber-900/30" />
        <div className="grid grid-cols-4 gap-2">
          {MENU_ITEMS.map((p) => {
            const badge = p === "orders" ? readyOrders : p === "skills" ? skillPoints : p === "contracts" ? claimableContracts : 0;
            return (
              <button
                key={p}
                type="button"
                aria-label={PANEL_META[p].title}
                onClick={() => {
                  haptic("tap");
                  onPick(p);
                }}
                className="relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/95 px-1 py-2.5 shadow-md ring-1 ring-amber-900/10 active:scale-95"
              >
                <Icon name={PANEL_META[p].icon} size={30} />
                <span className="text-[11px] font-black leading-none text-amber-950">{PANEL_META[p].title}</span>
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
                    {fmt(badge)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            onClose();
          }}
          className="mt-3 w-full rounded-2xl bg-amber-800 py-3 text-base font-black text-white shadow-lg active:scale-[.98]"
        >
          بستن
        </button>
      </div>
    </div>
  );
}
