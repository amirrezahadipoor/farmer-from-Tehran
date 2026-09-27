// tools/shot.mjs — اسکرین‌شاتِ صحنه‌ی ثابتِ مزرعه برای مقایسه‌ی بصری
//   node tools/shot.mjs <url> <out-prefix>
// یک صحنه‌ی معیّن (گندمِ ۷×۷ با گرادیانِ رشد، درخت‌های هر سه نوع، سنگ، آب، خانه و گاوداری)
// در یک لحظه‌ی نوریِ معیّن (ظهرِ تابستان، آفتابی) رندر و عکس می‌گیرد: نمایِ کلی + نمایِ نزدیک.
import { chromium } from "@playwright/test";

// ?fx=1 — پست‌پردازشِ GPU را حتی روی رندررِ نرم (SwiftShader) روشن نگه می‌دارد تا
// نمونه‌ی بصری کامل باشد (در CI و بازیِ عادی، تشخیصِ نرم‌افزاری آن را خاموش می‌کند)
const url = process.argv[2] ?? "http://localhost:3111/?fx=1";
const out = process.argv[3] ?? "docs/shots/sample";



const problems = [];
const logs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, hasTouch: true });
page.on("console", (m) => { if (m.type() === "error") problems.push({ kind: "console", detail: m.text().slice(0, 200) }); logs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
page.on("pageerror", (e) => problems.push({ kind: "pageerror", detail: String(e).slice(0, 200) }));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("favicon")) problems.push({ kind: `http-${r.status()}`, detail: r.url() }); });
// برگشتِ بازیکنِ باتجربه: هم آموزش رد می‌شود و هم اسپلش — بازی مستقیم روی نقشه بالا می‌آید
await page.addInitScript(() => {
  try { localStorage.setItem("farm_onboard", "1"); localStorage.setItem("farm_started", "1"); } catch {}
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const g = window.__game;
  return g && typeof g.getState === "function" && g.getState() !== null;
}, null, { timeout: 30_000 }).catch(async () => {
  console.log("GAME-NO-START. logs:", logs.slice(-20).join("\n"));
  const dump = await page.evaluate(() => ({
    hook: typeof window.__game,
    ls: JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, (localStorage.getItem(k) || "").slice(0, 40)]))),
  }));
  console.log("DUMP", JSON.stringify(dump));
  process.exit(2);
});

// صحنه‌ی معیّن + بستنِ پرده‌ی داستان (وگرنه حلقه پشتِ پرده رندر نمی‌کند)
const scene = await page.evaluate(() => {
  const g = window.__game, st = g.getState();
  if (!st) return "no-state";
  const N = 36, idx = (x, y) => y * N + x;
  st.seasonIndex = 1; // تابستان
  st.weather = "sun";
  st.time = 12 * 10; // ظهر
  for (let cy = 2; cy <= 6; cy++) for (let cx = 2; cx <= 6; cx++) st.chunks[cy * 9 + cx] = true;
  for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
    const t = st.tiles[idx(13 + dx, 13 + dy)];
    t.k = "soil"; delete t.wet; delete t.fert;
    t.crop = "wheat"; t.g = (dx + dy * 7) / 49 + 0.05;
  }
  for (const [x, y, v] of [[12, 12, 0.5], [12, 14, 0.42], [21, 12, 0.8], [22, 14, 0.46], [12, 21, 0.3], [21, 21, 0.78]]) {
    const t = st.tiles[idx(x, y)]; t.k = "tree"; t.v = v; delete t.crop;
  }
  for (const [x, y, v] of [[13, 21, 0.6], [20, 22, 0.35]]) {
    const t = st.tiles[idx(x, y)]; t.k = "rock"; t.v = v; delete t.crop;
  }
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
    const t = st.tiles[idx(20 + dx, 16 + dy)]; t.k = "water"; t.v = 0.6; delete t.crop;
  }
  const barn = st.tiles[idx(15, 22)]; barn.k = "bld"; barn.b = "barn"; delete barn.crop;
  const house = st.tiles[idx(23, 21)]; house.k = "bld"; house.b = "house"; delete house.crop;
  st.fest = { idx: st.seasonIndex, day: st.day, choice: "rest" };
  if (st.story) st.story.shown = false;
  g.setState(st);
  return "ok";
});
if (scene !== "ok") { console.log("SCENE-FAIL", scene, logs.slice(-10).join("\n")); process.exit(3); }
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game, v = g.view(), N = 36, [gx, gy, z] = [17, 16, 2.2];
  const wx = (gx - gy) * 44, wy = (gx + gy + 1 - N) * 22;
  v.cam.x = -z * wx; v.cam.y = -z * wy; v.cam.z = z;
});
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}-wide.png` });
await page.evaluate(() => {
  const g = window.__game, v = g.view(), N = 36, [gx, gy, z] = [15, 14, 4.4];
  const wx = (gx - gy) * 44, wy = (gx + gy + 1 - N) * 22;
  v.cam.x = -z * wx; v.cam.y = -z * wy; v.cam.z = z;
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}-close.png` });
await page.evaluate(() => {
  const g = window.__game, v = g.view(), N = 36, [gx, gy, z] = [13, 13, 3.8];
  const wx = (gx - gy) * 44, wy = (gx + gy + 1 - N) * 22;
  v.cam.x = -z * wx; v.cam.y = -z * wy; v.cam.z = z;
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}-trees.png` });

const perf = await page.evaluate(async () => window.__game.perf?.());
console.log(JSON.stringify({ scene, perf, problems }, null, 2));
await browser.close();
