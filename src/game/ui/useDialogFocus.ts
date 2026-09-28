"use client";

/**
 * src/game/ui/useDialogFocus.ts — قراردادِ صفحه‌کلید و صفحه‌خوان برای پنل‌ها
 *
 * سه چیز که هر پنلِ باز‌شده باید رعایت کند (و تستِ tests/a11y.test.ts آن را می‌سنجد):
 *  ۱. Escape پنل را می‌بندد — مثل دکمه‌ی «بستن» و کشیدنِ صفحه (بازیکنِ موبایلی).
 *  ۲. با باز شدن، تمرکز داخل پنل می‌رود (وگرنه صفحه‌خوان روی نقشه می‌ماند و نمی‌فهمد
 *     چه چیزی باز شده؛ صفحه‌کلید هم به لایه‌ی زیرِ پنل می‌رود).
 *  ۳. با بسته شدن، تمرکز به دکمه‌ای برمی‌گردد که پنل را باز کرده — تا جریانِ صفحه‌کلید
 *     از اول نشکند؛ Tab هم از دو طرف داخل پنل می‌چرخد (بدون گم شدنِ فوکس در لایه‌های زیر).
 *
 * بدون هیچ وابستگی بیرونی؛ تستِ e2e/a11y.spec.ts همین قرارداد را روی مرورگرِ واقعی
 * (بدون ماوس) اجرا می‌کند.
 */

import { useEffect, useRef } from "react";

const FOCUSABLE =
  "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function useDialogFocus<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    const returnTo =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const items = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement) : [];

    // تمرکز اولیه: اولین دکمه‌ی پنل، و اگر نبود خودِ پنل
    (items()[0] ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!active || !node.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (returnTo && returnTo.isConnected) returnTo.focus();
    };
  }, [onClose]);

  return ref;
}
