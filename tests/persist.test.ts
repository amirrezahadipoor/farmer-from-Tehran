import { describe, it, expect, beforeEach, vi } from "vitest";
import { newState, type State } from "../src/game/logic";
import { N, ITEMS } from "../src/game/data";
import {
  sanitizeSave,
  readLocalSave,
  quarantine,
  readQuarantined,
  restoreQuarantined,
  pickNewer,
  writeLocalSave,
  readBackupSave,
  readLocalWithBackup,
  BACKUP_KEY,
  readLS,
  writeLS,
  dropLS,
  SAVE_KEY,
  BROKEN_KEY,
  type LoadOutcome,
} from "../src/game/persist";

/**
 * P5.1 — «سیو خراب → بازیابی به‌جای قفل ابدی»
 * هر چه این تست‌ها سبز باشند، هیچ سیوِ معیوبی نمی‌تواند بازی را از کار بیندازد.
 */

/** یک localStorage ساده و درون‌حافظه‌ای برای محیط node */
function fakeLS(opts: { throwOn?: "get" | "set" | "all" } = {}) {
  const map = new Map<string, string>();
  const maybeThrow = (op: "get" | "set") => {
    if (opts.throwOn === "all" || opts.throwOn === op) throw new DOMException("blocked", "SecurityError");
  };
  return {
    getItem(k: string) {
      maybeThrow("get");
      return map.has(k) ? (map.get(k) as string) : null;
    },
    setItem(k: string, v: string) {
      maybeThrow("set");
      map.set(k, v);
    },
    removeItem(k: string) {
      maybeThrow("set");
      map.delete(k);
    },
    _map: map,
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeLS());
});

const ok = (s: State) => JSON.parse(JSON.stringify(s)) as State;

describe("sanitizeSave — سیوِ سالم", () => {
  it("سیوِ درست را همان‌طور برمی‌گرداند", () => {
    const s = newState();
    s.coins = 1234;
    const out = sanitizeSave(ok(s));
    expect(out).not.toBeNull();
    expect(out!.coins).toBe(1234);
    expect(out!.tiles.length).toBe(N * N);
  });

  it("ورودی غیرشیء یا نسخه‌ی ناشناخته را رد می‌کند", () => {
    expect(sanitizeSave(null)).toBeNull();
    expect(sanitizeSave("سلام")).toBeNull();
    expect(sanitizeSave(42)).toBeNull();
    expect(sanitizeSave({})).toBeNull();
    expect(sanitizeSave({ v: 4, tiles: [] })).toBeNull();
    expect(sanitizeSave({ v: 5, tiles: [] })).toBeNull();
  });
});

describe("sanitizeSave — سیوِ نیمه‌خراب قابل نجات است", () => {
  it("NaN و Infinity در پول/لول/روز را با عدد سالم عوض می‌کند", () => {
    const s = ok(newState());
    (s as unknown as Record<string, unknown>).coins = NaN;
    (s as unknown as Record<string, unknown>).xp = Infinity;
    (s as unknown as Record<string, unknown>).level = -7;
    (s as unknown as Record<string, unknown>).day = 0.5;
    const out = sanitizeSave(s)!;
    expect(Number.isFinite(out.coins)).toBe(true);
    expect(Number.isFinite(out.xp)).toBe(true);
    expect(out.level).toBeGreaterThanOrEqual(1);
    expect(out.day).toBeGreaterThanOrEqual(1);
  });

  it("market نامعتبر (null) را می‌سازد به‌جای پرتاب استثنا", () => {
    const s = ok(newState());
    (s as unknown as Record<string, unknown>).market = null;
    const out = sanitizeSave(s);
    expect(out).not.toBeNull();
    Object.keys(ITEMS).forEach((k) => expect(out!.market[k]).toBeTruthy());
    expect(out!.market.wheat.hist).toEqual([]);
  });

  it("کاشی‌های ناقص را به چمنِ خالی تبدیل می‌کند و تعداد را نگه می‌دارد", () => {
    const s = ok(newState());
    (s.tiles as unknown[])[5] = null;
    (s.tiles as unknown[])[6] = { k: "زرافه", v: "nan" };
    (s.tiles as unknown[])[7] = { k: "soil", v: 7, g: NaN, b: {} };
    const out = sanitizeSave(s)!;
    expect(out.tiles.length).toBe(N * N);
    expect(out.tiles[5].k).toBe("grass");
    expect(out.tiles[6].k).toBe("grass");
    expect(Number.isFinite(out.tiles[6].v)).toBe(true);
    expect(out.tiles[7].k).toBe("soil");
    expect(out.tiles[7].b).toBeUndefined(); // b غیررشته حذف شد
  });

  it("فهرست‌های آلوده (techs/skills/workers/orders) پاک‌سازی می‌شوند", () => {
    const s = ok(newState());
    (s as unknown as Record<string, unknown>).techs = ["seeds1", 5, null, "seeds1", ""];
    (s as unknown as Record<string, unknown>).skills = { نه: "آرایه" };
    (s as unknown as Record<string, unknown>).workers = [null, "x", {}];
    (s as unknown as Record<string, unknown>).orders = "خراب";
    const out = sanitizeSave(s)!;
    expect(out.techs).toEqual(["seeds1"]);
    expect(out.skills).toEqual([]);
    expect(out.workers).toHaveLength(1);
    expect(out.orders).toEqual([]);
  });

  it("داستانِ خارج از محدوده را به مقدار معتبر برمی‌گرداند", () => {
    const s = ok(newState());
    (s.story as unknown as Record<string, unknown>).chapter = 9999;
    (s.story as unknown as Record<string, unknown>).sceneIdx = -3;
    (s.story as unknown as Record<string, unknown>).phase = "چیزِ نامعلوم";
    const out = sanitizeSave(s)!;
    expect(out.story.chapter).toBeLessThanOrEqual(99);
    expect(out.story.sceneIdx).toBe(0);
    expect(out.story.phase).toBe("scenes");
  });

  it("chunks با اندازه‌ی غلط بازسازی می‌شود تا نقشه خراب نشود", () => {
    const s = ok(newState());
    (s as unknown as Record<string, unknown>).chunks = [true, false];
    const out = sanitizeSave(s)!;
    expect(out.chunks.length).toBeGreaterThan(1);
    expect(out.chunks.every((c) => c === false)).toBe(true);
  });

  it("وضعیت آب‌وهوای نامعتبر به «sun» برمی‌گردد", () => {
    const s = ok(newState());
    (s as unknown as Record<string, unknown>).weather = "طوفانِ نامعلوم";
    expect(sanitizeSave(s)!.weather).toBe("sun");
  });
});

