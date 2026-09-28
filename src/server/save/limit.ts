/**
 * src/server/save/limit.ts — محدودیتِ نرخ با سطلِ توکن
 *
 * دو پیاده‌سازی با یک رابط:
 *  • RateLimiter (این فایل): سطل در حافظه‌ی پروسه. ساده و بدونِ وابستگی، اما روی
 *    استقرارِ چند‌اینستنس (Vercel/serverless) هر instance سطلِ خودش را دارد و cold start
 *    آن را صفر می‌کند — یعنی در آن حالت سقف «نرم» است نه سخت.
 *  • RedisLimiter (limit-redis.ts): همان سطل در Redis با یک اسکریپتِ اتمی؛ برای وقتی
 *    RATE_LIMIT_REDIS_REST_URL تنظیم شده باشد. خطای شبکه = fail-open (باز) تا بازی
 *    آفلاین‌فِرست به‌خاطر محدودیتِ نرخ از کار نیفتد.
 *
 * createLimiter() بر اساسِ env یکی را برمی‌گزیند و در production، اگر Redis نباشد،
 * یک بار هشدار می‌دهد که سقف تک‌پروسه است.
 *
 * ساعت تزریق‌پذیر است تا تست بدونِ انتظار اجرا شود.
 */

import { RedisLimiter } from "./limit-redis";

export interface LimitResult {
  ok: boolean;
  /** ثانیه تا توکنِ بعدی (برای سرآیندِ Retry-After) */
  retryAfter: number;
}

/** رابطِ مشترکِ محدودکننده‌ها (حافظه یا Redis) */
export interface Limiter {
  take(key: string): Promise<LimitResult>;
  /** فقط پیاده‌سازیِ حافظه: تعدادِ سطل‌های زنده (برای تست و سنجش) */
  readonly size?: number;
}

export class RateLimiter implements Limiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    readonly capacity: number,
    readonly refillMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  async take(key: string): Promise<LimitResult> {
    const t = this.now();
    let b = this.buckets.get(key);
    if (!b) {
      if (this.buckets.size >= this.maxKeys) this.prune(t);
      b = { tokens: this.capacity, at: t };
      this.buckets.set(key, b);
    }
    const refill = Math.floor((t - b.at) / this.refillMs);
    if (refill > 0) {
      b.tokens = Math.min(this.capacity, b.tokens + refill);
      b.at += refill * this.refillMs;
      if (b.tokens === this.capacity) b.at = t;
    }
    if (b.tokens > 0) {
      b.tokens--;
      return { ok: true, retryAfter: 0 };
    }
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.at + this.refillMs - t) / 1000)) };
  }

  /**
   * هرس وقتی جدول به سقف می‌رسد: قدیمی‌ترین‌ها (ترتیبِ درجِ Map) حذف می‌شوند تا جدول
   * کوچک بماند. عمداً همه را پاک نمی‌کنیم: clear() یعنی یک مهاجم با پاشیدنِ شناسه‌های
   * تازه می‌توانست سقفِ نرخِ *همه‌ی* کاربرانِ واقعی را دور بزند (ریستِ جهانی). حالا
   * حداکثر سطل‌های بی‌استفاده‌ی قدیمی قربانی می‌شوند و کلیدهای تازه دست‌نخورده می‌مانند.
   */
  private prune(t: number) {
    const drop = Math.max(1, Math.floor(this.maxKeys * 0.1)); // ۱۰٪ قدیمی‌ها
    for (const [k, b] of this.buckets) {
      if (this.buckets.size < this.maxKeys - drop + 1) break;
      // سطلی که هنوز توکن نگه داشته (کلیدِ فعال) حذف نمی‌شود
      if (b.tokens + Math.floor((t - b.at) / this.refillMs) >= this.capacity) this.buckets.delete(k);
    }
    // اگر هنوز پر است (همه‌ی سطل‌ها فعال‌اند)، قدیمی‌ترین‌ها را جابه‌جا کن
    while (this.buckets.size >= this.maxKeys) {
      const oldest = this.buckets.keys().next();
      if (oldest.done) break;
      this.buckets.delete(oldest.value);
    }
  }

  get size() {
    return this.buckets.size;
  }
}

/* --------------------------- گزینشِ پیاده‌سازی --------------------------- */

const redisEnv = () => ({
  url: (process.env.RATE_LIMIT_REDIS_REST_URL || "").trim(),
  token: (process.env.RATE_LIMIT_REDIS_REST_TOKEN || "").trim(),
});

let warnedSingleProcess = false;

/**
 * محدودکننده‌ی مناسبِ این استقرار. Redis تنظیم شده → توزیع‌شده؛ وگرنه حافظه‌ی پروسه
 * با یک هشدارِ تک‌باره در production (سقف نرم، مستند در README).
 */
export function createLimiter(capacity: number, refillMs: number, now?: () => number): Limiter {
  const { url, token } = redisEnv();
  if (url && token) return new RedisLimiter(capacity, refillMs, url, token);
  if (process.env.NODE_ENV === "production" && !warnedSingleProcess) {
    warnedSingleProcess = true;
    console.error(
      JSON.stringify({
        level: "warn",
        src: "server",
        where: "createLimiter",
        message:
          "سقفِ نرخ در حافظه‌ی این پروسه است؛ روی استقرارِ چند‌اینستنس نرم می‌ماند. برای سقفِ سختِ توزیع‌شده، متغیرهای محیطیِ مستندشده در راهنمای پروژه را تنظیم کنید.",
        hint: "set RATE_LIMIT_REDIS_REST_URL and RATE_LIMIT_REDIS_REST_TOKEN for a distributed token bucket",
      }),
    );
  }
  return new RateLimiter(capacity, refillMs, now);
}
