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
// Focused mobile checks for random crafting and the equipment codex.
async function touch(selector){
 const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);assert.ok(p,selector);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(250);
}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:BASE});await sleep(800);
 const fixture=await evaluate(`(async()=>{const e=await import('./src/engine.js'),i=await import('./src/items.js'),s=e.createGame();s.materials.iron=1000;for(const grade of ['set','unique']){const item=i.generateItem({ilvl:40,grade});item.id='i'+s.nextId++;s.items[item.id]=item;s.warehouse.push(item.id);}return e.serialize(s)})()`);
 await loadFixture(fixture);await pauseToggle();await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 for(const [width,height] of [[390,844],[360,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'coarse'},{name:'hover',value:'none'}]});await sleep(250);
  assert.ok(await evaluate(`!document.querySelector('#nav [data-view="workshop"]')&&!document.querySelector('#nav [data-view="journal"]')&&!document.querySelector('#journal-view')`));
  assert.ok(await evaluate(`!document.querySelector('.map-zoom')&&!document.querySelector('#zoom-label')`));
  const beforeZoom=await camera();const cx=beforeZoom.left+beforeZoom.width/2,cy=beforeZoom.top+beforeZoom.height/2;
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-60,y:cy,id:1},{x:cx+60,y:cy,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(200);assert.ok((await camera()).zoom>beforeZoom.zoom,'pinch zoom survives controls removal');
  await touch('#nav [data-view="town"]');
  assert.ok(await evaluate(`document.querySelector('#town-gear .wh-head').textContent.includes(' / 80개')`));
  await touch('#town-gear .wh-item');assert.ok(await evaluate(`document.querySelector('#town-gear .gear-detail .detail-head')`),'warehouse detail works without selected hero');
  await touch('#town-tabs [data-mode="edit"]');assert.ok(await evaluate(`!document.querySelector('#town-edit').hidden`));
  await touch('#town-tabs [data-mode="workshop"]');
  assert.ok(await evaluate(`[...document.querySelectorAll('#town-tabs button')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.scrollWidth<=e.clientWidth})`));
  assert.ok(await evaluate(`!document.querySelector('#craft-grade')`),'grade selector removed');
  assert.ok(await evaluate(`document.querySelector('.craft-random-note').textContent.includes('레어 10%')`));
  const before=await saved();await touch('#workshop-view [data-gear="craft"]');const after=await saved();
  assert.equal(after.crafted,before.crafted+1);assert.equal(before.materials.iron-after.materials.iron,8);
  const item=Object.values(after.items).find(i=>!before.items[i.id]);assert.ok(['normal','magic','rare'].includes(item.grade));
  assert.ok(await evaluate(`[...document.querySelectorAll('#workshop-view .form-row select,#workshop-view [data-gear="craft"]')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.right<=innerWidth})`));
  await sleep(3600);await evaluate(`document.querySelector('#town-view').scrollTop=0`);await screenshot(`mobile-craft-${width}`);await touch('#nav [data-view="bestiary"]');await touch('[data-action="codex-tab"][data-tab="sets"]');
  assert.equal(await evaluate(`document.querySelectorAll('.set-entry').length`),5);await touch('.set-entry summary');
  assert.ok(await evaluate(`document.querySelector('.set-entry').open`));await sleep(900);assert.ok(await evaluate(`document.querySelector('.set-entry').open`),'refresh preserves expanded entry');
  assert.ok(await evaluate(`document.querySelector('.set-entry').textContent.includes('동시 착용 효과')`));await screenshot(`mobile-sets-${width}`);
  await touch('[data-action="codex-tab"][data-tab="uniques"]');assert.equal(await evaluate(`document.querySelectorAll('.unique-entry').length`),24);
  await touch('.unique-entry summary');assert.ok(await evaluate(`document.querySelector('.unique-entry').open`));
  assert.ok(await evaluate(`[...document.querySelectorAll('.codex-tabs button,.codex-entry summary')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})`));
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));await screenshot(`mobile-uniques-${width}`);
  await touch('[data-action="codex-tab"][data-tab="monsters"]');assert.ok(await evaluate(`document.querySelectorAll('.monster-entry').length>0`));
 }
 const final=await saved();assert.equal(Object.keys(final.codex.setPieces).length,1);assert.equal(Object.keys(final.codex.uniques).length,1);
 assert.deepEqual(errors,[]);console.log('PASS: unified town, item-count warehouse, compact menus, random crafting and set/unique codex via touch at 390x844 and 360x640; save migration, 44px controls, no overflow or runtime errors');
}finally{ws.close();}
