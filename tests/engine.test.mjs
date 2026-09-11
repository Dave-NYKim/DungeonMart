import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, ZONES, skillsOf } from '../src/data.js';
import { createGame, tick, craft, equip, salvage, promote, recruit, assignZone, statsOf, serialize, restore, upgradeSkill, resetSkills, upgradeMart } from '../src/engine.js';
import { MART } from '../src/world.js';
const rich = () => {const s=createGame();s.materials={iron:10000,crystal:10000,soul:10000};s.treasury=10000;return s;};
test('automatic hunting yields XP, personal gold, shared materials and return trips',()=>{
  const s=createGame();for(let i=0;i<3000;i++)tick(s,.1);
  assert.ok(s.kills>30);assert.ok(s.materials.iron>48);assert.ok(s.heroes.every(h=>h.level>1));
  for(const h of s.heroes){assert.ok(Number.isFinite(h.hp));assert.ok(h.hp>=0);assert.ok(h.hp<=statsOf(h,s).hp);assert.ok(h.gold>100);}
  assert.ok(s.logs.some(l=>l.message.includes('귀환')));
});
test('crafting consumes materials and purchases transfer gold exactly once',()=>{
  const s=rich(),h=s.heroes[0],startAtk=statsOf(h,s).atk;
  const r=craft(s,'weapon',h.classId,0);assert.ok(r.ok);assert.equal(s.materials.iron,9992);
  const before=s.treasury;assert.ok(equip(s,h,r.item.id).ok);assert.equal(h.gold,65);assert.equal(s.treasury,before+35);assert.ok(statsOf(h,s).atk>startAtk);
  assert.ok(equip(s,h,r.item.id).ok);assert.equal(h.gold,65);assert.equal(s.treasury,before+35);
  assert.equal(equip(s,s.heroes[1],r.item.id).ok,false);assert.equal(salvage(s,r.item.id).ok,false);
});
test('owned shared armor transfers without charging either hero',()=>{
  const s=rich(),a=s.heroes[0],b=s.heroes[1],item=craft(s,'armor',a.classId,0).item;
  equip(s,a,item.id);const bank=s.treasury,bGold=b.gold;
  assert.ok(equip(s,b,item.id).ok);assert.equal(a.equipment.armor,null);assert.equal(b.equipment.armor,item.id);assert.equal(b.gold,bGold);assert.equal(s.treasury,bank);
});
test('invalid or unaffordable transactions leave state unchanged',()=>{
  const s=createGame();s.materials.iron=0;const before=s.materials.iron;assert.equal(craft(s,'weapon','barbarian',3).ok,false);assert.equal(s.materials.iron,before);
  assert.equal(assignZone(s,s.heroes[0],3).ok,false);assert.equal(s.heroes[0].zone,0);
  s.treasury=0;assert.equal(recruit(s,'amazon').ok,false);assert.equal(upgradeMart(s,'forge').ok,false);
});
test('all twenty final classes inherit six active and two passive skills',()=>{
  let count=0;
  for(const c of CLASSES)for(const branch of c.branches)for(const final of branch.children){
    const s=rich(),h=s.heroes.find(h=>h.classId===c.id);h.level=40;
    assert.ok(promote(s,h,branch.id).ok);assert.ok(promote(s,h,final.id).ok);
    const skills=skillsOf(h);assert.equal(skills.filter(sk=>!sk.passive).length,6);assert.equal(skills.filter(sk=>sk.passive).length,2);
    assert.equal(promote(s,h,final.id).ok,false);count++;
  }
  assert.equal(count,20);
});
test('promotion requirements and parent branches are enforced',()=>{
  const s=rich(),h=s.heroes[0],c=CLASSES[0];assert.equal(promote(s,h,c.branches[0].id).ok,false);
  h.level=40;assert.ok(promote(s,h,c.branches[0].id).ok);assert.equal(promote(s,h,c.branches[1].children[0].id).ok,false);
});
test('skill investment is capped and resetting returns exactly the spent points',()=>{
  const s=createGame(),h=s.heroes[0],id=skillsOf(h)[0].id;h.skillPoints=12;
  for(let i=0;i<4;i++)assert.ok(upgradeSkill(s,h,id).ok);
  assert.equal(upgradeSkill(s,h,id).ok,false);assert.equal(h.skillPoints,2);
  resetSkills(s,h);assert.equal(h.skillPoints,12);assert.equal(skillsOf(h)[0].rank,1);resetSkills(s,h);assert.equal(h.skillPoints,12);
});
test('recruitment caps the roster at twenty and all four acts unlock by level',()=>{
  const s=rich();while(s.heroes.length<20)assert.ok(recruit(s,'paladin').ok);assert.equal(recruit(s,'paladin').ok,false);
  s.heroes[0].level=40;for(const z of ZONES)assert.ok(assignZone(s,s.heroes[1],z.id).ok);
});
test('every final class can simulate combat in every act without invalid state',()=>{
  for(const c of CLASSES)for(const branch of c.branches)for(const final of branch.children){
    const s=rich(),h=s.heroes.find(h=>h.classId===c.id);h.level=40;h.gold=10000;promote(s,h,branch.id);promote(s,h,final.id);
    for(const slot of ['weapon','armor','accessory'])equip(s,h,craft(s,slot,h.classId,3).item.id);
    s.heroes=[h];
    for(const z of ZONES){h.zone=z.id;h.x=z.x;h.y=z.y;h.state='hunt';h.hp=statsOf(h,s).hp;
      for(let i=0;i<400;i++)tick(s,.1);
      assert.ok(Number.isFinite(h.hp),final.id);assert.ok(h.hp>=0,final.id);assert.ok(s.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)),final.id);
    }
  }
});
test('saved progression round-trips with equipment, costumes and skills intact',()=>{
  const s=rich(),h=s.heroes[0];h.level=20;promote(s,h,'berserker');h.costume.palette='crimson';equip(s,h,craft(s,'weapon',h.classId,1).item.id);
  const loaded=restore(serialize(s));assert.ok(loaded);assert.deepEqual(loaded.heroes,s.heroes);assert.deepEqual(loaded.inventory,s.inventory);assert.equal(restore('broken'),null);assert.equal(restore('{"version":90}'),null);
  for(let i=0;i<100;i++)tick(loaded,.1);assert.ok(loaded.time>0);
});
test('incomplete or unsafe imported saves are rejected instead of crashing the game',()=>{
  const s=createGame();delete s.heroes[0].buffs;assert.equal(restore(JSON.stringify(s)),null);
  const t=createGame();t.logs[0].message='<img src=x onerror=alert(1)>';assert.equal(restore(JSON.stringify(t)),null);
  const u=createGame();u.enemies[0].dots=null;assert.equal(restore(JSON.stringify(u)),null);
});
test('town standby parks a hero at the mart until reassigned and survives saves',()=>{
  const s=createGame(),h=s.heroes[0];
  assert.ok(assignZone(s,h,-1).ok);assert.equal(h.standby,true);assert.equal(h.state,'return');
  for(let i=0;i<600;i++)tick(s,.1);
  assert.equal(h.state,'recover');assert.ok(Math.hypot(h.x-MART.x,h.y-MART.y)<160);assert.ok(h.hp>=statsOf(h,s).hp-1);
  assert.equal(assignZone(s,h,-1).ok,false);
  assert.equal(restore(serialize(s)).heroes[0].standby,true);
  const legacy=JSON.parse(serialize(s));for(const x of legacy.heroes)delete x.standby;assert.equal(restore(JSON.stringify(legacy)).heroes[0].standby,false);
  assert.ok(assignZone(s,h,0).ok);assert.equal(h.standby,false);assert.equal(h.state,'depart');
  for(let i=0;i<50;i++)tick(s,.1);assert.notEqual(h.state,'recover');
});
