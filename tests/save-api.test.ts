import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MAX_BODY, handleGet, handlePost, type SaveDeps } from "../src/server/save/handler";
import { MemorySaveStore, type SaveStore } from "../src/server/save/store";
import { RateLimiter } from "../src/server/save/limit";
import { clientIp, hashToken, tokenMatches, validId, validToken } from "../src/server/save/auth";
import { newState } from "../src/game/logic";
import { sanitizeSave } from "../src/game/sim/sanitize";

/**
 * P5.13 — «سیوِ هر بازیکن فقط با توکنِ خودش» + سقفِ حجم و نرخ.
 * هندلرِ واقعی با انبارِ حافظه‌ای و ساعتِ تزریقی اجرا می‌شود (بدون شبکه، بدون انتظار).
 */

const A = "a".repeat(64);
const B = "b".repeat(64);
const ID = "p_testplayer01";
let clock = 1_000_000;
const now = () => clock;
let store: MemorySaveStore;
let deps: SaveDeps;

beforeEach(() => {
  clock = 1_000_000;
  store = new MemorySaveStore();
  deps = { store, writeLimit: new RateLimiter(8, 4000, now), ipLimit: new RateLimiter(60, 1000, now) };
});

const save = () => JSON.parse(JSON.stringify(newState())) as Record<string, unknown>;
function post(body: unknown, token: string | null = A, extra: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "10.0.0.1", ...extra };
  if (token) headers["x-farm-token"] = token;
  return handlePost(new Request("http://x/api/save", { method: "POST", headers, body: text }), deps);
}
function get(id = ID, token: string | null = A, ip = "10.0.0.1") {
  const headers: Record<string, string> = { "x-forwarded-for": ip };
  if (token) headers["x-farm-token"] = token;
  return handleGet(new Request(`http://x/api/save?id=${encodeURIComponent(id)}`, { headers }), deps);
}

describe("مالکیت با توکن", () => {
  it("بی‌توکن یا توکنِ بدشکل → ۴۰۱", async () => {
    expect((await post({ id: ID, data: save() }, null)).status).toBe(401);
    expect((await post({ id: ID, data: save() }, "short")).status).toBe(401);
    expect((await get(ID, null)).status).toBe(401);
    expect((await get(ID, "Z".repeat(64))).status).toBe(401);
    expect(store.rows.size).toBe(0);
  });

  it("اولین نوشتن مالک را ثبت می‌کند؛ فقط هشِ توکن ذخیره می‌شود", async () => {
    const r = await post({ id: ID, data: save() });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, mode: "cloud" });
    const row = store.rows.get(ID)!;
    expect(row.tokenHash).toBe(hashToken(A));
    expect(JSON.stringify(row)).not.toContain(A); // خودِ توکن هیچ‌جا نیست
  });

  it("توکنِ دیگر نه می‌خواند نه می‌نویسد (۴۰۳)؛ مالک هر دو را می‌تواند", async () => {
    await post({ id: ID, data: save() });
    const w = await post({ id: ID, data: { ...save(), coins: 999_999 } }, B);
    expect(w.status).toBe(403);
    expect((store.rows.get(ID)!.data as { coins: number }).coins).not.toBe(999_999);
    const g = await get(ID, B);
    expect(g.status).toBe(403);
    expect((await g.json()).data).toBeNull();
    const mine = await get(ID, A);
    expect(mine.status).toBe(200);
    expect((await mine.json()).data.v).toBe(5);
    expect((await post({ id: ID, data: { ...save(), coins: 1234 } }, A)).status).toBe(200);
    expect((store.rows.get(ID)!.data as { coins: number }).coins).toBe(1234);
  });

  it("ردیفِ قدیمیِ بی‌مالک (پیش از P5.13): اولین نوشتنِ معتبر قفلش می‌کند", async () => {
    store.rows.set(ID, { data: save(), tokenHash: null });
    expect((await get(ID, B)).status).toBe(200);
    expect((await post({ id: ID, data: save() }, B)).status).toBe(200);
    expect(store.rows.get(ID)!.tokenHash).toBe(hashToken(B));
    expect((await post({ id: ID, data: save() }, A)).status).toBe(403);
  });

  it("دو نوشتنِ اولِ هم‌زمان: فقط یکی مالک می‌شود (بررسیِ مالکیت در خودِ نوشتن اتمی است)", async () => {
    // هر دو درخواست پیش از نوشتنِ دیگری «بی‌مالک» می‌بینند (همان مسابقه‌ای که خواندن-بعد-نوشتن نمی‌دید)
    const realGet = store.get.bind(store);
    store.get = async () => null;
    expect((await post({ id: ID, data: { ...save(), coins: 111 } }, A)).status).toBe(200);
    const lost = await post({ id: ID, data: { ...save(), coins: 222 } }, B);
    expect(lost.status).toBe(403);
    store.get = realGet;
    expect(store.rows.get(ID)!.tokenHash).toBe(hashToken(A));
    expect((store.rows.get(ID)!.data as { coins: number }).coins).toBe(111);
  });

  it("شناسه‌ی نامعتبر → ۴۰۰؛ شناسه‌ی ناموجود → دادهِ خالی (نه خطا)", async () => {
    expect((await post({ id: "bad id!", data: save() })).status).toBe(400);
    expect((await post({ data: save() })).status).toBe(400);
    expect((await get("x")).status).toBe(400);
    const g = await get("p_nobody_here");
    expect(g.status).toBe(200);
    expect(await g.json()).toEqual({ data: null, mode: "cloud" });
  });
});

