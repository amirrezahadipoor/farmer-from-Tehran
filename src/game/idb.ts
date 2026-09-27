/**
 * src/game/idb.ts — IndexedDBِ کلید-مقدار برای سیو (نقشه‌ی راه، مورد ۳)
 *
 * سیو هم‌زمان در دو جا نوشته می‌شود: localStorage (هم‌زمان و مطمئن در لحظه‌ی بستنِ صفحه) و این‌جا
 * (ناهم‌زمان، بی‌سقفِ ۵ مگابایتیِ localStorage). هنگامِ بارگذاری تازه‌ترینِ سالم برنده است؛ پس اگر یکی
 * پر، پاک یا خراب شد، دیگری بازی را نجات می‌دهد. هیچ تابعی پرتاب نمی‌کند.
 */
const DB_NAME = "golden-valley";
const STORE = "kv";
export const IDB_SAVE = "save";
export const IDB_BACKUP = "save_bak";

let opening: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  opening ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  }).then((db) => {
    if (!db) opening = null; // دفعه‌ی بعد دوباره امتحان می‌شود
    return db;
  });
  return opening;
}

export async function idbGet(key: string): Promise<string | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

/** سیوِ تازه را می‌نویسد و نسخه‌ی قبلیِ متفاوت را در همان تراکنش به پشتیبان می‌برد */
export async function idbRotateSave(json: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      const cur = st.get(IDB_SAVE);
      cur.onsuccess = () => {
        if (typeof cur.result === "string" && cur.result !== json) st.put(cur.result, IDB_BACKUP);
        st.put(json, IDB_SAVE);
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbDel(...keys: string[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      for (const k of keys) tx.objectStore(STORE).delete(k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
