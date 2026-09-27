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

/** شمارِ پراکسی‌های مطمئنِ جلوی سرور (Vercel یا یک nginx = ۱؛ CDN + nginx = ۲) */
function trustedHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1;
}

/**
 * IP کلاینت برای محدودیتِ نرخ. X-Forwarded-For را هر کلاینتی با مقدارِ دلخواه می‌فرستد و هر پراکسی فقط IPِ
 * فرستنده‌اش را به تهِ فهرست اضافه می‌کند؛ پس اولین مقدار جعل‌پذیر است (با عوض‌کردنش سقفِ نرخ دور زده می‌شد)
 * و مقدارِ درست n-امین از آخر است که n شمارِ پراکسی‌های مطمئن است.
 */
export function clientIp(req: Request, hops = trustedHops()): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const list = fwd.split(",").map((x) => x.trim()).filter(Boolean);
    const ip = list[Math.max(0, list.length - hops)];
    if (ip) return ip.slice(0, 64);
  }
  return (req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}