describe("حجم و محتوا", () => {
  it("بدنه‌ی بیش از ۵۱۲ کیلوبایت → ۴۱۳ (هم با content-length، هم بدون آن)", async () => {
    const big = JSON.stringify({ id: ID, data: { v: 5, pad: "x".repeat(MAX_BODY) } });
    expect((await post(big, A, { "content-length": String(big.length) })).status).toBe(413);
    // content-length دروغ/نبود: شمارشِ واقعیِ جریان
    const stream = new ReadableStream({
      start(c) {
        for (let i = 0; i < 9; i++) c.enqueue(new TextEncoder().encode("y".repeat(64 * 1024)));
        c.close();
      },
    });
    const req = new Request("http://x/api/save", { method: "POST", headers: { "x-farm-token": A }, body: stream, duplex: "half" } as RequestInit);
    expect((await handlePost(req, deps)).status).toBe(413);
    expect(store.rows.size).toBe(0);
  });

  it("یک سیوِ واقعیِ پُر کمتر از ربعِ سقف است", () => {
    const s = newState();
    s.inv = Object.fromEntries(Array.from({ length: 69 }, (_, i) => [`item${i}`, 9999]));
    expect(JSON.stringify({ id: ID, data: s }).length).toBeLessThan(MAX_BODY / 4);
  });

  it("JSON خراب → ۴۰۰؛ سیوِ نامعتبر → ۴۲۲", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ id: ID, data: { v: 4 } })).status).toBe(422);
    expect((await post({ id: ID, data: "hello" })).status).toBe(422);
    expect(store.rows.size).toBe(0);
  });

  it("داده قبل از نوشتن از sanitizeSave می‌گذرد: کلیدِ ناشناخته و عددِ بی‌معنا نمی‌مانند", async () => {
    const d = { ...save(), coins: Number.MAX_VALUE, junk: "x".repeat(1000), __admin: true };
    expect((await post({ id: ID, data: d })).status).toBe(200);
    const stored = store.rows.get(ID)!.data as Record<string, unknown>;
    expect(stored.junk).toBeUndefined();
    expect(stored.__admin).toBeUndefined();
    expect(stored.coins).toBeLessThanOrEqual(1e12);
    expect(sanitizeSave(stored)).not.toBeNull();
  });
});

describe("محدودیتِ نرخ", () => {
  it("۸ نوشتنِ پشتِ‌سرِهم آزاد، نهمی ۴۲۹ با Retry-After؛ بعد از ۴ ثانیه دوباره", async () => {
    for (let i = 0; i < 8; i++) expect((await post({ id: ID, data: save() })).status).toBe(200);
    const r = await post({ id: ID, data: save() });
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    clock += 4000;
    expect((await post({ id: ID, data: save() })).status).toBe(200);
  });

  it("هر «شناسه|IP» سطلِ خودش را دارد", async () => {
    for (let i = 0; i < 8; i++) await post({ id: ID, data: save() });
    expect((await post({ id: ID, data: save() }, A, { "x-forwarded-for": "10.0.0.2" })).status).toBe(200);
  });

  it("سقفِ هر IP جلوی پاشیدنِ شناسه‌های زیاد را می‌گیرد (GET هم)", async () => {
    deps.ipLimit = new RateLimiter(5, 1000, now);
    for (let i = 0; i < 5; i++) expect((await get(`p_probe_${i}`)).status).toBe(200);
    expect((await get("p_probe_x")).status).toBe(429);
    expect((await post({ id: ID, data: save() })).status).toBe(429);
    expect((await get("p_probe_y", A, "10.9.9.9")).status).toBe(200);
  });

  it("سطل‌ها حافظه را بی‌نهایت پر نمی‌کنند", async () => {
    const lim = new RateLimiter(2, 1000, now, 100);
    for (let i = 0; i < 1000; i++) await lim.take(`k${i}`);
    expect(lim.size).toBeLessThanOrEqual(100);
    clock += 10_000;
    for (let i = 0; i < 50; i++) await lim.take(`new${i}`);
    expect(lim.size).toBeLessThanOrEqual(100);
  });
});

