const puppeteer = require("puppeteer");
const fs = require("fs");
const OUT = "/home/user/review-shots";
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 180)); });

  await page.goto("http://127.0.0.1:3001/", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/b01-intro.png` });

  const bodies = [];
  const snap = async () => (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 260);
  const hasStory = async () => page.evaluate(() => !!document.querySelector(".z-\\[60\\]"));
  const clickCenter = async (x = 640, y = 400) => { await page.mouse.click(x, y); await sleep(230); };

  // intro splash -> name gate
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("آغاز داستان"))?.click());
  await sleep(500);
  await page.type("input", "امید", { delay: 10 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("آغاز داستان"))?.click());
  await sleep(600);

  // advance all 20 intro scenes (2 clicks each: finish typing, then next)
  let scenes = 0;
  for (let i = 0; i < 60; i++) {
    if (!(await hasStory())) break;
    await clickCenter();
    scenes++;
  }
  console.log(`intro scenes advanced with ${scenes} clicks; story overlay gone: ${!(await hasStory())}`);
  await sleep(800);
  await page.screenshot({ path: `${OUT}/b02-map-desktop.png` });
  console.log("HUD:", await snap());

  // Tool: hand - click on the pre-planted wheat tiles near the start farm
  const toolClick = async (label) => page.evaluate((l) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === l);
    if (b) { b.click(); return true; } return false;
  }, label);

  console.log("--- TOOL: hand on the starter field ---");
  await toolClick("دست");
  const before = await page.evaluate(() => document.body.innerText);
  for (let i = 0; i < 6; i++) { await clickCenter(600 + i * 30, 430); }
  await sleep(600);
  await page.screenshot({ path: `${OUT}/b03-harvest-attempt.png` });
  console.log("after 6 hand clicks:", await snap());

  console.log("--- TOOL: hoe on grass ---");
  await toolClick("شخم");
  for (let i = 0; i < 4; i++) await clickCenter(500 + i * 40, 500);
  console.log("after hoe:", await snap());
  await page.screenshot({ path: `${OUT}/b04-hoe.png` });

  console.log("--- TOOL: seed ---");
  await toolClick("کاشت");
  for (let i = 0; i < 4; i++) await clickCenter(500 + i * 40, 500);
  console.log("after seed:", await snap());

  console.log("--- TOOL: water ---");
  await toolClick("آب");
  for (let i = 0; i < 4; i++) await clickCenter(500 + i * 40, 500);
  console.log("after water:", await snap());
  await page.screenshot({ path: `${OUT}/b05-seeded.png` });

  console.log("--- PANELS ---");
  const panels = { "بازار": "market", "سفارش": "orders", "مدیریت": "biz", "مهارت": "skills", "تحقیق": "tech", "دکور": "decor", "قرارداد": "contracts", "جوایز": "ach", "راهنما": "help", "تنظیمات": "settings", "داستان": "chapters" };
  for (const [label, file] of Object.entries(panels)) {
    const ok = await page.evaluate((l) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === l);
      if (b) { b.click(); return true; } return false;
    }, label);
    await sleep(420);
    await page.screenshot({ path: `${OUT}/p-${file}.png` });
    const txt = (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 150);
    console.log(`panel ${label.padEnd(8)} found=${ok} :: ${txt}`);
  }
  // close panel
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "بستن")?.click());
  await sleep(300);

  console.log("--- MOBILE ---");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/b06-mobile-map.png` });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "بازار")?.click());
  await sleep(500);
  await page.screenshot({ path: `${OUT}/b07-mobile-market.png` });
  console.log("mobile HUD:", (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 200));

  console.log("\nERRORS:", [...new Set(errors)].slice(0, 12).join("\n") || "(none)");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
