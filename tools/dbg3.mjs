import { chromium, devices } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem("farm_onboard","1"); } catch {} });
await p.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await p.getByRole("button", { name: /آغاز|شروع|بازی/ }).first().tap().catch(()=>{});
await p.waitForTimeout(1200);
await p.evaluate(() => { const w=window; const st=w.__game?.getState?.(); if (st?.story){ st.story.shown=false; w.__game.setState(st);} });
await p.waitForTimeout(600);
await p.getByRole("button", { name: "منو" }).first().tap();
await p.getByRole("button", { name: "بازار" }).first().tap();
await p.waitForTimeout(600);
const info = await p.evaluate(() => {
  const sheets=[...document.querySelectorAll("div")].filter(d=>d.className && String(d.className).includes("bottom-0") && String(d.className).includes("z-40"));
  const s=sheets[0];
  if(!s) return {sheets:0};
  const handle = s.firstElementChild;
  const hb = handle.getBoundingClientRect();
  return { sheets: sheets.length, handleTag: handle.tagName, handleClass: String(handle.className).slice(0,90), handleBox: {x:hb.x,y:hb.y,w:hb.width,h:hb.height}, handleEvents: !!(handle.onpointerdown) };
});
console.log(JSON.stringify(info,null,1));
// کشیدن با رویدادهای pointer روی دستگیره
const res = await p.evaluate(async () => {
  const s=[...document.querySelectorAll("div")].find(d=>String(d.className).includes("z-40") && String(d.className).includes("bottom-0"));
  const handle = s.firstElementChild;
  const r = handle.getBoundingClientRect();
  const cx = r.x + r.width/2, cy = r.y + r.height/2;
  const ev = (type, y) => handle.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: cx, clientY: y, bubbles: true, cancelable: true, isPrimary: true }));
  ev("pointerdown", cy);
  for (let i=1;i<=8;i++) ev("pointermove", cy + i*22);
  ev("pointerup", cy + 176);
  return { moved: true };
});
await p.waitForTimeout(800);
console.log("sheet still open?", await p.getByText("بازار و انبار").count(), JSON.stringify(res));
await b.close();
