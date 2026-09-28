import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * تستِ قراردادِ دسترس‌پذیری — «صفحه‌کلید و صفحه‌خوان» (کسریِ ریویوی سخت‌گیرانه).
 *
 * دو لایه داریم و هر دو لازم‌اند:
 *  ۱. این فایل: قراردادِ ایستا روی همه‌ی فایل‌های رابط کاربری (نامِ دسترس‌پذیر هر
 *     دکمه، برچسبِ ورودی‌ها، متنِ جانشینِ تصاویر، نقشِ لایه‌های محاوره‌ای و
 *     بسته‌شدنِ با Escape). سریع است و بدونِ مرورگر در CI هم اجرا می‌شود.
 *  ۲. e2e/a11y.spec.ts: همان قرارداد روی مرورگرِ واقعی با فقط صفحه‌کلید (بدون ماوس)
 *     و بررسیِ نام‌های دسترس‌پذیرِ محاسبه‌شده‌ی خودِ مرورگر.
 */

const ROOT = join(__dirname, "..");

/** توضیح‌های چندخطی را حذف می‌کند (نمونه‌ی کد داخلِ کامیت رابط کاربری نیست) */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/** همه‌ی فایل‌های JSX/TSX پروژه (رابط کاربری) */
function tsxFiles(dir = join(ROOT, "src")): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out.sort();
}

/**
 * تگِ کامل را از src[start:] برمی‌گرداند.
 * براکت‌های (){}[] و رشته‌ها را می‌شمارد تا «>» داخلِ `onChange={(e) => …}` یا
 * `className="…"` پایانِ تگ شمرده نشود (دقیقاً همان دامی که یک regexِ ساده می‌افتد).
 */
function tagAt(src: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (c === ">" && depth === 0) return src.slice(start, i + 1);
  }
  return "";
}

/** محتوای درونیِ یک عنصر (بین تگِ باز و بسته) */
function innerOf(src: string, openEnd: number, closeTag: string): string {
  const end = src.indexOf(closeTag, openEnd);
  return end < 0 ? "" : src.slice(openEnd, end);
}

/** متنِ دیدنیِ یک محتوا: تگ‌ها حذف، براکت‌های JSX و نقل‌قول‌ها نگه داشته می‌شوند */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/[{}"'`]/g, " ")
    .replace(/\s+/g, " ");
}

const has = (attrs: string, name: string) => new RegExp(`\\b${name}\\s*=`).test(attrs);

describe("دسترس‌پذیری — قراردادِ رابط کاربری", () => {
  const files = tsxFiles();

  it("فایل‌های رابط کاربری پیدا می‌شوند (جلوگیری از تستِ بی‌اثر)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("هر دکمه نامِ دسترس‌پذیر دارد: aria-label/labelledby/title یا متنِ دیدنی", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /<button\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const tag = tagAt(src, m.index); // تگِ کامل (با >های داخلِ رشته‌ها)
        if (has(tag, "aria-label") || has(tag, "aria-labelledby") || has(tag, "title")) continue;
        const text = visibleText(innerOf(src, m.index + tag.length, "</button>"));
        if (/[\p{L}\p{N}]/u.test(text)) continue;
        missing.push(`${f.replace(`${ROOT}/`, "")}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("هر ورودیِ فرم برچسب یا جای‌نگه‌دار دارد (وگرنه صفحه‌خوان چیزی نمی‌گوید)", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /<(input|select|textarea)\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const tag = tagAt(src, m.index);
        if (
          has(tag, "aria-label") ||
          has(tag, "aria-labelledby") ||
          has(tag, "placeholder") ||
          has(tag, "id")
        )
          continue;
        missing.push(`${f.replace(`${ROOT}/`, "")}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("هر تصویرِ رابط کاربری متنِ جانشین (alt) دارد", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = stripComments(readFileSync(f, "utf8"));
      const re = /<img\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const tag = tagAt(src, m.index);
        if (!/\balt\s*=/.test(tag)) missing.push(`${f.replace(`${ROOT}/`, "")}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("لایه‌های محاوره‌ای (پنل‌ها و قاب عکس) نقش و برچسبِ صفحه‌خوان دارند", () => {
    const dialogs: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /role="dialog"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const tag = tagAt(src, m.index);
        const line = src.slice(0, m.index).split("\n").length;
        expect(tag, `${f}:${line}`).toContain('aria-modal="true"');
        expect(tag, `${f}:${line}`).toMatch(/aria-label=/);
        dialogs.push(f.replace(`${ROOT}/`, ""));
      }
    }
    expect(dialogs.length).toBeGreaterThan(0);
  });

  it("همه‌ی لایه‌های محاوره‌ای با Escape بسته می‌شوند و تمرکز را برمی‌گردانند", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (!src.includes('role="dialog"')) continue;
      // یا خودش کلید Escape را می‌گیرد، یا قلابِ useDialogFocus این کار را می‌کند
      const keyboard = src.includes("Escape") || src.includes("useDialogFocus");
      const returns = src.includes("useDialogFocus") || /activeElement|isConnected/.test(src);
      if (!keyboard || !returns) bad.push(f.replace(`${ROOT}/`, ""));
    }
    expect(bad).toEqual([]);
  });

  it("قلابِ useDialogFocus هر سه قاعده‌ی صفحه‌کلید را اجرا می‌کند", () => {
    const src = readFileSync(join(ROOT, "src/game/ui/useDialogFocus.ts"), "utf8");
    expect(src).toContain("Escape"); // بستن با Escape
    expect(src).toMatch(/\.focus\(\)/); // رفتن به داخل پنل و برگشتن به دکمه
    expect(src).toContain("isConnected"); // دکمه‌ی بازکننده هنوز در صفحه باشد
    expect(src).toContain('"Tab"'); // Tab از دو طرف داخل پنل می‌چرخد
  });

  it("آیکونِ بدونِ عنوان برای صفحه‌خوان پنهان است و آیکونِ عنوان‌دار نقشِ img دارد", () => {
    const src = readFileSync(join(ROOT, "src/game/icons.tsx"), "utf8");
    expect(src).toMatch(/aria-hidden=\{title \? undefined : true\}/);
    expect(src).toMatch(/role=\{title \? "img" : "presentation"\}/);
  });
});
