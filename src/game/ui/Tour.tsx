"use client";
/**
 * src/game/ui/Tour.tsx — آموزشِ تعاملی روی خودِ بازی (نقشه‌ی راه، مورد ۵)
 *
 * به‌جای کارت‌های متنی، پنج کارِ واقعی که فقط با عملِ خودِ بازیکن جلو می‌روند: شخم، کاشت، آبیاری، برداشت و
 * فروش. حلقه‌ی تپنده اول دورِ ابزارِ لازم و بعد روی خودِ زمینِ هدف در نقشه می‌نشیند و با دوربین جابه‌جا
 * می‌شود؛ در گامِ فروش روی دکمه‌ی بازار و بعد «فروش یک …». هر لحظه ردکردنی است و فقط یک بار می‌آید.
 */
import { useEffect, useRef, useState } from "react";
import type { State } from "../logic";
import { A, B, tileCenter } from "../render/core";
import { rt, useGameVersion } from "../store";
import { fmt } from "../data";
import { Icon } from "../icons";
import { haptic } from "../mobile";
import { readLS, writeLS } from "../persist";
import { UI } from "./common";
import { TOUR_KEY, TOUR_STEPS, type Pt, type Step } from "../tourSteps";

/** el: فهرستِ انتخاب‌گرها به ترتیبِ اولویت؛ اولین عنصرِ دیده‌شده هدف است */
type Target = { el: string[] } | { tile: Pt } | null;

/** انتخاب‌گر با برچسبِ دسترس‌پذیرِ دکمه (op: «=» دقیق، «^=» آغازِ برچسب) */
const byLabel = (label: string, op = "=") => `[aria-label${op}"${label}"]`;

/**
 * هدفِ گامِ فروش: قرصِ انبار با نشانگرِ پایدارِ data-tour (برچسبِ دیدنی‌اش «انبار ۱۸/۱۲۰» است و با
 * موجودی عوض می‌شود)، و وقتی بازار باز است دکمه‌ی فروشِ همان گندمِ برداشت‌شده، وگرنه اولین «فروش یک …».
 */
const MARKET_TARGET = ['[data-tour="market"]'];
const SELL_TARGET = [byLabel("فروش یک گندم"), byLabel("فروش یک", "^=")];

function targetOf(step: Step | undefined, s: State, tool: string, marketOpen: boolean): Target {
  if (!step) return null;
  if (!step.tool) return { el: marketOpen ? SELL_TARGET : MARKET_TARGET };
  if (tool !== step.tool) return { el: [byLabel(UI[step.tool])] };
  const p = step.tile?.(s);
  return p ? { tile: p } : null;
}

function rectOf(t: Target): { x: number; y: number; w: number; h: number; round: boolean } | null {
  if (!t) return null;
  if ("el" in t) {
    for (const sel of t.el) {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      if (r && r.width > 0) return { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12, round: false };
    }
    return null;
  }
  const v = rt.view;
  const c = tileCenter(t.tile.x, t.tile.y);
  const z = v.cam.z;
  const w = 2 * A * z * 1.15;
  const h = 2 * B * z * 1.15;
  return { x: c.x * z + v.w / 2 + v.cam.x - w / 2, y: c.y * z + v.h / 2 + v.cam.y - h / 2, w, h, round: true };
}

