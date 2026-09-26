const puppeteer=require("puppeteer");
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const logs=[];
p.on("console",m=>logs.push(`[${m.type()}] ${m.text()}`));
p.on("pageerror",e=>logs.push("[PAGEERROR] "+(e.stack||e.message)));
p.on("requestfailed",r=>logs.push("[REQFAIL] "+r.url()+" "+r.failure()?.errorText));
p.on("response",r=>{if(r.status()>=400)logs.push("[HTTP "+r.status()+"] "+r.url());});
await p.evaluateOnNewDocument(()=>{
  window.__errs=[];
  window.addEventListener("unhandledrejection",e=>{window.__errs.push("UNHANDLED_REJECTION: "+(e.reason&&e.reason.stack||e.reason));});
  window.addEventListener("error",e=>{window.__errs.push("ERROR: "+(e.error&&e.error.stack||e.message));});
  const of=window.fetch;
  window.fetch=(...a)=>{window.__errs.push("FETCH "+a[0]);return of(...a).then(r=>{window.__errs.push("FETCH_RESP "+r.status+" "+a[0]);return r;});};
});
await p.goto("http://127.0.0.1:3000/",{waitUntil:"networkidle2",timeout:60000});
await new Promise(r=>setTimeout(r,6000));
console.log("=== window.__errs ===");
console.log((await p.evaluate(()=>window.__errs)).join("\n").slice(0,3000));
console.log("=== localStorage ===");
console.log(JSON.stringify(await p.evaluate(()=>({pid:localStorage.getItem("farm_pid"), saveLen:(localStorage.getItem("farm_save")||"").length}))));
console.log("=== body ===", (await p.evaluate(()=>document.body.innerText)).slice(0,200));
console.log("=== LOGS ===\n"+[...new Set(logs)].join("\n").slice(0,3000));
await b.close();
})();
