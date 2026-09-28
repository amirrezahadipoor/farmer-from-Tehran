import { defineConfig, devices } from "@playwright/test";

/** تستِ دودِ دموی عمومی (مورد ۲): بدونِ سرورِ محلی، مستقیم روی آدرسِ منتشرشده. */
export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // انتشارِ تازه ممکن است چند ثانیه طول بکشد تا روی CDNِ گیت‌هاب برسد
  retries: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.DEMO_URL || "https://amirrezahadipoor.github.io/farmer-from-Tehran/",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
});
