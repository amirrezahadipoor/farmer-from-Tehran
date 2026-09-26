const puppeteer=require("puppeteer"), fs=require("fs");
const OUT="/home/user/review-shots"; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const save=fs.readFileSync("./save.json","utf8");
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const errs=[]; p.on("pageerror",e=>errs.push("PAGEERROR "+e.message));
await p.goto("http://127.0.0.1:3001/",{waitUntil:"domcontentloaded",timeout:60000});
await p.evaluate(s=>{localStorage.setItem("farm_pid","rev_test");localStorage.setItem("farm_save",s);},save);
await p.reload({waitUntil:"networkidle2"}); await sleep(2500);
await p.screenshot({path:`${OUT}/c00-intro-resumed.png`});
await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.innerText.includes("آغاز داستان"))?.click());
await sleep(700);
// close story overlay if it opened
await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="بستن")?.click());
await sleep(900);
await p.screenshot({path:`${OUT}/c01-late-map.png`});
console.log("late-game HUD:",(await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,300));

const openByTitle=async(title)=>{
  const ok=await p.evaluate(t=>{const b=[...document.querySelectorAll("button")].find(x=>(x.getAttribute("aria-label")||"")===t); if(b){b.click();return true;} return false;},title);
  await sleep(500); return ok;
};
const panels=[["بازار و انبار","market"],["سفارش‌ها","orders"],["مدیریت کسب‌وکار","biz"],["مهارت‌ها","skills"],["تحقیقات","tech"],["دکوراسیون","decor"],["قراردادها","contracts"],["دستاوردها","ach"],["راهنما","help"],["دفتر داستان","storyjournal"],["تنظیمات","settings"]];
for(const [t,f] of panels){
  const ok=await openByTitle(t);
  await p.screenshot({path:`${OUT}/d-${f}.png`});
  const txt=(await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,190);
  console.log(`panel ${f.padEnd(13)} ok=${ok} :: ${txt}`);
  await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="بستن")?.click()); await sleep(200);
}
// BUILD panel via toolbar (aria-label ساخت)
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>(x.getAttribute("aria-label")||"")==="ساخت"); if(b)b.click();});
await sleep(600); await p.screenshot({path:`${OUT}/d-build.png`});
console.log("build panel:",(await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,240));
await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="بستن")?.click()); await sleep(250);
// BUILDING interior: click a building tile then use hand? instead click centre of map where buildings are
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>(x.getAttribute("aria-label")||"")==="دست"); if(b)b.click();});
for(const [x,y] of [[640,400],[600,430],[680,430],[560,470],[720,470],[640,470],[600,500],[680,500]]){await p.mouse.click(x,y);await sleep(300);}
await sleep(400); await p.screenshot({path:`${OUT}/d-building-panel.png`});
console.log("after clicking tiles with hand:",(await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,260));
// zoom out to see the whole farm
for(let i=0;i<4;i++){await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>(x.getAttribute("aria-label")||"")==="zoomOut"); if(b)b.click();});await sleep(250);}
await sleep(600); await p.screenshot({path:`${OUT}/c02-zoomed-out.png`});
console.log("\nERRORS:",[...new Set(errs)].slice(0,8).join("\n")||"(none)");
await b.close();
})();
