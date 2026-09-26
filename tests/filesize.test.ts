import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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
