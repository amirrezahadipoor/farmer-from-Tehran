import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { RateLimiter } from "../src/server/save/limit";
import { hashToken } from "../src/server/save/auth";
import { asSqlRunner } from "../src/server/save/store";
import { newState } from "../src/game/logic";

/**
 * P5.13 · R/T7 — همان قاعده‌ها روی Postgresِ واقعی اجرا می‌شوند:
 *  • CI: TEST_DATABASE_URL تنظیم است → Postgresِ واقعی (سرویسِ ورک‌فلو)
 *  • محلی: TEST_DATABASE_URL نیست → PGlite (همان Postgres، به‌صورتِ WASM درون‌پروسه؛
 *    بدونِ Docker و بدونِ skip). شاهدِ این‌که ستونِ token_hash روی جدولِ قدیمی خودکار
 *    اضافه می‌شود، ردیفِ قدیمی با اولین نوشتن قفل می‌شود و پایگاه‌داده‌ی خالی هم بدون
 *    مهاجرتِ دستی کار می‌کند — و کاورجِ انبارها دیگر فقط در CI سبز نیست.
 */
const URL_ = process.env.TEST_DATABASE_URL;
const A = "a".repeat(64);
const B = "b".repeat(64);

/** یک باطنِ مشترک برای دو درایور: dbِ drizzle + اجرای SQLِ خام + بستن */
interface Backend {
  db: unknown;
  q: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  close: () => Promise<void>;
}

async function open(): Promise<Backend> {
  if (URL_) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: URL_ });
    return { db: drizzle(pool), q: (s, p) => pool.query(s, p), close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const pg = new PGlite();
  return { db: drizzle(pg), q: (s, p) => pg.query(s, p), close: () => pg.close() };
}

