"use client";

/**
 * src/game/mobile.ts — لایه‌ی «فقط موبایل» بازی
 *
 * هر چیزی که یک بازی موبایلِ آفلاین باید داشته باشد و در نسخه‌ی قبلی نبود:
 *  - تمام‌صفحه‌ی واقعی (بدون نوار آدرس) با fallback برای iOS
 *  - بیدارنگه‌داشتن صفحه (Wake Lock) تا وسط بازی صفحه خاموش نشود
 *  - لرزش لمسی (Haptics) برای کاشت/برداشت/خطا/سطح جدید
 *  - بستن ناخواسته‌ها: زوم دوباره‌ضربه، pinch-zoom، منوی لمس‌بلند، کشیدن صفحه
 *  - ارتفاع درست در مرورگرهای موبایل (نوار آدرسِ متغیر) از طریق visualViewport
 *  - قفل جهت (اختیاری، فقط وقتی پشتیبانی شود)
 */
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------ لرزش لمسی ------------------------------ */
export type HapticKind = "tap" | "success" | "error" | "level" | "big";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  success: [10, 30, 14],
  error: [26, 60, 26],
  level: [12, 40, 12, 40, 26],
  big: [18, 50, 18, 50, 18, 50, 40],
};

let hapticsOn = true;
export function setHaptics(on: boolean) {
  hapticsOn = on;
  try {
    localStorage.setItem("farm_haptics", on ? "1" : "0");
  } catch {
    /* حافظه در دسترس نیست */
  }
}
export function hapticsEnabled() {
  return hapticsOn;
}
export function haptic(kind: HapticKind = "tap") {
  if (!hapticsOn) return;
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    /* پشتیبانی نمی‌شود */
  }
}

/* --------------------------- تمام‌صفحه و بیداری --------------------------- */
type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function fullscreenSupported() {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as FsEl;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen() {
  if (typeof document === "undefined") return false;
  const d = document as FsDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function enterFullscreen() {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  } catch {
    /* iOS Safari اجازه نمی‌دهد؛ بی‌صدا رد می‌شویم */
  }
}

export async function exitFullscreen() {
  const d = document as FsDoc;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch {
    /* نادیده */
  }
}

/** صفحه را بیدار نگه می‌دارد؛ در بازگشت به تب، خودکار دوباره قفل می‌گیرد. */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        const lock = await nav.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        lockRef.current = lock;
      } catch {
        /* مرورگر پشتیبانی نمی‌کند یا کاربر اجازه نداد */
      }
    };
    void acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}

/* --------------------------- قفل جهت صفحه --------------------------- */
/** نوعِ قفلِ جهت (در lib.dom بعضی نسخه‌ها موجود نیست، خودمان تعریف می‌کنیم) */
export type OrientationKind =
  | "any"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape"
  | "landscape-primary"
  | "landscape-secondary";

type OrientationLockable = ScreenOrientation & {
  lock?: (o: OrientationKind) => Promise<void>;
  unlock?: () => void;
};

export async function lockOrientation(orientation: OrientationKind = "portrait") {
  const so = (typeof screen !== "undefined" ? screen.orientation : null) as OrientationLockable | null;
  try {
    await so?.lock?.(orientation);
  } catch {
    /* اندروید/iOS محدودیت دارند */
  }
}
export function unlockOrientation() {
  const so = (typeof screen !== "undefined" ? screen.orientation : null) as OrientationLockable | null;
  try {
    so?.unlock?.();
  } catch {
    /* نادیده */
  }
}

/* ------------------------- بستن رفتارهای ناخواسته ------------------------- */
/**
 * در یک بازی موبایل، این‌ها همه ممنوعند:
 * زوم دوباره‌ضربه، زوم دو‌انگشتی مرورگر، کشیدن صفحه برای رفرش، منوی لمس‌بلند، انتخاب متن.
 * این هوک همه را در سطح document می‌بندد (رویدادهای passive:false برای جلوگیری واقعی لازم است).
 */
export function useNativeGestureGuards(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    let lastTouchEnd = 0;

    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 320) e.preventDefault(); // زوم دوباره‌ضربه
      lastTouchEnd = now;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault(); // pinch-zoom مرورگر (pinch داخل بازی خودمان مدیریت می‌شود)
    };
    const onCtx = (e: Event) => e.preventDefault();
    const onGesture = (e: Event) => e.preventDefault(); // iOS Safari

    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("gesturestart", onGesture as EventListener);
    document.addEventListener("gesturechange", onGesture as EventListener);
    return () => {
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("gesturestart", onGesture as EventListener);
      document.removeEventListener("gesturechange", onGesture as EventListener);
    };
  }, [enabled]);
}

/* --------------------- ارتفاع/عرض درست صفحه‌ی موبایل --------------------- */
/** ارتفاعِ واقعیِ قابل‌استفاده را در CSS var می‌گذارد تا نوار آدرس موبایل چیدمان را نشکند. */
export function useAppViewportVar() {
  useEffect(() => {
    const set = () => {
      const vv = window.visualViewport;
      const h = Math.round(vv?.height ?? window.innerHeight);
      document.documentElement.style.setProperty("--app-h", `${h}px`);
    };
    set();
    window.visualViewport?.addEventListener("resize", set);
    window.visualViewport?.addEventListener("scroll", set);
    window.addEventListener("orientationchange", set);
    window.addEventListener("resize", set);
    return () => {
      window.visualViewport?.removeEventListener("resize", set);
      window.visualViewport?.removeEventListener("scroll", set);
      window.removeEventListener("orientationchange", set);
      window.removeEventListener("resize", set);
    };
  }, []);
}

/* ------------------------------ صفحه‌خوان ------------------------------ */
export function useIsPortrait() {
  const [portrait, setPortrait] = useState(true);
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight >= window.innerWidth);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  return portrait;
}

/* --------------------------- حالت «همه‌ی صفحه» --------------------------- */
export function useFullscreenState() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const on = () => setFs(isFullscreen());
    on();
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on as EventListener);
    };
  }, []);
  const toggle = useCallback(async () => {
    if (isFullscreen()) await exitFullscreen();
    else await enterFullscreen();
  }, []);
  return { isFullscreen: fs, toggle, supported: fullscreenSupported() };
}
