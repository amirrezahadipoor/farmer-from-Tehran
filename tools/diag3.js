const puppeteer=require("puppeteer");
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const res=[];
p.on("response",r=>res.push(r.status()+" "+(r.url().split("/").pop()||"").slice(0,70)));
await p.goto("http://127.0.0.1:3000/",{waitUntil:"networkidle2",timeout:60000});
await new Promise(r=>setTimeout(r,5000));
console.log("=== ALL RESPONSES ==="); console.log(res.join("\n"));
console.log("=== resources (script) ===");
console.log(JSON.stringify(await p.evaluate(()=>performance.getEntriesByType("resource").filter(r=>r.initiatorType==="script").map(r=>r.name.split("/").slice(-1)[0]+" dur="+Math.round(r.duration)+" size="+r.transferSize)),null,1).slice(0,2500));
console.log("=== next internals ===");
console.log(JSON.stringify(await p.evaluate(()=>({hasNext:!!window.next, nextKeys:window.next?Object.keys(window.next):null, selfNextF:(self.__next_f||[]).length, rootChildren:document.getElementById("__next")?document.getElementById("__next").children.length:"no __next"}))));
console.log("=== try clicking the canvas-less DOM: count buttons ===", await p.evaluate(()=>document.querySelectorAll("button").length));
await b.close();
})();
