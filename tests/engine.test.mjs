import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, ZONES, skillsOf } from '../src/data.js';
import { createGame, tick, craft, autoPlace, placeItem, unplaceItem, salvage, promote, recruit, assignZone, statsOf, serialize, restore, upgradeSkill, resetSkills, upgradeMart, summonBoss, RAID_COST, RAID_DURATION, spawnEnemy } from '../src/engine.js';
import { BASES, effectiveGrid } from '../src/items.js';
// 용사의 무기칸에 들어가면서 직업이 쓸 수 있는 가장 큰 무기 베이스
const weaponFor = h => { const g = effectiveGrid(h).weapon; return Object.values(BASES).filter(b => b.kind === 'weapon' && (!b.classes || b.classes.includes(h.classId)) && ((b.w <= g.w && b.h <= g.h) || (b.h <= g.w && b.w <= g.h))).sort((a, b) => b.w * b.h - a.w * a.h)[0].key; };
import { MART, CAMPS, REGIONS, regionAt } from '../src/world.js';
const rich = () => {const s=createGame();s.materials={iron:10000,crystal:10000,soul:10000};s.treasury=10000;return s;};
test('automatic hunting yields XP, personal gold, shared materials and return trips',()=>{
  const s=createGame();for(let i=0;i<3000;i++)tick(s,.1);
  assert.ok(s.kills>30);assert.ok(s.materials.iron>48);assert.ok(s.heroes.every(h=>h.level>1));
  for(const h of s.heroes){assert.ok(Number.isFinite(h.hp));assert.ok(h.hp>=0);assert.ok(h.hp<=statsOf(h,s).hp);assert.ok(h.gold>100);}
  assert.ok(s.logs.some(l=>l.message.includes('귀환')));
});
test('crafting consumes materials and first placement purchases exactly once',()=>{
  const s=rich(),h=s.heroes[0],startAtk=statsOf(h,s).atk;
  const r=craft(s,weaponFor(h),'normal');assert.ok(r.ok,r.message);assert.equal(s.materials.iron,9992);assert.ok(s.warehouse.includes(r.item.id));
  const before=s.treasury,price=r.item.price;assert.ok(price>0);assert.ok(autoPlace(s,h,r.item.id).ok);assert.equal(h.gold,100-price);assert.equal(s.treasury,before+price);assert.ok(statsOf(h,s).atk>startAtk);
  const p=h.placed[0];assert.ok(placeItem(s,h,r.item.id,p.zone,p.x,p.y,p.rotated).ok);assert.equal(h.gold,100-price);assert.equal(s.treasury,before+price);
  assert.equal(salvage(s,r.item.id).ok,false);
  assert.ok(unplaceItem(s,h,r.item.id).ok);assert.ok(statsOf(h,s).atk<=startAtk+.001);assert.ok(salvage(s,r.item.id).ok);assert.ok(s.materials.iron>9992);
});
test('owned shared armor transfers between heroes without charging twice',()=>{
  const s=rich(),a=s.heroes[0],b=s.heroes[1],item=craft(s,'leather','normal').item;
  assert.ok(autoPlace(s,a,item.id).ok);const bank=s.treasury,bGold=b.gold;
  assert.ok(autoPlace(s,b,item.id).ok);assert.equal(a.placed.length,0);assert.equal(b.placed[0].id,item.id);assert.equal(b.gold,bGold);assert.equal(s.treasury,bank);
});
test('invalid or unaffordable transactions leave state unchanged',()=>{
  const s=createGame();s.materials.iron=0;const before=s.materials.iron;assert.equal(craft(s,'axe2h','rare').ok,false);assert.equal(s.materials.iron,before);assert.equal(craft(s,'nope','normal').ok,false);
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
    for(const base of [weaponFor(h),'chain','amulet'])assert.ok(autoPlace(s,h,craft(s,base,'rare').item.id).ok);
    s.heroes=[h];
    for(const z of ZONES){h.zone=z.id;h.x=z.x;h.y=z.y;h.state='hunt';h.hp=statsOf(h,s).hp;
      for(let i=0;i<400;i++)tick(s,.1);
      assert.ok(Number.isFinite(h.hp),final.id);assert.ok(h.hp>=0,final.id);assert.ok(s.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)),final.id);
    }
  }
});
test('saved progression round-trips with equipment, costumes and skills intact',()=>{
  const s=rich(),h=s.heroes[0];h.level=20;promote(s,h,'berserker');h.costume.palette='crimson';autoPlace(s,h,craft(s,weaponFor(h),'magic').item.id);
  const loaded=restore(serialize(s));assert.ok(loaded);assert.deepEqual(JSON.parse(serialize(loaded)).heroes,JSON.parse(serialize(s)).heroes);assert.deepEqual(loaded.items,s.items);assert.deepEqual(loaded.warehouse,s.warehouse);assert.equal(restore('broken'),null);assert.equal(restore('{"version":90}'),null);
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
test('boss summon pulls every hero into ACT IV, rewards the party on the kill and restores assignments',()=>{
  const s=createGame();s.heroes[1].zone=1;assignZone(s,s.heroes[2],-1);
  for(const h of s.heroes){h.level=40;h.hp=statsOf(h,s).hp;}
  const before=s.treasury,r=summonBoss(s);assert.ok(r.ok);r.boss.hp=r.boss.maxHp=5e6;assert.equal(s.treasury,before-RAID_COST);assert.ok(r.boss.boss);assert.equal(r.boss.zone,3);assert.ok(regionAt(r.boss.x,r.boss.y)?.zone===3);
  assert.equal(summonBoss(s).ok,false);
  for(let i=0;i<900;i++)tick(s,.1);
  const boss=s.enemies.find(e=>e.boss);assert.ok(boss,'boss persists until killed or timed out');
  assert.ok(s.heroes.every(h=>h.state!=='hunt'||Math.hypot(h.x-boss.x,h.y-boss.y)<400),'hunting heroes stay on the boss');assert.ok(Object.keys(boss.contributors).length>=3,'most of the party has engaged the boss');
  assert.ok(boss.hp<boss.maxHp,'the party damages the boss');assert.ok(s.heroes.some(h=>boss.contributors[h.id]>0));
  const loaded=restore(serialize(s));assert.ok(loaded.raid&&loaded.enemies.some(e=>e.boss),'raid survives a save round trip');
  boss.hp=1;const striker=s.heroes.find(h=>h.state==='hunt')||s.heroes[0];boss.contributors[striker.id]=1;const gold=striker.gold,soul=striker.bag.soul;
  for(let i=0;i<300&&s.raid;i++)tick(s,.1);
  assert.equal(s.raid,null);assert.equal(s.bossKills,1);assert.ok(!s.enemies.some(e=>e.boss||e.minion));assert.ok(striker.gold>gold&&striker.bag.soul>=soul+3);
  assert.equal(s.heroes[1].zone,1);assert.equal(s.heroes[2].standby,true);
  const t=createGame();summonBoss(t);t.time=RAID_DURATION+5;tick(t,.1);assert.equal(t.raid,null,'timeout ends the raid');assert.ok(!t.enemies.some(e=>e.boss));
  const broken=JSON.parse(serialize(s));broken.raid={bossId:'e999',started:0,ends:10};assert.equal(restore(JSON.stringify(broken)).raid,null,'raid without a boss is dropped');
});
test('spawn camps cover each act instead of one cluster',()=>{
  for(const r of REGIONS){const camps=CAMPS.filter(c=>c.zone===r.zone);assert.ok(camps.length>=6,r.id);assert.ok(camps.every(c=>regionAt(c.x,c.y)===r));
    const xs=camps.map(c=>c.x),ys=camps.map(c=>c.y);assert.ok(Math.max(...xs)-Math.min(...xs)>r.rx&&Math.max(...ys)-Math.min(...ys)>r.ry*.9,r.id+' spread');}
  const s=createGame();for(let i=0;i<60;i++)spawnEnemy(s,0);const xs=s.enemies.map(e=>e.x);assert.ok(Math.max(...xs)-Math.min(...xs)>600,'packs spawn across the act');
});
