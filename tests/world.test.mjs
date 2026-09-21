import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, MART, ARRIVAL, REGIONS, POIS, isWalkable } from '../src/world.js';
import { Camera } from '../src/camera.js';
import { findPath, lineOpen, moveEntity } from '../src/navigation.js';
import { createGame, recruit, tick, serialize, restore, craft, autoPlace } from '../src/engine.js';
test('default camera is local, overview alone fits every region, and zoom is cursor anchored',()=>{
 const c=new Camera();c.resize(900,600);assert.equal(c.zoom,1.25);
 const visible=p=>{const v=c.view;return p.x>=v.x&&p.y>=v.y&&p.x<=v.x+v.width&&p.y<=v.y+v.height;};
 assert.ok(visible(MART));assert.equal(REGIONS.filter(visible).length,0);
 const p=c.worldPoint(230,200);c.zoomAt(1.7,230,200);const q=c.worldPoint(230,200);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<.001);
 c.fit();assert.ok(REGIONS.every(visible));assert.ok(visible(ARRIVAL));assert.ok(c.zoom<.3);
 c.resize(390,520);assert.ok(REGIONS.every(visible));c.focus(-999,99999,2);assert.ok(c.view.x>=0);assert.ok(c.view.y+c.view.height<=WORLD.height+.001);
});
test('all acts have traversable routes from the mart across the connected continent',()=>{
 for(const zone of REGIONS){const start={x:MART.x,y:MART.y+40},path=findPath(start,zone);assert.ok(path.length>=1,`ACT ${zone.zone+1} has a traversable route`);let previous=start;for(const point of path){assert.ok(lineOpen(previous,point),`ACT ${zone.zone+1}: no cliff or building crossing`);previous=point;}
  const actor={...start};let reached=false;for(let i=0;i<1200;i++){reached=moveEntity(actor,zone,112,.1);assert.ok(isWalkable(actor.x,actor.y));if(reached)break;}assert.ok(reached,`ACT ${zone.zone+1} reached`);
 }
});
test('new recruits sail into port, register, and depart from the mart',()=>{
 const s=createGame();s.treasury=1000;const h=recruit(s,'amazon').hero;assert.equal(h.state,'arrive');assert.equal(h.x,ARRIVAL.berth.x-160);assert.equal(h.arrivalStage,-1);assert.equal(h.y,ARRIVAL.y);
 for(let i=0;i<20;i++)tick(s,.1);assert.equal(h.state,'arrive');assert.ok(h.x>ARRIVAL.berth.x-160);assert.ok(h.x<ARRIVAL.x);
 const loaded=restore(serialize(s));assert.ok(loaded);assert.equal(loaded.heroes.at(-1).state,'arrive');
 for(let i=0;i<300;i++)tick(loaded,.1);assert.notEqual(loaded.heroes.at(-1).state,'arrive');assert.ok(loaded.logs.some(l=>l.message.includes('등록 완료')));
});
test('version-one saves migrate positions while retaining money, gear, levels and materials',()=>{
 const s=createGame(),h=s.heroes[0];h.level=12;
 // 구버전 저장 형태를 직접 구성: 슬롯 장비와 equipment 참조
 const legacy=JSON.parse(serialize(s));legacy.version=1;delete legacy.items;delete legacy.warehouse;delete legacy.fieldDrops;delete legacy.drawer;delete legacy.codex;delete legacy.upgrades.warehouse;
 legacy.inventory=[{id:'i900',slot:'weapon',classId:h.classId,rarity:1,name:'정밀한 양손 도끼',stats:{atk:25,crit:.08},price:85,purchased:true,appearance:{weapon:'axe',armor:1,color:'#82aacc',aura:0}},{id:'i901',slot:'armor',classId:null,rarity:3,name:'심연의 갑주',stats:{def:30,hp:150},price:360,purchased:false,appearance:{weapon:'axe',armor:3,color:'#d38c5d',aura:0}}];
 const old=[{x:235,y:235},{x:785,y:235},{x:235,y:635},{x:785,y:635}];
 for(const hero of legacy.heroes){hero.x=510;hero.y=455;delete hero.arrivalStage;delete hero.arrivalWait;delete hero.grid;delete hero.placed;delete hero.bagItems;hero.equipment={weapon:hero.id===h.id?'i900':null,armor:null,accessory:null};}
 for(const e of legacy.enemies){e.x=old[e.zone].x;e.y=old[e.zone].y;}
 const loaded=restore(JSON.stringify(legacy));assert.ok(loaded);assert.equal(loaded.version,3);assert.equal(loaded.heroes[0].level,12);assert.equal(loaded.heroes[0].gold,h.gold);assert.deepEqual(loaded.materials,s.materials);
 assert.equal(loaded.heroes[0].placed[0].id,'i900');assert.deepEqual(loaded.items.i900.implicit,{atk:25,crit:.08});assert.equal(loaded.items.i900.purchased,true);assert.ok(loaded.warehouse.includes('i901'));assert.equal(loaded.items.i901.grade,'unique');assert.ok(loaded.items.i901.name.startsWith('옛 시대의'));
 assert.ok(loaded.heroes.every(h=>isWalkable(h.x,h.y)));assert.ok(loaded.enemies.every(e=>isWalkable(e.x,e.y)));
 for(let i=0;i<50;i++)tick(loaded,.1);assert.ok(restore(serialize(loaded)));
});
test('POIs have stable unique IDs and solid footprints are respected by movement',()=>{
 assert.equal(new Set(POIS.map(p=>p.id)).size,POIS.length);assert.equal(POIS.filter(p=>p.interaction==='act-boss').length,4);
 for(const p of POIS.filter(p=>p.solid))assert.equal(isWalkable(p.x,p.y-p.height/2),false,p.id);
 assert.equal(isWalkable(32,1800),false,'western sea is impassable');
 const path=findPath({x:MART.x-140,y:MART.y+64},{x:MART.x+180,y:MART.y-200});let prev={x:MART.x-140,y:MART.y+64};for(const p of path){assert.ok(lineOpen(prev,p));prev=p;}assert.ok(path.length>1,'path routes around mart');
});
