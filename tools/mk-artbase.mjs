import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const url = process.argv[2] ?? "http://localhost:3111/";
const out = process.argv[3] ?? "docs/light/artdiff-base.png";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  try { localStorage.setItem("farm_onboard", "1"); localStorage.setItem("farm_started", "1"); } catch {}
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const g = window.__game;
  return g && typeof g.getState === "function" && g.getState() !== null;
}, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game, st = g.getState();
  const N = 36, idx = (x, y) => y * N + x;
  st.seasonIndex = 1;
  st.weather = "sun";
  st.time = 120;
  for (const t of st.tiles) { t.k = "grass"; delete t.crop; delete t.b; delete t.wet; delete t.fert; delete t.v; }
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
});
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game, v = g.view(), N = 36, [gx, gy, z] = [17, 16, 0.45];
  const wx = (gx - gy) * 44, wy = (gx + gy + 1 - N) * 22;
  v.cam.x = -z * wx; v.cam.y = -z * wy; v.cam.z = z;
});
await page.waitForTimeout(1500);
const data = await page.evaluate(() => {
  const cv = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const c2 = document.createElement("canvas");
  c2.width = 768;
  c2.height = 1024;
  c2.getContext("2d").drawImage(cv, 0, 0, 768, 1024);
  return c2.toDataURL("image/png");
});
writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
console.log("base saved", out);
await browser.close();
