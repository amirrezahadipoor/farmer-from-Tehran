import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { newState } from "../src/game/logic";

/**
 * پوششِ مسیرهای بی‌تستِ persist.ts (کسری «فایل‌های کم‌پوشش» در ریویوی سخت‌گیرانه):
 * IndexedDB، حافظه‌ی ماندگارِ مرورگر، سیوِ ابری و ابزارهای توکن/شناسه.
 * هیچ‌کدام نباید استثنا بدهند: «هیچ خطایی بازی را قفل نمی‌کند».
 */

const store = new Map<string, string>();
const idb = new Map<string, string>();
const rotate = vi.fn(async (json: string) => {
  idb.set("save", json);
  return true;
});
const del = vi.fn(async (...keys: string[]) => {
  for (const k of keys) idb.delete(k);
});

vi.mock("../src/game/idb", () => ({
  IDB_SAVE: "save",
  IDB_BACKUP: "save_bak",
  idbGet: async (key: string) => idb.get(key),
  idbRotateSave: rotate,
  idbDel: del,
}));

const {
  readIdbSave,
  clearAllSaves,
  requestPersistence,
  fetchCloudSave,
  ensureFarmToken,
  ensurePlayerId,
  pickNewer,
  writeLocalSave,
  SAVE_KEY,
  TOKEN_KEY,
  PID_KEY,
} = await import("../src/game/persist");

/** localStorageِ درون‌حافظه‌ای برای محیط node */
function fakeLS() {
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

beforeEach(() => {
  store.clear();
  idb.clear();
  rotate.mockClear();
  del.mockClear();
  vi.stubGlobal("localStorage", fakeLS());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IndexedDB — سیوِ دوم در پایگاه‌داده‌ی مرورگر", () => {
  it("سیوِ IndexedDB خوانده می‌شود", async () => {
    idb.set("save", JSON.stringify(newState()));
    const out = await readIdbSave();
    expect(out.source).toBe("idb");
    expect(out.state).not.toBeNull();
  });

  it("اگر سیوِ اصلی خراب بود، پشتیبانِ همان‌جا بازیابی می‌شود", async () => {
    idb.set("save", "{خراب");
    idb.set("save_bak", JSON.stringify(newState()));
    const out = await readIdbSave();
    expect(out.source).toBe("backup");
    expect(out.state).not.toBeNull();
  });

  it("اگر هر دو خراب/خالی باشند، بازی تازه بالا می‌آید (بدون استثنا)", async () => {
    expect((await readIdbSave()).state).toBeNull();
    idb.set("save", "{}");
    idb.set("save_bak", "{}");
    const out = await readIdbSave();
    expect(out.state).toBeNull();
    expect(out.note).toContain("خالی");
  });

  it("نوشتنِ محلی، سیو را به IndexedDB هم می‌برد و «شروع دوباره» هر دو را پاک می‌کند", async () => {
    writeLocalSave(JSON.stringify(newState()));
    expect(rotate).toHaveBeenCalledTimes(1);
    store.set(SAVE_KEY, "x");
    clearAllSaves();
    expect(store.has(SAVE_KEY)).toBe(false);
    expect(del).toHaveBeenCalled();
    expect(idb.size).toBe(0);
  });
});

describe("حافظه‌ی ماندگارِ مرورگر", () => {
  it("اگر مرورگر پشتیبانی نکند: unsupported", async () => {
    vi.stubGlobal("navigator", {});
    expect(await requestPersistence()).toBe("unsupported");
  });

  it("اگر سیو از قبل ماندگار باشد: granted بدون پنجره‌ی اجازه", async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal("navigator", { storage: { persisted: async () => true, persist } });
    expect(await requestPersistence()).toBe("granted");
    expect(persist).not.toHaveBeenCalled();
    expect(store.get("farm_persist")).toBe("granted"); // نتیجه برای پنل نگه داشته می‌شود
    // فقط پرسشِ وضعیت (ask=false) چیزی نمی‌نویسد
    store.clear();
    expect(await requestPersistence(false)).toBe("granted");
    expect(store.has("farm_persist")).toBe(false);
  });

  it("اگر اجازه داده شود: granted، و اگر نه: denied", async () => {
    vi.stubGlobal("navigator", { storage: { persisted: async () => false, persist: async () => true } });
    expect(await requestPersistence()).toBe("granted");
    vi.stubGlobal("navigator", { storage: { persisted: async () => false, persist: async () => false } });
    expect(await requestPersistence()).toBe("denied");
    vi.stubGlobal("navigator", { storage: { persisted: async () => { throw new Error("no"); } } });
    expect(await requestPersistence()).toBe("unsupported");
  });
});

