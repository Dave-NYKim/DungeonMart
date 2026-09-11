import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, MART, ARRIVAL, REGIONS, POIS, isWalkable } from '../src/world.js';
import { Camera } from '../src/camera.js';
import { findPath, lineOpen, moveEntity } from '../src/navigation.js';
import { createGame, recruit, tick, serialize, restore, craft, equip } from '../src/engine.js';
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
 const s=createGame(),h=recruit(s,'amazon').hero;assert.equal(h.state,'arrive');assert.equal(h.x,ARRIVAL.berth.x-160);assert.equal(h.arrivalStage,-1);assert.equal(h.y,ARRIVAL.y);
 for(let i=0;i<20;i++)tick(s,.1);assert.equal(h.state,'arrive');assert.ok(h.x>ARRIVAL.berth.x-160);assert.ok(h.x<ARRIVAL.x);
 const loaded=restore(serialize(s));assert.ok(loaded);assert.equal(loaded.heroes.at(-1).state,'arrive');
 for(let i=0;i<300;i++)tick(loaded,.1);assert.notEqual(loaded.heroes.at(-1).state,'arrive');assert.ok(loaded.logs.some(l=>l.message.includes('등록 완료')));
});
test('version-one saves migrate positions while retaining money, gear, levels and materials',()=>{
 const s=createGame(),h=s.heroes[0];h.level=12;const item=craft(s,'weapon',h.classId,0).item;equip(s,h,item.id);s.version=1;
 const old=[{x:235,y:235},{x:785,y:235},{x:235,y:635},{x:785,y:635}];
 for(const hero of s.heroes){hero.x=510;hero.y=455;delete hero.arrivalStage;delete hero.arrivalWait;}
 for(const e of s.enemies){e.x=old[e.zone].x;e.y=old[e.zone].y;}
 const loaded=restore(JSON.stringify(s));assert.ok(loaded);assert.equal(loaded.version,2);assert.equal(loaded.heroes[0].level,12);assert.equal(loaded.heroes[0].gold,h.gold);assert.deepEqual(loaded.materials,s.materials);assert.deepEqual(loaded.inventory,s.inventory);assert.equal(loaded.heroes[0].equipment.weapon,item.id);assert.ok(loaded.heroes.every(h=>isWalkable(h.x,h.y)));assert.ok(loaded.enemies.every(e=>isWalkable(e.x,e.y)));
});
test('POIs have stable unique IDs and solid footprints are respected by movement',()=>{
 assert.equal(new Set(POIS.map(p=>p.id)).size,POIS.length);assert.ok(POIS.filter(p=>p.status==='reserved').length>=5);
 for(const p of POIS.filter(p=>p.solid))assert.equal(isWalkable(p.x,p.y-p.height/2),false,p.id);
 assert.equal(isWalkable(32,1800),false,'western sea is impassable');
 const path=findPath({x:MART.x-140,y:MART.y+64},{x:MART.x+180,y:MART.y-200});let prev={x:MART.x-140,y:MART.y+64};for(const p of path){assert.ok(lineOpen(prev,p));prev=p;}assert.ok(path.length>1,'path routes around mart');
});
