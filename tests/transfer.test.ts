import { describe, it, expect } from "vitest";
import { newState } from "../src/game/logic";
import { decodeSave, encodeSave } from "../src/game/transfer";
import { CODE_ALPHABET, formatCode, normalizeCode } from "../src/game/transferCode";
import { handleCreate, handleRedeem, newCode, type TransferDeps } from "../src/server/transfer/handler";
import { MemoryTransferStore } from "../src/server/transfer/store";
import { MemorySaveStore } from "../src/server/save/store";
import { RateLimiter } from "../src/server/save/limit";
import { hashToken } from "../src/server/save/auth";

/** tests/transfer.test.ts — انتقالِ مزرعه به دستگاهِ دیگر (نقشه‌ی راه، مورد ۳) */
describe("متنِ انتقال", () => {
  it("رفت‌وبرگشت: همان مزرعه، فشرده و کوتاه‌تر از JSON", async () => {
    const s = newState();
    s.coins = 777_777;
    s.level = 9;
    const text = await encodeSave(s);
    expect(text.startsWith("GVF1.z.")).toBe(true);
    expect(text.length).toBeLessThan(JSON.stringify(s).length);
    const back = await decodeSave(`  ${text.slice(0, 40)}\n${text.slice(40)}  `); // فاصله و شکستنِ خط در پیام‌رسان
    expect(back?.coins).toBe(777_777);
    expect(back?.level).toBe(9);
    expect(back?.tiles.length).toBe(s.tiles.length);
  });

  it("متنِ دستکاری‌شده، ناقص یا بیگانه پذیرفته نمی‌شود", async () => {
    const text = await encodeSave(newState());
    expect(await decodeSave(text.slice(0, -20))).toBeNull();
    expect(await decodeSave("GVF1.z.AAAA")).toBeNull();
    expect(await decodeSave("hello")).toBeNull();
    const notSave = `GVF1.j.${Buffer.from(JSON.stringify({ hi: 1 })).toString("base64url")}`;
    expect(await decodeSave(notSave)).toBeNull();
  });

  it("قالبِ بی‌فشرده (j) هم خوانده می‌شود", async () => {
    const s = newState();
    const plain = `GVF1.j.${Buffer.from(JSON.stringify(s)).toString("base64url")}`;
    expect((await decodeSave(plain))?.coins).toBe(s.coins);
  });
});