describe("سیوِ ابری", () => {
  it("۴۰۳ یعنی «سیو با توکنِ این دستگاه باز نمی‌شود»", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));
    const out = await fetchCloudSave("id");
    expect(out.source).toBeNull();
    expect(out.note).toContain("توکن");
  });

  it("۵۰۰ یا خطای شبکه = «در دسترس نبود» (هرگز پرتاب نمی‌کند)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    expect((await fetchCloudSave("id")).note).toContain("دسترس نبود");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    expect((await fetchCloudSave("id")).state).toBeNull();
  });

  it("بدنه‌ی خالی یا نامعتبر نادیده گرفته می‌شود و سیوِ سالم برمی‌گردد", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: null })));
    expect((await fetchCloudSave("id")).note).toContain("خالی");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { v: 1 } })));
    expect((await fetchCloudSave("id")).note).toContain("نامعتبر");
    const save = JSON.parse(JSON.stringify(newState()));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: save })));
    const out = await fetchCloudSave("id");
    expect(out.source).toBe("cloud");
    expect(out.state!.coins).toBe(save.coins);
  });
});

describe("توکن و شناسه‌ی بازیکن", () => {
  it("توکن ۶۴ رقمِ هگز است و بین فراخوان‌ها ثابت می‌ماند", () => {
    const a = ensureFarmToken();
    const b = ensureFarmToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(b).toBe(a);
    expect(store.get(TOKEN_KEY)).toBe(a);
  });

  it("توکنِ قبلی که شکلِ درست نداشته باشد دوباره ساخته می‌شود", () => {
    store.set(TOKEN_KEY, "short");
    expect(ensureFarmToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("شناسه‌ی بازیکن یکتا و پایدار است", () => {
    const a = ensurePlayerId();
    expect(a.startsWith("p_")).toBe(true);
    expect(ensurePlayerId()).toBe(a);
    expect(store.get(PID_KEY)).toBe(a);
  });
});

describe("pickNewer — همه‌ی حالت‌ها", () => {
  const mk = (coins: number, savedAt: number) => ({ ...newState(), coins, savedAt });
  const none = { state: null, corrupt: false, source: null, note: "ندارد" };

  it("اگر هیچ‌کدام سیو نداشته باشند، پرچم خرابی حفظ می‌شود", () => {
    const out = pickNewer(none, { ...none, corrupt: true });
    expect(out.state).toBeNull();
    expect(out.corrupt).toBe(true);
  });

  it("اگر فقط یکی سیو داشته باشد، همان برنده است و پرچمِ خرابیِ طرفِ دیگر می‌آید", () => {
    const a = mk(10, 1);
    expect(pickNewer({ state: a, corrupt: false, source: "local", note: "" }, none).state!.coins).toBe(10);
    expect(pickNewer(none, { state: a, corrupt: false, source: "cloud", note: "" }).state!.coins).toBe(10);
    expect(pickNewer({ ...none, corrupt: true }, { state: a, corrupt: false, source: "cloud", note: "" }).corrupt).toBe(true);
  });

  it("تازه‌ترین savedAt برنده است (تساوی ⇒ محلی)", () => {
    const old = mk(1, 10);
    const fresh = mk(2, 20);
    expect(pickNewer({ state: old, corrupt: false, source: "local", note: "" }, { state: fresh, corrupt: false, source: "cloud", note: "" }).state!.coins).toBe(2);
    expect(pickNewer({ state: fresh, corrupt: false, source: "local", note: "" }, { state: old, corrupt: false, source: "cloud", note: "" }).state!.coins).toBe(2);
  });
});
