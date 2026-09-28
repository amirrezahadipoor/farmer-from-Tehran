/**
 * src/server/save/store.ts — انبارِ سیو (P5.13 · R/T7): یک رابط، دو پیاده‌سازی
 *  • PgSaveStore: Postgres با drizzle. جدول و ستونِ token_hash را خودش (idempotent) می‌سازد
 *    تا پایگاه‌داده‌ی تازه یا قدیمی بدون مهاجرتِ دستی کار کند.
 *  • MemorySaveStore: برای تست‌ها.
 *
 * R/T7: ذخیره‌ها روی SQLِ خام و از یک رابطِ باریکِ SqlRunner کار می‌کنند (نه روی نوعِ
 * خاصِ یک درایور)، پس همان منطق روی Postgresِ واقعی (CI با TEST_DATABASE_URL) و روی
 * PGlite درون‌پروسه (تستِ محلی، بدونِ Docker) اجرا می‌شود و کاورجشان محلی هم سبز است.
 */
import { sql } from "drizzle-orm";

export interface SaveRow {
  data: unknown;
  /** sha256 توکنِ مالک؛ null = ردیفِ قدیمیِ پیش از P5.13 (اولین نوشتنِ معتبر مالکش می‌شود) */
  tokenHash: string | null;
  /** B/T11: نسخه‌ی قبلی — آخرین ردیفی که با نوشتنِ بعدی رونویسی شده (null = هیچ) */
  prev: unknown;
}

export interface SaveStore {
  get(id: string): Promise<SaveRow | null>;
  /**
   * نوشتنِ اتمی: ردیفِ تازه یا بی‌مالک مالِ tokenHash می‌شود؛ ردیفی که مالِ توکنِ دیگری است دست نمی‌خورد و
   * false برمی‌گردد. (خواندن و بعد نوشتن اتمی نبود: دو دستگاه که هم‌زمان اولین بار می‌نوشتند، هر دو «بی‌مالک»
   * می‌دیدند و آخری مالکیت را از اولی می‌گرفت.)
   */
  put(id: string, data: unknown, tokenHash: string): Promise<boolean>;
}

/** رابطِ باریکِ اجرای SQL — هر درایورِ drizzle (node-postgres یا pglite) این را دارد */
export interface SqlRunner {
  execute(query: unknown): Promise<{ rows: Record<string, unknown>[] }>;
}

/** دروازه‌ی نوع برای پاس‌دادنِ هر dbِ drizzle به انبارها */
export const asSqlRunner = (db: unknown): SqlRunner => db as SqlRunner;

export class MemorySaveStore implements SaveStore {
  readonly rows = new Map<string, SaveRow>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, data: unknown, tokenHash: string) {
    const cur = this.rows.get(id);
    if (cur?.tokenHash && cur.tokenHash !== tokenHash) return false;
    // B/T11: رونویسیِ کور ممنوع — داده‌ی قبلی به «نسخه‌ی قبلی» می‌رود
    this.rows.set(id, { data, tokenHash, prev: cur ? cur.data : null });
    return true;
  }
}

let schemaReady: Promise<void> | null = null;

/** جدول و ستونِ تازه را یک بار در هر پروسه تضمین می‌کند (شکست = دوباره در درخواستِ بعد) */
function ensureSchema(db: SqlRunner): Promise<void> {
  schemaReady ??= (async () => {
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS farm_saves (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamp DEFAULT now() NOT NULL, token_hash text)`,
    );
    await db.execute(sql`ALTER TABLE farm_saves ADD COLUMN IF NOT EXISTS token_hash text`);
    await db.execute(sql`ALTER TABLE farm_saves ADD COLUMN IF NOT EXISTS prev_data jsonb`); // B/T11
  })().catch((e: unknown) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export class PgSaveStore implements SaveStore {
  constructor(private readonly db: SqlRunner) {}

  async get(id: string): Promise<SaveRow | null> {
    await ensureSchema(this.db);
    const r = await this.db.execute(sql`SELECT data, token_hash, prev_data FROM farm_saves WHERE id = ${id} LIMIT 1`);
    const row = r.rows[0];
    return row ? { data: row.data, tokenHash: (row.token_hash as string | null) ?? null, prev: (row.prev_data as unknown) ?? null } : null;
  }

  async put(id: string, data: unknown, tokenHash: string): Promise<boolean> {
    await ensureSchema(this.db);
    // یک دستورِ اتمی: درج، یا به‌روزرسانی فقط اگر ردیف بی‌مالک یا مالِ همین توکن باشد؛ وگرنه هیچ ردیفی برنمی‌گردد
    const r = await this.db.execute(sql`
      INSERT INTO farm_saves (id, data, token_hash, prev_data, updated_at)
      VALUES (${id}, ${JSON.stringify(data)}::jsonb, ${tokenHash}, NULL, now())
      ON CONFLICT (id) DO UPDATE SET
        prev_data = farm_saves.data, data = EXCLUDED.data, token_hash = EXCLUDED.token_hash, updated_at = now()
      WHERE farm_saves.token_hash IS NULL OR farm_saves.token_hash = ${tokenHash}
      RETURNING id
    `);
    return r.rows.length > 0;
  }
}
