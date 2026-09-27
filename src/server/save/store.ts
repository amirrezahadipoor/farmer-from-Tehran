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
  /**
   * نوشتنِ اتمی: ردیفِ تازه یا بی‌مالک مالِ tokenHash می‌شود؛ ردیفی که مالِ توکنِ دیگری است دست نمی‌خورد و
   * false برمی‌گردد. (خواندن و بعد نوشتن اتمی نبود: دو دستگاه که هم‌زمان اولین بار می‌نوشتند، هر دو «بی‌مالک»
   * می‌دیدند و آخری مالکیت را از اولی می‌گرفت.)
   */
  put(id: string, data: unknown, tokenHash: string): Promise<boolean>;
}

export class MemorySaveStore implements SaveStore {
  readonly rows = new Map<string, SaveRow>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, data: unknown, tokenHash: string) {
    const cur = this.rows.get(id);
    if (cur?.tokenHash && cur.tokenHash !== tokenHash) return false;
    this.rows.set(id, { data, tokenHash });
    return true;
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

  async put(id: string, data: unknown, tokenHash: string): Promise<boolean> {
    await ensureSchema(this.db);
    const now = new Date();
    // یک دستورِ اتمی: درج، یا به‌روزرسانی فقط اگر ردیف بی‌مالک یا مالِ همین توکن باشد؛ وگرنه هیچ ردیفی برنمی‌گردد
    const rows = await this.db
      .insert(saves)
      .values({ id, data, tokenHash, updatedAt: now })
      .onConflictDoUpdate({
        target: saves.id,
        set: { data, tokenHash, updatedAt: now },
        setWhere: sql`${saves.tokenHash} is null or ${saves.tokenHash} = ${tokenHash}`,
      })
      .returning({ id: saves.id });
    return rows.length > 0;
  }
}
