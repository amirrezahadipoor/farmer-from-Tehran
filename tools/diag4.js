const puppeteer=require("puppeteer");
(async()=>{
const b=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
await p.evaluateOnNewDocument(()=>{
  window.__log=[];
  const ce=console.error, cw=console.warn;
  console.error=(...a)=>{window.__log.push("ERROR: "+a.map(x=>String(x&&x.stack||x)).join(" ").slice(0,500));ce(...a);};
  console.warn=(...a)=>{window.__log.push("WARN: "+a.map(x=>String(x)).join(" ").slice(0,300));cw(...a);};
  window.addEventListener("unhandledrejection",e=>window.__log.push("REJECT: "+String(e.reason&&e.reason.stack||e.reason)));
  window.addEventListener("error",e=>window.__log.push("ERR: "+String(e.error&&e.error.stack||e.message)),true);
});
await p.goto("http://127.0.0.1:3000/",{waitUntil:"networkidle2",timeout:60000});
await new Promise(r=>setTimeout(r,6000));
const info = await p.evaluate(()=>{
  const fibers=Object.keys(document.body).filter(k=>k.startsWith("__react"));
  const divs=[...document.body.children].map(d=>({tag:d.tagName,cls:(d.className||"").toString().slice(0,80),kf:Object.keys(d).filter(k=>k.startsWith("__react"))}));
  return {fibersOnBody:fibers, divs, log:window.__log, nextF:(self.__next_f||[]).length, hasReact:typeof window.React, 
    // is a tree mounted? check any element for a react fiber key
    anyFiber: !!document.querySelector('[class*="h-screen"]') && Object.keys(document.querySelector('[class*="h-screen"]')).some(k=>k.startsWith("__react"))};
});
console.log(JSON.stringify(info,null,1).slice(0,4000));
await b.close();
})();
