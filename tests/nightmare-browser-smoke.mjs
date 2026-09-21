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
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:BASE});await sleep(1000);
 await until(`import('./src/nightmare-art.js').then(m=>m.nightmareArtStatus().ready&&m.nightmareArtStatus().motionReady)`);
 const result=await evaluate(`(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());const m=await import('./src/nightmare-art.js'),d=await import('./src/data.js');const ids=d.ZONES.flatMap(z=>z.monsters);const hashes=new Set();const preview=document.createElement('div');preview.style.cssText='position:fixed;inset:100px 10px auto;background:#24322a;z-index:999;display:grid;grid-template-columns:repeat(4,1fr)';for(const id of ids){const c=m.nightmareSprite(id);if(!c||c.width!==64)throw Error('Missing '+id);hashes.add(c.toDataURL());if(c.toDataURL()===m.nightmareSprite(id,false,0,1).toDataURL())throw Error('Missing motion '+id);const variants=[0,1,2].map(t=>m.nightmareSprite(id,false,t));if(new Set(variants.map(v=>v.toDataURL())).size!==3)throw Error('Missing palettes '+id);const base=variants[0].getContext('2d').getImageData(0,0,64,64).data;for(const v of variants.slice(1)){const a=v.getContext('2d').getImageData(0,0,64,64).data;for(let j=3;j<a.length;j+=4)if(a[j]!==base[j])throw Error('Silhouette changed');}const pixels=c.getContext('2d').getImageData(0,0,64,64).data;let clear=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)clear++;if(pixels[i]>128)solid++;}if(clear<300||solid<100)throw Error('Alpha/content '+id);const copy=document.createElement('canvas');copy.width=copy.height=64;copy.getContext('2d').drawImage(c,0,0);preview.append(copy);}document.body.append(preview);const render=await import('./src/render.js'),engine=await import('./src/engine.js'),game=engine.createGame(),hero=game.heroes[0];hero.state='dead';const ghost=document.createElement('canvas');ghost.width=64;ghost.height=72;const ctx=ghost.getContext('2d');render.drawHero(ctx,hero,game,32,60,1,0);if(ctx.globalAlpha!==1)throw Error('Ghost state leak');preview.append(ghost);if(document.documentElement.scrollWidth>innerWidth)throw Error('Overflow');if(document.querySelector('a[href*="battle.net"]'))throw Error('Reference remains');return hashes.size;})()`);
 assert.equal(result,16);await screenshot('nightmare-'+width);
 }
 assert.deepEqual(errors,[]);console.log('PASS: 16 transparent monster sprites and 3 distinct palettes at both mobile sizes');
}finally{ws.close();}
