/**
 * src/server/save/auth.ts — احراز هویتِ سبکِ سیو (P5.13)
 *
 * هر دستگاه یک توکنِ تصادفیِ ۲۵۶ بیتی دارد (farm_token در localStorage) و با سرآیندِ
 * x-farm-token می‌فرستد. سرور هیچ‌وقت خودِ توکن را نگه نمی‌دارد؛ فقط sha256 آن را،
 * و مقایسه در زمانِ ثابت انجام می‌شود. اولین نوشتن مالکیت را ثبت می‌کند (TOFU).
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const TOKEN_HEADER = "x-farm-token";
const TOKEN_RE = /^[a-f0-9]{64}$/;
const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;

export const validToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);
export const validId = (id: unknown): id is string => typeof id === "string" && ID_RE.test(id);

export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

/** آیا توکن با هشِ ذخیره‌شده می‌خواند؟ (مقایسه‌ی زمانِ ثابت) */
export function tokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** IP کلاینت برای محدودیتِ نرخ (پشت پراکسی: اولین مقدارِ x-forwarded-for) */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64) || "unknown";
  return (req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}
