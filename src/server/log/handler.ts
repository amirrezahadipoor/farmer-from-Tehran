/**
 * src/server/log/handler.ts — دریافتِ گزارشِ خطای کلاینت (نقشه‌ی راه، مورد ۴)، مستقل از Next تا تست شود
 *
 *  • بدنه‌ی بیش از ۸ کیلوبایت → ۴۱۳؛ JSONِ خراب یا بی‌پیام → ۴۰۰؛ بیش از سقفِ نرخِ هر IP → ۴۲۹
 *  • فقط فیلدهای شناخته‌شده، کوتاه‌شده و پاک‌شده از نویسه‌های کنترلی، نگه داشته می‌شوند؛
 *    IP خام ثبت نمی‌شود (فقط هشِ کوتاهِ آن برای کنارِ هم گذاشتنِ گزارش‌های یک دستگاه)
 *  • R/T6: اگر LOG_SHARED_SECRET تنظیم شود (مثلاً پشتِ یک پروکسیِ مطمئن که سرآیند را
 *    اضافه می‌کند)، درخواستِ بی‌سرآیندِ درست ۴۰۱ می‌گیرد. بدونِ آن، مسیر همان گزارشِ
 *    تلاش‌محورِ نرخِ‌محدودشده می‌ماند (در دموی ایستا اصلاً سروری وجود ندارد).
 *  • خروجی یک خطِ JSON در لاگِ سرور است و پاسخ ۲۰۴
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { clientIp } from "../save/auth";
import { createLimiter, type Limiter } from "../save/limit";
import { TooLarge, readCapped } from "../http";
import type { Sink } from "./server";

export const MAX_LOG_BODY = 8 * 1024;
/** سرآیندِ دروازه‌ی اختیاری (R/T6) */
export const LOG_SECRET_HEADER = "x-log-secret";

export interface LogDeps {
  limit: Limiter;
  sink: Sink;
  /** با تنظیمِ LOG_SHARED_SECRET: درخواست باید همین سرآیند را داشته باشد */
  secret?: string;
}

/** هر IP ده گزارشِ پشتِ‌سرِهم و بعد یکی هر ۶ ثانیه */
export const defaultLogLimit = (): Limiter => createLimiter(10, 6000);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
/** نویسه‌های کنترلی (خطِ تازه و …) از گزارشِ کلاینت حذف می‌شوند تا لاگِ یک‌خطی نشکند */
const clean = (v: unknown, max: number) => str(v, max)?.replace(/[\u0000-\u001F\u007F]/g, " ").trim() || undefined;
const status = (code: number) => new Response(null, { status: code, headers: { "cache-control": "no-store" } });

/** مقایسه‌ی زمانِ ثابتِ سرآیند با secret (هر دو هش می‌شوند تا طولِ متفاوت هم امن باشد) */
export function secretMatches(got: string | null, secret: string): boolean {
  const a = createHash("sha256").update(got ?? "", "utf8").digest();
  const b = createHash("sha256").update(secret, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleLog(req: Request, deps: LogDeps): Promise<Response> {
  if (Number(req.headers.get("content-length") || 0) > MAX_LOG_BODY) return status(413);
  const ip = clientIp(req);
  if (!(await deps.limit.take(ip)).ok) return status(429);
  if (deps.secret && !secretMatches(req.headers.get(LOG_SECRET_HEADER), deps.secret)) return status(401);
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
  const message = clean(body?.message, 300);
  if (!body || typeof body !== "object" || !message) return status(400);
  const path = str(body.path, 200);
  deps.sink(
    JSON.stringify({
      level: "error",
      src: "client",
      at: new Date().toISOString(),
      where: clean(body.where, 60) || "unknown",
      message,
      stack: clean(body.stack, 2000),
      path: path?.startsWith("/") ? path : undefined,
      ua: str(body.ua, 160),
      build: str(body.build, 40),
      device: createHash("sha256").update(ip).digest("hex").slice(0, 12),
    }),
  );
  return status(204);
}
