"use client";

/**
 * src/game/ui/panels/Workshop.tsx — جزئیات کارگاه: صف تولید، تولید خودکار و دستورها
 */

import { BMAP, ITEMS, fmt } from "../../data";
import { collect, has, queueMax, queueRecipe, toggleAutoMode, type Tile } from "../../logic";
import { Icon, ItemIcon } from "../../icons";
import { game } from "../../store";
import { btn, type PanelProps } from "../common";

export function WorkshopPanel({ s, ui, tile: bt, x, y }: PanelProps & { tile: Tile; x: number; y: number }) {
  const def = bt.b ? BMAP[bt.b] : undefined;
  if (!def || !def.recipes.length) return <p className="p-4 text-center font-bold text-amber-900">{def?.desc}</p>;
  const maxQ = queueMax(s);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-3 shadow-md">
        <div className="mb-2 flex items-center justify-between text-sm font-black">
          <span>
            صف تولید ({fmt(bt.q?.length || 0)} / {fmt(maxQ)})
          </span>
          {bt.out && bt.out.length > 0 && (
            <button
              type="button"
              className={`${btn} bg-emerald-600 text-xs text-white`}
              onClick={() => {
                collect(s, bt, x, y, ui.ev);
                game.bump();
              }}
            >
              جمع‌آوری{" "}
              {bt.out.slice(0, 4).map((o, oi) => (
                <ItemIcon key={oi} id={o} size={16} />
              ))}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxQ }).map((_, i) => {
            const r = bt.q && bt.q[i] !== undefined ? def.recipes[bt.q[i]] : null;
            return (
              <div key={i} className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-amber-100 text-2xl shadow-inner">
                {r && i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-lime-400/70 transition-all" style={{ height: `${(bt.p || 0) * 100}%` }} />}
                <span className="relative">{r ? <ItemIcon id={r.out} size={34} /> : null}</span>
              </div>
            );
          })}
        </div>
        {bt.q && bt.q.length > 0 && (
          <div className="mt-2 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={14} />
              {fmt((1 - (bt.p || 0)) * def.recipes[bt.q[0]].time)} ثانیه تا کالای بعدی
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-md">
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700">
          <Icon name="repeat" size={20} />
          تولید خودکار پیوسته
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!!bt.autoMode}
          onClick={() => {
            toggleAutoMode(bt);
            game.bump();
          }}
          className={`rounded-xl px-3 py-1 text-xs font-bold ${bt.autoMode ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
        >
          {bt.autoMode ? "فعال" : "غیرفعال"}
        </button>
      </div>

      {def.recipes.map((r, ri) => {
        const ok = has(s, r.inp);
        const cost = Object.entries(r.inp).reduce((a, [k, n]) => a + (ITEMS[k]?.base || 0) * n, 0);
        return (
          <div key={ri} className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-md">
            <ItemIcon id={r.out} size={46} />
            <div className="flex-1">
              <div className="text-sm font-black text-slate-800">
                {ITEMS[r.out]?.name}{" "}
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500">
                  <Icon name="clock" size={12} />
                  {fmt(r.time)}ث
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                {Object.entries(r.inp).map(([k, n]) => (
                  <span
                    key={k}
                    className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-bold ${(s.inv[k] || 0) >= n ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}
                  >
                    <ItemIcon id={k} size={16} /> {fmt(s.inv[k] || 0)}/{fmt(n)}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-700">
                {(r.n || 1) > 1 && <>خروجی: {fmt(r.n)} عدد · </>}ارزش افزوده: +{fmt((ITEMS[r.out]?.base || 0) * (r.n || 1) - cost)}
              </div>
            </div>
            <button
              type="button"
              aria-label={`تولید ${ITEMS[r.out]?.name ?? ""}`}
              disabled={!ok}
              className={`${btn} bg-orange-600 text-sm text-white`}
              onClick={() => {
                queueRecipe(s, bt, ri, ui.ev);
                game.bump();
              }}
            >
              تولید
            </button>
          </div>
        );
      })}
    </div>
  );
}
