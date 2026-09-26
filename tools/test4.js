const puppeteer=require("puppeteer"), fs=require("fs");
const OUT="/home/user/review-shots"; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
async function load(saveFile,name){
  const p=await b.newPage(); await p.setViewport({width:1280,height:800});
  await p.goto("http://127.0.0.1:3001/",{waitUntil:"domcontentloaded",timeout:60000});
  await p.evaluate(s=>{localStorage.setItem("farm_pid","rev_"+Math.random().toString(36).slice(2));localStorage.setItem("farm_save",s);},fs.readFileSync(saveFile,"utf8"));
  await p.reload({waitUntil:"networkidle2"}); await sleep(2200);
  await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.innerText.includes("آغاز داستان"))?.click());
  await sleep(600);
  await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.getAttribute("aria-label")==="بستن")?.click());
  await sleep(1200);
  await p.screenshot({path:`${OUT}/${name}.png`});
  return p;
}
const p=await load("./save-night.json","e1-night-rain");
// MARKET SELL TEST
const coins=async()=>p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.includes("سطح")); const t=document.body.innerText.match(/([\d٬,]+)\s*$/m); return document.body.innerText.replace(/\n/g," ").match(/سطح [\d۰-۹]+ \| ([\d٬۰-۹]+)/)?.[1];});
const readCoins=async()=>p.evaluate(()=>{const el=[...document.querySelectorAll("span")].find(s=>/^[\d٬۰-۹,]+$/.test(s.textContent.trim())&&s.parentElement?.textContent.includes("سطح")===false); return document.body.innerText.split("\n").slice(0,12).join(" | ");});
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>(x.getAttribute("aria-label")||"")==="بازار و انبار"); b&&b.click();});
await sleep(800); await p.screenshot({path:`${OUT}/e2-market-before.png`});
console.log("MARKET BEFORE:", (await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,400));
// click the "همه" (sell all) for the first item three times
for(let i=0;i<3;i++){
  await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.trim()==="همه"); b&&b.click();});
  await sleep(700);
}
await p.screenshot({path:`${OUT}/e3-market-after-sellall.png`});
console.log("AFTER 3x SELL-ALL:", (await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,600));
// WINTER
const p2=await load("./save-winter.json","e4-winter-snow");
console.log("WINTER HUD:", (await p2.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,180));
await b.close();
})();
