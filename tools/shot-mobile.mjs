#!/usr/bin/env node
/**
 * tools/shot-mobile.mjs — بازرسی و عکس‌برداری خودکار بازی در حالت موبایل
 *
 * روی ۵ اندازه‌ی واقعی موبایل/تبلت بازی را باز می‌کند، صفحه‌ی شروع را با لمس رد می‌کند،
 * پنل بازار را می‌گشاید و گزارش نقص می‌دهد: سرریز، دکمه‌ی ریز، خطای کنسول، ۴۰۴.
 *
 * اجرا:  node tools/shot-mobile.mjs [baseUrl]
 * (از مرورگر Playwright استفاده می‌کند؛ اگر نصب نبود: npx playwright install chromium)
 * پشتیبانی از مرورگر سفارشی:  CHROME_PATH=/path/to/chrome node tools/shot-mobile.mjs
 */
import { chromium, devices } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = "docs/shots";
mkdirSync(OUT, { recursive: true });

const DEVICES = [
  { name: "320-small", ...devices["iPhone SE"], viewport: { width: 320, height: 568 } },
  { name: "390-iphone13", ...devices["iPhone 13"] },
  { name: "412-pixel7", ...devices["Pixel 7"] },
  { name: "430-promax", ...devices["iPhone 14 Pro Max"] },
  { name: "768-tablet", ...devices["iPad Mini"] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const report = { base: BASE, devices: [], issues: [] };

for (const d of DEVICES) {
  const ctx = await browser.newContext({ ...d, locale: "fa-IR", timezoneId: "Asia/Tehran" });
  const page = await ctx.newPage();
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`http${r.status()}: ${r.url().slice(0, 130)}`); });

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60_000 });
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/mobile-${d.name}-1-splash.png` });

  const splash = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    sh: document.documentElement.scrollHeight,
    ch: document.documentElement.clientHeight,
  }));

  // رد کردن صفحه‌ی شروع با لمس واقعی
  const start = page.getByRole("button", { name: /آغاز|شروع|بازی/ }).first();
  try { await start.tap({ timeout: 8000 }); }
  catch (e) { report.issues.push(`${d.name}: لمس دکمه‌ی شروع نشد — ${String(e).slice(0, 90)}`); }
  await sleep(1600);
  await page.screenshot({ path: `${OUT}/mobile-${d.name}-2-name.png` });

  // ورود نام (دروازه‌ی پیش از داستان) — با لمس و تایپ واقعی
  const nameInput = page.locator("input").first();
  let named = false;
  try {
    await nameInput.tap({ timeout: 8000 });
    await nameInput.fill("امید");
    await page.waitForTimeout(250);
    const gate = page.getByRole("button", { name: "آغاز داستان" });
    if (await gate.count()) await gate.last().tap({ timeout: 5000 });
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    named = await page.evaluate(() => Boolean(window.__game?.getState?.()?.story?.name));
  } catch (e) {
    report.issues.push(`${d.name}: ورود نام ناموفق — ${String(e).slice(0, 90)}`);
  }
  if (!named) report.issues.push(`${d.name}: نامِ بازیکن ثبت نشد (دروازه‌ی داستان)`);

  await sleep(1500);
  await page.screenshot({ path: `${OUT}/mobile-${d.name}-3-story.png` });

  // داستان را با ضربه‌های واقعی جلو ببر (۵ صحنه) تا رابط گفت‌وگو هم تست شود
  const cx = Math.round((d.viewport?.width || 390) / 2);
  const cy = Math.round((d.viewport?.height || 844) * 0.72);
  let taps = 0;
  for (let i = 0; i < 8; i++) {
    try { await page.touchscreen.tap(cx, cy); taps++; } catch { break; }
    await sleep(300);
  }
  // بقیه‌ی صحنه‌ها را رد می‌کنیم تا به بازی برسیم (آزمون واقعیِ بازی هدف است)
  await page.evaluate(() => {
    const g = window.__game;
    const st = g?.getState?.();
    if (st?.story) { st.story.shown = false; g.setState(st); }
  }).catch(() => {});
  await sleep(1400);
  await page.screenshot({ path: `${OUT}/mobile-${d.name}-4-game.png` });

  const render = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return { ok: false, reason: "no canvas" };
    const g = c.getContext("2d");
    if (!g) return { ok: false, reason: "no 2d ctx" };
    const w = c.width, h = c.height;
    const data = g.getImageData(0, 0, w, Math.min(h, 400)).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      const r = data[i], gg = data[i + 1], b = data[i + 2];
      if (r + gg + b > 90 && Math.abs(r - b) > 8) colored++;
    }
    const fonts = [...document.fonts].filter((f) => f.family.includes("Vazirmatn")).map((f) => `${f.family}:${f.weight}:${f.status}`);
    return { ok: colored > 5, colored, w, h, fonts };
  });

  const state = await page.evaluate(() => {
    const g = window.__game;
    const st = g?.getState?.();
    const small = [...document.querySelectorAll("button")].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 34 || r.height < 34);
    }).map((b) => (b.getAttribute("aria-label") || b.textContent || "?").trim().slice(0, 14));
    return {
      hasHook: Boolean(g),
      level: st?.level, coins: st?.coins, day: st?.day,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      smallButtons: small,
    };
  });

  // لمس وسط نقشه
  const box = await page.locator("canvas").boundingBox();
  if (box) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(700);
    await page.screenshot({ path: `${OUT}/mobile-${d.name}-3-tap.png` });
  }

  // باز کردن منوی اصلی (دکمه‌ی همبرگری در HUD) → عکس منو
  const menuBtn = page.getByRole("button", { name: "منو" }).first();
  try { await menuBtn.tap({ timeout: 5000 }); } catch { report.issues.push(`${d.name}: دکمه‌ی منو پیدا/لمس نشد`); }
  await sleep(700);
  await page.screenshot({ path: `${OUT}/mobile-${d.name}-5-menu.png` });

  // انتخاب «بازار» از گرید منو
  const marketBtn = page.getByRole("button", { name: "بازار" }).first();
  const opened = await marketBtn.count() > 0;
  try { await marketBtn.tap({ timeout: 5000 }); } catch { report.issues.push(`${d.name}: گزینه‌ی بازار در منو کار نکرد`); }
  await sleep(900);
  await page.screenshot({ path: `${OUT}/mobile-${d.name}-6-market.png` });

  report.devices.push({ name: d.name, viewport: d.viewport, splash, state, render, openedMarket: opened, named, storyTaps: taps, problems });
  if (!render.ok) report.issues.push(`${d.name}: بوم رندر نشده (${render.reason || render.colored})`);
  if (render.fonts && render.fonts.some((f) => f.includes("loaded") === false)) report.issues.push(`${d.name}: فونت وزیرمتن لود نشد`);
  if (state.scrollW > state.clientW + 1) report.issues.push(`${d.name}: سرریز افقی (${state.scrollW} > ${state.clientW})`);
  if (splash.sw > splash.cw + 1) report.issues.push(`${d.name}: سرریز افقی در صفحه‌ی شروع (${splash.sw} > ${splash.cw})`);
  if (state.smallButtons.length) report.issues.push(`${d.name}: دکمه‌های ریز → ${state.smallButtons.join(" / ")}`);
  problems.forEach((p) => report.issues.push(`${d.name}: ${p}`));

  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/mobile-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  issues: report.issues,
  devices: report.devices.map((d) => ({ n: d.name, viewport: `${d.viewport.width}x${d.viewport.height}`, overflow: `${d.state.scrollW}/${d.state.clientW}`, small: d.state.smallButtons.length, hook: d.state.hasHook, market: d.openedMarket, render: d.render.ok, fonts: (d.render.fonts || []).length, named: d.named, taps: d.storyTaps, lvl: d.state.level, coins: d.state.coins })),
}, null, 2));
console.log(`\n📸 اسکرین‌شات‌ها در ${OUT}/`);
process.exit(report.issues.length ? 1 : 0);
