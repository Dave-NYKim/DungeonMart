// Optional UI verification against an isolated Chromium DevTools session on port 9223.
// Requires Node 22+; never point this at a personal browser profile.
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
// BASE / DEVTOOLS env vars let a second checkout run on other ports without touching another session's server.
const BASE=process.env.BASE||'http://127.0.0.1:4173',DEVTOOLS=process.env.DEVTOOLS||'http://127.0.0.1:9223';
const targets=await(await fetch(`${DEVTOOLS}/json`)).json();
const target=targets.find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;const waiting=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=waiting.get(m.id);waiting.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;waiting.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression){for(let i=0;i<60;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error(`Timeout: ${expression}`);}
const out='/tmp/dungeonmart-review';await mkdir(out,{recursive:true});
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(`${out}/${name}.png`,Buffer.from(r.data,'base64'));}
try {
 await send('Runtime.enable');await send('Page.enable');
 for(const [width,height] of [[390,844],[360,640]]){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:BASE});await sleep(1500);
 await until(`import('./src/sorceress-art.js').then(m=>m.sorceressArtStatus().ready)`);
 console.log(await evaluate(`(async()=>{const m=await import('./src/sorceress-art.js');const dirs=[];for(const motion of ['walk'])for(let d=0;d<8;d++){let a=m.sorceressSprite(0,d,motion),b=m.sorceressSprite(2,d,motion);if(!a||a.width!==64||a.toDataURL()===b.toDataURL())throw Error('Invalid animation frames '+d);if(a.getContext('2d').getImageData(0,0,1,1).data[3]!==0)throw Error('Opaque background');dirs.push(a.width);}if(document.documentElement.scrollWidth>innerWidth)throw Error('Overflow');return m.sorceressArtStatus()})()`));
 await evaluate(`(async()=>{const e=await import('./src/engine.js'),r=await import('./src/render.js'),s=e.createGame(),h=e.makeHero(s,'sorceress');const c=document.createElement('canvas');c.width=252;c.height=316;c.style.cssText='position:fixed;top:120px;left:30px;background:#29372e;z-index:999';document.body.append(c);r.portrait(c,h,s);})()`);await screenshot('sorceress-mobile-'+width);
 }
 assert.deepEqual(errors,[]);console.log('Sorceress mobile checks passed');
} finally {ws.close();}
