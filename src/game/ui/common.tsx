"use client";

/**
 * src/game/ui/common.tsx — اجزای مشترک رابط کاربری (P5.10)
 */

import type { Events, State } from "../logic";
import { Icon } from "../icons";
import { faNum } from "../faNum";

/** همان خروجیِ toLocaleString("fa-IR")، بی‌ICU و بی‌ساختنِ NumberFormat در هر رندر (P6.5)؛ اعشار هم می‌پذیرد */
const fmtNum = (v: number) => faNum(v);

export type PanelId =
  | "market"
  | "orders"
  | "build"
  | "decor"
  | "skills"
  | "story"
  | "biz"
  | "tech"
  | "contracts"
  | "quests"
  | "achievements"
  | "help"
  | "transfer"
  | "settings";

export type Panel = null | PanelId | { bx: number; by: number };

/** رابطی که هر پنل از ریشه‌ی بازی می‌گیرد (به‌جای ده‌ها prop جدا). */
export interface UiApi {
  ev: Events;
  toast: (m: string, t?: string) => void;
  setPanel: (p: Panel) => void;
  setTool: (t: string) => void;
  setBsel: (b: string) => void;
  bsel: string;
  save: () => Promise<void>;
}

export interface PanelProps {
  s: State;
  ui: UiApi;
}

export const UI = {
  hand: "دست",
  seed: "کاشت",
  water: "آب",
  fert: "کود",
  hoe: "شخم",
  build: "ساخت",
  clear: "پاکسازی",
} as const;

export const PANEL_META: Record<PanelId, { icon: string; title: string }> = {
  market: { icon: "market", title: "بازار و انبار" },
  orders: { icon: "orders", title: "سفارش‌ها" },
  build: { icon: "build", title: "ساختمان‌ها و ماشین‌ها" },
  decor: { icon: "decor", title: "دکوراسیون" },
  skills: { icon: "skills", title: "مهارت‌ها" },
  story: { icon: "film", title: "دفتر داستان" },
  biz: { icon: "biz", title: "مدیریت کسب‌وکار" },
  tech: { icon: "tech", title: "تحقیقات" },
  contracts: { icon: "contracts", title: "قراردادها" },
  quests: { icon: "calendar", title: "اهداف روزانه" },
  achievements: { icon: "trophy", title: "دستاوردها" },
  help: { icon: "help", title: "راهنما" },
  transfer: { icon: "cloud", title: "انتقال و پشتیبان" },
  settings: { icon: "settings", title: "تنظیمات" },
};

export const TOAST_ICON: Record<string, string> = { err: "alert", ok: "check", lvl: "star", prestige: "crown", info: "sparkle" };

export const btn =
  "inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 font-bold shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-none transition disabled:opacity-40 disabled:cursor-not-allowed";

export const Coin = ({ v, size = 15 }: { v: number | string; size?: number }) => (
  <span className="inline-flex items-center gap-1">
    <Icon name="coin" size={size} />
    {typeof v === "number" ? fmtNum(v) : v}
  </span>
);

export function Spark({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data),
    mx = Math.max(...data),
    r = mx - mn || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 80},${22 - ((d - mn) / r) * 20}`).join(" ");
  const up = data[data.length - 1] >= data[data.length - 2];
  return (
    <svg width="80" height="24" className="shrink-0" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function LevelRing({ level, pct }: { level: number; pct: number }) {
  const r = 17,
    cc = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center md:h-11 md:w-11">
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="#14532d" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#ffffff33" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" strokeDasharray={cc} strokeDashoffset={cc * (1 - Math.min(1, pct))} />
      </svg>
      <span className="relative text-sm font-black text-white">{fmtNum(level)}</span>
    </span>
  );
}

export function Pill({
  icon,
  children,
  onClick,
  label,
  className = "",
}: {
  icon: string;
  children?: React.ReactNode;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 items-center gap-1.5 rounded-full bg-white/95 pl-3 pr-1.5 text-[12px] font-black text-amber-950 shadow-lg ring-1 ring-amber-900/10 transition active:scale-95 md:h-11 md:text-sm ${className}`}
    >
      <Icon name={icon} size={26} />
      {children}
    </button>
  );
}

/** کلید روشن/خاموش لمسی (۶۴×۳۲) با برچسب دسترس‌پذیر. */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-8 w-16 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"} ${disabled ? "opacity-40" : ""}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "right-1" : "right-9"}`} />
    </button>
  );
}

/** یک ردیف تنظیمات: آیکون + عنوان + توضیح + کلید. */
export function SettingRow({ icon, title, hint, children }: { icon: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow">
      <span className="flex min-w-0 flex-col text-sm font-black text-slate-800">
        <span className="flex items-center gap-2">
          <Icon name={icon} size={26} /> {title}
        </span>
        {hint && <span className="mt-0.5 text-[11px] font-bold text-slate-500">{hint}</span>}
      </span>
      {children}
    </div>
  );
}
