/**
 * src/server/log/handler.ts — دریافتِ گزارشِ خطای کلاینت (نقشه‌ی راه، مورد ۴)، مستقل از Next تا تست شود
 *
 *  • بدنه‌ی بیش از ۸ کیلوبایت → ۴۱۳؛ JSONِ خراب یا بی‌پیام → ۴۰۰؛ بیش از سقفِ نرخِ هر IP → ۴۲۹
 *  • فقط فیلدهای شناخته‌شده، کوتاه‌شده، نگه داشته می‌شوند؛ IP خام ثبت نمی‌شود (فقط هشِ کوتاهِ آن برای
 *    کنارِ هم گذاشتنِ گزارش‌های یک دستگاه)
 *  • خروجی یک خطِ JSON در لاگِ سرور است و پاسخ ۲۰۴
 */
import { createHash } from "node:crypto";
import { clientIp } from "../save/auth";
import { RateLimiter } from "../save/limit";
import { TooLarge, readCapped } from "../http";
import type { Sink } from "./server";

export const MAX_LOG_BODY = 8 * 1024;

export interface LogDeps {
  limit: RateLimiter;
  sink: Sink;
}

/** هر IP ده گزارشِ پشتِ‌سرِهم و بعد یکی هر ۶ ثانیه */
export const defaultLogLimit = () => new RateLimiter(10, 6000);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const status = (code: number) => new Response(null, { status: code, headers: { "cache-control": "no-store" } });

export async function handleLog(req: Request, deps: LogDeps): Promise<Response> {
  if (Number(req.headers.get("content-length") || 0) > MAX_LOG_BODY) return status(413);
  const ip = clientIp(req);
  if (!deps.limit.take(ip).ok) return status(429);
  let text: string;
  try {
    text = await readCapped(req, MAX_LOG_BODY);
  } catch (e) {
    return status(e instanceof TooLarge ? 413 : 400);
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return status(400);
  }
  const message = str(body?.message, 300);
  if (!body || typeof body !== "object" || !message) return status(400);
  deps.sink(
    JSON.stringify({
      level: "error",
      src: "client",
      at: new Date().toISOString(),
      where: str(body.where, 60) || "unknown",
      message,
      stack: str(body.stack, 2000),
      path: str(body.path, 200),
      ua: str(body.ua, 160),
      build: str(body.build, 40),
      device: createHash("sha256").update(ip).digest("hex").slice(0, 12),
    }),
  );
  return status(204);
}
