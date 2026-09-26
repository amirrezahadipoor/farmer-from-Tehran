"use client";

/**
 * src/game/ui/panels/Build.tsx — ساختمان‌های تولیدی و دکوراسیون
 */

import { BUILDINGS, fmt, type BuildingDef } from "../../data";
import { buildCost, countB, decorCost, canBuildDecor, type State } from "../../logic";
import { Icon } from "../../icons";
import { BuildingThumb, Coin, type PanelProps, type UiApi } from "../common";

function BuildCard({
  b,
  s,
  ui,
  lock,
  cost,
  costLabel,
  ring,
  costColor,
  hint,
}: {
  b: BuildingDef;
  s: State;
  ui: UiApi;
  lock: boolean;
  cost: number;
  costLabel?: string;
  ring: string;
  costColor: string;
  hint: string;
}) {
  const n = countB(s, b.id);
  return (
    <button
      type="button"
      disabled={lock}
      onClick={() => {
        ui.setBsel(b.id);
        ui.setTool("build");
        ui.setPanel(null);
        ui.toast(hint);
      }}
      className={`rounded-2xl bg-white p-3 text-right shadow-md transition active:scale-95 ${ui.bsel === b.id ? ring : ""} ${lock ? "opacity-50" : ""}`}
    >
      <div className="relative">
        <BuildingThumb id={b.id} dim={lock} />
        {lock && <Icon name="lock" size={26} className="absolute left-0 top-0" />}
      </div>
      <div className="mt-1 text-sm font-black text-slate-800">
        {b.name} {n > 0 && <span className="text-xs text-slate-500">({fmt(n)})</span>}
      </div>
      <div className="my-1 line-clamp-2 text-[11px] text-slate-600">{b.desc}</div>
      <div className={`text-xs font-black ${s.coins >= cost ? costColor : "text-red-500"}`}>{costLabel ?? <Coin v={cost} size={14} />}</div>
    </button>
  );
}

export function BuildPanel({ s, ui }: PanelProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {BUILDINGS.filter((b) => !b.isDecor).map((b) => {
        const lock = b.lvl > s.level;
        return (
          <BuildCard
            key={b.id}
            b={b}
            s={s}
            ui={ui}
            lock={lock}
            cost={buildCost(s, b.id)}
            costLabel={lock ? `سطح ${fmt(b.lvl)}` : undefined}
            ring="ring-3 ring-emerald-500"
            costColor="text-amber-700"
            hint={`روی یک خانه‌ی چمن یا خاکِ خالی ضربه بزن تا ${b.name} ساخته شود`}
          />
        );
      })}
    </div>
  );
}

export function DecorPanel({ s, ui }: PanelProps) {
  const can = canBuildDecor(s);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-pink-100 p-2.5 text-xs leading-5 text-pink-950">
        {!can && "برای باز شدن دکورها، دانشِ «طراحی منظر» را در تحقیقات بخر یا مهارتِ «طراح باغ» را یاد بگیر. "}
        مزرعه‌ات را مثل یک باغ ایرانی بیارای: فواره، آلاچیق، مجسمه، دیوار سنگی و باغچه‌ی بامبو.
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {BUILDINGS.filter((b) => b.isDecor).map((b) => {
          const lock = b.lvl > s.level || !can;
          return (
            <BuildCard
              key={b.id}
              b={b}
              s={s}
              ui={ui}
              lock={lock}
              cost={decorCost(s, b.id)}
              costLabel={b.lvl > s.level ? `سطح ${fmt(b.lvl)}` : !can ? "نیازمند دانش طراحی منظر" : undefined}
              ring="ring-3 ring-pink-500"
              costColor="text-pink-700"
              hint={`روی یک زمینِ خالی ضربه بزن تا دکورِ ${b.name} ساخته شود`}
            />
          );
        })}
      </div>
    </div>
  );
}
