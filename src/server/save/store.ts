/**
 * src/server/save/store.ts — انبارِ سیو (P5.13): یک رابط، دو پیاده‌سازی
 *  • PgSaveStore: Postgres با drizzle؛ جدول و ستونِ token_hash را خودش (idempotent) می‌سازد
 *    تا پایگاه‌داده‌ی تازه یا قدیمی بدون مهاجرتِ دستی کار کند.
 *  • MemorySaveStore: برای تست‌ها.
 */
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { saves } from "@/db/schema";

export interface SaveRow {
  data: unknown;
  /** sha256 توکنِ مالک؛ null = ردیفِ قدیمیِ پیش از P5.13 (اولین نوشتنِ معتبر مالکش می‌شود) */
  tokenHash: string | null;
}

export interface SaveStore {
  get(id: string): Promise<SaveRow | null>;
  put(id: string, data: unknown, tokenHash: string): Promise<void>;
}

export class MemorySaveStore implements SaveStore {
  readonly rows = new Map<string, SaveRow>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, data: unknown, tokenHash: string) {
    this.rows.set(id, { data, tokenHash });
  }
}

type Db = NodePgDatabase<Record<string, never>>;
let schemaReady: Promise<void> | null = null;

/** جدول و ستونِ تازه را یک بار در هر پروسه تضمین می‌کند (شکست = دوباره در درخواستِ بعد) */
function ensureSchema(db: Db): Promise<void> {
  schemaReady ??= (async () => {
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS farm_saves (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamp DEFAULT now() NOT NULL, token_hash text)`,
    );
    await db.execute(sql`ALTER TABLE farm_saves ADD COLUMN IF NOT EXISTS token_hash text`);
  })().catch((e: unknown) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export class PgSaveStore implements SaveStore {
  constructor(private readonly db: Db) {}

  async get(id: string): Promise<SaveRow | null> {
    await ensureSchema(this.db);
    const rows = await this.db.select().from(saves).where(eq(saves.id, id)).limit(1);
    const r = rows[0];
    return r ? { data: r.data, tokenHash: r.tokenHash ?? null } : null;
  }

  async put(id: string, data: unknown, tokenHash: string): Promise<void> {
    await ensureSchema(this.db);
    const now = new Date();
    await this.db
      .insert(saves)
      .values({ id, data, tokenHash, updatedAt: now })
      .onConflictDoUpdate({ target: saves.id, set: { data, tokenHash, updatedAt: now } });
  }
}
