import { describe, it, expect } from "vitest";
import { RateLimiter, createLimiter } from "../src/server/save/limit";
import { RedisLimiter } from "../src/server/save/limit-redis";

/** tests/rate-limit.test.ts — سقفِ نرخ (R/T5): هرسِ بدونِ ریستِ جهانی و بک‌اندِ Redis */

describe("RateLimiter (حافظه)", () => {
  it("سطل را پر و خالی می‌کند و Retry-After درست می‌دهد", async () => {
    let t = 0;
    const lim = new RateLimiter(2, 1000, () => t);
    expect(await lim.take("a")).toEqual({ ok: true, retryAfter: 0 });
    expect(await lim.take("a")).toEqual({ ok: true, retryAfter: 0 });
    const no = await lim.take("a");
    expect(no.ok).toBe(false);
    expect(no.retryAfter).toBe(1);
    t = 500;
    expect((await lim.take("a")).ok).toBe(false); // نیمه‌ی پر = هنوز خالی
    t = 1000;
    expect((await lim.take("a")).ok).toBe(true); // یک توکن برگشت
  });

  it("هرس، سطل‌های کاربرانِ سالم را ریست نمی‌کند (ریستِ جهانی ممکن نباشد)", async () => {
    let t = 0;
    const lim = new RateLimiter(2, 1000, () => t, 10);
    // ده کلید، هر کدام یک توکن خرج می‌کنند (یک توکن مانده)
    for (let i = 0; i < 10; i++) expect((await lim.take(`k${i}`)).ok).toBe(true);
    // کلیدِ تازه → هرس؛ قدیمی‌ترین‌ها (k0..) حذف می‌شوند
    expect((await lim.take("new")).ok).toBe(true);
    // کلیدی که اخیراً استفاده شده باید حالتش حفظ شود: یک توکن مانده، بعدش ۴۲۹
    expect((await lim.take("k9")).ok).toBe(true);
    expect((await lim.take("k9")).ok).toBe(false);
    // کلیدِ حذف‌شده از نو شروع می‌شود (سقفِ نرم، نه ریستِ همه)
    expect((await lim.take("k0")).ok).toBe(true);
    expect(lim.size).toBeLessThanOrEqual(10);
  });

  it("زمانِ عبور، توکن‌ها را برمی‌گرداند", async () => {
    let t = 0;
    const lim = new RateLimiter(1, 500, () => t);
    expect((await lim.take("x")).ok).toBe(true);
    expect((await lim.take("x")).ok).toBe(false);
    t = 1500;
    expect((await lim.take("x")).ok).toBe(true);
  });
});

describe("createLimiter", () => {
  it("بدونِ env، حافظه‌ای است", () => {
    delete process.env.RATE_LIMIT_REDIS_REST_URL;
    delete process.env.RATE_LIMIT_REDIS_REST_TOKEN;
    expect(createLimiter(2, 1000)).toBeInstanceOf(RateLimiter);
  });

  it("با env، Redis برمی‌گزیند", () => {
    process.env.RATE_LIMIT_REDIS_REST_URL = "https://example.invalid";
    process.env.RATE_LIMIT_REDIS_REST_TOKEN = "t";
    expect(createLimiter(2, 1000)).toBeInstanceOf(RedisLimiter);
    delete process.env.RATE_LIMIT_REDIS_REST_URL;
    delete process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  });
});

describe("RedisLimiter", () => {
  const url = "https://redis.example.invalid";
  const token = "tok";
  const okResponse = (ok: number, retry: number) => ({
    ok: true,
    json: async () => [{ results: [{ response: [ok, retry] }] }],
  });

  it("اجازه و منع را از پاسخِ Redis می‌خواند", async () => {
    let t = 1_000;
    const lim = new RedisLimiter(2, 1000, url, token, (async () => okResponse(1, 0)) as never, () => t);
    expect(await lim.take("k")).toEqual({ ok: true, retryAfter: 0 });
    const lim2 = new RedisLimiter(2, 1000, url, token, (async () => okResponse(0, 4)) as never, () => t);
    expect(await lim2.take("k")).toEqual({ ok: false, retryAfter: 4 });
  });

  it("بدنه‌ی درخواست: EVAL با ظرفیت و refill و زمانِ تزریق‌پذیر", async () => {
    let body = "";
    const lim = new RedisLimiter(8, 4000, url, token, (async (u: string, init: { body: string }) => {
      body = init.body;
      return okResponse(1, 0);
    }) as never, () => 1_700_000_000_000);
    await lim.take("p_abc|1.2.3.4");
    const cmd = JSON.parse(body)[0].command;
    expect(cmd[0]).toBe("EVAL");
    expect(cmd[2]).toBe("1");
    expect(cmd[3]).toBe("gvf:rl:p_abc|1.2.3.4");
    expect(cmd.slice(4)).toEqual(["8", "4000", "1700000000000"]);
  });

  it("خطای شبکه = fail-open (بازی نباید به‌خاطرِ سقفِ نرخ بخوابد)", async () => {
    const lim = new RedisLimiter(2, 1000, url, token, (async () => {
      throw new Error("network down");
    }) as never);
    expect(await lim.take("k")).toEqual({ ok: true, retryAfter: 0 });
  });

  it("با RATE_LIMIT_FAIL_CLOSED=1، خطای شبکه = بسته", async () => {
    process.env.RATE_LIMIT_FAIL_CLOSED = "1";
    const lim = new RedisLimiter(2, 1000, url, token, (async () => {
      throw new Error("network down");
    }) as never);
    expect((await lim.take("k")).ok).toBe(false);
    delete process.env.RATE_LIMIT_FAIL_CLOSED;
  });
});
