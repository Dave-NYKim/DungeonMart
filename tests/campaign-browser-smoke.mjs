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
async function click(selector){const found=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;e.click();return true;})()`);assert.ok(found,`Clickable ${selector}`);await sleep(120);}
const out='/tmp/dungeonmart-review';await mkdir(out,{recursive:true});
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(`${out}/${name}.png`,Buffer.from(r.data,'base64'));}
const camera=()=>evaluate(`(()=>{const e=document.querySelector('#world'),r=e.getBoundingClientRect();return{x:Number(e.dataset.cameraX),y:Number(e.dataset.cameraY),zoom:Number(e.dataset.zoom),left:r.left,top:r.top,width:r.width,height:r.height};})()`);
const actualClick=async(x,y)=>{await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await sleep(160);};
const overview=async()=>{await evaluate(`document.querySelector('#world').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'0',code:'Digit0'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'0',code:'Digit0'});await sleep(200);};
const pauseToggle=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'p',code:'KeyP',modifiers:1});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'p',code:'KeyP',modifiers:1});await sleep(120);};
async function tap(selector){const p=await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.checkVisibility()&&!e.disabled);if(!e)return null;e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);assert.ok(p,`Visible actionable control ${selector}`);await actualClick(p.x,p.y);}
async function worldTap(x,y){const cam=await camera();await actualClick(cam.left+cam.width/2+(x-cam.x)*cam.zoom,cam.top+cam.height/2+(y-cam.y)*cam.zoom);}
const saved=()=>evaluate(`JSON.parse(localStorage.getItem('dungeon-mart-save-v1'))`);
async function loadFixture(fixture){const injected=await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('dungeon-mart-save-v1',${JSON.stringify(fixture)})`});await send('Page.reload');await until(`document.querySelector('#hero-portrait')`);await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected.identifier});await sleep(350);}

async function touch(selector){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(200);}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setTouchEmulationEnabled',{enabled:true});await send('Page.navigate',{url:BASE});await sleep(1000);
 const fresh=await evaluate(`(async()=>{const e=await import('./src/engine.js'),s=e.createGame();s.treasury=10000;s.savedAt=Date.now();return e.serialize(s)})()`);
 for(const [width,height]of [[390,844],[360,640]]){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await loadFixture(fresh);await evaluate(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
 await until(`import('./src/campaign-art.js').then(m=>m.campaignArtStatus().buildings&&m.campaignArtStatus().bosses)`);
 await screenshot('modern-mart-'+width);
 const alpha=await evaluate(`(async()=>{const a=await import('./src/campaign-art.js'),w=await import('./src/world.js');return w.POIS.filter(p=>['mart','crypt','tomb','temple','fortress','final-seal'].includes(p.type)).map(p=>{const c=a.buildingSprite(p),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]===0)n++;return n/(c.width*c.height)})})()`);assert.ok(alpha.every(n=>n>.1),'Building alpha backgrounds');
 await touch('[data-action="view"][data-view="expedition"]');
 assert.equal(await evaluate(`document.querySelectorAll('.act-boss-button:not(:disabled)').length`),1);
 await touch('.act-boss-button[data-zone="0"]');await touch('[data-action="confirm-act-boss"]');await sleep(200);
 assert.ok(await evaluate(`document.querySelector('#boss-hud').textContent.includes('묘역의 파수장')`));await screenshot('act-one-boss-'+width);
 assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
 const final=JSON.parse(fresh);final.campaign.clears['0:1']=4;for(const [i,h]of final.heroes.entries()){h.state=i%2?'return':'recover';h.standby=true;h.hp=80;}
 await loadFixture(JSON.stringify(final));await evaluate(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);await touch('[data-action="summon-boss"]');await touch('[data-action="confirm-summon"]');await sleep(400);await screenshot('northern-final-boss-'+width);
 const s=await saved();assert.equal(s.raid.kind,'final');assert.ok(s.heroes.every(h=>!['return','recover'].includes(h.state)));assert.ok(s.enemies.find(e=>e.boss).y<800);
 const hell=JSON.parse(fresh);hell.difficulty={tier:2,stage:10,unlocked:2,unlockedStage:10,lockedUntil:0};hell.campaign.clears['2:10']=4;
 await loadFixture(JSON.stringify(hell));await evaluate(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);await touch('[data-action="view"][data-view="expedition"]');
 assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false,'Hell10 difficulty fits mobile');
 await touch('[data-action="summon-boss"]');await touch('[data-action="confirm-summon"]');
 assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false,'Huge boss HP fits mobile');

 }
 assert.deepEqual(errors,[]);console.log('PASS campaign buildings, act gates and final rally via touch at two mobile sizes');
}finally{ws.close();}
