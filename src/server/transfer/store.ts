/**
 * src/server/transfer/store.ts — انبارِ کدهای انتقال (مورد ۳): Postgres و حافظه (برای تست)
 * take() کد را «اتمی» مصرف می‌کند: فقط یک درخواست برنده می‌شود، حتی اگر دو دستگاه هم‌زمان بزنند.
 */
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type TakeResult = { saveId: string } | "expired" | "used" | null;

export interface TransferStore {
  create(code: string, saveId: string, expiresAt: Date): Promise<void>;
  take(code: string, now: Date): Promise<TakeResult>;
}

export class MemoryTransferStore implements TransferStore {
  readonly rows = new Map<string, { saveId: string; expiresAt: Date; usedAt: Date | null }>();
  async create(code: string, saveId: string, expiresAt: Date) {
    if (this.rows.has(code)) throw new Error("duplicate code");
    this.rows.set(code, { saveId, expiresAt, usedAt: null });
  }
  async take(code: string, now: Date): Promise<TakeResult> {
    const r = this.rows.get(code);
    if (!r) return null;
    if (r.usedAt) return "used";
    if (r.expiresAt <= now) return "expired";
    r.usedAt = now;
    return { saveId: r.saveId };
  }
}

type Db = NodePgDatabase<Record<string, never>>;
let ready: Promise<void> | null = null;

function ensureTable(db: Db): Promise<void> {
  ready ??= db
    .execute(sql`CREATE TABLE IF NOT EXISTS farm_transfers (code text PRIMARY KEY, save_id text NOT NULL, expires_at timestamp NOT NULL, used_at timestamp, created_at timestamp DEFAULT now() NOT NULL)`)
    .then(() => undefined)
    .catch((e: unknown) => {
      ready = null;
      throw e;
    });
  return ready;
}

export class PgTransferStore implements TransferStore {
  constructor(private readonly db: Db) {}

  async create(code: string, saveId: string, expiresAt: Date) {
    await ensureTable(this.db);
    // کدهای مصرف‌شده یا منقضی‌ِ قدیمی جارو می‌شوند تا جدول کوچک بماند
    await this.db.execute(sql`DELETE FROM farm_transfers WHERE expires_at < now() - interval '1 day'`);
    await this.db.execute(sql`INSERT INTO farm_transfers (code, save_id, expires_at) VALUES (${code}, ${saveId}, ${expiresAt})`);
  }

  async take(code: string, now: Date): Promise<TakeResult> {
    await ensureTable(this.db);
    const won = await this.db.execute(
      sql`UPDATE farm_transfers SET used_at = ${now} WHERE code = ${code} AND used_at IS NULL AND expires_at > ${now} RETURNING save_id`,
    );
    const row = won.rows[0] as { save_id?: string } | undefined;
    if (row?.save_id) return { saveId: row.save_id };
    const why = await this.db.execute(sql`SELECT used_at FROM farm_transfers WHERE code = ${code}`);
    const r = why.rows[0] as { used_at?: Date | null } | undefined;
    if (!r) return null;
    return r.used_at ? "used" : "expired";
  }
}
