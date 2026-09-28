/**
 * src/server/save/limit-redis.ts — همان سطلِ توکن، این بار در Redis (R/T5)
 *
 * چرا؟ پیاده‌سازیِ حافظه‌ای (limit.ts) روی استقرارِ چند‌اینستنس یا serverless سخت نیست:
 * هر instance سطلِ خودش را دارد و cold start آن را صفر می‌کند. اینجا سطل در Redis است و
 * کلِ تصمیم (مقدارِ تازه، اجازه، ثانیه‌ی صبر) در یک اسکریپتِ اتمی انجام می‌شود، پس دو
 * درخواستِ هم‌زمان هم نمی‌توانند یک توکن را دوبار خرج کنند.
 *
 * انتقال: RESTِ سازگار با Upstash (RATE_LIMIT_REDIS_REST_URL + RATE_LIMIT_REDIS_REST_TOKEN).
 * هیچ وابستگیِ npm تازه‌ای لازم نیست؛ فقط fetch.
 *
 * سیاستِ خطا: fail-open. اگر Redis در دسترس نباشد، درخواست «مجاز» شمرده می‌شود (با یک
 * هشدارِ کوتاه‌شده). بازی آفلاین‌فِرست است و قطعی‌شدنِ ذخیره‌ی ابری به‌خاطرِ محدودیتِ نرخ
 * بدتر از یک سقفِ نرمِ موقت است. برای بستنِ سخت، fail-closed را با FAIL_CLOSED=1 انتخاب کن.
 */

import type { Limiter, LimitResult } from "./limit";

/** سطلِ توکن؛ همه‌ی محاسبه در سمتِ Redis و اتمی */
const LUA = `
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'at')
local tokens = tonumber(b[1])
local at = tonumber(b[2])
if tokens == nil then tokens = capacity end
if at == nil then at = now end
local ref = math.floor((now - at) / refill)
if ref > 0 then
  tokens = math.min(capacity, tokens + ref)
  at = at + ref * refill
  if tokens == capacity then at = now end
end
local ok = 0
local retry = 0
if tokens > 0 then
  tokens = tokens - 1
  ok = 1
else
  retry = math.max(1, math.ceil((at + refill - now) / 1000))
end
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'at', at)
redis.call('PEXPIRE', KEYS[1], math.ceil(refill * capacity / 1000) + 60000)
return { ok, retry }
`;

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;

export class RedisLimiter implements Limiter {
  constructor(
    readonly capacity: number,
    readonly refillMs: number,
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private readonly now: () => number = Date.now,
    private readonly prefix = "gvf:rl",
  ) {}

  async take(key: string): Promise<LimitResult> {
    const bucket = `${this.prefix}:${key.slice(0, 96)}`;
    try {
      const res = await this.fetchImpl(`${this.url.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
        body: JSON.stringify([
          { command: ["EVAL", LUA, "1", bucket, String(this.capacity), String(this.refillMs), String(this.now())] },
        ]),
      });
      if (!res.ok) throw new Error(`redis ${res.status}`);
      const body = (await res.json()) as { results?: [{ response?: [number, number]; error?: string }] }[];
      const r = body?.[0]?.results?.[0];
      if (r?.error || !r?.response) throw new Error(r?.error ?? "bad response");
      const [ok, retry] = r.response;
      return { ok: ok === 1, retryAfter: Number(retry) || 0 };
    } catch {
      if (process.env.RATE_LIMIT_FAIL_CLOSED === "1") return { ok: false, retryAfter: 30 };
      return { ok: true, retryAfter: 0 }; // fail-open: سقفِ نرم بهتر از قطعِ ذخیره است
    }
  }
}