describe("کدِ کوتاه", () => {
  it("۸ نویسه از الفبای بی‌ابهام؛ ورودیِ کاربر با فاصله و خط تیره و حروف کوچک", () => {
    for (let i = 0; i < 200; i++) {
      const c = newCode();
      expect(c).toHaveLength(8);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
    expect(normalizeCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(formatCode("ABCDEFGH")).toBe("ABCD-EFGH");
    expect(normalizeCode("ABCD-EFG0"), "صفر در الفبا نیست").toBeNull();
    expect(normalizeCode("ABC")).toBeNull();
  });
});

const TOKEN = "a".repeat(64);
const OTHER = "b".repeat(64);
const mkDeps = (now = 1_000_000): TransferDeps & { saves: MemorySaveStore; transfers: MemoryTransferStore; clock: { t: number } } => {
  const clock = { t: now };
  return { saves: new MemorySaveStore(), transfers: new MemoryTransferStore(), limit: new RateLimiter(100, 1000), now: () => clock.t, clock };
};
const req = (path: string, body: unknown, token: string | null = TOKEN, ip = "1.2.3.4") =>
  new Request(`http://x${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(token ? { "x-farm-token": token } : {}) } });

describe("/api/transfer", () => {
  it("فقط مالکِ سیو کد می‌سازد و دستگاهِ دیگر یک‌بار همان مزرعه را می‌گیرد", async () => {
    const d = mkDeps();
    const s = newState();
    s.coins = 4242;
    await d.saves.put("p_owner_1", s, hashToken(TOKEN));

    expect((await handleCreate(req("/api/transfer", { id: "p_owner_1" }, OTHER), d)).status).toBe(403);
    expect((await handleCreate(req("/api/transfer", { id: "p_owner_1" }, null), d)).status).toBe(401);
    expect((await handleCreate(req("/api/transfer", { id: "p_nobody_9" }), d)).status).toBe(404);

    const made = await (await handleCreate(req("/api/transfer", { id: "p_owner_1" }), d)).json();
    expect(normalizeCode(made.code)).toBe(made.code);
    expect(made.expiresAt).toBe(1_000_000 + 24 * 3600 * 1000);

    const got = await handleRedeem(req("/api/transfer/redeem", { code: formatCode(made.code).toLowerCase() }, OTHER), d);
    expect(got.status).toBe(200);
    expect((await got.json()).data.coins).toBe(4242);

    const again = await handleRedeem(req("/api/transfer/redeem", { code: made.code }, OTHER), d);
    expect(again.status).toBe(410);
    expect((await again.json()).error).toBe("used");
  });

  it("کدِ منقضی ۴۱۰، ناشناخته ۴۰۴، بدقالب ۴۰۰", async () => {
    const d = mkDeps();
    await d.saves.put("p_owner_2", newState(), hashToken(TOKEN));
    const { code } = await (await handleCreate(req("/api/transfer", { id: "p_owner_2" }), d)).json();
    d.clock.t += 24 * 3600 * 1000 + 1;
    const late = await handleRedeem(req("/api/transfer/redeem", { code }), d);
    expect(late.status).toBe(410);
    expect((await late.json()).error).toBe("expired");
    expect((await handleRedeem(req("/api/transfer/redeem", { code: "ZZZZ-ZZZZ" }), d)).status).toBe(404);
    expect((await handleRedeem(req("/api/transfer/redeem", { code: "12" }), d)).status).toBe(400);
  });

  it("سقفِ نرخِ هر IP جلوی حدس‌زدنِ کد را می‌گیرد", async () => {
    const d = { ...mkDeps(), limit: new RateLimiter(3, 60_000, () => 0) };
    const codes = ["AAAA-AAAA", "BBBB-BBBB", "CCCC-CCCC", "DDDD-DDDD"];
    const st = [];
    for (const code of codes) st.push((await handleRedeem(req("/api/transfer/redeem", { code }, null, "9.9.9.9"), d)).status);
    expect(st).toEqual([404, 404, 404, 429]);
  });

  it("بی‌پایگاه‌داده «آفلاین» است و کلاینت سراغِ متن یا فایل می‌رود", async () => {
    const d: TransferDeps = { saves: null, transfers: null, limit: new RateLimiter(5, 1000) };
    expect((await (await handleCreate(req("/api/transfer", { id: "p_x_1" }), d)).json()).mode).toBe("offline");
    expect((await (await handleRedeem(req("/api/transfer/redeem", { code: "ABCD-EFGH" }), d)).json()).mode).toBe("offline");
  });

  // ── B/T8: بستنِ کسورِ پوششِ ریویو — مسیرهای خطا و تاب‌آوریِ هندلر

  it("بدنه‌ی JSON خراب یا ناع объект → 400 (بدونِ استثنا)", async () => {
    const d = mkDeps();
    const bad = (raw: string, token = TOKEN) =>
      new Request("http://x/api/transfer", { method: "POST", body: raw, headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4", ...(token ? { "x-farm-token": token } : {}) } });
    expect((await handleCreate(bad("not json"), d)).status).toBe(400);
    expect((await handleCreate(bad(JSON.stringify(["array"])), d)).status).toBe(400);
    expect((await handleCreate(bad(JSON.stringify({ id: 42 })), d)).status).toBe(400);
    expect((await handleRedeem(bad("{{{"), d)).status).toBe(400);
  });

  it("برخوردِ کد (تقریباً ناممکن) → تا دو بار دوباره، بعد خطا بالا می‌رود و «آفلاین» می‌شود", async () => {
    const d = mkDeps();
    await d.saves.put("p_owner_3", newState(), hashToken(TOKEN));
    let throws = 2;
    const real = d.transfers.create.bind(d.transfers);
    d.transfers.create = async (code, saveId, exp) => {
      if (throws-- > 0) throw new Error("collision");
      return real(code, saveId, exp);
    };
    const r = await handleCreate(req("/api/transfer", { id: "p_owner_3" }), d);
    expect(r.status).toBe(200); // دو برخورد پشتِ سر، سومین موفق
    expect(((await r.json()) as { code: string }).code).toHaveLength(8);
  });

  it("خطای پایگاه‌داده در ساخت و مصرف کد → «آفلاین»، نه ۵۰۰", async () => {
    const d = mkDeps();
    await d.saves.put("p_owner_4", newState(), hashToken(TOKEN));
    d.saves.get = async () => {
      throw new Error("db down");
    };
    const c = await handleCreate(req("/api/transfer", { id: "p_owner_4" }), d);
    expect((await c.json()).mode).toBe("offline");

    const d2 = mkDeps();
    await d2.saves.put("p_owner_5", newState(), hashToken(TOKEN));
    const made = await (await handleCreate(req("/api/transfer", { id: "p_owner_5" }), d2)).json();
    d2.transfers.take = async () => {
      throw new Error("db down");
    };
    const r = await handleRedeem(req("/api/transfer/redeem", { code: made.code }), d2);
    expect((await r.json()).mode).toBe("offline");
  });

  it("کدِ سالم اما سیوِ حذف‌شده → 404 no_save (نه crash و نه داده‌ی خالی)", async () => {
    const d = mkDeps();
    await d.saves.put("p_owner_6", newState(), hashToken(TOKEN));
    const made = await (await handleCreate(req("/api/transfer", { id: "p_owner_6" }), d)).json();
    d.saves.rows.delete("p_owner_6");
    const r = await handleRedeem(req("/api/transfer/redeem", { code: made.code }), d);
    expect(r.status).toBe(404);
    expect((await r.json()).error).toBe("no_save");
  });
});