describe("readLocalSave — بازیابی از سیوِ خراب (P5.1)", () => {
  it("JSON خراب → قرنطینه + corrupt=true (بدون پرتاب استثنا)", () => {
    localStorage.setItem(SAVE_KEY, "{این JSON نیست");
    const out = readLocalSave();
    expect(out.corrupt).toBe(true);
    expect(out.state).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull(); // سیوِ خراب کنار گذاشته شد
    const q = readQuarantined();
    expect(q).not.toBeNull();
    expect(q!.raw).toContain("این JSON نیست");
  });

  it("شیء نامعتبر (v قدیمی) هم قرنطینه می‌شود", () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, tiles: [] }));
    const out = readLocalSave();
    expect(out.corrupt).toBe(true);
    expect(localStorage.getItem(BROKEN_KEY)).not.toBeNull();
  });

  it("سیوِ سالم → corrupt=false و منبع local", () => {
    const s = newState();
    s.coins = 777;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const out = readLocalSave();
    expect(out.corrupt).toBe(false);
    expect(out.source).toBe("local");
    expect(out.state!.coins).toBe(777);
  });

  it("بدون سیو → نه خطا، نه قرنطینه", () => {
    const out = readLocalSave();
    expect(out).toEqual({ state: null, corrupt: false, source: null, note: expect.any(String) });
  });

  it("حافظه‌ی مسدود (مرور خصوصی) → بازی قفل نمی‌شود", () => {
    vi.stubGlobal("localStorage", fakeLS({ throwOn: "all" }));
    expect(() => readLocalSave()).not.toThrow();
    expect(readLocalSave().state).toBeNull();
    expect(() => quarantine("x")).not.toThrow();
  });
});

describe("restoreQuarantined — بازگرداندن پیشرفتِ بازیکن", () => {
  it("سیوِ قرنطینه‌شده‌ی سالم را برمی‌گرداند", () => {
    const s = newState();
    s.coins = 4321;
    // سناریوی واقعی: فایل سالم بود، ولی JSON با یک کاراکتر اضافه خراب شده بود
    localStorage.setItem(BROKEN_KEY, JSON.stringify({ at: Date.now(), raw: JSON.stringify(s) }));
    const out = restoreQuarantined();
    expect(out.state?.coins).toBe(4321);
    expect(out.corrupt).toBe(false);
  });

  it("اگر پشتیبان هم خراب باشد، می‌گوید «قابل بازیابی نبود»", () => {
    localStorage.setItem(BROKEN_KEY, JSON.stringify({ at: Date.now(), raw: "{{{" }));
    const out = restoreQuarantined();
    expect(out.state).toBeNull();
    expect(out.note).toContain("قابل تجزیه");
  });

  it("بدون پشتیبان هیچ کاری نمی‌کند", () => {
    expect(restoreQuarantined().state).toBeNull();
  });
});

