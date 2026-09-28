import { defaultLogLimit, handleLog } from "@/server/log/handler";

export const dynamic = "force-dynamic";

/** /api/log — گزارشِ خطای کلاینت به لاگِ ساختاریافته‌ی سرور (مورد ۴). منطق در src/server/log/handler.ts */
const limit = defaultLogLimit();
/** R/T6: اگر LOG_SHARED_SECRET تنظیم شود، مسار فقط با سرآیندِ درست پاسخ می‌دهد (پشتِ پروکسیِ مطمئن) */
const secret = process.env.LOG_SHARED_SECRET || undefined;

export async function POST(req: Request) {
  return handleLog(req, { limit, secret, sink: (line) => console.error(line) });
}
