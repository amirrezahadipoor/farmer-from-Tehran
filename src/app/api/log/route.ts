import { defaultLogLimit, handleLog } from "@/server/log/handler";

export const dynamic = "force-dynamic";

/** /api/log — گزارشِ خطای کلاینت به لاگِ ساختاریافته‌ی سرور (مورد ۴). منطق در src/server/log/handler.ts */
const limit = defaultLogLimit();

export async function POST(req: Request) {
  return handleLog(req, { limit, sink: (line) => console.error(line) });
}
