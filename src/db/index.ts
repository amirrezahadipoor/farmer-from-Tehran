import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * اتصال تنبل (lazy) به پایگاه‌داده.
 *
 * چرا؟ چون نبودِ DATABASE_URL نباید بیلد یا اجرای آفلاین بازی را بشکند.
 * بازی به‌صورت آفلاین‌فِرست کار می‌کند و پایگاه‌داده فقط برای همگام‌سازی ابری اختیاری است.
 */

const globalForDb = globalThis as typeof globalThis & {
  __goldenValleyPool?: Pool;
  __goldenValleyDb?: NodePgDatabase<Record<string, never>>;
};

export const hasDatabase = (): boolean => Boolean(process.env.DATABASE_URL);

export function getDb(): NodePgDatabase<Record<string, never>> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForDb.__goldenValleyPool) {
    globalForDb.__goldenValleyPool = new Pool({
      connectionString: url,
      // برای محیط‌های بدون دیتابیس، سریع شکست بخورد و بازی به حالت آفلاین برود
      connectionTimeoutMillis: 2500,
      max: 5,
    });
    // خطای استخر نباید پروسه را بکشد
    globalForDb.__goldenValleyPool.on("error", () => {});
  }
  if (!globalForDb.__goldenValleyDb) {
    globalForDb.__goldenValleyDb = drizzle(globalForDb.__goldenValleyPool);
  }
  return globalForDb.__goldenValleyDb;
}
