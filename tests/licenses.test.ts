import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * tests/licenses.test.ts — نگهبانِ مجوزها (نقشه‌ی راه: مورد ۸، و برای صداها مورد ۱۰)
 *
 * هر فایلِ بیرونیِ توزیع‌شده باید مجوزش کنارش باشد و در CREDITS.md ثبت شده باشد؛
 * این تست جلوی ورودِ بی‌صدای دارایی‌ِ بی‌مجوز را می‌گیرد.
 */
const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const credits = read("CREDITS.md");

describe("مجوزها", () => {
  it("LICENSE در ریشه، MIT و هم‌خوان با package.json", () => {
    expect(existsSync(join(ROOT, "LICENSE"))).toBe(true);
    expect(read("LICENSE")).toMatch(/^MIT License/);
    expect(JSON.parse(read("package.json")).license).toBe("MIT");
  });

  it("متنِ کاملِ OFL کنارِ هر پوشه‌ی فونت", () => {
    for (const dir of ["public/fonts", "tools/fonts-src"]) {
      const ofl = read(`${dir}/OFL.txt`);
      expect(ofl).toContain("SIL OPEN FONT LICENSE Version 1.1");
      expect(ofl).toContain("The Vazirmatn Project Authors");
    }
  });

  it("هر فایلِ فونت در CREDITS.md ثبت شده است", () => {
    const fonts = readdirSync(join(ROOT, "public/fonts")).filter((f) => f.endsWith(".woff2"));
    expect(fonts.length).toBeGreaterThan(0);
    for (const f of fonts) {
      const family = f.replace(/-.*$/, "");
      expect(credits, `فونتِ ${f} در CREDITS.md نیست`).toContain(family === "Vazirmatn" ? "وزیرمتن" : family);
    }
  });

  it("هر فایلِ صوتی نامش در CREDITS.md آمده و مجوزش آزاد است", () => {
    const dir = join(ROOT, "public/audio");
    const files = existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(mp3|m4a|ogg|opus|wav)$/.test(f)) : [];
    for (const f of files) {
      const name = f.split("/").pop() as string;
      const line = credits.split("\n").find((l) => l.includes(name));
      expect(line, `فایلِ صوتیِ ${name} در CREDITS.md ثبت نشده`).toBeTruthy();
      expect(line, `مجوزِ ${name} آزاد نیست`).toMatch(/CC0|CC-BY|CC BY|Public Domain|OGA-BY/);
      expect(line, `مجوزِ ${name} غیرتجاری یا بی‌اشتقاق است`).not.toMatch(/NC|ND/);
    }
  });
});
