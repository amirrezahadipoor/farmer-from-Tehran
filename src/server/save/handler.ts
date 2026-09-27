/**
 * src/server/save/handler.ts — منطقِ GET/POST سیو، مستقل از Next (P5.13)
 *
 * قاعده‌ها:
 *  ۱. سیوِ هر بازیکن فقط با توکنِ خودش خوانده یا نوشته می‌شود (۴۰۱ بی‌توکن، ۴۰۳ توکنِ دیگر).
 *  ۲. بدنه‌ی بیش از ۵۱۲ کیلوبایت → ۴۱۳ (هم از روی content-length، هم با شمارشِ واقعی).
 *  ۳. نرخ: هر «شناسه|IP» و هر IP سطلِ خودش را دارد → ۴۲۹ با Retry-After.
 *  ۴. داده قبل از نوشتن از همان sanitizeSave بازی می‌گذرد؛ سیوِ نامعتبر → ۴۲۲.
 *  ۵. خطای پایگاه‌داده = «آفلاین» (بازی روی دستگاه ادامه می‌دهد؛ هیچ ۵۰۰ی به بازیکن نمی‌رسد)،
 *     ولی دیگر بی‌صدا نیست: یک خطِ JSON در لاگِ سرور (مورد ۴).
 */
import { sanitizeSave } from "@/game/sim/sanitize";
import { TOKEN_HEADER, clientIp, hashToken, tokenMatches, validId, validToken } from "./auth";
import { RateLimiter } from "./limit";
import type { SaveStore } from "./store";
import { TooLarge, readCapped } from "../http";
import { logServerError } from "../log/server";

export const MAX_BODY = 512 * 1024;

export interface SaveDeps {
  store: SaveStore | null;
  /** سطلِ هر «شناسه|IP» برای نوشتن */
  writeLimit: RateLimiter;
  /** سطلِ هر IP برای همه‌ی درخواست‌ها (جلوی پاشیدنِ شناسه‌های زیاد از یک IP) */
  ipLimit: RateLimiter;
}

/** تنظیمِ پیش‌فرض: کلاینت هر ۱۲ ثانیه ذخیره می‌کند؛ ۸ نوشتنِ پشتِ‌سرِهم و بعد یکی هر ۴ ثانیه */
export const defaultLimits = () => ({
  writeLimit: new RateLimiter(8, 4000),
  ipLimit: new RateLimiter(60, 1000),
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
const limited = (retryAfter: number, extra: Record<string, unknown>) =>
  json({ ...extra, mode: "cloud", error: "rate" }, 429, { "retry-after": String(retryAfter) });

export async function handleGet(req: Request, deps: SaveDeps): Promise<Response> {
  const id = new URL(req.url).searchParams.get("id");
  if (!deps.store) return json({ data: null, mode: "offline" });
  if (!validId(id)) return json({ data: null, mode: "cloud", error: "id" }, 400);
  const token = req.headers.get(TOKEN_HEADER);
  if (!validToken(token)) return json({ data: null, mode: "cloud", error: "token" }, 401);
  const lim = deps.ipLimit.take(clientIp(req));
  if (!lim.ok) return limited(lim.retryAfter, { data: null });
  try {
    const row = await deps.store.get(id);
    if (!row) return json({ data: null, mode: "cloud" });
    if (row.tokenHash && !tokenMatches(token, row.tokenHash)) return json({ data: null, mode: "cloud", error: "forbidden" }, 403);
    // ردیفِ قدیمی بدون مالک هم فقط به دارنده‌ی شناسه و یک توکنِ معتبر داده می‌شود؛ اولین نوشتن قفلش می‌کند
    return json({ data: row.data ?? null, mode: "cloud" });
  } catch (e) {
    logServerError("save.get", e);
    return json({ data: null, mode: "offline" });
  }
}

export async function handlePost(req: Request, deps: SaveDeps): Promise<Response> {
  if (!deps.store) return json({ ok: false, mode: "offline" });
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return json({ ok: false, mode: "cloud", error: "too_large" }, 413);
  const token = req.headers.get(TOKEN_HEADER);
  if (!validToken(token)) return json({ ok: false, mode: "cloud", error: "token" }, 401);
  const ip = clientIp(req);
  const ipLim = deps.ipLimit.take(ip);
  if (!ipLim.ok) return limited(ipLim.retryAfter, { ok: false });

  let text: string;
  try {
    text = await readCapped(req, MAX_BODY);
  } catch (e) {
    if (e instanceof TooLarge) return json({ ok: false, mode: "cloud", error: "too_large" }, 413);
    return json({ ok: false, mode: "cloud", error: "body" }, 400);
  }
  let body: { id?: unknown; data?: unknown };
  try {
    body = JSON.parse(text) as { id?: unknown; data?: unknown };
  } catch {
    return json({ ok: false, mode: "cloud", error: "json" }, 400);
  }
  if (!body || typeof body !== "object" || !validId(body.id)) return json({ ok: false, mode: "cloud", error: "id" }, 400);
  const id = body.id;
  const lim = deps.writeLimit.take(`${id}|${ip}`);
  if (!lim.ok) return limited(lim.retryAfter, { ok: false });

  const clean = sanitizeSave(body.data);
  if (!clean) return json({ ok: false, mode: "cloud", error: "invalid" }, 422);

  try {
    const row = await deps.store.get(id);
    if (row?.tokenHash && !tokenMatches(token, row.tokenHash)) return json({ ok: false, mode: "cloud", error: "forbidden" }, 403);
    // مالکیت در خودِ نوشتن هم اتمی بررسی می‌شود: اگر دستگاهِ دیگری در همین فاصله زودتر نوشت، این یکی ۴۰۳ است
    if (!(await deps.store.put(id, clean, hashToken(token)))) return json({ ok: false, mode: "cloud", error: "forbidden" }, 403);
    return json({ ok: true, mode: "cloud" });
  } catch (e) {
    logServerError("save.post", e);
    return json({ ok: false, mode: "offline" });
  }
}
