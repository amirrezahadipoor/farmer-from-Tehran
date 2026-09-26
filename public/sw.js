/*
 * Service Worker — مزرعه طلایی (Offline-first)
 * ------------------------------------------------------------------
 * راهبرد کش:
 *   • پوسته‌ی اپ و دارایی‌های ثابت  → پیش‌کش در install
 *   • تصاویر/فونت/آیکون و چانک‌ها   → cache-first + بازاعتبارسنجی در پس‌زمینه
 *   • ناوبری (صفحه)                → network-first با مهلت ۴ ثانیه، فرود به کش
 *   • /api/*                       → شبکه‌ی مستقیم (صف آفلاین سمت اپ است)
 * پیام‌ها: SKIP_WAITING | PREFETCH (لیست URL برای گرم‌کردن کش تصاویر داستان)
 */
const VERSION = "v1";
const CORE = `gvf-core-${VERSION}`;
const RUNTIME = `gvf-rt-${VERSION}`;
const IMAGES = `gvf-img-${VERSION}`;

/** دارایی‌هایی که برای بالا آمدن آفلاینِ اپ لازم‌اند (سبک نگه داشته می‌شود). */
const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/maskable-512.png",
  "/fonts/Vazirmatn-Regular.woff2",
  "/fonts/Vazirmatn-Medium.woff2",
  "/fonts/Vazirmatn-Bold.woff2",
  "/fonts/Vazirmatn-Black.woff2",
];


/**
 * پوسته‌ی اپ را از HTML اصلی «گرم» می‌کند:
 * چانک‌های هش‌دار ‎/_next/static/...‎ فقط از داخل HTML درز می‌کنند، پس با یک بار
 * خواندن صفحه، همه‌ی آن‌ها کش می‌شوند تا بازدید *اول* هم آفلاین بالا بیاید.
 */
async function warmAppShell() {
  const core = await caches.open(CORE);
  const rt = await caches.open(RUNTIME);
  try {
    const res = await fetch("/", { cache: "reload" });
    if (!res.ok) return;
    await core.put("/", res.clone());
    const html = await res.text();
    const urls = new Set();
    const re = /\/_next\/static\/[^\s"'\)]+/g;
    let m;
    while ((m = re.exec(html))) urls.add(m[0]);
    await Promise.all(
      [...urls].map((u) => rt.add(new Request(u, { cache: "reload" })).catch(() => undefined))
    );
  } catch {
    /* آفلاین یا شبکه قطع: بار بعد */
  }
}

/** تصاویر داستان/آسمان/لوگو را مستقل از صفحه گرم می‌کند (برای بازی آفلاین). */
async function warmImages() {
  const cache = await caches.open(IMAGES);
  await Promise.all(STORY_IMAGES.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => undefined)));
}

/** مهلت‌دار کردن کارهای پس‌زمینه تا نصب SW الکی طول نکشد. */
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((r) => setTimeout(r, ms))]);

const IMAGE_RE = /\.(?:webp|avif|png|jpe?g|gif|svg|ico)$/i;
/** تصاویری که برای داستان و منو لازم‌اند (هم‌نام با private/images). */
const STORY_IMAGES = [
  "/images/bg_sky.webp",
  "/images/logo_badge.png",
  "/images/story_office.webp",
  "/images/story_will.webp",
  "/images/story_farm.webp",
  "/images/story_grandpa.webp",
  "/images/story_festival.webp",
  "/images/story_village.webp",
  "/images/story_house.webp",
  "/images/story_landgrab.webp",
  "/images/story_barn.webp",
  "/images/story_mill.webp",
  "/images/story_livestock.webp",
  "/images/story_harvest.webp",
  "/images/story_night.webp",
  "/images/story_machines.webp",
  "/images/story_factory.webp",
  "/images/story_expo.webp",
  "/images/story_sunset.webp",
];

const STATIC_RE = /\/(?:_next\/static|fonts)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE);
      // هر دارایی جداگانه تا یک خطا کل نصب را خراب نکند
      await Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)
        )
      );
      // گرم‌کردن پوسته‌ی Next و تصاویر داستان (از نصب، نه از بازدید دوم)
      await withTimeout(warmAppShell(), 6000);
      await withTimeout(warmImages(), 12000);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CORE, RUNTIME, IMAGES]);
      const names = await caches.keys();
      await Promise.all(names.map((n) => (keep.has(n) ? undefined : caches.delete(n))));
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch {
          /* پشتیبانی نمی‌شود */
        }
      }
      await self.clients.claim();
      const core = await caches.open(CORE);
      if (!(await core.match("/", { ignoreVary: true }))) await withTimeout(warmAppShell(), 6000);
    })()
  );
});

/** پاسخ موفق و قابل‌کش را جدا می‌کند. */
const isCacheable = (res) => res && res.ok && res.type !== "opaque" && res.status !== 206;

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) {
    // بازاعتبارسنجی در پس‌زمینه (stale-while-revalidate)
    event_safe_revalidate(request, cache);
    return hit;
  }
  const res = await fetch(request);
  if (isCacheable(res)) cache.put(request, res.clone()).catch(() => undefined);
  return res;
}

/** بازاعتبارسنجی بدون بلاک‌کردن پاسخ (کمک‌کننده؛ خطا مهم نیست). */
function event_safe_revalidate(request, cache) {
  fetch(request)
    .then((res) => {
      if (isCacheable(res)) cache.put(request, res.clone()).catch(() => undefined);
    })
    .catch(() => undefined);
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CORE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (isCacheable(res)) cache.put("/", res.clone()).catch(() => undefined);
    return res;
  } catch {
    const cached = (await cache.match("/", { ignoreVary: true })) || (await cache.match(request, { ignoreVary: true }));
    if (cached) return cached;
    return new Response(
      `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
       <meta name="viewport" content="width=device-width,initial-scale=1">
       <title>مزرعه طلایی — آفلاین</title></head>
       <body style="margin:0;font-family:Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
       <div><div style="font-size:56px">🌾</div>
       <h1 style="font-size:20px;margin:12px 0 6px">مزرعه طلایی</h1>
       <p style="opacity:.75;font-size:14px;line-height:2">برای بار اول به اینترنت وصل شوید تا بازی کامل ذخیره شود.<br>بعد از آن، بازی کاملاً آفلاین اجرا می‌شود.</p>
       <button onclick="location.reload()" style="margin-top:16px;padding:12px 22px;border:0;border-radius:14px;background:#16a34a;color:#fff;font-size:16px;font-weight:700">تلاش مجدد</button>
       </div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POST/PUT → مستقیم به شبکه (صف آفلاین سمت اپ)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: هرگز کش نمی‌شود
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (IMAGE_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES));
    return;
  }

  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  event.respondWith(cacheFirst(request, RUNTIME));
});

/** گرم‌کردن کش تصاویر داستان در زمان بی‌کاری (از سمت اپ صدا زده می‌شود). */
async function prefetch(urls) {
  const cache = await caches.open(IMAGES);
  for (const url of urls) {
    try {
      const exists = await cache.match(url, { ignoreVary: true });
      if (exists) continue;
      const res = await fetch(url, { cache: "reload" });
      if (isCacheable(res)) await cache.put(url, res.clone());
    } catch {
      /* آفلاین یا قطع شد؛ بار بعد ادامه می‌دهیم */
    }
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type === "PREFETCH" && Array.isArray(data.urls)) {
    event.waitUntil(prefetch(data.urls));
  }
});
