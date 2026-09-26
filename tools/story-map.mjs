#!/usr/bin/env node
/**
 * tools/story-map.mjs — تولید خودکار «نقشه‌ی صحنه ← تصویر» از روی src/game/story.ts
 *
 * چرا؟ چون متن داستان تنها منبع حقیقت است؛ هر بار صحنه‌ای جابه‌جا/اضافه شود،
 * با `npm run story-map` این سند دوباره ساخته می‌شود و هیچ‌وقت از کد عقب نمی‌افتد.
 *
 * اجرا:  node tools/story-map.mjs
 * خروجی: docs/STORY-ART.md
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src/game/story.ts");
const OUT = join(ROOT, "docs/STORY-ART.md");

const src = readFileSync(SRC, "utf8");

/* ---------- ۱) توکن‌های تصویر → مسیر فایل ---------- */
const consts = {};
for (const m of src.matchAll(/const\s+([A-Z]+)\s*=\s*"([^"]+)"/g)) consts[m[1]] = m[2];

/* ---------- ۲) فصل‌ها و صحنه‌ها ---------- */
const chapters = [];
for (const m of src.matchAll(/\{\s*id:\s*"([^"]+)",\s*(.*?)\n  \},\n/gs)) {
  chapters.push({ id: m[1], body: m[2] });
}
const chapterTitle = (body) => (body.match(/title:\s*"([^"]*)"/) || [, ""])[1];

const rows = [];
for (const ch of chapters) {
  const [scenesPart, endPart] = ch.body.includes("endScenes")
    ? ch.body.split("endScenes")
    : [ch.body, ""];
  const collect = (block, kind) => {
    const items = [];
    for (const m of block.matchAll(/\{\s*sp:\s*"([^"]*)"[\s\S]*?bg:\s*([A-Z]+)[\s\S]*?\btext:\s*"((?:[^"\\]|\\.)*)"/g)) {
      items.push({ sp: m[1], bg: m[2], text: m[3] });
    }
    items.forEach((it, i) => rows.push({ ...it, chapter: ch.id, kind, n: i + 1 }));
  };
  collect(scenesPart, "صحنه");
  collect(endPart, "پایان فصل");
}

/* ---------- ۳) استفاده‌ی هر تصویر ---------- */
const usage = {};
for (const r of rows) usage[r.bg] = (usage[r.bg] || 0) + 1;

const missingFiles = Object.entries(consts).filter(
  ([, p]) => !existsSync(join(ROOT, "public", p))
);

/* ---------- ۴) مارک‌داون ---------- */
const L = [];
L.push("# نقشه‌ی تصویری داستان — مزرعه طلایی");
L.push("");
L.push("> این فایل **خودکار** از `src/game/story.ts` ساخته می‌شود. دستی ویرایش نکن؛ `npm run story-map` را اجرا کن.");
L.push("");
L.push(`- فصل‌ها: **${chapters.length}**`);
L.push(`- کل صحنه‌های داستان: **${rows.length}**`);
L.push(`- تصاویر استفاده‌شده: **${Object.keys(usage).length}** از ${Object.keys(consts).length}`);
L.push(`- همه‌ی فایل‌ها موجود: **${missingFiles.length === 0 ? "بله" : "نه"}**`);
L.push("");
L.push("## فایل‌های تصویر");
L.push("");
L.push("| توکن | مسیر | اندازه‌ی نمایش | تعداد صحنه |");
L.push("| --- | --- | --- | --- |");
for (const [tok, path] of Object.entries(consts)) {
  L.push(`| \`${tok}\` | \`${path}\` | 1280×720 (WebP) | ${usage[tok] || 0} |`);
}
L.push("");
L.push("## فصل‌ها");
L.push("");
let lastCh = "";
for (const r of rows) {
  if (r.chapter !== lastCh) {
    const ch = chapters.find((c) => c.id === r.chapter);
    L.push("");
    L.push(`### ${r.chapter} — ${chapterTitle(ch.body)}`);
    L.push("");
    L.push("| # | گوینده | نوع | تصویر | متن (بریده) |");
    L.push("| --- | --- | --- | --- | --- |");
    lastCh = r.chapter;
  }
  const short = r.text.replace(/\{name\}/g, "نام بازیکن").replace(/"/g, "»").slice(0, 58);
  L.push(`| ${r.n} | ${r.sp} | ${r.kind} | \`${consts[r.bg]}\` | ${short}… |`);
}
L.push("");
L.push("---");
L.push("");
L.push("## قاعده‌های هنری");
L.push("");
L.push("۱. هر تصویر باید **دقیقاً همان چیزی** باشد که متن صحنه می‌گوید (قاعده‌ی کاربر: «متن داستان رو باید بخونی کامل که دقیقا عکس داستان رو بفهمی چی باید باشه»).");
L.push("۲. هیچ متنی داخل تصویر نیست؛ همه‌ی روایت‌ها روی لایه‌ی HTML می‌آیند (فونت وزیرمتن، RTL).");
L.push("۳. صحنه‌های بدون تصویر اختصاصی، از نزدیک‌ترین تصویرِ فضاسازی استفاده می‌کنند تا هرگز جای خالی نماند.");
L.push("۴. همه‌ی تصاویر با `tools/prepare-assets.py` به WebP @1280 تبدیل می‌شوند (موبایل‌محور، بودجه‌ی حجم).");
L.push("");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`${OUT} نوشته شد — ${chapters.length} فصل، ${rows.length} صحنه، ${Object.keys(consts).length} تصویر`);
if (missingFiles.length) {
  console.error("[خطا] فایل‌های گم‌شده:", missingFiles.map(([t, p]) => `${t} → ${p}`).join(", "));
  process.exit(1);
}
