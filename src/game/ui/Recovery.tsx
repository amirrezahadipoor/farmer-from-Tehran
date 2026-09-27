"use client";

import { useEffect, useState } from "react";
import { readErrorLog } from "../errors";

/**
 * persist (و پشتِ آن sanitize، داده‌ی بازی، IndexedDB) فقط وقتی این صفحه واقعاً دیده شد بار می‌شود: error.tsx و
 * global-error.tsx هر کدام ورودیِ جدای Next هستند و واردکردنِ مستقیم، همین کد را دو بار در بارِ اولِ صفحه می‌گذاشت.
 */
const loadPersist = () => import("../persist");

/**
 * src/game/ui/Recovery.tsx — صفحه‌ی بازیابی به‌جای صفحه‌ی سفید (نقشه‌ی راه، مورد ۴)
 * به هیچ بخشِ بازی (رندر، داده‌ی ساختمان‌ها، آیکون‌ها) وابسته نیست تا خودش هم نشکند.
 */
export default function Recovery({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  useEffect(() => {
    let live = true;
    loadPersist()
      .then((m) => live && setHasBackup(!!m.readBackupSave().state))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const restore = async () => {
    try {
      const m = await loadPersist();
      const b = m.readBackupSave();
      if (b.state) m.writeLocalSave(JSON.stringify(b.state));
    } catch {
      /* حتی اگر پشتیبان خوانده نشد، بارگذاریِ دوباره بهترین راه است */
    }
    location.reload();
  };

  const copy = async () => {
    const text = JSON.stringify({ error: error?.message, stack: error?.stack?.slice(0, 1500), log: readErrorLog().slice(-5) }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const btn = "min-h-11 w-full rounded-2xl px-4 py-3 text-base font-bold active:scale-[0.98]";
  return (
    <div role="alert" dir="rtl" className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950 p-4" style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}>
      <div className="w-full max-w-sm rounded-3xl bg-amber-50 p-5 text-slate-900 shadow-2xl ring-2 ring-amber-400">
        <h1 className="text-xl font-black text-amber-800">بازی به خطا خورد</h1>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          سیوِ شما روی همین دستگاه سالم است (بازی هر ۱۲ ثانیه ذخیره می‌کند). خطا ثبت شد تا رفع شود؛ یکی از راه‌های زیر را امتحان کنید.
        </p>
        <div className="mt-4 grid gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className={`${btn} bg-emerald-600 text-white`}>
              دوباره امتحان کن
            </button>
          )}
          <button type="button" onClick={() => location.reload()} className={`${btn} ${onRetry ? "bg-white text-emerald-800 ring-1 ring-emerald-300" : "bg-emerald-600 text-white"}`}>
            بارگذاریِ دوباره‌ی بازی
          </button>
          {hasBackup && (
            <button type="button" onClick={restore} className={`${btn} bg-white text-amber-800 ring-1 ring-amber-300`}>
              بازیابی از پشتیبانِ قبلی
            </button>
          )}
          <button type="button" onClick={copy} className={`${btn} bg-white text-slate-700 ring-1 ring-slate-300`}>
            {copied ? "رونوشت شد" : "رونوشتِ گزارشِ خطا"}
          </button>
        </div>
        {error?.message && (
          <p dir="ltr" className="mt-3 break-words rounded-xl bg-slate-100 p-2 text-left font-mono text-[11px] text-slate-500">
            {error.message.slice(0, 200)}
          </p>
        )}
      </div>
    </div>
  );
}
