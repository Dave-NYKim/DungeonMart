import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, ZONES, skillsOf, DIFFICULTIES } from '../src/data.js';
import { createGame, tick, craft, autoPlace, placeItem, unplaceItem, salvage, promote, recruit, assignZone, statsOf, serialize, restore, upgradeSkill, resetSkills, upgradeMart, summonBoss, RAID_COST, RAID_DURATION, SPIN, facingTo, spawnEnemy, settleOffline, OFFLINE, setDifficulty, zoneStats, DIFFICULTY_LOCK, storeItem, pickupFieldDrop, warehouseUsed, warehouseCapacity, resetRaidCooldown, raidResetCost, raidCooldownLeft } from '../src/engine.js';
import { BASES, effectiveGrid, generateItem, GRADES } from '../src/items.js';
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
  const r=craft(s,weaponFor(h),1,()=>.5);assert.ok(r.ok,r.message);assert.equal(s.materials.iron,9992);assert.ok(s.warehouse.includes(r.item.id));
  const before=s.treasury,price=r.item.price;assert.ok(price>0);assert.ok(autoPlace(s,h,r.item.id).ok);assert.equal(h.gold,100-price);assert.equal(s.treasury,before+price);assert.ok(statsOf(h,s).atk>startAtk);
  const p=h.placed[0];assert.ok(placeItem(s,h,r.item.id,p.zone,p.x,p.y,p.rotated).ok);assert.equal(h.gold,100-price);assert.equal(s.treasury,before+price);
  assert.equal(salvage(s,r.item.id).ok,false);
  assert.ok(unplaceItem(s,h,r.item.id).ok);assert.ok(statsOf(h,s).atk<=startAtk+.001);assert.ok(salvage(s,r.item.id).ok);assert.ok(s.materials.iron>9992);
});
test('owned shared armor transfers between heroes without charging twice',()=>{
  const s=rich(),a=s.heroes[0],b=s.heroes[1],item=craft(s,'leather',1,()=>.5).item;
  assert.ok(autoPlace(s,a,item.id).ok);const bank=s.treasury,bGold=b.gold;
  assert.ok(autoPlace(s,b,item.id).ok);assert.equal(a.placed.length,0);assert.equal(b.placed[0].id,item.id);assert.equal(b.gold,bGold);assert.equal(s.treasury,bank);
});
test('invalid or unaffordable transactions leave state unchanged',()=>{
  const s=createGame();s.materials.iron=0;const before=s.materials.iron;assert.equal(craft(s,'axe2h').ok,false);assert.equal(s.materials.iron,before);assert.equal(craft(s,'nope').ok,false);
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
    for(const base of [weaponFor(h),'chain','amulet'])assert.ok(autoPlace(s,h,craft(s,base).item.id).ok);
    s.heroes=[h];
    for(const z of ZONES){h.zone=z.id;h.x=z.x;h.y=z.y;h.state='hunt';h.hp=statsOf(h,s).hp;
      for(let i=0;i<400;i++)tick(s,.1);
      assert.ok(Number.isFinite(h.hp),final.id);assert.ok(h.hp>=0,final.id);assert.ok(s.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)),final.id);
    }
  }
});
test('saved progression round-trips with equipment, costumes and skills intact',()=>{
  const s=rich(),h=s.heroes[0];h.level=20;promote(s,h,'berserker');h.costume.palette='crimson';autoPlace(s,h,craft(s,weaponFor(h),1,()=>.5).item.id);
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
test('boss dark spin turns through all eight facings and beams heroes standing in each direction',()=>{
  const s=createGame();s.treasury=10000;for(const h of s.heroes){h.level=40;h.hp=statsOf(h,s).hp;}
  const boss=summonBoss(s).boss;boss.hp=boss.maxHp=5e6;boss.cd=boss.specialCd=boss.summonCd=99;
  assert.equal(facingTo({x:0,y:0},{x:0,y:10}),0);assert.equal(facingTo({x:0,y:0},{x:-10,y:0}),2);assert.equal(facingTo({x:0,y:0},{x:0,y:-10}),4);assert.equal(facingTo({x:0,y:0},{x:10,y:0}),6);assert.equal(facingTo({x:0,y:0},{x:10,y:10}),7);
  const south=s.heroes[0],east=s.heroes[1],far=s.heroes[2];
  for(const [h,dx,dy] of [[south,0,120],[east,120,0],[far,0,SPIN.range+80]]){h.state='hunt';h.x=boss.x+dx;h.y=boss.y+dy;h.hp=statsOf(h,s).hp;}
  boss.spinCd=0;tick(s,.05);
  assert.ok(boss.spin,'spin starts when its cooldown expires');assert.equal(boss.facing,0);assert.ok(south.hp<statsOf(south,s).hp,'the south beam hits the hero standing south');
  assert.equal(east.hp,statsOf(east,s).hp,'the east hero is untouched by the south beam');assert.ok(south.buffs.weaken>0,'dark magic weakens');
  const seen=new Set([boss.facing]),eastHp=east.hp;for(let i=0;i<60&&boss.spin;i++){tick(s,.05);seen.add(boss.facing);}
  assert.equal(boss.spin,null,'spin ends after eight steps');assert.deepEqual([...seen].sort(),[0,1,2,3,4,5,6,7]);assert.ok(east.hp<eastHp,'the east beam hits the east hero');
  assert.equal(far.hp,statsOf(far,s).hp,'heroes beyond the beam range are safe');assert.ok(boss.spinCd>SPIN.cooldown-5,'cooldown restarts');
  const loaded=restore(serialize(s)),lb=loaded.enemies.find(e=>e.boss);assert.ok(Number.isInteger(lb.facing)&&lb.spin===null);
  const broken=JSON.parse(serialize(s));const bb=broken.enemies.find(e=>e.boss);bb.facing=42;bb.spin={bogus:true};const fixed=restore(JSON.stringify(broken)).enemies.find(e=>e.boss);assert.equal(fixed.facing,0);assert.equal(fixed.spin,null);
});
test('boss summon pulls every hero into ACT IV, rewards the party on the kill and restores assignments',()=>{
  const s=createGame();s.treasury=10000;s.heroes[1].zone=1;assignZone(s,s.heroes[2],-1);
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
test('offline settlement pays materials from the measured return rate, capped and never during a raid',()=>{
  const s=createGame();
  assert.equal(settleOffline(s,Date.now()-3600e3),null,'no measured income yet means nothing to pay');
  for(let i=0;i<6000;i++)tick(s,.1);
  const rate=s.yield.rate;assert.ok(rate.iron>0,'ten minutes of hunting measures an iron rate');
  const before={...s.materials},since=Date.now()-2*3600e3,r=settleOffline(s,since);
  assert.ok(r&&r.gained.iron>0);assert.equal(r.gained.iron,Math.floor(rate.iron*120*OFFLINE.efficiency));assert.equal(s.materials.iron,before.iron+r.gained.iron);assert.equal(r.capped,false);
  const capped=settleOffline(s,Date.now()-40*3600e3);assert.ok(capped.capped);assert.equal(capped.gained.iron,Math.floor(rate.iron*(OFFLINE.capSeconds/60)*OFFLINE.efficiency));
  assert.equal(settleOffline(s,Date.now()-30e3),null,'under a minute is ignored');
  s.treasury=5000;assert.ok(summonBoss(s).ok);assert.equal(settleOffline(s,since),null,'no payout during a raid');
  const legacy=JSON.parse(serialize(s));delete legacy.yield;delete legacy.raid;const loaded=restore(JSON.stringify(legacy));assert.ok(loaded);assert.deepEqual(loaded.yield.rate,{iron:0,crystal:0,soul:0});assert.ok(typeof loaded.savedAt==='number');
});
test('difficulty ladder: stages climb, nightmare 1 beats normal 10, acts stay close, boss kills unlock tiers, changes lock for five minutes',()=>{
  const s=createGame();
  const n1=zoneStats(s,0).hp;s.difficulty.stage=10;const n10=zoneStats(s,0).hp;s.difficulty.stage=1;
  assert.ok(n10>n1*7&&n10<n1*8,'stage ten is roughly 7.45x stage one');
  assert.ok(zoneStats(s,3).hp/zoneStats(s,0).hp<=2.5&&zoneStats(s,3).hp>zoneStats(s,0).hp,'ACT IV is stronger than ACT I but not wildly');
  assert.equal(setDifficulty(s,1,1).ok,false,'nightmare is locked until the normal boss dies');
  assert.equal(setDifficulty(s,0,10).ok,false,'cannot skip normal stages');
  s.treasury=100000;for(const h of s.heroes){h.level=40;h.hp=statsOf(h,s).hp;}
  for(let tier=0;tier<3;tier++)for(let stage=1;stage<=10;stage++){
    assert.equal(s.difficulty.tier,tier);assert.equal(s.difficulty.stage,stage);
    s.raidReadyAt=0;const r=summonBoss(s);assert.ok(r.ok);r.boss.hp=1;r.boss.contributors[s.heroes[0].id]=1;
    for(let i=0;i<200&&s.raid;i++)tick(s,.1);assert.equal(s.raid,null);
    const nextTier=stage===10?Math.min(2,tier+1):tier,nextStage=stage===10?(tier===2?10:1):stage+1;
    assert.equal(s.difficulty.unlocked,nextTier);assert.equal(s.difficulty.unlockedStage,nextStage);
    if(tier===2&&stage===10)break;
    s.time+=DIFFICULTY_LOCK;assert.ok(setDifficulty(s,nextTier,nextStage).ok);
    assert.equal(setDifficulty(s,0,1).ok,false,'changes lock for five minutes');
  }
  s.time+=DIFFICULTY_LOCK;assert.ok(setDifficulty(s,1,1).ok);
  const nm1=zoneStats(s,0).hp;assert.ok(nm1>n10*1.5,'nightmare 1 is far above normal 10');
  const e=spawnEnemy(s,0);assert.equal(e.tier,1);assert.ok(e.maxHp>n10);
  const loaded=restore(serialize(s));assert.deepEqual(loaded.difficulty,s.difficulty);assert.equal(loaded.enemies.find(x=>x.id===e.id).tier,1);
  const legacy=JSON.parse(serialize(s));delete legacy.difficulty;for(const x of legacy.enemies)delete x.tier;const l2=restore(JSON.stringify(legacy));assert.deepEqual(l2.difficulty,{tier:0,stage:1,unlocked:0,unlockedStage:1,lockedUntil:0});assert.ok(l2.enemies.every(x=>x.tier===0));
  const bad=JSON.parse(serialize(s));bad.difficulty.tier=2;bad.difficulty.unlocked=1;assert.equal(restore(JSON.stringify(bad)),null,'tier above unlocked is rejected');
});
test('set and unique items are never auto-salvaged: common gear makes room, otherwise the light pillar stays',()=>{
  const s=createGame();const mk=(grade,ilvl=20)=>{const it=generateItem({ilvl,grade,kind:'elite',classId:'barbarian',findPct:0,pity:0,codex:s.codex});it.id=`i${s.nextId++}`;s.items[it.id]=it;return it;};
  while(warehouseUsed(s)<warehouseCapacity(s)){const it=mk('normal',5);s.warehouse.push(it.id);}
  const normalsBefore=s.warehouse.filter(id=>s.items[id].grade==='normal').length,setItem=mk('set');s.fieldDrops.push({id:setItem.id,zone:0,x:MART.x,y:MART.y,expires:s.time+300});
  const r=pickupFieldDrop(s,setItem.id);assert.ok(r.ok,r.message);assert.ok(s.warehouse.includes(setItem.id),'set item lands in the warehouse');assert.ok(s.warehouse.filter(id=>s.items[id].grade==='normal').length<normalsBefore,'cheap gear was salvaged to make room');assert.ok(s.warehouse.every(id=>s.items[id]),'no dangling ids');
  // a warehouse full of set items cannot make room: the pillar must survive instead of being destroyed
  const t=createGame();t.warehouse=[];while(warehouseUsed(t)<warehouseCapacity(t)){const it=generateItem({ilvl:20,grade:'set',kind:'elite',classId:'barbarian',findPct:0,pity:0,codex:t.codex});it.id=`i${t.nextId++}`;t.items[it.id]=it;t.warehouse.push(it.id);}
  const extra=generateItem({ilvl:20,grade:'unique',kind:'elite',classId:'barbarian',findPct:0,pity:0,codex:t.codex});extra.id='iX';t.items.iX=extra;t.fieldDrops.push({id:'iX',zone:0,x:MART.x,y:MART.y,expires:t.time+1});
  assert.equal(pickupFieldDrop(t,'iX').ok,false);assert.ok(t.fieldDrops.some(d=>d.id==='iX'),'pillar remains on the map');
  tick(t,.1);tick(t,1);assert.ok(t.fieldDrops.some(d=>d.id==='iX')&&t.items.iX,'expiry keeps a protected item instead of destroying it');
});
test('new and existing games use fixed 2x speed without losing progress',()=>{
  const s=createGame();assert.equal(s.speed,2);s.treasury=1234;
  for(const speed of [1,2,4,undefined]){s.speed=speed;const restored=restore(serialize(s));assert.equal(restored.speed,2);assert.equal(restored.treasury,1234);}
});
test('legacy difficulty keeps current progress and previously unlocked tiers',()=>{
  for(const [tier,stage,unlocked] of [[0,7,0],[0,5,1],[1,8,1],[2,10,2]]){
    const s=createGame();s.difficulty={tier,stage,unlocked,lockedUntil:0};
    const loaded=restore(serialize(s));assert.ok(loaded);assert.equal(loaded.difficulty.stage,stage);
    assert.equal(loaded.difficulty.unlockedStage,tier===unlocked?stage:1);
    assert.equal(restore(serialize(loaded)).difficulty.unlockedStage,loaded.difficulty.unlockedStage);
  }
});
test('boss cooldown can be reset for gold priced by the remaining minutes',()=>{
  const s=createGame();s.treasury=5000;for(const h of s.heroes){h.level=40;h.hp=statsOf(h,s).hp;}assert.ok(summonBoss(s).ok);const boss=s.enemies.find(e=>e.boss);boss.hp=1;boss.contributors[s.heroes[0].id]=1;for(let i=0;i<200&&s.raid;i++)tick(s,.1);
  const left=raidCooldownLeft(s);assert.ok(left>0);assert.equal(raidResetCost(s),Math.ceil(left/60)*100);
  s.treasury=10;assert.equal(resetRaidCooldown(s).ok,false);s.treasury=5000;const cost=raidResetCost(s),before=s.treasury;assert.ok(resetRaidCooldown(s).ok);assert.equal(s.treasury,before-cost);assert.equal(raidCooldownLeft(s),0);assert.equal(resetRaidCooldown(s).ok,false,'nothing to reset');
});

test('boss difficulty depends on stage and roster size rather than hero levels or gear',async()=>{
 const {bossStats}=await import('../src/engine.js');
 const s=createGame(),first=bossStats(s);for(const h of s.heroes)h.level=60;assert.deepEqual(bossStats(s),first);
 s.difficulty.stage=10;const n10=bossStats(s);assert.ok(n10.hp>first.hp*7);assert.ok(n10.atk>first.atk*3);
 s.difficulty.tier=1;s.difficulty.stage=1;const nightmare=bossStats(s);assert.ok(nightmare.hp>n10.hp*2);assert.ok(nightmare.atk>n10.atk*2);
 s.heroes.push(...s.heroes.map(h=>({...h})));assert.equal(bossStats(s).hp,nightmare.hp*2);assert.equal(bossStats(s).atk,nightmare.atk);
});
test('old combat saves update enemies and bosses while preserving damage and progression',async()=>{
 const {bossStats,COMBAT_REVISION}=await import('../src/engine.js');
 const s=createGame();s.treasury=5000;const e=spawnEnemy(s,0);const b=summonBoss(s).boss;
 const raw=JSON.parse(serialize(s));delete raw.combatRevision;
 const oldEnemy=raw.enemies.find(x=>x.id===e.id),oldBoss=raw.enemies.find(x=>x.id===b.id);oldEnemy.maxHp=100;oldEnemy.hp=50;oldBoss.maxHp=200;oldBoss.hp=50;
 const loaded=restore(JSON.stringify(raw));assert.ok(loaded);assert.equal(loaded.combatRevision,COMBAT_REVISION);
 const mob=loaded.enemies.find(x=>x.id===e.id),boss=loaded.enemies.find(x=>x.id===b.id);
 assert.equal(mob.hp/mob.maxHp,.5);assert.equal(boss.hp/boss.maxHp,.25);assert.equal(boss.maxHp,bossStats(loaded).hp);
 assert.equal(loaded.treasury,s.treasury);assert.deepEqual(loaded.difficulty,s.difficulty);assert.equal(loaded.raid.ends,s.raid.ends);
 const again=restore(serialize(loaded));assert.equal(again.enemies.find(x=>x.id===b.id).hp,boss.hp);
 raw.combatRevision=99;assert.equal(restore(JSON.stringify(raw)),null);
});
test('level sixty alone cannot defeat nightmare one boss within the raid limit',(t)=>{
 let seed=37;t.mock.method(Math,'random',()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});
 const s=createGame();s.treasury=1000;s.difficulty={tier:1,stage:1,unlocked:1,unlockedStage:1,lockedUntil:0};
 for(const h of s.heroes){h.level=60;h.hp=statsOf(h,s).hp;}
 const b=summonBoss(s).boss;for(const [i,h]of s.heroes.entries()){h.x=b.x+20+i*2;h.y=b.y+20;h.zone=3;h.state='hunt';}
 for(let i=0;i<2401&&s.raid;i++)tick(s,.1);
 assert.equal(s.bossKills,0);assert.equal(s.raid,null);assert.ok(b.hp>b.maxHp*.5);
});
