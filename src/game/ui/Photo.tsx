"use client";
/**
 * src/game/ui/Photo.tsx — V.10: پرده‌ی حالتِ عکس
 *
 * با اولین لمسِ دکمه‌ی دوربین بارگذاری می‌شود (بسته‌ی اولیه سنگین نمی‌شود). لحظه‌ی باز شدن از
 * نمای فعلی عکس می‌گیرد؛ عوض کردنِ قاب فقط همان عکس را دوباره ترکیب می‌کند. زمانِ ترکیب و
 * ساختِ PNG روی data-photo-ms نوشته می‌شود تا e2e بودجه‌ی ≤ ۲ ثانیه را بسنجد.
 *
 * رزولوشنِ تطبیقی روی دستگاهِ کند بوم را تا نیم‌برابر پایین می‌آورد؛ عکسِ یادگاری نباید تار باشد،
 * پس پیش از گرفتن DPR موقتاً روی مقدارِ کامل (حداکثر ۲) قفل می‌شود تا یک فریمِ کامل کشیده شود.
 */
import { useEffect, useRef, useState } from "react";
import { SEASONS } from "../data";
import { game, rt } from "../store";
import { asset } from "../base";
import { sound } from "../audio";
import { haptic } from "../mobile";
import {
  FRAMES, canShareFiles, canvasToPng, composePhoto, downloadBlob, frameForSeason, loadSky, photoCaption, photoFileName, sharePng, takeSnapshot,
  type FrameId, type Snapshot,
} from "../photo";

export default function PhotoMode({ onClose }: { onClose: () => void }) {
  const s = game.get();
  const [frame, setFrame] = useState<FrameId>(() => frameForSeason(s?.seasonIndex ?? 0));
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [redraw, setRedraw] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ms, setMs] = useState<number | null>(null);
  const [share] = useState(canShareFiles);
  const skyReady = useRef<Promise<void>>(Promise.resolve());
  const cvRef = useRef<HTMLCanvasElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  const season = SEASONS[s?.seasonIndex ?? 0] ?? SEASONS[0];
  const caption = s ? photoCaption(s.story.name, s.day, season.name) : "";
  const fileName = s ? photoFileName(s.day, s.seasonIndex) : "golden-valley.png";
  const frameName = FRAMES.find((f) => f.id === frame)?.name ?? "";

  // عکس با DPRِ کامل: قفل ← صبر تا بوم با اندازه‌ی تازه کشیده شود (حداکثر ~۱ ثانیه) ← گرفتن ← آزاد کردن
  useEffect(() => {
    let alive = true;
    const prev = rt.dprLock;
    const full = Math.min(2, window.devicePixelRatio || 1);
    rt.dprLock = full;
    const cv = document.querySelector<HTMLCanvasElement>("canvas[data-map]");
    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const t0 = performance.now();
    void (async () => {
      for (let i = 0; i < 90 && performance.now() - t0 < 1000; i++) {
        await nextFrame();
        if (cv && cv.clientWidth && Math.abs(cv.width - Math.round(cv.clientWidth * full)) <= 2) {
          await nextFrame(); // فریمِ کامل با اندازه‌ی تازه
          break;
        }
      }
      const shot = takeSnapshot(document);
      rt.dprLock = prev;
      if (!alive) return;
      if (shot) setSnap(shot);
      else setFailed(true);
    })();
    return () => {
      alive = false;
      rt.dprLock = prev;
    };
  }, []);

  useEffect(() => {
    if (!snap) return;
    skyReady.current = loadSky(asset("/images/bg_sky.webp")).then((img) => {
      snap.sky = img;
      setRedraw((n) => n + 1);
    });
    // نوشته‌ی قاب با فونتِ بازی؛ اگر فونت دیر برسد، پیش‌نمایش یک بار دیگر کشیده می‌شود
    void document.fonts
      ?.load("bold 15px Vazirmatn")
      .then(() => setRedraw((n) => n + 1))
      .catch(() => {});
    saveRef.current?.focus();
  }, [snap]);

  useEffect(() => {
    if (snap && cvRef.current) composePhoto(cvRef.current, snap, frame, caption);
  }, [snap, frame, caption, redraw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // بازگشتِ تمرکز به دکمه‌ای که این قاب را باز کرده (قراردادِ صفحه‌کلید)
  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (returnTo && returnTo.isConnected) returnTo.focus();
    };
  }, []);

  /** ترکیب + PNG؛ زمان از لحظه‌ی ترکیب تا آماده شدنِ فایل سنجیده می‌شود */
  const produce = async (): Promise<Blob | null> => {
    if (!snap || !cvRef.current) return null;
    await skyReady.current;
    const t0 = performance.now();
    const blob = await canvasToPng(composePhoto(cvRef.current, snap, frame, caption));
    setMs(Math.max(1, Math.round(performance.now() - t0)));
    return blob;
  };

  const onSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await produce();
      if (!blob) return;
      downloadBlob(blob, fileName);
      haptic("tap");
      sound("goal");
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await produce();
      if (!blob) return;
      const r = await sharePng(blob, fileName, "مزرعه‌ی من");
      if (r === "unsupported") downloadBlob(blob, fileName);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="حالت عکس"
      data-testid="photo-mode"
      data-photo-ms={ms ?? undefined}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-md flex-col gap-2.5 rounded-3xl bg-white p-3 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black text-amber-950">حالت عکس</h2>
          <button type="button" aria-label="بستن حالت عکس" onClick={onClose} className="min-h-10 rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-600 active:scale-95">
            بستن
          </button>
        </div>

        {snap ? (
          <canvas
            ref={cvRef}
            role="img"
            aria-label={frame === "none" ? "پیش‌نمایشِ عکسِ مزرعه، بی‌قاب" : `پیش‌نمایشِ عکسِ مزرعه با قابِ ${frameName}`}
            className="mx-auto block h-auto max-h-[50vh] w-auto max-w-full rounded-2xl shadow-md"
          />
        ) : (
          <p className="rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900">
            {failed ? "نقشه هنوز آماده نیست؛ چند لحظه بعد دوباره امتحان کن." : "در حالِ گرفتنِ عکس…"}
          </p>
        )}

        <div role="group" aria-label="قابِ عکس" className="grid grid-cols-5 gap-1.5">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={frame === f.id}
              onClick={() => {
                setFrame(f.id);
                sound("click");
              }}
              className={`min-h-11 rounded-xl px-1 text-xs font-black transition active:scale-95 ${
                frame === f.id ? "bg-amber-500 text-white shadow" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            ref={saveRef}
            type="button"
            aria-label="دانلود عکس"
            disabled={busy || !snap}
            onClick={() => void onSave()}
            className="min-h-12 flex-1 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow active:scale-95 disabled:opacity-50"
          >
            {busy ? "در حالِ ساختِ عکس…" : "دانلود عکس"}
          </button>
          {share && (
            <button
              type="button"
              aria-label="اشتراک عکس"
              disabled={busy || !snap}
              onClick={() => void onShare()}
              className="min-h-12 rounded-2xl bg-sky-600 px-4 text-sm font-black text-white shadow active:scale-95 disabled:opacity-50"
            >
              اشتراک
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