describe(`Postgres واقعی${URL_ ? "" : " (PGlite درون‌پروسه)"}`, () => {
  let backend: Backend;
  beforeAll(async () => {
    backend = await open();
    await backend.q("DROP TABLE IF EXISTS farm_saves");
    await backend.q("DROP TABLE IF EXISTS farm_transfers");
    // جدولِ قدیمیِ پیش از P5.13: بدون token_hash
    await backend.q("CREATE TABLE farm_saves (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)");
    await backend.q("INSERT INTO farm_saves (id, data) VALUES ($1, $2)", ["p_legacy_row", JSON.stringify(newState())]);
  });
  afterAll(async () => {
    await backend.q("DROP TABLE IF EXISTS farm_saves");
    await backend.q("DROP TABLE IF EXISTS farm_transfers");
    await backend.close();
  });

  const mk = async () => {
    vi.resetModules(); // تضمینِ طرح‌واره در هر پروسه یک بار است؛ برای سناریوی تازه، ماژول تازه
    const { PgSaveStore } = await import("../src/server/save/store");
    const { handleGet, handlePost } = await import("../src/server/save/handler");
    const deps = { store: new PgSaveStore(asSqlRunner(backend.db)), writeLimit: new RateLimiter(50, 10), ipLimit: new RateLimiter(500, 10) };
    const post = (id: string, token: string, data: unknown = JSON.parse(JSON.stringify(newState()))) =>
      handlePost(new Request("http://x/api/save", { method: "POST", headers: { "x-farm-token": token, "content-type": "application/json" }, body: JSON.stringify({ id, data }) }), deps);
    const get = (id: string, token: string) => handleGet(new Request(`http://x/api/save?id=${id}`, { headers: { "x-farm-token": token } }), deps);
    return { post, get, store: deps.store };
  };

  it("جدولِ قدیمی: ستون خودکار اضافه می‌شود و ردیفِ قدیمی با اولین نوشتن قفل می‌شود", async () => {
    const { post, get, store } = await mk();
    expect((await store.get("p_legacy_row"))?.tokenHash).toBeNull();
    const cols = await backend.q("SELECT column_name FROM information_schema.columns WHERE table_name = 'farm_saves'");
    expect(cols.rows.map((r) => r.column_name)).toContain("token_hash");
    expect((await post("p_legacy_row", A)).status).toBe(200);
    expect((await store.get("p_legacy_row"))?.tokenHash).toBe(hashToken(A));
    expect((await post("p_legacy_row", B)).status).toBe(403);
    expect((await get("p_legacy_row", B)).status).toBe(403);
    expect((await get("p_legacy_row", A)).status).toBe(200);
  });

  it("ردیفِ تازه: مالک می‌نویسد و می‌خواند، توکنِ دیگر نه؛ داده پاک‌سازی‌شده ذخیره می‌شود", async () => {
    const { post, get } = await mk();
    const data = { ...JSON.parse(JSON.stringify(newState())), coins: 4321, junk: "x" };
    expect((await post("p_new_player", A, data)).status).toBe(200);
    const mine = (await (await get("p_new_player", A)).json()) as { data: { coins: number; junk?: string } };
    expect(mine.data.coins).toBe(4321);
    expect(mine.data.junk).toBeUndefined();
    expect((await post("p_new_player", B)).status).toBe(403);
    const raw = await backend.q("SELECT token_hash, data::text AS d FROM farm_saves WHERE id = 'p_new_player'");
    expect(raw.rows[0].token_hash).toBe(hashToken(A));
    expect(raw.rows[0].d).not.toContain(A);
  });

  it("B/T11: نوشتنِ دوم، نسخه‌ی قبلی را در prev_data نگه می‌دارد و ستون روی جدولِ قدیمی خودش می‌آید", async () => {
    const { post } = await mk();
    const v1 = { ...JSON.parse(JSON.stringify(newState())), coins: 1000 };
    const v2 = { ...JSON.parse(JSON.stringify(newState())), coins: 2000 };
    expect((await post("p_prev_player", A, v1)).status).toBe(200);
    expect((await post("p_prev_player", A, v2)).status).toBe(200);
    const raw = await backend.q("SELECT data->'coins' AS c, prev_data->'coins' AS p FROM farm_saves WHERE id = 'p_prev_player'");
    expect(Number(raw.rows[0].c)).toBe(2000);
    expect(Number(raw.rows[0].p)).toBe(1000);
  });

  it("پایگاه‌داده‌ی خالی: جدول خودش ساخته می‌شود", async () => {
    await backend.q("DROP TABLE farm_saves");
    const { post, get } = await mk();
    expect((await post("p_fresh_db", A)).status).toBe(200);
    expect((await get("p_fresh_db", A)).status).toBe(200);
  });
  it("مالکیت در خودِ نوشتن اتمی است: توکنِ دیگر هیچ ردیفی را بازنویسی نمی‌کند", async () => {
    const { store } = await mk();
    const hA = "a".repeat(64);
    const hB = "b".repeat(64);
    const s1 = JSON.parse(JSON.stringify(newState()));
    expect(await store.put("p_race_row01", { ...s1, coins: 111 }, hA)).toBe(true);
    expect(await store.put("p_race_row01", { ...s1, coins: 222 }, hB)).toBe(false);
    const row = await store.get("p_race_row01");
    expect(row?.tokenHash).toBe(hA);
    expect((row?.data as { coins: number }).coins).toBe(111);
    expect(await store.put("p_race_row01", { ...s1, coins: 333 }, hA)).toBe(true);
    const [x, y] = await Promise.all([store.put("p_race_row02", s1, hA), store.put("p_race_row02", s1, hB)]);
    expect([x, y].filter(Boolean)).toHaveLength(1);
  });

  it("مورد ۳: کدِ انتقال روی Postgres اتمی مصرف می‌شود (دو دریافتِ هم‌زمان، یک برنده)", async () => {
    vi.resetModules();
    const { PgTransferStore } = await import("../src/server/transfer/store");
    await backend.q("DROP TABLE IF EXISTS farm_transfers");
    const t = new PgTransferStore(asSqlRunner(backend.db));
    const now = new Date();
    await t.create("PGTEST23", "p_legacy_row", new Date(now.getTime() + 60_000));
    const [a, b] = await Promise.all([t.take("PGTEST23", now), t.take("PGTEST23", now)]);
    const wins = [a, b].filter((r) => r && typeof r === "object");
    expect(wins).toHaveLength(1);
    expect([a, b]).toContain("used");
    await t.create("PGOLD234", "p_legacy_row", new Date(now.getTime() - 1000));
    expect(await t.take("PGOLD234", now)).toBe("expired");
    expect(await t.take("NOPE2345", now)).toBeNull();
    await backend.q("DROP TABLE IF EXISTS farm_transfers");
  });
});
