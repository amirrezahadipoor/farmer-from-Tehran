import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * فاز P — پیکربندیِ بسته‌ی اندروید و ورک‌فلوی APK باید همیشه با هم هم‌خوان بمانند:
 * webDir همان پوشه‌ای است که بیلدِ ایستا می‌سازد، android/ وارد مخزن نمی‌شود و
 * APK از تگِ نسخه یا اجرای دستی ساخته می‌شود.
 */
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ROOT = new URL("../", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(ROOT + "package.json", "utf8"));

describe("capacitor.config.ts", () => {
  const cfg = read("capacitor.config.ts");
  it("webDir همان خروجیِ بیلدِ ایستا است (out)", () => {
    expect(cfg).toContain('webDir: "out"');
    const build = read("tools/build-static.mjs");
    expect(build).toContain('join(ROOT, "out")'); // همان پوشه‌ای که اسکریپت پاک و پر می‌کند
  });
  it("appId و appName دارد و cleartext باز نیست", () => {
    expect(cfg).toMatch(/appId: "[a-z][\w.]*"/);
    expect(cfg).toContain("appName:");
    expect(cfg).toContain('androidScheme: "https"');
    expect(cfg).toContain("allowMixedContent: false");
  });
});

describe("اسکریپت‌های npm", () => {
  it("build:static بیلدِ ایستا را می‌سازد و cap:sync/apk:debug زنجیرِ APK را می‌بندند", () => {
    expect(pkg.scripts["build:static"]).toContain("tools/build-static.mjs");
    expect(pkg.scripts["cap:sync"]).toContain("build:static");
    expect(pkg.scripts["cap:sync"]).toContain("cap sync android");
    expect(pkg.scripts["apk:debug"]).toContain("gradlew assembleDebug");
  });
  it("وابستگی‌های Capacitor در devDependencies هستند", () => {
    for (const d of ["@capacitor/core", "@capacitor/android", "@capacitor/cli"]) {
      expect(pkg.devDependencies[d]).toBeDefined();
      expect(pkg.dependencies?.[d]).toBeUndefined(); // فقط برای بیلدِ بسته لازم است، نه برای اجرای وب
    }
  });
});

describe("پروژه‌ی اندروید در مخزن نمی‌ماند", () => {
  it(".gitignore پوشه‌ی android/ و پارکِ موقتِ API را نادیده می‌گیرد", () => {
    const gi = read(".gitignore").split("\n").map((l) => l.trim());
    expect(gi).toContain("android/");
    expect(gi).toContain(".api-parked/");
  });
});

describe("ورک‌فلو apk.yml", () => {
  const wf = read(".github/workflows/apk.yml");
  it("روی تگِ نسخه و اجرای دستی فعال می‌شود", () => {
    expect(wf).toContain('tags: ["v*"]');
    expect(wf).toContain("workflow_dispatch:");
  });
  it("زنجیرِ بیلد کامل است: بیلدِ ایستا، cap add/sync، gradlew، آپلودِ artifact", () => {
    expect(wf).toContain("npm run build:static");
    expect(wf).toContain("npx cap add android");
    expect(wf).toContain("npx cap sync android");
    expect(wf).toContain("./gradlew assembleDebug");
    expect(wf).toContain("actions/upload-artifact@v7");
    expect(wf).toContain("android/app/build/outputs/apk/debug/*.apk");
  });
  it("JDK ۲۱ و Node ۲۰ (هم‌خوان با بقیه‌ی ورک‌فلوها) استفاده می‌شود", () => {
    expect(wf).toContain('java-version: "21"');
    expect(wf).toContain("node-version: 20");
  });
});
