"use client";

/**
 * src/game/ui/panels/Legacy.tsx — تناسخِ مزرعه: مزایای نسلِ فعلی و بعدی، پیش‌نمایشِ ارثیه
 * و شجره‌نامه‌ی نسل‌ها (P6.3)
 */

import { useState } from "react";
import { fmt } from "../../data";
import {
  INHERIT_SHARE,
  PRESTIGE_COINS,
  prestigeCoins,
  PRESTIGE_LEVEL,
  canPrestige,
  doPrestige,
  generationRows,
  inheritedChunks,
  legacyPerks,
} from "../../logic";
import { Icon } from "../../icons";
import { haptic } from "../../mobile";
import { game } from "../../store";
import { Coin, btn, type PanelProps } from "../common";

export function LegacySection({ s, ui }: PanelProps) {
  const [arm, setArm] = useState(false);
  const ready = canPrestige(s);
  const perks = legacyPerks(s.prestige);
  const rows = generationRows(s);
  const inherit = Math.floor(s.coins * INHERIT_SHARE);

  return (
    <div className="space-y-3 rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-amber-100 to-yellow-200 p-3.5 shadow-md">
      <div>
        <h4 className="flex items-center gap-1.5 text-sm font-black text-amber-950">
          <Icon name="crown" size={22} />
          تناسخ مزرعه — نسل {fmt(s.prestige + 1)}
        </h4>
        <p className="mt-1 text-xs leading-5 text-amber-900">
          مزرعه را به نسلِ بعد بسپار. زمین از نو شروع می‌شود، اما این‌ها به ارث می‌رسند:
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white/80 ring-1 ring-amber-300">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-amber-200 px-2.5 py-1.5 text-[10px] font-black text-amber-800">
          <span>مزیت</span>
          <span>اکنون</span>
          <span>نسلِ بعد</span>
        </div>
        {perks.map((p) => (
          <div key={p.title} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-amber-100 px-2.5 py-1.5 text-xs last:border-0">
            <span className="flex min-w-0 items-center gap-1.5 font-bold text-slate-800">
              <Icon name={p.icon} size={18} />
              <span className="truncate">{p.title}</span>
              {p.fresh && <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 text-[9px] font-black leading-4 text-white">تازه</span>}
            </span>
            <span className="font-bold text-slate-500">{p.now}</span>
            <span className="font-black text-emerald-700">{p.next}</span>
          </div>
        ))}
      </div>

      {ready && (
        <div className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 text-xs font-bold text-amber-950 ring-1 ring-amber-300">
          <Icon name="gift" size={22} />
          <span>
            ارثیه اگر همین حالا تناسخ کنی: <Coin v={1000 * (s.prestige + 1) + inherit} size={13} /> و {fmt(inheritedChunks(s.prestige + 1))} قطعه زمین
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          if (!arm) {
            setArm(true);
            haptic("tap");
            ui.toast("برای شروع نسل تازه دوباره بزن", "info");
            return;
          }
          setArm(false);
          doPrestige(s, ui.ev);
          game.bump();
        }}
        className={`${btn} min-h-11 w-full text-sm text-white ${arm ? "bg-red-600" : "bg-gradient-to-r from-amber-500 to-yellow-600"}`}
      >
        {!ready ? `نیاز: سطح ${fmt(PRESTIGE_LEVEL)} و ${fmt(prestigeCoins(s))} سکه` : arm ? "مطمئنی؟ آغاز نسل تازه" : "آغاز تناسخ"}
      </button>

      <div>
        <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-amber-950">
          <Icon name="story" size={18} /> شجره‌نامه
        </h5>
        {rows.length === 0 ? (
          <p className="rounded-xl bg-white/70 p-2.5 text-xs text-amber-900">هنوز هیچ نسلی کامل نشده است؛ نسلِ اول، داستانِ خودت است.</p>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.gen} className="rounded-xl bg-white/85 p-2.5 text-[11px] leading-5 text-slate-700 ring-1 ring-amber-200">
                <div className="flex items-center justify-between text-xs font-black text-amber-950">
                  <span>نسل {fmt(r.gen + 1)}</span>
                  <span className="text-slate-500">
                    {fmt(r.day)} روز · سطح {fmt(r.level)}
                  </span>
                </div>
                درآمد {fmt(r.earned)} سکه · برداشت {fmt(r.harvested)} · سفارش {fmt(r.orders)} · ارثیه {fmt(r.inherited)} سکه
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
