#!/usr/bin/env node
/**
 * tools/shot-atlas.mjs — اسکرین‌شاتِ مقایسه‌ایِ آرت (نقشه‌ی راه، فاز B.5)
 *
 * مسیر واقعیِ بازیکن را می‌رود، بعد یک صحنه‌ی استاندارد می‌کارد:
 *   ۴×۴ گندم با گرادیانِ رشد (q=۰..۲۰) + یک گاوداری (barn) روی چمن.
 * خروجی: اسکرین‌شات + JSON (اتلس؟ پرفورمنس؟ خطا؟)
 *
 * استفاده:  node tools/shot-atlas.mjs <url> <out.png>
 */
import { chromium } from "@playwright/test";

const [url, out] = process.argv.slice(2);
if (!url || !out) console.error("usage: node tools/shot-atlas.mjs <url> <out.png>");
process.exitCode = process.exitCode ?? 0;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, hasTouch: true });
const problems = [];
page.on("pageerror", (e) => problems.push(String(e).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text().slice(0, 200)));

await page.addInitScript(() => {
  try { localStorage.setItem("farm_onboard", "1"); } catch { /* ignore */ }
});
await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap({ timeout: 20000 });
await page.waitForTimeout(1200);
await page.locator("input").first().fill("آزمون");
const gate = page.getByRole("button", { name: "آغاز داستان" });
if (await gate.count()) await gate.last().tap();
await page.waitForTimeout(800);
await page.touchscreen.tap(160, 300).catch(() => {});
await page.evaluate(() => {
  const g = window.__game;
  const st = g?.getState?.();
  if (st?.story) st.story.shown = false;
  g?.setState?.(st);
});
await page.waitForTimeout(800);

// صحنه‌ی استاندارد: کلِ زمینِ شروع (۷×۷) گندم با گرادیانِ رشد + گاوداری + بستنِ فستیول
const scene = await page.evaluate(() => {
  const g = window.__game;
  const st = g?.getState?.();
  if (!st) return "no-state";
  const N = 36;
  let minx = 99, miny = 99;
  for (let gy = 0; gy < N; gy++)
    for (let gx = 0; gx < N; gx++)
      if (st.tiles[gy * N + gx].k === "soil") { minx = Math.min(minx, gx); miny = Math.min(miny, gy); }
  let planted = 0;
  for (let dy = 0; dy < 7; dy++)
    for (let dx = 0; dx < 7; dx++) {
      const t = st.tiles[(miny + dy) * N + (minx + dx)];
      if ((t.k === "soil" || t.k === "grass") && !t.b && t.k !== "water") {
        t.k = "soil"; t.v = 0.3; t.crop = "wheat"; t.g = (dx + dy * 7) / 49 + 0.05;
        planted++;
      }
    }
  let barn = false;
  outer: for (let dy = 0; dy < 2; dy++)
    for (let dx = 5; dx >= 0; dx--) {
      const t = st.tiles[(miny + 6 + dy) * N + (minx + dx)];
      if (t.k === "grass" && !t.b) {
        t.k = "bld"; t.b = "barn"; t.q = []; t.p = 0; t.out = []; t.autoMode = true;
        barn = true;
        break outer;
      }
    }
  st.fest = { idx: st.seasonIndex, day: st.day, choice: "rest" }; // فستیول: انتخابِ «آرامش» = پرده بسته
  g.setState(st);
  return `wheat@${minx},${miny} planted=${planted} barn=${barn}`;
});

// دوربین روی مرکزِ مزرعه با زومِ مناسب (v.w ≥ 700 → سقفِ زومِ موبایل فعال نیست)
await page.evaluate(() => {
  const g = window.__game;
  const v = g?.view?.();
  if (!v) return;
  const A = 44, B = 22, N = 36, gx = 19, gy = 19;
  v.cam.x = (gx - gy) * A;
  v.cam.y = (gx + gy + 1) * B - N * B;
  v.cam.z = 2.2;
});
await page.waitForTimeout(500);

const atlas = await page
  .waitForFunction(() => window.__game?.atlasReady?.() === true, null, { timeout: 30000 })
  .then(() => true)
  .catch(() => false);
await page.waitForTimeout(3000); // چند فریم برای رندر
const perf = await page.evaluate(() => window.__game?.perf?.()).catch(() => null);
console.log(JSON.stringify({ scene, atlasReady: atlas, perf, problems: problems.slice(0, 5) }, null, 1));
await page.screenshot({ path: out });
await browser.close();
