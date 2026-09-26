#!/usr/bin/env node
/**
 * tools/shot-panels.mjs — عکسِ پنل‌های بازی در اندازه‌ی موبایل (شاهدِ آیتم‌های رودمپ)
 *
 * اجرا:
 *   node tools/shot-panels.mjs --tag=p5-9 --panels=skills,tech,decor [--widths=320,390]
 *        [--state='{"level":12,"coins":50000}'] [--base=http://127.0.0.1:3000]
 * خروجی: docs/shots/panel-<tag>-<panel>-<width>.png
 * سرور باید در حال اجرا باشد (npm run build && npm run start).
 */
import { chromium, devices } from "playwright-core";
import { mkdirSync } from "node:fs";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=") || d;
const BASE = arg("base", "http://127.0.0.1:3000");
const TAG = arg("tag", "panels");
const PANELS = arg("panels", "skills").split(",");
const WIDTHS = arg("widths", "320,390").split(",").map(Number);
const PATCH = JSON.parse(arg("state", "{}"));
mkdirSync("docs/shots", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const errors = [];
for (const w of WIDTHS) {
  const dev = w <= 320 ? { ...devices["iPhone SE"], viewport: { width: 320, height: 568 } } : devices["iPhone 13"];
  const ctx = await browser.newContext({ ...dev, locale: "fa-IR", timezoneId: "Asia/Tehran" });
  await ctx.addInitScript(() => {
    localStorage.setItem("farm_started", "1");
    localStorage.setItem("farm_onboard", "1");
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!(window.__game && window.__game.getState()), null, { timeout: 60_000 });
  await page.evaluate((patch) => {
    const g = window.__game;
    const s = g.getState();
    Object.assign(s, patch);
    s.story.name = s.story.name || "امید";
    s.story.shown = false;
    g.setState(s);
  }, PATCH);
  for (const p of PANELS) {
    await page.evaluate((panel) => window.__game.openPanel(panel === "none" ? null : panel), p);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `docs/shots/panel-${TAG}-${p}-${w}.png` });
    console.log(`📸 docs/shots/panel-${TAG}-${p}-${w}.png`);
  }
  await ctx.close();
}
await browser.close();
if (errors.length) {
  console.error("❌ خطای مرورگر:\n" + errors.join("\n"));
  process.exit(1);
}
