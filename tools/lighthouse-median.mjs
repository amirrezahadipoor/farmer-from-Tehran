#!/usr/bin/env node
/**
 * tools/lighthouse-median.mjs — خلاصه‌ی چند اجرای Lighthouse و بررسیِ آستانه (P6.5)
 *
 *   node tools/lighthouse-median.mjs <پوشه‌ی گزارش‌ها> [آستانه=95]
 *
 * همه‌ی *.report.json پوشه را می‌خواند، جدولِ هر اجرا و میانه‌ی هر شاخص را (Markdown) چاپ می‌کند و اگر
 * میانه‌ی یکی از چهار شاخص زیرِ آستانه باشد با کدِ ۱ خارج می‌شود. میانه چون یک اجرای Lighthouse
 * نویز دارد؛ همان روشی که خودِ Lighthouse برای تصمیم‌گیری پیشنهاد می‌کند.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || "lh";
const min = Number(process.argv[3] || 95);
const files = readdirSync(dir).filter((f) => f.endsWith(".report.json")).sort();
if (!files.length) {
  console.error(`no *.report.json in ${dir}`);
  process.exit(1);
}

const CATS = ["performance", "accessibility", "best-practices", "seo"];
const METRICS = [
  ["first-contentful-paint", "FCP", (v) => `${(v / 1000).toFixed(1)}s`],
  ["largest-contentful-paint", "LCP", (v) => `${(v / 1000).toFixed(1)}s`],
  ["total-blocking-time", "TBT", (v) => `${Math.round(v)}ms`],
  ["cumulative-layout-shift", "CLS", (v) => v.toFixed(3)],
  ["speed-index", "SI", (v) => `${(v / 1000).toFixed(1)}s`],
];
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const runs = files.map((f) => {
  const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
  return {
    name: f.replace(".report.json", ""),
    scores: Object.fromEntries(CATS.map((c) => [c, Math.round((r.categories[c]?.score ?? 0) * 100)])),
    metrics: Object.fromEntries(METRICS.map(([id]) => [id, r.audits[id]?.numericValue ?? NaN])),
    ua: r.environment?.hostUserAgent ?? "",
    lh: r.lighthouseVersion,
  };
});

const head = ["اجرا", ...CATS, ...METRICS.map((m) => m[1])];
const row = (name, s, m) => [name, ...CATS.map((c) => s[c]), ...METRICS.map(([id, , f]) => f(m[id]))];
const lines = [
  `### Lighthouse ${runs[0].lh} — موبایل (پیش‌فرض)، ${runs.length} اجرا`,
  "",
  `| ${head.join(" | ")} |`,
  `|${head.map(() => "---").join("|")}|`,
  ...runs.map((r) => `| ${row(r.name, r.scores, r.metrics).join(" | ")} |`),
];
const medS = Object.fromEntries(CATS.map((c) => [c, median(runs.map((r) => r.scores[c]))]));
const medM = Object.fromEntries(METRICS.map(([id]) => [id, median(runs.map((r) => r.metrics[id]))]));
lines.push(`| **میانه** | ${row("", medS, medM).slice(1).map((v) => `**${v}**`).join(" | ")} |`, "");
const fails = CATS.filter((c) => medS[c] < min);
lines.push(fails.length ? `نتیجه: زیرِ ${min} — ${fails.join("، ")}` : `نتیجه: همه‌ی شاخص‌ها ≥ ${min}`);
console.log(lines.join("\n"));
process.exit(fails.length ? 1 : 0);
