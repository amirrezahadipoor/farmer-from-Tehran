import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_LOG_KEY, __resetErrorsForTest, clearFatal, describeError, fatalStore, raiseFatal, readErrorLog, reportError } from "../src/game/errors";
import { MAX_LOG_BODY, handleLog } from "../src/server/log/handler";
import { RateLimiter } from "../src/server/save/limit";
import { logServerError } from "../src/server/log/server";
import { handleGet } from "../src/server/save/handler";

/** tests/errors.test.ts — ثبتِ خطای کلاینت و /api/log (نقشه‌ی راه، مورد ۴) */
const mem = new Map<string, string>();
const beacon = vi.fn(() => true);

beforeEach(() => {
  mem.clear();
  beacon.mockClear();
  __resetErrorsForTest();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubGlobal("navigator", { userAgent: "vitest", sendBeacon: beacon });
  vi.stubGlobal("location", { pathname: "/" });
});
afterEach(() => vi.unstubAllGlobals());

describe("reportError", () => {
  it("خلاصه و کوتاه می‌کند و در بافرِ روی دستگاه نگه می‌دارد", () => {
    const rep = reportError(new Error("x".repeat(500)), "loop", 1000);
    expect(rep?.message.length).toBe(300);
    expect(rep?.where).toBe("loop");
    expect(readErrorLog()).toHaveLength(1);
    expect(JSON.parse(mem.get(ERROR_LOG_KEY) as string)[0].ua).toBe("vitest");
  });

  it("تکرارِ همان خطا در یک دقیقه ثبت نمی‌شود؛ بعد از آن دوباره", () => {
    expect(reportError(new Error("a"), "loop", 0)).not.toBeNull();
    expect(reportError(new Error("a"), "loop", 59_000)).toBeNull();
    expect(reportError(new Error("a"), "loop", 61_000)).not.toBeNull();
    expect(reportError(new Error("a"), "react", 61_500), "جای دیگر یعنی خطای دیگر").not.toBeNull();
  });

  it("بافر فقط ۲۰ گزارشِ آخر را نگه می‌دارد و در هر نشست حداکثر ۱۰ گزارش فرستاده می‌شود", () => {
    for (let i = 0; i < 30; i++) reportError(new Error(`e${i}`), "loop", i);
    const log = readErrorLog();
    expect(log).toHaveLength(20);
    expect(log[19].message).toBe("e29");
    expect(beacon).toHaveBeenCalledTimes(10);
  });

  it("هر نوعِ مقدارِ پرتاب‌شده را توصیف می‌کند", () => {
    expect(describeError("متن").message).toBe("متن");
    expect(describeError({ a: 1 }).message).toBe('{"a":1}');
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(describeError(loop).message).toBe("[object Object]");
  });

  it("fatalStore خطای ماندگار را به مشترک‌ها می‌رساند و پاک می‌شود", () => {
    const seen: (Error | null)[] = [];
    const off = fatalStore.subscribe(() => seen.push(fatalStore.get()));
    raiseFatal("شکستِ پیاپی");
    clearFatal();
    off();
    expect(seen.map((e) => e?.message ?? null)).toEqual(["شکستِ پیاپی", null]);
  });
});

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://x/api/log", { method: "POST", body, headers: { "content-type": "application/json", "x-forwarded-for": "10.1.2.3", ...headers } });

describe("/api/log", () => {
  it("۲۰۴ و یک خطِ JSON با فیلدهای کوتاه‌شده؛ IPِ خام ثبت نمی‌شود", async () => {
    const lines: string[] = [];
    const res = await handleLog(post(JSON.stringify({ message: "خطا", where: "loop", stack: "s".repeat(5000), extra: "حذف" })), { limit: new RateLimiter(5, 1000), sink: (l) => lines.push(l) });
    expect(res.status).toBe(204);
    const row = JSON.parse(lines[0]);
    expect(row).toMatchObject({ level: "error", src: "client", where: "loop", message: "خطا" });
    expect(row.stack.length).toBe(2000);
    expect(row.device).toMatch(/^[0-9a-f]{12}$/);
    expect(lines[0]).not.toContain("10.1.2.3");
    expect(row.extra).toBeUndefined();
  });

  it("بدنه‌ی بزرگ ۴۱۳، JSONِ خراب یا بی‌پیام ۴۰۰", async () => {
    const deps = { limit: new RateLimiter(50, 1000), sink: () => undefined };
    expect((await handleLog(post("x", { "content-length": String(MAX_LOG_BODY + 1) }), deps)).status).toBe(413);
    expect((await handleLog(post(JSON.stringify({ message: "y".repeat(MAX_LOG_BODY) })), deps)).status).toBe(413);
    expect((await handleLog(post("{not json"), deps)).status).toBe(400);
    expect((await handleLog(post(JSON.stringify({ where: "x" })), deps)).status).toBe(400);
  });

  it("بیش از سقفِ نرخِ هر IP ← ۴۲۹", async () => {
    const deps = { limit: new RateLimiter(2, 60_000, () => 0), sink: () => undefined };
    const ok = JSON.stringify({ message: "m" });
    expect((await handleLog(post(ok), deps)).status).toBe(204);
    expect((await handleLog(post(ok), deps)).status).toBe(204);
    expect((await handleLog(post(ok), deps)).status).toBe(429);
  });
});

describe("لاگِ سرور", () => {
  it("logServerError یک خطِ JSON با محل و پیام می‌نویسد", () => {
    const lines: string[] = [];
    logServerError("save.get", new Error("db down"), (l) => lines.push(l));
    expect(JSON.parse(lines[0])).toMatchObject({ level: "error", src: "server", where: "save.get", message: "db down" });
  });

  it("خطای پایگاه‌داده در سیو دیگر بی‌صدا نیست", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = { get: async () => { throw new Error("connection refused"); }, put: async () => true };
    const req = new Request("http://x/api/save?id=abc123", { headers: { "x-farm-token": "a".repeat(64) } });
    const res = await handleGet(req, { store, writeLimit: new RateLimiter(5, 1000), ipLimit: new RateLimiter(5, 1000) });
    expect((await res.json()).mode).toBe("offline");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({ where: "save.get", message: "connection refused" });
    spy.mockRestore();
  });
});
