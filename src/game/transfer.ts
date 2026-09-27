/**
 * src/game/transfer.ts — انتقالِ مزرعه به دستگاهِ دیگر (نقشه‌ی راه، مورد ۳)
 *
 *  ۱. متن یا فایلِ فشرده (همه‌جا، حتی دموی بی‌سرور): GVF1.<z|j>.<base64url>؛ z یعنی gzip
 *  ۲. کدِ کوتاهِ ۸ حرفیِ یک‌بارمصرف با ۲۴ ساعت اعتبار، وقتی سرورِ ذخیره‌ی ابری هست
 * هر مزرعه‌ی واردشده از همان sanitizeSaveِ بازی می‌گذرد؛ متنِ دستکاری‌شده بازی را خراب نمی‌کند.
 */
import type { State } from "./logic";
import { sanitizeSave } from "./sim/sanitize";
import { STATIC_BUILD, asset } from "./base";
import { TOKEN_HEADER, ensureFarmToken, ensurePlayerId, writeLocalSave } from "./persist";
import { idbRotateSave } from "./idb";
import { normalizeCode } from "./transferCode";

export const TRANSFER_PREFIX = "GVF1";

function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(t: string): Uint8Array {
  const b = atob(t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeSave(state: State): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream !== "undefined") {
    try {
      return `${TRANSFER_PREFIX}.z.${toB64url(await through(raw, new CompressionStream("gzip")))}`;
    } catch {
      /* بدونِ فشرده‌سازی */
    }
  }
  return `${TRANSFER_PREFIX}.j.${toB64url(raw)}`;
}

/** متنِ انتقال را می‌خواند؛ هر ایرادی (قالب، فشرده‌سازی، JSON، داده‌ی نامعتبر) = null */
export async function decodeSave(text: string): Promise<State | null> {
  const m = /^GVF1\.([zj])\.([A-Za-z0-9_-]+)$/.exec(text.replace(/\s+/g, ""));
  if (!m) return null;
  try {
    let bytes = fromB64url(m[2]);
    if (m[1] === "z") {
      if (typeof DecompressionStream === "undefined") return null;
      bytes = await through(bytes, new DecompressionStream("gzip"));
    }
    return sanitizeSave(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

/** مزرعه‌ی واردشده جای سیوِ این دستگاه می‌نشیند؛ زمانش «اکنون» می‌شود تا بارگذاری آن را تازه‌ترین بداند */
export async function adoptSave(state: State): Promise<void> {
  state.savedAt = Date.now();
  const json = JSON.stringify(state);
  writeLocalSave(json);
  await idbRotateSave(json);
}

export type TransferError = "offline" | "no_save" | "not_found" | "expired" | "used" | "rate" | "invalid" | "network";

export const TRANSFER_ERRORS: Record<TransferError, string> = {
  offline: "کدِ کوتاه به سرورِ ذخیره‌ی ابری نیاز دارد؛ از متن یا فایلِ انتقال استفاده کن",
  no_save: "هنوز سیوی از این مزرعه در ابر نیست؛ چند ثانیه‌ی دیگر دوباره بزن",
  not_found: "این کد پیدا نشد",
  expired: "اعتبارِ این کد تمام شده است",
  used: "این کد قبلاً استفاده شده است",
  rate: "کمی صبر کن و دوباره امتحان کن",
  invalid: "کد باید ۸ حرف باشد",
  network: "به سرور وصل نشد",
};

async function post(path: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const res = await fetch(asset(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", [TOKEN_HEADER]: ensureFarmToken() },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}

const errorOf = (status: number, body: Record<string, unknown> | null): TransferError => {
  if (body?.mode === "offline") return "offline";
  if (status === 429) return "rate";
  const e = body?.error;
  return e === "no_save" || e === "not_found" || e === "expired" || e === "used" || e === "invalid" ? e : "network";
};

export async function createTransferCode(): Promise<{ code: string; expiresAt: number } | { error: TransferError }> {
  if (STATIC_BUILD) return { error: "offline" };
  try {
    const r = await post("/api/transfer", { id: ensurePlayerId() });
    if (r.status === 200 && typeof r.body?.code === "string") return { code: r.body.code, expiresAt: Number(r.body.expiresAt) };
    return { error: errorOf(r.status, r.body) };
  } catch {
    return { error: "network" };
  }
}

export async function redeemTransferCode(input: string): Promise<{ state: State } | { error: TransferError }> {
  if (STATIC_BUILD) return { error: "offline" };
  const code = normalizeCode(input);
  if (!code) return { error: "invalid" };
  try {
    const r = await post("/api/transfer/redeem", { code });
    const state = r.status === 200 ? sanitizeSave(r.body?.data) : null;
    return state ? { state } : { error: errorOf(r.status, r.body) };
  } catch {
    return { error: "network" };
  }
}
