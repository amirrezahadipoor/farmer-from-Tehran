import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { RateLimiter } from "../src/server/save/limit";
import { hashToken } from "../src/server/save/auth";
import { newState } from "../src/game/logic";

/**
 * P5.13 — همان قاعده‌ها روی Postgresِ واقعی (فقط وقتی TEST_DATABASE_URL هست؛ CI یک سرویسِ
 * Postgres برایش بالا می‌آورد). شاهدِ این‌که ستونِ token_hash روی جدولِ قدیمی خودکار اضافه
 * می‌شود، ردیفِ قدیمی با اولین نوشتن قفل می‌شود و پایگاه‌داده‌ی خالی هم بدون مهاجرتِ دستی کار می‌کند.
 */
const URL_ = process.env.TEST_DATABASE_URL;
const A = "a".repeat(64);
const B = "b".repeat(64);

describe.skipIf(!URL_)("Postgres واقعی", () => {
  let pool: Pool;
  beforeAll(async () => {
    pool = new Pool({ connectionString: URL_ });
    await pool.query("DROP TABLE IF EXISTS farm_saves");
    // جدولِ قدیمیِ پیش از P5.13: بدون token_hash
    await pool.query("CREATE TABLE farm_saves (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)");
    await pool.query("INSERT INTO farm_saves (id, data) VALUES ($1, $2)", ["p_legacy_row", JSON.stringify(newState())]);
  });
  afterAll(async () => {
    await pool.query("DROP TABLE IF EXISTS farm_saves");
    await pool.end();
  });

  const mk = async () => {
    vi.resetModules(); // تضمینِ طرح‌واره در هر پروسه یک بار است؛ برای سناریوی تازه، ماژول تازه
    const { PgSaveStore } = await import("../src/server/save/store");
    const { handleGet, handlePost } = await import("../src/server/save/handler");
    const deps = { store: new PgSaveStore(drizzle(pool)), writeLimit: new RateLimiter(50, 10), ipLimit: new RateLimiter(500, 10) };
    const post = (id: string, token: string, data: unknown = JSON.parse(JSON.stringify(newState()))) =>
      handlePost(new Request("http://x/api/save", { method: "POST", headers: { "x-farm-token": token, "content-type": "application/json" }, body: JSON.stringify({ id, data }) }), deps);
    const get = (id: string, token: string) => handleGet(new Request(`http://x/api/save?id=${id}`, { headers: { "x-farm-token": token } }), deps);
    return { post, get, store: deps.store };
  };

  it("جدولِ قدیمی: ستون خودکار اضافه می‌شود و ردیفِ قدیمی با اولین نوشتن قفل می‌شود", async () => {
    const { post, get, store } = await mk();
    expect((await store.get("p_legacy_row"))?.tokenHash).toBeNull();
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'farm_saves'");
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
    const raw = await pool.query("SELECT token_hash, data::text AS d FROM farm_saves WHERE id = 'p_new_player'");
    expect(raw.rows[0].token_hash).toBe(hashToken(A));
    expect(raw.rows[0].d).not.toContain(A);
  });

  it("پایگاه‌داده‌ی خالی: جدول خودش ساخته می‌شود", async () => {
    await pool.query("DROP TABLE farm_saves");
    const { post, get } = await mk();
    expect((await post("p_fresh_db", A)).status).toBe(200);
    expect((await get("p_fresh_db", A)).status).toBe(200);
  });
  it("مورد ۳: کدِ انتقال روی Postgres اتمی مصرف می‌شود (دو دریافتِ هم‌زمان، یک برنده)", async () => {
    vi.resetModules();
    const { PgTransferStore } = await import("../src/server/transfer/store");
    const db = drizzle(pool);
    await pool.query("DROP TABLE IF EXISTS farm_transfers");
    const t = new PgTransferStore(db as never);
    const now = new Date();
    await t.create("PGTEST23", "p_legacy_row", new Date(now.getTime() + 60_000));
    const [a, b] = await Promise.all([t.take("PGTEST23", now), t.take("PGTEST23", now)]);
    const wins = [a, b].filter((r) => r && typeof r === "object");
    expect(wins).toHaveLength(1);
    expect([a, b]).toContain("used");
    await t.create("PGOLD234", "p_legacy_row", new Date(now.getTime() - 1000));
    expect(await t.take("PGOLD234", now)).toBe("expired");
    expect(await t.take("NOPE2345", now)).toBeNull();
    await pool.query("DROP TABLE IF EXISTS farm_transfers");
  });
});