describe("پشتیبانِ چرخشی — سیوِ خراب، پیشرفت را نمی‌بَرد", () => {
  it("هر ذخیره، نسخه‌ی سالمِ قبلی را به پشتیبان منتقل می‌کند", () => {
    const a = newState();
    a.coins = 111;
    const b = newState();
    b.coins = 222;
    writeLocalSave(JSON.stringify(a));
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull(); // نسخه‌ی قبلی نبود
    writeLocalSave(JSON.stringify(b));
    expect(readBackupSave().state?.coins).toBe(111);
    expect(readLocalSave().state?.coins).toBe(222);
  });

  it("سیوِ خراب هیچ‌وقت جای پشتیبانِ سالم را نمی‌گیرد", () => {
    const a = newState();
    a.coins = 333;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(a));
    localStorage.setItem(SAVE_KEY, '{"v":5,"tiles":['); // نیمه‌نوشته
    writeLocalSave(JSON.stringify(newState()));
    expect(readBackupSave().state?.coins).toBe(333);
  });

  it("سیوِ اصلیِ خراب → خودکار از پشتیبان بالا می‌آید و پرچم خرابی حفظ می‌شود", () => {
    const a = newState();
    a.coins = 987654;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(a));
    localStorage.setItem(SAVE_KEY, '{"v":5,"tiles":[{"k":"soil"');
    const out = readLocalWithBackup();
    expect(out.state?.coins).toBe(987654);
    expect(out.source).toBe("backup");
    expect(out.corrupt).toBe(true);
    expect(out.note).toContain("پشتیبان");
    expect(readQuarantined()?.raw).toBe('{"v":5,"tiles":[{"k":"soil"');
  });

  it("اگر پشتیبان هم خراب باشد، بازی تازه با پرچم خرابی شروع می‌شود", () => {
    localStorage.setItem(BACKUP_KEY, "{{{");
    localStorage.setItem(SAVE_KEY, "}}}");
    const out = readLocalWithBackup();
    expect(out.state).toBeNull();
    expect(out.corrupt).toBe(true);
  });

  it("سیوِ سالم → پشتیبان دست نمی‌خورد", () => {
    const a = newState();
    a.coins = 5;
    localStorage.setItem(SAVE_KEY, JSON.stringify(a));
    const out = readLocalWithBackup();
    expect(out.source).toBe("local");
    expect(out.corrupt).toBe(false);
  });

  it("حافظه‌ی پر/مسدود → writeLocalSave پرتاب نمی‌کند", () => {
    vi.stubGlobal("localStorage", fakeLS({ throwOn: "set" }));
    expect(() => writeLocalSave("{}")).not.toThrow();
    expect(writeLocalSave("{}")).toBe(false);
  });
});

describe("pickNewer — تازه‌تر بین محلی و ابری", () => {
  const wrap = (s: State | null, corrupt = false, source: LoadOutcome["source"] = "local"): LoadOutcome => ({
    state: s,
    corrupt,
    source,
    note: "",
  });

  it("سیوی که savedAt بزرگ‌تر دارد برنده است", () => {
    const a = newState();
    a.savedAt = 1000;
    a.coins = 10;
    const b = newState();
    b.savedAt = 2000;
    b.coins = 20;
    expect(pickNewer(wrap(a), wrap(b, false, "cloud")).state!.coins).toBe(20);
    expect(pickNewer(wrap(b, false, "cloud"), wrap(a)).state!.coins).toBe(20);
  });

  it("اگر فقط یکی سالم باشد، همان انتخاب می‌شود و پرچم خرابی حفظ می‌شود", () => {
    const a = newState();
    a.coins = 55;
    const out = pickNewer(wrap(null, true), wrap(a, false, "cloud"));
    expect(out.state!.coins).toBe(55);
    expect(out.corrupt).toBe(true);
  });

  it("اگر هیچ‌کدام سالم نبود، بازی تازه با پرچم خرابی اعلام می‌شود", () => {
    const out = pickNewer(wrap(null, true), wrap(null));
    expect(out.state).toBeNull();
    expect(out.corrupt).toBe(true);
  });
});

describe("ابزارهای ایمن حافظه", () => {
  it("writeLS/readLS/dropLS در حالت مسدود هم پرتاب نمی‌کنند", () => {
    expect(writeLS("k", "v")).toBe(true);
    expect(readLS("k")).toBe("v");
    dropLS("k");
    expect(readLS("k")).toBeNull();

    vi.stubGlobal("localStorage", fakeLS({ throwOn: "all" }));
    expect(writeLS("k", "v")).toBe(false);
    expect(readLS("k")).toBeNull();
    expect(() => dropLS("k")).not.toThrow();
  });
});
