"use client";

/**
 * src/game/ui/panels/Trade.tsx — بازار (فروش ایمن + پیش‌نمایش درآمد) و سفارش‌ها
 */

import { useState } from "react";
import { ITEMS, NPCS, fmt } from "../../data";
import { price, sell, sellPreview, fulfill, rejectOrder } from "../../logic";
import { Icon, ItemIcon, Portrait, npcSvg } from "../../icons";
import { haptic } from "../../mobile";
import { game } from "../../store";
import { Coin, Spark, btn, type PanelProps } from "../common";

export function MarketPanel({ s, ui }: PanelProps) {
  // فروش ایمن: کدام محصول در حالت «تأیید فروش همه» است
  const [sellArm, setSellArm] = useState("");
  const rows = Object.keys(ITEMS).filter((k) => (s.inv[k] || 0) > 0);
  const doSell = (k: string, n: number) => {
    sell(s, k, n, ui.ev);
    game.bump();
  };

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-sky-100 p-2.5 text-xs leading-5 text-sky-950">
        قیمت‌ها با عرضه و تقاضا نوسان می‌کنند و فروش انبوه قیمت را موقتاً پایین می‌آورد. با تحقیقِ «مجوز صادرات» و استخدامِ «دلال بورس» سود بیشتری می‌گیری.
      </div>
      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center font-bold text-amber-900">
          <Icon name="sprout" size={64} />
          انبار خالی است؛ محصول برداشت کن.
        </div>
      )}
      {rows.map((k) => {
        const it = ITEMS[k],
          p = price(s, k),
          pct = Math.round((p / it.base - 1) * 100);
        return (
          <div key={k} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-md">
            <ItemIcon id={k} size={42} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-800">
                {it.name} <span className="text-xs text-slate-500">×{fmt(s.inv[k])}</span>
              </div>
              <div className="text-xs font-bold">
                <Coin v={p} size={14} />{" "}
                <span className={pct >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {pct >= 0 ? "▲" : "▼"}
                  {fmt(Math.abs(pct))}٪
                </span>
              </div>
            </div>
            <Spark data={s.market[k]?.hist || []} />
            <div className="flex flex-col gap-1">
              <button type="button" aria-label={`فروش یک ${it.name}`} className={`${btn} bg-emerald-600 text-xs text-white`} onClick={() => doSell(k, 1)}>
                ۱
              </button>
              <button type="button" aria-label={`فروش ده ${it.name}`} className={`${btn} bg-sky-600 text-xs text-white`} onClick={() => doSell(k, Math.min(10, s.inv[k]))}>
                ۱۰
              </button>
              <button
                type="button"
                className={`${btn} text-xs text-white ${sellArm === k ? "bg-red-600" : "bg-amber-600"}`}
                aria-label={sellArm === k ? `تأیید فروش همه‌ی ${it.name}` : `فروش همه‌ی ${it.name}`}
                onClick={() => {
                  // «همه» دو ضربه می‌خواهد تا یک لمسِ اشتباهی انبار را خالی نکند
                  if (sellArm !== k) {
                    setSellArm(k);
                    ui.toast(`دوباره بزن تا همه‌ی ${it.name} فروخته شود`, "info");
                    haptic("tap");
                    return;
                  }
                  setSellArm("");
                  doSell(k, s.inv[k]);
                }}
              >
                {sellArm === k ? "مطمئنی؟" : "همه"}
              </button>
            </div>
          </div>
        );
      })}
      {rows.length > 0 && <SalePreview s={s} rows={rows} />}
    </div>
  );
}

/** پیش‌نمایش درآمد (P5.7): قبل از فروش بدان چقدر می‌گیری و بازار چقدر افت می‌کند */
function SalePreview({ s, rows }: { s: PanelProps["s"]; rows: string[] }) {
  const totalCoins = rows.reduce((a, k) => a + sellPreview(s, k, s.inv[k]).coins, 0);
  const totalXp = rows.reduce((a, k) => a + sellPreview(s, k, s.inv[k]).xp, 0);
  const satMax = Math.max(0, ...rows.map((k) => (s.market[k]?.sat || 0) * 100));
  return (
    <div className="rounded-2xl bg-white/90 p-2.5 text-xs font-bold text-slate-700 shadow">
      اگر همین حالا کل انبار را بفروشی:{" "}
      <span className="text-emerald-700">
        <Coin v={totalCoins} size={13} />
      </span>{" "}
      و <span className="text-sky-700">+{fmt(totalXp)} تجربه</span>
      <div className="mt-1 text-[11px] leading-5 text-slate-500">
        فروش انبوه قیمت را موقتاً کم می‌کند (بیشترین افت فعلی: {fmt(Math.round(satMax))}٪). تجربه فقط از روی «ارزش» فروش داده می‌شود؛ پس تکه‌تکه
        فروختن تجربه‌ی بیشتری نمی‌دهد.
      </div>
    </div>
  );
}

export function OrdersPanel({ s, ui }: PanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-emerald-100 p-2.5 text-xs leading-5 text-emerald-950">
        سفارش‌ها بهترین راهِ درآمدِ انبوه و بالا بردن اعتبارند؛ هر امتیازِ اعتبار، سودِ سفارش‌های بعدی را بیشتر می‌کند.
      </div>
      {s.orders.map((o, i) => {
        const ok = o.items.every((it) => (s.inv[it.id] || 0) >= it.n);
        const left = Math.max(0, o.exp - s.time);
        return (
          <div key={o.id} className={`rounded-2xl border-2 bg-white p-3 shadow-md ${ok ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Portrait html={npcSvg(o.npc)} size={42} />
                <span className="font-black text-slate-800">{NPCS[o.npc] || "مشتری"}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                <Icon name="clock" size={14} /> {fmt(Math.floor(left / 60))}:{String(Math.floor(left % 60)).padStart(2, "0")}
              </span>
            </div>
            <div className="my-2.5 flex flex-wrap gap-1.5">
              {o.items.map((it) => {
                const have = s.inv[it.id] || 0;
                return (
                  <div
                    key={it.id}
                    className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold ${have >= it.n ? "bg-emerald-100 text-emerald-900" : "bg-red-50 text-red-900"}`}
                  >
                    <ItemIcon id={it.id} size={22} /> {fmt(Math.min(have, it.n))}/{fmt(it.n)}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-amber-700">
                <span className="inline-flex items-center gap-2">
                  <Coin v={o.coins} size={16} />
                  <span className="inline-flex items-center gap-1">
                    <Icon name="star" size={15} />
                    {fmt(o.xp)}
                  </span>
                </span>
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className={`${btn} bg-slate-200 text-xs text-slate-700`}
                  onClick={() => {
                    rejectOrder(s, i);
                    game.bump();
                  }}
                >
                  رد
                </button>
                <button
                  type="button"
                  disabled={!ok}
                  className={`${btn} bg-emerald-600 text-sm text-white`}
                  onClick={() => {
                    fulfill(s, i, ui.ev);
                    game.bump();
                  }}
                >
                  <Icon name="orders" size={18} /> ارسال
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
