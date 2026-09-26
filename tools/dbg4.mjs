import { chromium, devices } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
p.on("pageerror", e => console.log("[pageerror]", String(e).slice(0,200)));
await p.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await p.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap().catch(()=>{});
await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const card=[...document.querySelectorAll("div")].find(d=>String(d.className).includes("z-[60]"));
  if(!card) return {found:false};
  const btns=[...card.querySelectorAll("button")].map(b=>{
    const r=b.getBoundingClientRect();
    const el=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    return { txt:(b.textContent||"").trim().slice(0,12), box:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)], hit: el===b || (el&&b.contains(el)), coveredBy: el ? (el.tagName+"."+String(el.className).slice(0,70)+" | "+(el.textContent||"").trim().slice(0,20)) : "null" };
  });
  const cr=card.getBoundingClientRect();
  return { found:true, cardBox:[Math.round(cr.x),Math.round(cr.y),Math.round(cr.width),Math.round(cr.height)], z:getComputedStyle(card).zIndex, pe:getComputedStyle(card).pointerEvents, btns };
});
console.log(JSON.stringify(info,null,1));
console.log("count بعدی:", await p.getByRole("button", { name: "بعدی" }).count());
await b.close();
