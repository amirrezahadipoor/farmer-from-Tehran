#!/usr/bin/env node
/**
 * tools/check-assets.mjs
 * هر مسیر دارایی که در سورس به آن ارجاع شده را استخراج می‌کند و وجود فایل را در public/ بررسی می‌کند.
 * خروجی: کد ۱ اگر چیزی گم شده باشد (برای CI).
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SRC = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css|json|mjs|js)$/.test(p)) out.push(p);
  }
  return out;
}

const REF = /["'`(](\/(?:images|icons|sounds|music|fonts)\/[A-Za-z0-9._\-/]+)["'`)]/g;
const FONTS = /url\(\s*["']?(\/[A-Za-z0-9._\-/]+\.(?:woff2?|ttf|otf))["']?\s*\)/g;

const refs = new Map();
for (const file of walk(SRC)) {
  const txt = readFileSync(file, "utf8");
  for (const re of [REF, FONTS]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt))) {
      if (!refs.has(m[1])) refs.set(m[1], new Set());
      refs.get(m[1]).add(relative(ROOT, file));
    }
  }
}

const missing = [];
const ok = [];
for (const [ref, files] of [...refs].sort()) {
  if (existsSync(join(PUBLIC, ref))) ok.push(ref);
  else missing.push({ ref, files: [...files] });
}

console.log(`\n🔎 بررسی دارایی‌ها — ${ok.length} موجود، ${missing.length} گم‌شده\n`);
for (const r of ok) console.log(`  ✅ ${r}`);
if (missing.length) {
  console.log("");
  for (const m of missing) console.log(`  ❌ ${m.ref}  ←  ${m.files.join(", ")}`);
  console.log(`\n💥 ${missing.length} دارایی گم‌شده. بازی بدون این‌ها ناقص اجرا می‌شود.\n`);
  process.exit(1);
}
console.log("\n🎉 همه‌ی دارایی‌ها موجود هستند.\n");
