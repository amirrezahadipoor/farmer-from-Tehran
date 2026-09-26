import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * tests/api.test.ts — شاهدِ «بیلد و اجرا بدون DATABASE_URL» (P5.3)
 *
 * قاعده‌ی پروژه: بازی باید بدون هیچ متغیر محیطی کار کند. پایگاه‌داده فقط برای
 * همگام‌سازی ابریِ اختیاری است؛ نبودِ آن نه بیلد را می‌شکند، نه سیوِ بازیکن را.
 * این تست، هندلرهای واقعیِ API را بدون DATABASE_URL صدا می‌زند.
 */

const saveRoute = () => import("../src/app/api/save/route");
const healthRoute = () => import("../src/app/api/health/route");
const db = () => import("../src/db");

let savedUrl: string | undefined;
beforeEach(() => {
  savedUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
});
afterEach(() => {
  if (savedUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedUrl;
  vi.resetModules();
});

describe("بدون DATABASE_URL — لایه‌ی داده تنبل است و هیچ‌چیز نمی‌شکند", () => {
  it("getDb() مقدار null می‌دهد و hasDatabase() دروغ نمی‌گوید", async () => {
    const { getDb, hasDatabase } = await db();
    expect(hasDatabase()).toBe(false);
    expect(getDb()).toBeNull();
  });

  it("GET /api/save → حالت آفلاین و ضرر صفر (بدون خطا)", async () => {
    const { GET } = await saveRoute();
    const res = await GET(new Request("http://localhost/api/save?id=p_test"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown; mode: string };
    expect(body).toEqual({ data: null, mode: "offline" });
  });

  it("POST /api/save → موفقِ آفلاین (ok:false) تا کلاینت در صف بگذارد", async () => {
    const { POST } = await saveRoute();
    const res = await POST(
      new Request("http://localhost/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "p_test", data: { v: 5 } }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; mode: string };
    expect(body).toEqual({ ok: false, mode: "offline" });
  });

  it("GET /api/health → ok:true و database:offline (سلامت اپ مستقل از دیتابیس)", async () => {
    const { GET } = await healthRoute();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; database: string; configured: boolean };
    expect(body.ok).toBe(true);
    expect(body.database).toBe("offline");
    expect(body.configured).toBe(false);
  });

  it("ورودی نامعتبر روی سرور هم رد می‌شود (id خیلی بلند و بدنه‌ی خالی)", async () => {
    const { GET, POST } = await saveRoute();
    const badId = await GET(new Request("http://localhost/api/save?id=" + "x".repeat(200)));
    expect(((await badId.json()) as { mode: string }).mode).toBe("offline");

    const empty = await POST(
      new Request("http://localhost/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(empty.status).toBe(200);
  });
});
