const puppeteer=require("puppeteer"); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
async function probe(url,label,{corrupt=false}={}){
  const p=await b.newPage(); await p.setViewport({width:1000,height:700});
  const errs=[]; p.on("pageerror",e=>errs.push(e.message.slice(0,120)));
  await p.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  if(corrupt){ await p.evaluate(()=>{localStorage.setItem("farm_save","{oops not json");localStorage.setItem("farm_pid","x");}); await p.reload({waitUntil:"domcontentloaded"}); }
  await sleep(12000);
  const txt=(await p.evaluate(()=>document.body.innerText)).replace(/\n+/g," | ").slice(0,120);
  const hasCanvas=await p.evaluate(()=>!!document.querySelector("canvas"));
  const hasIntro=await p.evaluate(()=>document.body.innerText.includes("آغاز داستان"));
  console.log(`${label.padEnd(34)} canvas=${String(hasCanvas).padEnd(5)} introBtn=${String(hasIntro).padEnd(5)} text="${txt}" errs=${errs.length?errs[0]:"none"}`);
  await p.close();
}
await probe("http://127.0.0.1:3001/","PROD, clean profile");
await probe("http://127.0.0.1:3001/","PROD, CORRUPTED save",{corrupt:true});
await probe("http://127.0.0.1:3000/","DEV (npm run dev)");
await b.close();
})();
