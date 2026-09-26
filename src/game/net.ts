"use client";

/**
 * src/game/net.ts — لایه‌ی شبکه و ذخیره‌سازیِ آفلاین‌فِرست
 *
 * مسئله‌ای که حل می‌کند:
 *  • قبلاً اگر POST /api/save شکست می‌خورد، فقط localStorage ذخیره می‌شد و HUD
 *    دروغ می‌گفت «ابری». حالا هر ذخیره‌ی ناموفق به «صندوق خروجی» (outbox) می‌رود
 *    و به‌محض برگشتن اینترنت، خودکار به سرور می‌رود.
 *  • ثبت Service Worker + پیش‌کش تصاویر داستان برای بازی کامل آفلاین.
 *  • هوک وضعیت شبکه تا UI بتواند صادق باشد: آنلاین/آفلاین/در صف.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { writeLocalSave } from "./persist";

const OUTBOX_KEY = "farm_outbox";
const SAVE_URL = "/api/save";
const TIMEOUT_MS = 7000;

export type SaveState = "" | "saving" | "cloud" | "queued" | "local";

interface OutboxPayload {
  id: string;
  data: unknown;
  at: number;
}

/* ------------------------------- وضعیت شبکه ------------------------------- */

export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** هوک وضعیت آنلاین/آفلاین + تلاش برای تخلیه‌ی صف در لحظه‌ی اتصال. */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(isOnline());
    const goOnline = () => {
      setOnline(true);
      void flushOutbox();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return online;
}

/* ------------------------------- صندوق خروجی ------------------------------- */

function readOutbox(): OutboxPayload | null {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxPayload) : null;
  } catch {
    return null;
  }
}

function writeOutbox(p: OutboxPayload | null) {
  try {
    if (p) localStorage.setItem(OUTBOX_KEY, JSON.stringify(p));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    /* حافظه پر یا غیرفعال */
  }
}

export function hasPendingSave() {
  return readOutbox() !== null;
}

/**
 * یک درخواست POST با مهلت زمانی؛ در صورت خطای شبکه/HTTP پرتاب می‌کند.
 * خروجی صادق است: `cloud` فقط وقتی سرور واقعاً نوشت (`ok: true`)؛ اگر سرور
 * پایگاه‌داده ندارد (`mode: "offline"`)، یعنی «فقط محلی» — نه ابری و نه قابل صف.
 */
async function postSave(id: string, data: unknown): Promise<"cloud" | "local"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data }),
      signal: controller.signal,
      keepalive: true,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json().catch(() => null)) as { ok?: boolean; mode?: string } | null;
    if (body?.ok === true) return "cloud";
    if (body?.mode === "offline") return "local"; // سرور بدون پایگاه‌داده: ذخیره فقط روی دستگاه
    throw new Error("save rejected");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ذخیره‌ی بازی: اول محلی (همیشه)، سپس ابری.
 * خروجی: وضعیتی که باید در HUD نمایش داده شود.
 */
export async function saveGame(id: string, data: unknown): Promise<SaveState> {
  // ۱) محلی: هیچ‌وقت شکست نمی‌خورد (سقوط نرم)
  try {
    writeLocalSave(JSON.stringify(data)); // + پشتیبانِ چرخشیِ نسخه‌ی سالمِ قبلی
  } catch {
    /* حافظه پر */
  }

  // ۲) اگر آفلاین هستیم، بی‌دلیل منتظر شبکه نمان
  if (!isOnline()) {
    writeOutbox({ id, data, at: Date.now() });
    return "queued";
  }

  try {
    const mode = await postSave(id, data);
    writeOutbox(null); // هر چیزی در صف بود، با نسخه‌ی تازه‌تر بی‌اعتبار شد
    return mode;
  } catch {
    writeOutbox({ id, data, at: Date.now() });
    return "queued";
  }
}

/** تخلیه‌ی صف: اگر اینترنت برگشت، آخرین سیو را به سرور می‌فرستد؛ خروجی = حالت واقعیِ ذخیره یا `false`. */
export async function flushOutbox(): Promise<"cloud" | "local" | false> {
  const pending = readOutbox();
  if (!pending || !isOnline()) return false;
  try {
    const mode = await postSave(pending.id, pending.data);
    writeOutbox(null);
    return mode;
  } catch {
    return false;
  }
}

/* ----------------------------- Service Worker ----------------------------- */

type SwEvent = "ready" | "update" | "none";

/** ثبت SW و برگرداندن وضعیت؛ در حالت dev غیرفعال است تا HMR خراب نشود. */
export function registerServiceWorker(onEvent?: (e: SwEvent) => void): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    onEvent?.("none");
    return () => undefined;
  }
  if (process.env.NODE_ENV !== "production") {
    onEvent?.("none");
    return () => undefined;
  }

  let reg: ServiceWorkerRegistration | null = null;
  let cancelled = false;

  (async () => {
    try {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      if (cancelled) return;
      onEvent?.("ready");

      // نسخه‌ی جدید → به کاربر اطلاع بده (بدون رفرش ناگهانی وسط بازی)
      reg.addEventListener("updatefound", () => {
        const sw = reg?.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) onEvent?.("update");
        });
      });

      // هر بار برگشت به اپ، از سرور نسخه‌ی تازه‌ی SW را بپرس
      const onVisible = () => {
        if (document.visibilityState === "visible") reg?.update().catch(() => undefined);
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => document.removeEventListener("visibilitychange", onVisible);
    } catch {
      onEvent?.("none");
    }
  })();

  return () => {
    cancelled = true;
  };
}

/** تصاویر داستان را وقتی اپ بیکار است در کش SW گرم می‌کند (برای اجرای آفلاین). */
export function prefetchStoryArt(urls: string[]) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  const send = () => navigator.serviceWorker.controller?.postMessage({ type: "PREFETCH", urls });
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback;
  if (idle) idle(send, { timeout: 8000 });
  else setTimeout(send, 4000);
}

/** فهرست تصاویر داستان برای پیش‌کش (نام فایل‌ها ثابت است). */
export const STORY_ART_URLS = [
  "/images/bg_sky.webp",
  "/images/logo_badge.png",
  "/images/story_office.webp",
  "/images/story_will.webp",
  "/images/story_farm.webp",
  "/images/story_grandpa.webp",
  "/images/story_festival.webp",
  "/images/story_village.webp",
  "/images/story_house.webp",
  "/images/story_landgrab.webp",
  "/images/story_barn.webp",
  "/images/story_mill.webp",
  "/images/story_livestock.webp",
  "/images/story_harvest.webp",
  "/images/story_night.webp",
  "/images/story_machines.webp",
  "/images/story_factory.webp",
  "/images/story_expo.webp",
  "/images/story_sunset.webp",
];

/* --------------------------- همگام‌سازی دوره‌ای --------------------------- */

/** هر ۳۰ ثانیه تلاش می‌کند صف را خالی کند (اگر آفلاین بودیم). */
export function useOutboxSync(onFlushed?: () => void) {
  const cb = useRef(onFlushed);
  cb.current = onFlushed;
  const online = useOnline();
  const flush = useCallback(async () => {
    const ok = await flushOutbox();
    if (ok) cb.current?.();
    return ok;
  }, []);
  useEffect(() => {
    const iv = setInterval(() => {
      if (hasPendingSave()) void flush();
    }, 30000);
    return () => clearInterval(iv);
  }, [flush, online]);
  return flush;
}
