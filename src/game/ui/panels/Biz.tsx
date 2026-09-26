"use client";

/**
 * src/game/ui/panels/Biz.tsx — آمار کسب‌وکار، نیروی انسانی و تناسخ مزرعه
 */

import { useState } from "react";
import { WORKERS, fmt, type WorkerKind } from "../../data";
import { hire, fireWorker } from "../../logic";
import { Icon, Portrait, workerSvg } from "../../icons";
import { haptic } from "../../mobile";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";
import { LegacySection } from "./Legacy";

export function BizPanel({ s, ui }: PanelProps) {
  const stats: [string, string, number][] = [
    ["bag", "کل درآمد", s.stats.earned],
    ["trendDown", "کل مخارج", s.stats.spent],
    ["sprout", "برداشت", s.stats.harvested],
    ["factory", "تولید کارگاهی", s.stats.produced],
    ["cow", "محصولات دامی", s.stats.animals],
    ["decor", "دکورها", s.stats.decorations],
    ["orders", "سفارش تحویلی", s.stats.orders],
    ["trendUp", "سود خالص", s.stats.earned - s.stats.spent],
  ];

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {stats.map(([ic, n, v]) => (
          <div key={n} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow">
            <Icon name={ic} size={30} />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold text-slate-500">{n}</div>
              <div className={`text-base font-black ${v < 0 ? "text-red-600" : "text-emerald-700"}`}>{fmt(v)}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="flex items-center gap-2 text-base font-black text-amber-950">
        <Icon name="workers" size={24} />
        نیروی انسانی
      </h3>
      {(Object.keys(WORKERS) as WorkerKind[]).map((k) => {
        const w = WORKERS[k],
          n = s.workers.filter((x) => x.kind === k).length,
          lock = w.lvl > s.level;
        return (
          <div key={k} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md">
            <Portrait html={workerSvg(k)} size={48} />
            <div className="flex-1">
              <div className="text-sm font-black text-slate-800">
                {w.name} <span className="text-xs font-bold text-slate-500">×{fmt(n)}</span>
              </div>
              <div className="text-[11px] text-slate-600">{w.desc}</div>
              <div className="text-xs font-bold text-red-600">
                حقوق روزانه: <Coin v={w.wage} size={12} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={lock}
                className={`${btn} bg-emerald-600 text-xs text-white`}
                onClick={() => {
                  hire(s, k, ui.ev);
                  game.bump();
                }}
              >
                {lock ? (
                  `سطح ${fmt(w.lvl)}`
                ) : (
                  <>
                    استخدام <Coin v={w.hire} size={13} />
                  </>
                )}
              </button>
              {n > 0 && (
                <button
                  type="button"
                  className={`${btn} bg-red-100 text-xs text-red-700`}
                  onClick={() => {
                    fireWorker(s, k);
                    game.bump();
                  }}
                >
                  تعدیل
                </button>
              )}
            </div>
          </div>
        );
      })}

      <LegacySection s={s} ui={ui} />

      <button
        type="button"
        className={`${btn} w-full bg-sky-600 text-white`}
        onClick={() => {
          void ui.save();
          ui.toast("بازی ذخیره شد", "ok");
        }}
      >
        <Icon name="save" size={18} /> ذخیره دستی
      </button>
    </div>
  );
}
