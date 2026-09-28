/**
 * src/server/transfer/handler.ts — ساخت و دریافتِ کدِ انتقال (نقشه‌ی راه، مورد ۳)، مستقل از Next
 *
 *  • ساخت: فقط مالکِ سیو (توکنِ همان دستگاه) برای شناسه‌ی خودش کد می‌سازد؛ سیو باید در ابر باشد
 *  • دریافت: کد اتمی مصرف می‌شود (یک‌بار)، تازه‌ترین سیوِ آن مزرعه از sanitizeSave می‌گذرد و برمی‌گردد؛
 *    دستگاهِ مقصد آن را «رونوشت» می‌کند و شناسه و توکنِ خودش را نگه می‌دارد
 *  • سقفِ نرخ برای هر IP (جلوی حدس‌زدنِ کد)؛ بی‌پایگاه‌داده = «آفلاین»؛ خطای پایگاه‌داده ثبت می‌شود
 */
import { randomInt } from "node:crypto";
import { sanitizeSave } from "@/game/sim/sanitize";
import { CODE_ALPHABET, CODE_LEN, CODE_TTL_MS, normalizeCode } from "@/game/transferCode";
import { TOKEN_HEADER, clientIp, tokenMatches, validId, validToken } from "../save/auth";
import { createLimiter, type Limiter } from "../save/limit";
import type { SaveStore } from "../save/store";
import { readCapped } from "../http";
import { logServerError } from "../log/server";
import type { TransferStore } from "./store";

export interface TransferDeps {
  saves: SaveStore | null;
  transfers: TransferStore | null;
  limit: Limiter;
  now?: () => number;
}

/** هر IP پنج تلاش و بعد یکی هر ۱۲ ثانیه (برای حدسِ کدی با ۴۰ بیت، عملاً بی‌اثر) */
export const defaultTransferLimit = (): Limiter => createLimiter(5, 12_000);

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export function newCode(): string {
  let c = "";
  for (let i = 0; i < CODE_LEN; i++) c += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return c;
}

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const v = JSON.parse(await readCapped(req, 1024)) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null; // بدنه‌ی بزرگ، خالی یا JSONِ خراب
  }
}

export async function handleCreate(req: Request, deps: TransferDeps): Promise<Response> {
  if (!deps.saves || !deps.transfers) return json({ mode: "offline" });
  const token = req.headers.get(TOKEN_HEADER);
  if (!validToken(token)) return json({ error: "token" }, 401);
  if (!(await deps.limit.take(clientIp(req))).ok) return json({ error: "rate" }, 429);
  const b = await body(req);
  if (!b || !validId(b.id)) return json({ error: "id" }, 400);
  try {
    const row = await deps.saves.get(b.id);
    if (!row) return json({ error: "no_save" }, 404);
    if (row.tokenHash && !tokenMatches(token, row.tokenHash)) return json({ error: "forbidden" }, 403);
    const expiresAt = (deps.now?.() ?? Date.now()) + CODE_TTL_MS;
    for (let attempt = 0; ; attempt++) {
      const code = newCode();
      try {
        await deps.transfers.create(code, b.id, new Date(expiresAt));
        return json({ code, expiresAt });
      } catch (e) {
        if (attempt >= 2) throw e; // برخوردِ کد (تقریباً ناممکن) → دوباره
      }
    }
  } catch (e) {
    logServerError("transfer.create", e);
    return json({ mode: "offline" });
  }
}

export async function handleRedeem(req: Request, deps: TransferDeps): Promise<Response> {
  if (!deps.saves || !deps.transfers) return json({ mode: "offline" });
  if (!(await deps.limit.take(clientIp(req))).ok) return json({ error: "rate" }, 429);
  const b = await body(req);
  const code = normalizeCode(b?.code);
  if (!code) return json({ error: "invalid" }, 400);
  try {
    const got = await deps.transfers.take(code, new Date(deps.now?.() ?? Date.now()));
    if (got === null) return json({ error: "not_found" }, 404);
    if (got === "expired" || got === "used") return json({ error: got }, 410);
    const row = await deps.saves.get(got.saveId);
    const clean = row ? sanitizeSave(row.data) : null;
    if (!clean) return json({ error: "no_save" }, 404);
    return json({ data: clean });
  } catch (e) {
    logServerError("transfer.redeem", e);
    return json({ mode: "offline" });
  }
}
