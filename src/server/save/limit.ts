/**
 * src/server/save/limit.ts — محدودیتِ نرخ با سطلِ توکن (P5.13)
 *
 * هر کلید (مثلاً «شناسه|IP») یک سطل با ظرفیتِ capacity دارد که هر refillMs یک توکن پر
 * می‌شود. ساعت تزریق‌پذیر است تا تست بدون انتظار اجرا شود. حافظه محدود می‌ماند:
 * سطل‌های پُر و قدیمی هنگامِ رشدِ جدول هرس می‌شوند.
 */
export interface LimitResult {
  ok: boolean;
  /** ثانیه تا توکنِ بعدی (برای سرآیندِ Retry-After) */
  retryAfter: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    readonly capacity: number,
    readonly refillMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  take(key: string): LimitResult {
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

  /** سطل‌هایی که تا حالا دوباره پر شده‌اند اطلاعاتی ندارند و حذف می‌شوند */
  private prune(t: number) {
    for (const [k, b] of this.buckets) {
      if (b.tokens + Math.floor((t - b.at) / this.refillMs) >= this.capacity) this.buckets.delete(k);
    }
    if (this.buckets.size >= this.maxKeys) this.buckets.clear(); // حمله‌ی پُرکردنِ جدول: بازنشانی
  }

  get size() {
    return this.buckets.size;
  }
}
