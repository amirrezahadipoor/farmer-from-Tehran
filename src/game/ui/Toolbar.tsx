"use client";

/**
 * src/game/ui/Toolbar.tsx — نوار ابزار شست‌رس + سینی بذر
 */

import { CROPS, CMAP, FERT_COST, HOE_COST, fmt } from "../data";
import type { State } from "../logic";
import { Icon, ItemIcon } from "../icons";
import { sound } from "../audio";
import { UI, type Panel } from "./common";

export const TOOLS = [
  { id: "hand", name: UI.hand },
  { id: "seed", name: UI.seed },
  { id: "water", name: UI.water },
  { id: "fert", name: UI.fert },
  { id: "hoe", name: UI.hoe },
  { id: "build", name: UI.build },
  { id: "clear", name: UI.clear },
] as const;

/** راهنمای کوتاه هر ابزار (برای آموزش/راهنما) */
export const toolTip = (id: string, seed: string) =>
  ({
    hand: "برداشت محصول رسیده یا بررسی سازه‌ها",
    seed: `کاشت ${CMAP[seed]?.name || "بذر"} فقط روی خاک شخم‌خورده`,
    water: "آبیاری دستی خاک خشک (+۸۰٪ سرعت رشد)",
    fert: `کود تقویتی خاک (+۲ محصول) (${fmt(FERT_COST)} سکه)`,
    hoe: `شخم زدن چمن به خاک آماده (${fmt(HOE_COST)} سکه)`,
    build: "احداث ساختمان‌ها، کارخانه‌ها و ماشین‌آلات",
    clear: "قطع درخت، استخراج سنگ، یا برچیدن سازه",
  })[id] ?? "";

export function SeedTray({ s, seed, setSeed }: { s: State; seed: string; setSeed: (id: string) => void }) {
  return (
    <div className="absolute bottom-[86px] left-1/2 z-30 flex max-w-[96vw] -translate-x-1/2 gap-1.5 overflow-x-auto overscroll-contain rounded-2xl bg-amber-50/95 p-1.5 shadow-2xl ring-1 ring-amber-900/15 backdrop-blur-md">
      {CROPS.map((c) => {
        const lock = c.lvl > s.level;
        return (
          <button
            key={c.id}
            type="button"
            disabled={lock}
            aria-label={lock ? `${c.name} (سطح ${fmt(c.lvl)})` : c.name}
            aria-pressed={seed === c.id}
            onClick={() => setSeed(c.id)}
            className={`relative flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl p-1 transition md:w-16 ${
              seed === c.id ? "bg-emerald-500 text-white ring-2 ring-emerald-700" : "bg-white text-amber-950"
            } ${lock ? "opacity-45" : ""}`}
          >
            <span className="relative">
              <ItemIcon id={c.id} size={34} className={lock ? "grayscale" : ""} />
              {lock && <Icon name="lock" size={16} className="absolute -bottom-1 -left-1" />}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-black">
              {lock ? (
                fmt(c.lvl)
              ) : (
                <>
                  <Icon name="coin" size={11} />
                  {fmt(c.seed)}
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ToolbarProps {
  tool: string;
  seed: string;
  setTool: (t: string) => void;
  setPanel: (p: Panel) => void;
}

export default function Toolbar({ tool, seed, setTool, setPanel }: ToolbarProps) {
  return (
    <div
      data-tour="toolbar"
      className="absolute left-1/2 z-30 flex w-[calc(100vw-8px)] max-w-[520px] -translate-x-1/2 gap-1 overflow-x-auto overscroll-contain rounded-[22px] bg-gradient-to-b from-amber-100 to-amber-200 p-1.5 shadow-2xl ring-1 ring-amber-900/20"
      style={{ bottom: "max(8px, env(safe-area-inset-bottom))", paddingLeft: "max(6px, env(safe-area-inset-left))", paddingRight: "max(6px, env(safe-area-inset-right))" }}
    >
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-label={t.name}
          aria-pressed={tool === t.id}
          title={toolTip(t.id, seed)}
          onClick={() => {
            setTool(t.id);
            if (t.id === "build") setPanel("build");
            sound("click");
          }}
          className={`relative flex h-[56px] min-w-[44px] flex-1 shrink-0 flex-col items-center justify-center rounded-2xl transition ${
            tool === t.id ? "-translate-y-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-xl ring-2 ring-white" : "bg-white/90 shadow active:scale-90"
          }`}
        >
          {t.id === "seed" ? <ItemIcon id={seed} size={26} /> : <Icon name={t.id} size={26} />}
          <span className={`mt-0.5 text-[11px] font-black leading-none min-[430px]:text-[12px] min-[768px]:text-[13px] ${tool === t.id ? "text-white" : "text-amber-950"}`}>
            {t.name}
          </span>
        </button>
      ))}
    </div>
  );
}