describe("بدون پایگاه‌داده و خطای انبار", () => {
  it("بی‌انبار: هر دو مسیر «آفلاین» بدون خطا (بازی روی دستگاه ادامه می‌دهد)", async () => {
    deps.store = null;
    expect(await (await get()).json()).toEqual({ data: null, mode: "offline" });
    expect(await (await post({ id: ID, data: save() })).json()).toEqual({ ok: false, mode: "offline" });
  });

  it("خطای پایگاه‌داده = آفلاین، نه ۵۰۰", async () => {
    const broken: SaveStore = {
      get: () => Promise.reject(new Error("db down")),
      put: () => Promise.reject(new Error("db down")),
    };
    deps.store = broken;
    const g = await get();
    expect(g.status).toBe(200);
    expect((await g.json()).mode).toBe("offline");
    const p = await post({ id: ID, data: save() });
    expect(p.status).toBe(200);
    expect((await p.json()).mode).toBe("offline");
  });
});

describe("ابزارهای احراز", () => {
  it("اعتبارِ توکن/شناسه، مقایسه‌ی زمانِ ثابت و IP", () => {
    expect(validToken(A)).toBe(true);
    expect(validToken(A.toUpperCase())).toBe(false);
    expect(validId("p_abc")).toBe(true);
    expect(validId("../etc")).toBe(false);
    expect(tokenMatches(A, hashToken(A))).toBe(true);
    expect(tokenMatches(B, hashToken(A))).toBe(false);
    expect(tokenMatches(A, "")).toBe(false);
    // اولین مقدار را خودِ کلاینت می‌فرستد (جعل‌پذیر)؛ مقدارِ درست را پراکسیِ مطمئن به ته اضافه کرده است
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "6.6.6.6, 5.6.7.8" } }))).toBe("5.6.7.8");
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4, 10.0.0.2" } }), 2)).toBe("1.2.3.4");
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4" } }), 3)).toBe("1.2.3.4");
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("کلاینت: توکنِ دستگاه و رفتارِ صادق در برابرِ رد شدن", () => {
  const ls = new Map<string, string>();
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    ls.clear();
    vi.resetModules();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => ls.get(k) ?? null,
      setItem: (k: string, v: string) => void ls.set(k, v),
      removeItem: (k: string) => void ls.delete(k),
    });
    vi.stubGlobal("navigator", { onLine: true });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("توکن ۶۴ رقمِ هگز است، یک بار ساخته می‌شود و در هر درخواست می‌رود", async () => {
    const P = await import("../src/game/persist");
    const t = P.ensureFarmToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
    expect(P.ensureFarmToken()).toBe(t);
    fetchMock.mockResolvedValue(Response.json({ data: null, mode: "cloud" }));
    await P.fetchCloudSave("p_me");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("x-farm-token")).toBe(t);
    const N = await import("../src/game/net");
    fetchMock.mockResolvedValue(Response.json({ ok: true, mode: "cloud" }));
    expect(await N.saveGame("p_me", { v: 5 })).toBe("cloud");
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("x-farm-token")).toBe(t);
  });

  it("۴۰۳/۴۱۳/۴۲۲ = «فقط محلی» بدون صف؛ ۴۲۹ و ۵۰۰ = در صف برای بعد", async () => {
    const N = await import("../src/game/net");
    for (const status of [403, 413, 422]) {
      fetchMock.mockResolvedValueOnce(Response.json({ ok: false }, { status }));
      expect(await N.saveGame("p_me", { v: 5 }), String(status)).toBe("local");
      expect(N.hasPendingSave()).toBe(false);
    }
    for (const status of [429, 500]) {
      fetchMock.mockResolvedValueOnce(Response.json({ ok: false }, { status }));
      expect(await N.saveGame("p_me", { v: 5 }), String(status)).toBe("queued");
      expect(N.hasPendingSave()).toBe(true);
    }
  });

  it("سیوِ ابریِ دستگاهِ دیگر (۴۰۳) صادقانه گزارش می‌شود و بازی از محلی ادامه می‌دهد", async () => {
    const P = await import("../src/game/persist");
    fetchMock.mockResolvedValue(Response.json({ data: null, error: "forbidden" }, { status: 403 }));
    const r = await P.fetchCloudSave("p_me");
    expect(r.state).toBeNull();
    expect(r.note).toContain("توکن");
  });
});
