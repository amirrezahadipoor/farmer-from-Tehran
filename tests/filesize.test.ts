import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

/**
 * P5.14/P6.6 — «هیچ فایلِ کدی بیش از ۴۰۰ خط» (شاخصِ نقشه‌ی راه). پیش از این render.ts ۱۲۲۸ خط
 * و icons.tsx ۴۹۴ خط بود؛ حالا به src/game/render/* و src/game/art/* شکسته شده‌اند و این
 * نگهبان نمی‌گذارد فایلی دوباره غول شود.
 */
const ROOT = new URL("..", import.meta.url).pathname;
function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("اندازه‌ی فایل‌های کد", () => {
  it("هر فایلِ src حداکثر ۴۰۰ خط", () => {
    const big = walk(join(ROOT, "src"))
      .map((f) => ({ f: relative(ROOT, f), n: readFileSync(f, "utf8").split("\n").length }))
      .filter((x) => x.n > 400);
    expect(big).toEqual([]);
  });
});

/* -------------------------------------------------------------- */
/**
 * B/T10 — عددِ حجمِ مخزن در README دیگر دستی و کهنه نمی‌شود: همان عدد از
 * «حجمِ واقعیِ فایل‌های ردیابی‌شده» می‌آید و این نگهبان فاصله‌شان را می‌سنجد.
 */
const faToEn = (x: string) => x.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

describe("عددِ حجمِ README (B/T10)", () => {
  it("«حجمِ فایل‌های ردیابی‌شده ≈ X مگابایت» با اندازه‌ی واقعیِ git ls-files می‌خواند", () => {
    const files = execSync("git ls-files -z", { cwd: ROOT })
      .toString()
      .split("\0")
      .filter(Boolean);
    const bytes = files.reduce((a, f) => a + statSync(join(ROOT, f)).size, 0);
    const mb = Math.round((bytes / 1048576) * 10) / 10;
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    const m = readme.match(/حجمِ فایل‌های ردیابی‌شده ≈ ([۰-۹.]+) مگابایت/);
    expect(m, "عددِ حجم در README پیدا نشد").not.toBeNull();
    const claimed = parseFloat(faToEn(m![1]));
    expect(claimed, `README می‌گوید ${claimed} ولی واقعی ${mb} است`).toBeLessThanOrEqual(mb + 0.05);
    expect(claimed).toBeGreaterThanOrEqual(mb - 0.05);
  });
});
