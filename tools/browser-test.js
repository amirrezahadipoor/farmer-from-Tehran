const puppeteer = require("puppeteer");
const fs = require("fs");

const OUT = "/home/user/review-shots";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

  const console_ = [];
  const failed = [];
  page.on("console", (m) => console_.push(`[${m.type()}] ${m.text()}`.slice(0, 200)));
  page.on("pageerror", (e) => console_.push(`[PAGEERROR] ${String(e).slice(0, 300)}`));
  page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`.slice(0, 160)));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url()}`.slice(0, 160)); });

  await page.goto("http://127.0.0.1:3001/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); return name; };
  const clickText = async (t) => {
    const ok = await page.evaluate((t) => {
      const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").includes(t));
      if (b) { b.click(); return true; } return false;
    }, t);
    await new Promise((r) => setTimeout(r, 350));
    return ok;
  };

  console.log("---- 1. INTRO SPLASH ----");
  await shot("01-intro-desktop");
  const introInfo = await page.evaluate(() => {
    const img = document.querySelector("img");
    return {
      title: document.querySelector("h1")?.innerText,
      imgSrc: img?.getAttribute("src"),
      imgNatural: img ? img.naturalWidth + "x" + img.naturalHeight : "no <img>",
      canvas: (() => { const c = document.querySelector("canvas"); return c ? c.width + "x" + c.height : "none"; })(),
      preloadBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  console.log(JSON.stringify(introInfo, null, 1));

  console.log("---- 2. START STORY ----");
  console.log("clicked 'آغاز داستان':", await clickText("آغاز داستان"));
  await new Promise((r) => setTimeout(r, 600));
  await shot("02-name-gate");

  console.log("---- 3. NAME -> CINEMATIC ----");
  await page.type("input", "امید", { delay: 20 });
  await clickText("آغاز داستان");
  await new Promise((r) => setTimeout(r, 2500));
  await shot("03-story-scene");
  const bgInfo = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) => d.style.backgroundImage?.includes("/images/"));
    if (!el) return "no background-image div found";
    const img = new Image(); img.src = el.style.backgroundImage.match(/url\("?(.*?)"?\)/)[1];
    return { style: el.style.backgroundImage, computedBg: getComputedStyle(el).backgroundImage };
  });
  console.log("story background element:", JSON.stringify(bgInfo));

  // click through the 20 intro scenes (2 clicks per scene: finish typing + advance)
  console.log("---- 4. CLICK THROUGH INTRO (ch0 = 20 scenes) ----");
  let clicks = 0, sceneTexts = [];
  for (let i = 0; i < 110; i++) {
    const before = await page.evaluate(() => document.body.innerText);
    await page.mouse.click(640, 700);
    await new Promise((r) => setTimeout(r, 260));
    clicks++;
    const after = await page.evaluate(() => document.body.innerText);
    if (after.includes("صف تولید") || after.includes("بازار و انبار") || after === before) { /* keep going */ }
    if (i === 3) await shot("04-story-scene-2");
    if (!after.includes("فصل") && !after.includes("لمس = نمایش کامل متن")) { break; }
  }
  console.log("clicks spent to get out of the intro:", clicks);
  await new Promise((r) => setTimeout(r, 1200));
  await shot("05-after-intro");
  console.log("post-intro body text:", (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n+/g, " | "));

  console.log("---- 5. GAMEPLAY ----");
  await new Promise((r) => setTimeout(r, 1500));
  await shot("06-gameplay-desktop");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 1500));
  await shot("07-gameplay-mobile");

  console.log("---- 6. EXERCISE THE 'HOE' TOOL ON A GRASS TILE + read toasts ----");
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await new Promise((r) => setTimeout(r, 800));
  const tile = await page.evaluate(() => {
    // click the middle of the canvas with the hoe tool selected
    const b = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === "شخم");
    if (b) b.click();
    return !!b;
  });
  console.log("hoe button found:", tile);
  for (const [x, y] of [[640, 400], [700, 430], [580, 380], [660, 470]]) {
    await page.mouse.click(x, y);
    await new Promise((r) => setTimeout(r, 400));
  }
  await shot("08-hoe-clicks");
  const toasts = await page.evaluate(() => document.body.innerText);
  console.log("toast/HUD text after clicks:", toasts.replace(/\n+/g, " | ").slice(0, 400));

  console.log("---- 7. MARKET / PANELS ----");
  for (const label of ["بازار", "سفارش", "مدیریت", "مهارت", "تحقیق", "قرارداد", "جوایز", "راهنما", "تنظیمات"]) {
    const ok = await page.evaluate((l) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === l);
      if (b) { b.click(); return true; } return false;
    }, label);
    await new Promise((r) => setTimeout(r, 450));
    if (label === "بازار") await shot("09-market");
    if (label === "مدیریت") await shot("10-biz");
    if (label === "تحقیق") await shot("11-tech");
    if (label === "راهنما") await shot("12-help");
  }

  console.log("\n===== CONSOLE MESSAGES =====");
  console.log([...new Set(console_)].slice(0, 40).join("\n") || "(none)");
  console.log("\n===== FAILED / 4xx REQUESTS =====");
  console.log([...new Set(failed)].join("\n") || "(none)");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
