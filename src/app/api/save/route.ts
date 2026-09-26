import { getDb } from "@/db";
import { defaultLimits, handleGet, handlePost, type SaveDeps } from "@/server/save/handler";
import { PgSaveStore } from "@/server/save/store";

export const dynamic = "force-dynamic";

/**
 * /api/save — همگام‌سازیِ ابریِ اختیاری (P5.13: توکنِ هر دستگاه، سقفِ حجم و نرخ).
 * بدون DATABASE_URL هر دو مسیر «آفلاین» جواب می‌دهند و بازی روی دستگاه ادامه می‌دهد.
 * منطق در src/server/save/handler.ts است تا بدون Next تست شود.
 */
const limits = defaultLimits();

function deps(): SaveDeps {
  const db = getDb();
  return { store: db ? new PgSaveStore(db) : null, ...limits };
}

/** گرفتن سیو از ابر — فقط با توکنِ همان دستگاه */
export async function GET(req: Request) {
  return handleGet(req, deps());
}

/** ذخیره در ابر — اولین نوشتن مالکیت را ثبت می‌کند؛ بعد از آن فقط همان توکن */
export async function POST(req: Request) {
  return handlePost(req, deps());
}
