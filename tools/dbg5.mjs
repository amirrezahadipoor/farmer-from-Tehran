import { chromium, devices } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
await p.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await p.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap().catch(()=>{});
await p.waitForTimeout(1200);
const inp = p.locator("input").first();
console.log("inputs:", await p.locator("input").count());
if (await inp.count()) {
  await inp.fill("امید").catch(e=>console.log("fill err", String(e).slice(0,80)));
  const g = p.getByRole("button", { name: "آغاز داستان" });
  console.log("gate buttons:", await g.count());
  if (await g.count()) await g.last().tap().catch(e=>console.log("tap err", String(e).slice(0,80)));
}
await p.waitForTimeout(900);
await p.evaluate(() => { const w=window; const st=w.__game?.getState?.(); if (st?.story){ st.story.shown=false; w.__game.setState(st);} });
await p.waitForTimeout(1200);
const state = await p.evaluate(() => {
  const st = window.__game?.getState?.();
  const card=[...document.querySelectorAll("div")].find(d=>String(d.className).includes("z-[60]"));
  const overlayText = card ? (card.textContent||"").trim().slice(0,40) : null;
  const btns = card ? [...card.querySelectorAll("button")].map(b=>({t:(b.textContent||"").trim().slice(0,10), ...(r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}))(b.getBoundingClientRect())})) : [];
  return { name: st?.story?.name, shown: st?.story?.shown, onboardFlag: localStorage.getItem("farm_onboard"), overlayText, btns, vh: window.innerHeight };
});
console.log(JSON.stringify(state,null,1));
console.log("بعدی count:", await p.getByRole("button", { name: "بعدی" }).count());
try { await p.getByRole("button", { name: "بعدی" }).tap({ timeout: 6000 }); console.log("tap OK →", await p.evaluate(()=>document.body.innerText.slice(0,60))); }
catch (e) { console.log("TAP FAIL:", String(e).slice(0, 900)); }
await b.close();
