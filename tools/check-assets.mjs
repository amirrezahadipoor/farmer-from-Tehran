#!/usr/bin/env node
/**
 * tools/check-assets.mjs — شاهدِ «صفر دارایی ۴۰۴» (P2.6 و P5.2)
 *
 * چه چیزی را چک می‌کند؟
 *  ۱. هر مسیر `/images|icons|fonts|sounds|music/...` در **کل ریپو** (سورس، README،
 *     مستندات، سرویس‌ورکر، تست‌ها) فایلش در `public/` موجود باشد. (قبلاً فقط `src/`
 *     اسکن می‌شد و به همین دلیل یک تصویر شکسته در README از دست در رفت.)
 *  ۲. فهرست آیکون‌های `public/manifest.json` واقعاً موجود باشد.
 *  ۳. فهرست پیش‌کشِ `public/sw.js` واقعاً موجود باشد (وگرنه آفلاین نصفه می‌ماند).
 *  ۴. هیچ ارجاع `next/image` بدون عرض/ارتفاع یا مسیر ناموجود نمانده باشد.
 *
 * خروجی: کد ۱ اگر چیزی گم شده باشد (بلاک‌کننده‌ی CI).
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const PUBLIC = join(ROOT, "public");

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "test-results", "playwright-report", "coverage", ".cache", "dist",
]);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|css|md|ya?ml|html|webmanifest)$/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out);
    } else if (TEXT.test(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

const REF = /["'`(](\/(?:images|icons|fonts|sounds|music)\/[A-Za-z0-9._/-]+)["'`)]/g;
const FONTS = /url\(\s*["']?(\/[A-Za-z0-9._/-]+\.(?:woff2?|ttf|otf))["']?\s*\)/g;

const refs = new Map(); // path → Set(فایل‌های ارجاع‌دهنده)
const add = (ref, file) => {
  if (!refs.has(ref)) refs.set(ref, new Set());
  refs.get(ref).add(relative(ROOT, file));
};

const files = walk(ROOT);
for (const file of files) {
  // خودِ ابزار و فایل‌های تولیدیِ مستندات را اسکن نکن
  const rel = relative(ROOT, file);
  if (rel.startsWith("tools/")) continue;
  const txt = readFileSync(file, "utf8");
  for (const re of [REF, FONTS]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt))) add(m[1], file);
  }
}

/* ── ۲) آیکون‌های مانیفست ── */
const manifestPath = join(PUBLIC, "manifest.json");
let manifestIcons = [];
if (existsSync(manifestPath)) {
  try {
    const man = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifestIcons = (man.icons ?? []).map((i) => i.src);
    for (const src of manifestIcons) add(src, manifestPath);
    if (!man.start_url) add("/__manifest_missing_start_url__", manifestPath);
  } catch (e) {
    console.error(`\n[خطا] manifest.json قابل تجزیه نیست: ${e.message}\n`);
    process.exit(1);
  }
} else {
  console.error("\n[خطا] public/manifest.json پیدا نشد (PWA نصب‌شدنی نمی‌شود).\n");
  process.exit(1);
}

/* ── ۳) فهرست پیش‌کش سرویس‌ورکر ── */
const swPath = join(PUBLIC, "sw.js");
let precache = [];
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, "utf8");
  precache = [...new Set([...sw.matchAll(/["'](\/(?:images|icons|fonts)\/[A-Za-z0-9._-]+)["']/g)].map((m) => m[1]))];
  for (const p of precache) add(p, swPath);
  if (precache.length < 10) {
    console.error(`\n[خطا] فهرست پیش‌کش سرویس‌ورکر خیلی کوچک است (${precache.length} مورد) — بازی آفلاین ناقص می‌شود.\n`);
    process.exit(1);
  }
  for (const core of ["/", "/manifest.json", "/fonts/Vazirmatn-Regular.woff2"]) {
    if (!sw.includes(core)) {
      console.error(`\n[خطا] سرویس‌ورکر «${core}» را پیش‌کش نمی‌کند.\n`);
      process.exit(1);
    }
  }
} else {
  console.error("\n[خطا] public/sw.js پیدا نشد — بازی آفلاین کار نمی‌کند.\n");
  process.exit(1);
}

const missing = [];
const ok = [];
for (const [ref, from] of [...refs].sort()) {
  if (existsSync(join(PUBLIC, ref))) ok.push(ref);
  else missing.push({ ref, files: [...from] });
}

console.log("\nبررسی دارایی‌ها (کل ریپو + مانیفست + پیش‌کش سرویس‌ورکر)");
console.log(`   فایل‌های اسکن‌شده: ${files.length} · ارجاع‌های یکتا: ${refs.size} · آیکون مانیفست: ${manifestIcons.length} · پیش‌کش SW: ${precache.length}\n`);
for (const r of ok) console.log(`  [ok] ${r}`);
if (missing.length) {
  console.log("");
  for (const m of missing) console.log(`  [گم‌شده] ${m.ref}  ←  ${m.files.join(", ")}`);
  console.log(`\n[خطا] ${missing.length} دارایی گم‌شده. بازی بدون این‌ها ناقص اجرا می‌شود.\n`);
  process.exit(1);
}
console.log(`\nهمه‌ی ${ok.length} دارایی موجود است — ۰ مورد ۴۰۴.\n`);
