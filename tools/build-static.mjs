#!/usr/bin/env node
/**
 * tools/build-static.mjs — بیلدِ ایستای وب برای بسته‌ی اندروید (فاز P)
 *
 * تفاوتش با بیلدِ GitHub Pages دو چیز است:
 *   ۱. بدونِ NEXT_PUBLIC_BASE_PATH — در اپ، مسیرِ پایه معنا ندارد (فایل‌ها از خودِ بسته خوانده می‌شوند).
 *   ۲. src/app/api موقتاً کنار می‌رود: خروجیِ export به route handlerِ پویا اجازه نمی‌دهد.
 *      پوشه در هر حالتی (حتی با شکستِ بیلد) سرِ جایش برمی‌گردد، پس اجرای محلی هیچ‌وقت
 *      کدِ API را از درختِ کاری حذف نمی‌کند.
 *
 * خروجی: out/ — همان webDir در capacitor.config.ts
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const NEXT = join(ROOT, "node_modules", ".bin", "next"); // مستقیم صدا زده می‌شود تا به PATHِ npm وابسته نباشد
const API = join(ROOT, "src", "app", "api");
const PARKED = join(ROOT, ".api-parked");
const OUT = join(ROOT, "out");

const park = () => {
  if (existsSync(PARKED)) throw new Error(".api-parked از اجرای قبلی مانده — اول آن را برگردانید");
  if (existsSync(API)) renameSync(API, PARKED);
};

const unpark = () => {
  if (!existsSync(PARKED)) return;
  if (existsSync(API)) rmSync(API, { recursive: true, force: true });
  renameSync(PARKED, API);
};

rmSync(OUT, { recursive: true, force: true });
park();
try {
  execSync(`"${NEXT}" build`, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_STATIC: "1", NEXT_PUBLIC_BASE_PATH: "" },
  });
} catch (err) {
  process.exitCode = typeof err.status === "number" ? err.status : 1;
} finally {
  unpark();
}
