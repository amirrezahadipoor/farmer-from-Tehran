import { chromium, devices } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
p.on("console", m => { if (m.type()==="error") console.log("[console]", m.text().slice(0,120)); });
await p.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await p.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap().catch(()=>{});
await p.waitForTimeout(1200);
await p.locator("input").first().fill("امید").catch(()=>{});
await p.getByRole("button", { name: "آغاز داستان" }).last().tap().catch(()=>{});
await p.waitForTimeout(800);
await p.evaluate(() => { const w=window; const st=w.__game?.getState?.(); if (st?.story){ st.story.shown=false; w.__game.setState(st);} });
await p.waitForTimeout(900);
console.log("tutorial:", await p.getByText("آموزش سریع").count());
await p.getByRole("button", { name: "بعدی" }).tap({timeout:10000});
await p.getByRole("button", { name: "بعدی" }).tap({timeout:10000});
await p.getByRole("button", { name: "بزن بریم!" }).tap({timeout:10000});
console.log("onboard flag:", await p.evaluate(()=>localStorage.getItem("farm_onboard")));
for (const wu of ["domcontentloaded","load"]) {
  const t0 = Date.now();
  try { await p.goto("http://127.0.0.1:3000/", { waitUntil: wu, timeout: 20000 }); console.log("goto", wu, "OK in", Date.now()-t0, "ms"); }
  catch (e) { console.log("goto", wu, "FAIL in", Date.now()-t0, "ms:", String(e).slice(0,200)); }
}
await b.close();
