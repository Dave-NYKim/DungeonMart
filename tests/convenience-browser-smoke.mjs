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
const pauseToggle=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'p',code:'KeyP',modifiers:1});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'p',code:'KeyP',modifiers:1});await sleep(120);};
const saved=()=>evaluate(`JSON.parse(localStorage.getItem('dungeon-mart-save-v1'))`);
async function loadFixture(fixture){const injected=await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('dungeon-mart-save-v1',${JSON.stringify(fixture)})`});await send('Page.reload');await until(`document.querySelector('#hero-portrait')`);await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected.identifier});await sleep(350);}
// Uses only the isolated test profile; fixtures replace its local test save.
async function touch(selector){
 const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);assert.ok(p,selector);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(250);
}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:BASE});await sleep(800);
 const fixture=await evaluate(`(async()=>{const e=await import('./src/engine.js');const s=e.createGame();s.treasury=10000;s.materials.iron=1000;const h=s.heroes[0];h.level=30;h.skillPoints=29;h.gold=10000;h.grid.weapon={w:1,h:3};const old=e.craft(s,'sword1h',1,()=>.5).item;e.autoPlace(s,h,old.id);const good=e.craft(s,'axe1h',1,()=>.5).item;good.implicit={atk:300};e.craft(s,'plate',1,()=>.5);while(s.heroes.length<10)e.recruit(s);s.reserve.push(e.makeHero(s,'paladin'));return e.serialize(s)})()`);
 for(const [width,height]of [[390,844],[360,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await loadFixture(fixture);await pauseToggle();
  await touch('#nav [data-view="town"]');await touch('#town-tabs [data-mode="workshop"]');
  assert.equal(await evaluate(`document.querySelectorAll('#craft-cat,#craft-base,#craft-tier').length`),0);
  const before=await saved();await touch('#workshop-view [data-gear="craft"]');const after=await saved();assert.equal(after.crafted,before.crafted+1);assert.equal(before.materials.iron-after.materials.iron,8);await screenshot('random-craft-'+width);
  await touch('#nav [data-view="heroes"]');await touch('#hero-list .hero-card');await touch('#profile-tabs [data-tab="equipment"]');
  assert.equal(await evaluate(`document.querySelectorAll('#gear-view .wh-item').length>0`),true);
  await touch('#gear-view [data-gear="auto-equip"]');const equipped=await saved();const hero=equipped.heroes[0];assert.ok(hero.placed.some(p=>equipped.items[p.id].implicit.atk===300));assert.ok(!hero.placed.some(p=>equipped.items[p.id].base==='plate'));await screenshot('auto-equip-'+width);
  await touch('[data-action="close-profile"]');
  await touch('#reserve-list [data-action="reserve-replace"]');assert.ok(await evaluate(`document.querySelector('#modal').textContent.includes('사라집니다')`));await touch('[data-action="confirm-replace"]');const replaced=await saved();assert.equal(replaced.heroes.length,10);assert.equal(replaced.reserve.length,0);assert.equal(replaced.heroes[0].classId,'paladin');assert.equal(replaced.heroes[0].level,30);assert.ok(replaced.warehouse.some(id=>replaced.items[id].implicit.atk===300));
  await screenshot('reserve-'+width);
  await touch('#nav [data-view="expedition"]');
  const layout=await evaluate(`(()=>{const b=document.querySelector('.zone-board'),r=b.getBoundingClientRect(),panel=document.querySelector('#management-panel').getBoundingClientRect();return {width:innerWidth,board:b.scrollWidth,client:b.clientWidth,right:r.right,panelHeight:panel.height,overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(b).gridTemplateColumns.split(' ').length};})()`);
  assert.equal(layout.columns,1);assert.equal(layout.board,layout.client);assert.equal(layout.overflow,false);assert.ok(layout.panelHeight>height*.7);console.log(layout);
  const controls=await evaluate(`[...document.querySelectorAll('#expedition-view .diff-tier,#expedition-view .diff-stage,#expedition-view .spawn-options button,#expedition-view .act-boss-button,#expedition-view .zone-hero')].filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height}})`);assert.ok(controls.every(r=>r.w>=44&&r.h>=44));
  await evaluate(`document.querySelector('#expedition-view').scrollTop=0`);await screenshot('expedition-'+width);
  await touch('#expedition-view .zone-hero');assert.equal(await evaluate(`document.querySelector('#hero-modal').open`),true);await touch('#profile-hunt [data-action="assign"][data-zone="-1"]');assert.equal((await saved()).heroes[0].standby,true);await touch('[data-action="close-profile"]');
  const runtime=await evaluate(`(async()=>{const {createGame,makeHero,craft}=await import('./src/engine.js'),{autoEquip}=await import('./src/auto-equip.js');const s=createGame();s.materials.iron=10000;s.heroes[0].gold=100000;for(let i=0;i<80;i++)craft(s,['sword1h','axe1h','chain','helm','gloves','boots','ring','amulet'][i%8],1,()=>.85);const now=performance.now();autoEquip(s,s.heroes[0]);return Math.round(performance.now()-now)})()`);console.log({autoEquip80ItemsMs:runtime});
 }
 assert.deepEqual(errors,[]);console.log('PASS random crafting, auto equip, reserve replacement and mobile expedition touch flows');
}finally{ws.close();}
