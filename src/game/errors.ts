/**
 * src/game/errors.ts — ثبتِ خطاهای کلاینت (نقشه‌ی راه، مورد ۴)
 *
 *  • reportError: خطا را خلاصه، تکراریِ یک دقیقه را حذف، در بافرِ حلقوی روی دستگاه نگه‌داری (برای
 *    «رونوشتِ گزارش» در صفحه‌ی بازیابی) و به /api/log می‌فرستد (در دموی ایستا فقط روی دستگاه)
 *  • installGlobalErrorHandlers: خطاهای بی‌صاحب (window.onerror و unhandledrejection)
 *  • fatalStore: خطای ماندگارِ حلقه‌ی رندر را به React می‌رساند تا به‌جای بازیِ یخ‌زده صفحه‌ی بازیابی بیاید
 */
import { STATIC_BUILD, asset } from "./base";

export interface ErrorReport {
  at: number;
  where: string;
  message: string;
  stack?: string;
  path?: string;
  ua?: string;
  build?: string;
}

export const ERROR_LOG_KEY = "farm_errors";
const KEEP = 20;
const MAX_SEND = 10;
const DEDUPE_MS = 60_000;

let sent = 0;
const seen = new Map<string, number>();

export function describeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message || err.name, stack: err.stack };
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err) ?? String(err) };
  } catch {
    return { message: String(err) };
  }
}

export function readErrorLog(): ErrorReport[] {
  try {
    const v = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]") as unknown;
    return Array.isArray(v) ? (v as ErrorReport[]) : [];
  } catch {
    return [];
  }
}

function send(rep: ErrorReport) {
  const body = JSON.stringify(rep);
  const url = asset("/api/log");
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* sendBeacon در دسترس نیست */
  }
  try {
    void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* بی‌شبکه: همان نسخه‌ی روی دستگاه کافی است */
  }
}

/** خطا را ثبت می‌کند؛ خروجی گزارشِ ثبت‌شده یا null اگر تکراریِ همین یک دقیقه بود */
export function reportError(err: unknown, where: string, now = Date.now()): ErrorReport | null {
  const { message, stack } = describeError(err);
  const key = `${where}|${message}`;
  const last = seen.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) return null;
  seen.set(key, now);
  const rep: ErrorReport = {
    at: now,
    where: where.slice(0, 60),
    message: message.slice(0, 300),
    stack: stack?.slice(0, 2000),
    path: typeof location !== "undefined" ? location.pathname : undefined,
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : undefined,
    build: process.env.GVF_BUILD,
  };
  try {
    const log = readErrorLog();
    log.push(rep);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log.slice(-KEEP)));
  } catch {
    /* حافظه پر یا بسته */
  }
  if (!STATIC_BUILD && sent < MAX_SEND) {
    sent++;
    send(rep);
  }
  return rep;
}

export function installGlobalErrorHandlers(): () => void {
  const onError = (e: ErrorEvent) => void reportError(e.error ?? e.message, "window.onerror");
  const onRejection = (e: PromiseRejectionEvent) => void reportError(e.reason, "unhandledrejection");
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

let fatal: Error | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

/** خطای ماندگار (مثلاً حلقه‌ی رندر که پشتِ‌سرِهم می‌شکند): Game آن را پرتاب می‌کند تا ErrorBoundary بگیرد */
export function raiseFatal(err: unknown) {
  fatal = err instanceof Error ? err : new Error(describeError(err).message);
  notify();
}

export function clearFatal() {
  fatal = null;
  notify();
}

export const fatalStore = {
  subscribe(cb: () => void) {
    subs.add(cb);
    return () => void subs.delete(cb);
  },
  get: (): Error | null => fatal,
  server: (): Error | null => null,
};

/** فقط برای تست‌های واحد */
export function __resetErrorsForTest() {
  sent = 0;
  seen.clear();
  fatal = null;
}
