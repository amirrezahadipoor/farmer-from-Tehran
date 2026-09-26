const puppeteer=require("puppeteer");
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const logs=[];
p.on("console",m=>logs.push(`[${m.type()}] ${m.text()}`));
p.on("pageerror",e=>logs.push("[PAGEERROR] "+e.message));
p.on("requestfailed",r=>logs.push("[REQFAIL] "+r.url()+" "+r.failure()?.errorText));
p.on("response",r=>{if(r.status()>=400)logs.push("[HTTP "+r.status()+"] "+r.url());});
await p.goto("http://127.0.0.1:3000/",{waitUntil:"networkidle2",timeout:60000});
await new Promise(r=>setTimeout(r,5000));
console.log("=== BODY TEXT ===");
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,600));
console.log("=== HTML LEN ===", (await p.content()).length);
console.log("=== LOGS ===");
console.log([...new Set(logs)].join("\n").slice(0,4000));
await p.screenshot({path:"/home/user/review-shots/diag.png"});
await b.close();
})();
