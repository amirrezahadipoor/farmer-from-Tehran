#!/usr/bin/env node
/**
 * tools/lint-text.mjs — «lint متن» فارسیِ بازی (P5.9)
 *
 * همه‌ی رشته‌ها و متن‌های JSX در src/ را با کامپایلر TypeScript می‌خواند (نه regex روی
 * کد) و هر متنی را که حرف فارسی دارد، این‌طور می‌سنجد:
 *   • خط‌های بیگانه‌ی ناخواسته (تایلندی، چینی/ژاپنی/کره‌ای، دوناگری، سیریلیک، عبری)
 *   • حروف عربی به‌جای فارسی: ك → ک ، ي → ی ، ة
 *   • ارقام عربی (٠١٢…) به‌جای ارقام فارسی (۰۱۲…)
 *   • کلمه‌های لاتینِ قاطی‌شده در جمله‌ی فارسی (مگر در فهرست مجاز: XP، PWA، iOS …)
 *   • فاصله‌ی تکراری و فاصله پیش از نشانه‌های «،» «؛» «!» «؟»
 *   • رقم لاتین (0-9) در متن فارسی، و عددی که بدون fmt()/toLocaleString("fa-IR") داخل
 *     قالبِ فارسی گذاشته شده (با TypeChecker: نوعِ number)
 * خروجی: فهرست مورد‌ها با فایل:خط؛ اگر حتی یک مورد باشد، کد خروج ۱ (در CI بلاک می‌کند).
 *
 * اجرا:  npm run lint:text
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const PERSIAN = /[\u0600-\u06FF]/;
const RULES = [
  { id: "خط بیگانه", re: /[\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u0900-\u097F\u0400-\u04FF\u0590-\u05FF]/g },
  { id: "حرف عربی (ك/ي/ة)", re: /[\u0643\u064A\u0629]/g },
  { id: "رقم عربی", re: /[\u0660-\u0669]/g },
  { id: "فاصله‌ی تکراری", re: /[^\s] {2,}[^\s]/g },
  { id: "فاصله پیش از نشانه", re: /[\u0600-\u06FF] +[،؛!؟](?![^\s])/g },
];

/** واژه‌های لاتینِ مجاز داخل متن فارسی (اصطلاحات فنی/برند که فارسیِ رایج ندارند) */
const LATIN_OK = new Set(["XP", "PWA", "iOS", "Android", "HUD", "FPS", "CI", "API", "JSON", "SW", "GPU", "Golden", "Valley", "Farm"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p);
  }
  return out;
}

/** متن‌هایی که روی صفحه می‌روند: رشته، قالب (بخش‌های ثابت) و متن JSX — نه کامنت */
function collectTexts(sf) {
  const found = [];
  const visit = (node) => {
    let text = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    else if (ts.isJsxText(node)) text = node.text.replace(/\s+/g, " ").trim();
    if (text && PERSIAN.test(text)) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      found.push({ line: line + 1, text });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function check(raw) {
  const issues = [];
  const text = raw.replace(/\{[a-zA-Z_]+\}/g, "نام"); // جای‌گذارهای داستان مثل {name}
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) issues.push(`${r.id}: «${m.slice(0, 3).join("» «")}»`);
  }
  const latin = (text.match(/[A-Za-z][A-Za-z0-9.+-]*/g) || []).filter((w) => !LATIN_OK.has(w));
  const digits = text.replace(/[A-Za-z][A-Za-z0-9.+-]*/g, "").match(/[0-9]+/g);
  if (digits) issues.push(`رقم لاتین در متن فارسی: «${digits.slice(0, 3).join("» «")}»`);
  if (latin.length) issues.push(`کلمه‌ی لاتین در متن فارسی: «${latin.slice(0, 4).join("» «")}»`);
  return issues;
}

const files = walk(SRC);
const program = ts.createProgram(files, { jsx: ts.JsxEmit.Preserve, allowJs: false, noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, paths: { "@/*": ["./src/*"] }, baseUrl: ROOT });
const checker = program.getTypeChecker();
const isFaFormatted = (e) => {
  // fmt(x)، x.toLocaleString("fa-IR")، fa(x) یا هر فراخوانی که رشته برمی‌گرداند قبول است
  const t = checker.getTypeAtLocation(e);
  return !(t.flags & ts.TypeFlags.NumberLike);
};
let total = 0;
let scanned = 0;
const report = (f, line, issue, text) => {
  total++;
  const snippet = text.length > 70 ? text.slice(0, 70) + "…" : text;
  console.log(`✗ ${relative(ROOT, f)}:${line}  ${issue}\n    ${snippet}`);
};
for (const f of files) {
  const sf = program.getSourceFile(f);
  if (!sf) continue;
  for (const { line, text } of collectTexts(sf)) {
    scanned++;
    for (const issue of check(text)) report(f, line, issue, text);
  }
  // عددِ خام داخل قالبِ فارسی → ارقام لاتین روی صفحه
  const visit = (node) => {
    if (ts.isTemplateExpression(node)) {
      const whole = node.head.text + node.templateSpans.map((sp) => sp.literal.text).join("");
      if (PERSIAN.test(whole)) {
        for (const sp of node.templateSpans) {
          if (!isFaFormatted(sp.expression)) {
            const { line } = sf.getLineAndCharacterOfPosition(sp.expression.getStart(sf));
            report(f, line + 1, `عدد بدون قالب فارسی: \${${sp.expression.getText(sf)}} → fmt(…)`, whole);
          }
        }
      }
    }
    // عددِ خام به‌عنوان فرزندِ JSX (مثل {s.level}) → ارقام لاتین روی صفحه
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      if (!isFaFormatted(node.expression)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        report(f, line + 1, `عدد خام در JSX: {${node.expression.getText(sf)}} → fmt(…)`, node.expression.getText(sf));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (total) {
  console.log(`\n[خطا] ${total} مورد در ${scanned} متن فارسی — lint متن رد شد.`);
  process.exit(1);
}
console.log(`lint متن: ${scanned} متن فارسی در ${files.length} فایل بررسی شد — ۰ مورد غیرفارسی.`);
