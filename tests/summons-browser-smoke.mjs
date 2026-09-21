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
try{await send('Runtime.enable');await send('Page.enable');for(const [width,height] of [[390,844],[360,640]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:BASE});await sleep(1000);await until(`import('./src/summon-art.js').then(m=>m.summonArtStatus().ready)`);await evaluate(`(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());const m=await import('./src/summon-art.js');const c=document.createElement('canvas');c.width=320;c.height=180;c.style.cssText='position:fixed;top:120px;left:15px;background:#29392e;z-index:9999';document.body.append(c);const ctx=c.getContext('2d');for(const [i,kind] of ['skeleton','golem'].entries()){if(m.summonSprite(kind,0).toDataURL()===m.summonSprite(kind,1).toDataURL())throw Error('Same poses');for(let pose=0;pose<2;pose++){const sprite=m.summonSprite(kind,pose);const data=sprite.getContext('2d').getImageData(0,0,64,64).data;let clear=0;for(let j=3;j<data.length;j+=4)if(data[j]===0)clear++;if(clear<300)throw Error('Missing alpha');ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,20+pose*150,i*80,80,80);}m.drawSummon(ctx,{kind,x:20,y:20,life:1},1);if(ctx.globalAlpha!==1)throw Error('Canvas state leak');}if(document.documentElement.scrollWidth>innerWidth)throw Error('Overflow');})()`);await screenshot('summons-'+width);}assert.deepEqual(errors,[]);console.log('PASS summon poses/alpha/mobile');}finally{ws.close();}
