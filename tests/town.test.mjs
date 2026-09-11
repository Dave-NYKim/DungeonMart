import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, editTown, restore, serialize, tick } from '../src/engine.js';
import { MART, POIS, WORLD, REGIONS, HARBOR, HUB, RESERVE, regionAt, isWalkable, applyTownLayout, freshTown, placementError } from '../src/world.js';
import { findPath, lineOpen } from '../src/navigation.js';
import { SKILL_CATALOG, skillFamily, skillIcon } from '../src/skill-visuals.js';
function validPlace(s,id){for(let y=912;y<1580;y+=32)for(let x=1360;x<2260;x+=32)if(!placementError(s.town,id,x,y)&&Math.hypot(x-MART.x,y-MART.y)>180)return{x,y};throw new Error('No place found');}
test('continent has unequal connected biomes, western uphill grassland and only a northern expansion pocket',()=>{
 const areas=new Map();for(let y=112;y<2680;y+=64)for(let x=320;x<3400;x+=64){const r=regionAt(x,y);areas.set(r?.id,(areas.get(r?.id)||0)+1);}
 assert.ok(new Set(REGIONS.map(r=>areas.get(r.id))).size>=3);
 assert.equal(regionAt(700,550).zone,0);assert.equal(regionAt(528,1136),HARBOR);assert.equal(regionAt(1808,1200),HUB);
 assert.ok(areas.get(RESERVE.id)<[...areas.values()].reduce((a,b)=>a+b,0)*.12);
 for(const r of REGIONS)assert.equal(regionAt(r.x,r.y).zone,r.zone);
});
test('moving the mart changes recovery targets and navigation, persists, and can be undone',()=>{
 const s=createGame(),before=structuredClone(s.town),target=validPlace(s,'mart');s.heroes[0].state='recover';
 const economy={gold:s.treasury,materials:structuredClone(s.materials),inventory:structuredClone(s.inventory)};
 assert.ok(editTown(s,{kind:'move',id:'mart',...target}).ok);assert.equal(MART.x,target.x);assert.equal(MART.y,target.y);
 assert.ok(!isWalkable(target.x,target.y-50));assert.ok(isWalkable(s.heroes[0].x,s.heroes[0].y));
 for(const zone of REGIONS){let prev={x:MART.x,y:MART.y+48};const path=findPath(prev,zone);assert.ok(path.length);for(const p of path){assert.ok(lineOpen(prev,p));prev=p;}}
 const loaded=restore(serialize(s));assert.deepEqual(loaded.town,s.town);tick(loaded,.1);assert.equal(MART.x,target.x);
 assert.equal(s.treasury,economy.gold);assert.deepEqual(s.materials,economy.materials);assert.deepEqual(s.inventory,economy.inventory);
 assert.ok(editTown(s,{kind:'restore',town:before}).ok);assert.equal(MART.x,1808);assert.equal(MART.y,1200);
});
test('town rejects overlapping buildings, blocked roads, invalid saves and out of bounds placements atomically',()=>{
 const s=createGame(),before=serialize(s);
 for(const action of [{kind:'move',id:'mart',x:2064,y:1216},{kind:'move',id:'mart',x:1808,y:1424},{kind:'move',id:'mart',x:-50,y:800},{kind:'move',id:'arrival',x:1456,y:960},{kind:'decorate',type:'flowers',x:9000,y:9000}])assert.equal(editTown(s,action).ok,false);
 assert.deepEqual(JSON.parse(serialize(s)).town,JSON.parse(before).town);
 for(const town of [{buildings:{mart:{x:1808,y:1424}},decorations:[]},{buildings:{unknown:{x:1400,y:900}},decorations:[]},{buildings:{},decorations:[{type:'unknown',x:1400,y:900}]}])assert.equal(restore(JSON.stringify({...s,town})),null);
});
test('decorations place, replace, erase and round-trip without changing progression',()=>{
 const s=createGame();for(const type of ['path','tree','flowers','bench','lamp'])assert.ok(editTown(s,{kind:'decorate',type,x:1328+32*s.town.decorations.length,y:1520}).ok);
 assert.equal(s.town.decorations.length,5);assert.deepEqual(restore(serialize(s)).town,s.town);
 assert.ok(editTown(s,{kind:'erase',x:1328,y:1520}).ok);assert.equal(s.town.decorations.length,4);applyTownLayout(freshTown());
});
test('revision-two saves migrate spatial data while preserving earned money, heroes, skills, and inventory',()=>{
 const s=createGame();s.worldRevision=2;delete s.town;s.treasury=4321;s.heroes[0].level=25;s.heroes[0].path=['berserker'];s.heroes[0].skillPoints=6;s.materials.iron=666;
 const restored=restore(serialize(s));assert.equal(restored.worldRevision,WORLD.revision);assert.equal(restored.treasury,4321);assert.equal(restored.materials.iron,666);assert.deepEqual(restored.heroes[0].path,['berserker']);assert.equal(restored.heroes[0].skillPoints,6);assert.ok(restored.heroes.every(h=>isWalkable(h.x,h.y)));assert.ok(restored.enemies.every(e=>isWalkable(e.x,e.y)));assert.deepEqual(restored.town,freshTown());
});
test('every base and unlearned promotion skill has an icon and shared preview effect family',()=>{
 assert.equal(SKILL_CATALOG.length,100);assert.equal(new Set(SKILL_CATALOG.map(s=>s.id)).size,100);
 for(const sk of SKILL_CATALOG){assert.ok(skillFamily(sk));assert.ok(skillIcon(sk).includes('<path'));}
 assert.ok(new Set(SKILL_CATALOG.map(skillFamily)).size>=10);
});
test('reading a different valid save does not change the active town before import confirmation',()=>{
 const s=createGame(),target=validPlace(s,'mart');editTown(s,{kind:'move',id:'mart',...target});
 const different=JSON.parse(serialize(s));different.town=freshTown();const loaded=restore(JSON.stringify(different));assert.ok(loaded);assert.equal(MART.x,target.x);assert.equal(MART.y,target.y);assert.deepEqual(s.town.buildings.mart,target);applyTownLayout(freshTown());
});
