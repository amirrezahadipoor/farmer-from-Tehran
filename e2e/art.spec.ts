import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "docs/light/artdiff-base.png";

test.use({ trace: "off", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });

async function scene(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("farm_onboard", "1");
      localStorage.setItem("farm_started", "1");
    } catch { /* sandbox */ }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const g = (window as unknown as { __game?: { getState: () => unknown } }).__game;
    return g && typeof g.getState === "function" && g.getState() !== null;
  }, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => Record<string, unknown>; setState: (s: unknown) => void } }).__game;
    const st = g.getState();
    const N = 36, idx = (x: number, y: number) => y * N + x;
    st.seasonIndex = 1;
    st.weather = "sun";
    st.time = 120;
    const tiles = st.tiles as Record<string, unknown>[];
    for (const t of tiles) { t.k = "grass"; delete t.crop; delete t.b; delete t.wet; delete t.fert; delete t.v; }
    for (let cy = 2; cy <= 6; cy++) for (let cx = 2; cx <= 6; cx++) (st.chunks as boolean[])[cy * 9 + cx] = true;
    for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
      const t = tiles[idx(13 + dx, 13 + dy)] as Record<string, unknown>;
      t.k = "soil"; delete t.wet; delete t.fert;
      t.crop = "wheat"; t.g = (dx + dy * 7) / 49 + 0.05;
    }
    for (const [x, y, v] of [[12, 12, 0.5], [12, 14, 0.42], [21, 12, 0.8], [22, 14, 0.46], [12, 21, 0.3], [21, 21, 0.78]]) {
      const t = tiles[idx(x, y)] as Record<string, unknown>; t.k = "tree"; t.v = v; delete t.crop;
    }
    for (const [x, y, v] of [[13, 21, 0.6], [20, 22, 0.35]]) {
      const t = tiles[idx(x, y)] as Record<string, unknown>; t.k = "rock"; t.v = v; delete t.crop;
    }
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const t = tiles[idx(20 + dx, 16 + dy)] as Record<string, unknown>; t.k = "water"; t.v = 0.6; delete t.crop;
    }
    const barn = tiles[idx(15, 22)] as Record<string, unknown>; barn.k = "bld"; barn.b = "barn"; delete barn.crop;
    const house = tiles[idx(23, 21)] as Record<string, unknown>; house.k = "bld"; house.b = "house"; delete house.crop;
    st.fest = { idx: st.seasonIndex as number, day: st.day as number, choice: "rest" };
    if (st.story) (st.story as Record<string, unknown>).shown = false;
    g.setState(st);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { view: () => { cam: { x: number; y: number; z: number } } } }).__game;
    const v = g.view(), N = 36, [gx, gy, z] = [17, 16, 0.45];
    const wx = (gx - gy) * 44, wy = (gx + gy + 1 - N) * 22;
    v.cam.x = -z * wx; v.cam.y = -z * wy; v.cam.z = z;
  });
  await page.waitForTimeout(1500);
}

test("A.10: diff پیکسلیِ صحنه‌ی مرجع با پایه‌ی ثبت‌شده زیرِ آستانه می‌ماند", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "diff پیکسلی فقط روی کروم");
  await scene(page);
  const b64 = readFileSync(BASE).toString("base64");
  const diff = await page.evaluate(async (b64s) => {
    const bin = atob(b64s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const all = [...document.querySelectorAll("canvas")];
    const cv = all.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!cv || cv.width !== bmp.width || cv.height !== bmp.height) return { bad: "size " + (cv ? cv.width + "x" + cv.height : "none") + " vs " + bmp.width + "x" + bmp.height + " of [" + all.map((c) => c.width + "x" + c.height).join(",") + "]" };
    const mk = () => { const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height; return c; };
    const a = mk(), b = mk();
    const ca = a.getContext("2d")!, cb = b.getContext("2d")!;
    ca.fillStyle = "#808080";
    ca.fillRect(0, 0, a.width, a.height);
    cb.fillStyle = "#808080";
    cb.fillRect(0, 0, b.width, b.height);
    ca.drawImage(cv, 0, 0);
    cb.drawImage(bmp, 0, 0);
    const da = ca.getImageData(0, 0, a.width, a.height).data;
    const db = cb.getImageData(0, 0, b.width, b.height).data;
    let sum = 0, over = 0, n = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      sum += d;
      if (d > 24) over++;
      n++;
    }
    return { mean: sum / n, over: over / n };
  }, b64);
  if (diff.bad || (diff as { mean: number }).mean >= 10) {
    const png = await page.locator("canvas").screenshot();
    writeFileSync("test-results/art-live.png", png);
  }
  expect(diff.bad, diff.bad ?? "").toBeUndefined();
  const d = diff as { mean: number; over: number };
  expect(d.mean, `میانگینِ دلتا ${d.mean.toFixed(2)}`).toBeLessThan(10);
  expect(d.over, `پیکسلِ دور ${((d as { over: number }).over * 100).toFixed(1)}٪`).toBeLessThan(0.04);
  console.log(`[artdiff] mean=${d.mean.toFixed(2)} over24=${(d.over * 100).toFixed(2)}%`);
});