export function Tour({ s, tool, panelOpen, marketOpen, onDone }: { s: State; tool: string; panelOpen: boolean; marketOpen: boolean; onDone: () => void }) {
  const [step, setStep] = useState(() => (readLS(TOUR_KEY) === "1" ? -1 : 0));
  const base = useRef<number | null>(null);
  const target = useRef<Target>(null);
  const ring = useRef<HTMLDivElement>(null);
  const cur = step >= 0 ? TOUR_STEPS[step] : undefined;

  // پیشرفت فقط با عملِ واقعی: شاخصِ گام از مقدارِ آغازش بالاتر رفت (مقدارِ آغاز با شروعِ هر گام گرفته می‌شود)
  const version = useGameVersion(); // وضعیت جهش می‌یابد؛ نسخه هر تغییر را اعلام می‌کند
  useEffect(() => {
    base.current = cur ? cur.metric(s) : null;
  }, [step, cur, s]);
  useEffect(() => {
    target.current = targetOf(cur, s, tool, marketOpen);
    if (!cur || base.current === null) return;
    const m = cur.metric(s);
    // کاهشِ شاخص (موجِ گرما زمین را خشک کرد) مانع نشود؛ فقط افزایشِ تازه گام را تمام می‌کند
    if (m < base.current) base.current = m;
    else if (m > base.current || cur.auto?.(s)) {
      base.current = null;
      haptic("tap");
      setStep((n) => n + 1);
    }
  }, [cur, s, tool, marketOpen, version]);

  // حلقه هر فریم دنبالِ هدف می‌رود (دوربین نرم حرکت می‌کند و رندرِ React فقط ۴ بار در ثانیه است)
  useEffect(() => {
    if (step < 0 || step >= TOUR_STEPS.length) return;
    let raf = 0;
    const loop = () => {
      const el = ring.current;
      const r = rectOf(target.current);
      if (el) {
        el.style.display = r ? "block" : "none";
        if (r) {
          el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)`;
          el.style.width = `${Math.round(r.w)}px`;
          el.style.height = `${Math.round(r.h)}px`;
          el.style.borderRadius = r.round ? "9999px" : "18px";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  if (step < 0) return null;
  const finish = () => {
    writeLS(TOUR_KEY, "1");
    setStep(-1);
    haptic("tap");
  };
  const total = TOUR_STEPS.length;
  const done = step >= total;
  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-black text-emerald-700">
        آموزشِ تعاملی · {done ? "پایان" : `گام ${fmt(step + 1)} از ${fmt(total)}`}
      </span>
      {!done && (
        <button type="button" aria-label="رد کردن آموزش" onClick={finish} className="min-h-9 rounded-xl bg-slate-100 px-2.5 text-[11px] font-black text-slate-600 active:scale-95">
          رد کردن
        </button>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={ring}
        data-tour-ring=""
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[46] hidden shadow-[0_0_0_4px_rgba(251,191,36,0.95),0_0_22px_6px_rgba(251,191,36,0.55)] motion-safe:animate-pulse"
      />
      <section
        role="region"
        aria-label="آموزشِ تعاملی"
        className={`absolute inset-x-3 z-[45] mx-auto max-w-[440px] rounded-3xl bg-white/95 p-3 shadow-2xl ring-1 ring-emerald-200 ${panelOpen ? "top-[max(0.4rem,env(safe-area-inset-top))]" : "top-[calc(env(safe-area-inset-top)+7.2rem)]"}`}
      >
        {header}
        {done ? (
          <div className="mt-1">
            <h3 className="text-sm font-black text-slate-900">آفرین! مزرعه مالِ توست</h3>
            <p className="mt-0.5 text-[12px] font-bold leading-6 text-slate-600">
              از منو داستان، اهدافِ روزانه، ساختمان‌ها و «انتقال و پشتیبان» را پیدا می‌کنی. انگشت را نیم‌ثانیه روی زمین نگه داری، همان کار روی ۹ زمینِ اطراف انجام می‌شود.
            </p>
            <button
              type="button"
              onClick={() => {
                finish();
                onDone();
              }}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg active:scale-95"
            >
              بزن بریم!
            </button>
          </div>
        ) : (
          cur && (
            <div className={`flex items-start gap-3 ${panelOpen ? "mt-1" : "mt-2"}`}>
              {!panelOpen && (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                  <Icon name={cur.icon} size={30} />
                </span>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900">{cur.title}</h3>
                <p className="mt-0.5 text-[12px] font-bold leading-6 text-slate-600">{cur.text}</p>
                <button
                  type="button"
                  onClick={() => {
                    base.current = null;
                    setStep((n) => n + 1);
                  }}
                  className="mt-1 min-h-8 text-[11px] font-black text-slate-400 underline decoration-dotted underline-offset-4"
                >
                  این گام را رد کن
                </button>
                {!panelOpen && (
                  <div className="mt-1.5 flex gap-1" aria-hidden>
                    {TOUR_STEPS.map((_, i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-emerald-500" : i === step ? "bg-amber-400" : "bg-slate-200"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </section>
    </>
  );
}
