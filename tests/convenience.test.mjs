import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,makeHero,randomCraft,craft,autoPlace,statsOf,gearBonus,recruit,replaceHero,serialize,restore,tick,bossStats} from '../src/engine.js';
import {autoEquip,equipmentScore} from '../src/auto-equip.js';
import {skillsOf} from '../src/data.js';
import {BASES,activation} from '../src/items.js';
const game=()=>{const s=createGame();s.materials.iron=10000;s.treasury=10000;s.heroes[0].gold=100000;return s;};
const snapshot=s=>JSON.stringify(JSON.parse(serialize(s)),(k,v)=>k==='savedAt'?undefined:v);
const plain=(s,base)=>craft(s,base,1,()=>.5).item;
test('one-tap crafting reaches every base and unlocked tier for the displayed fixed price',()=>{
 const keys=Object.keys(BASES),seen=new Set();
 for(const forge of [0,2,4])for(let n=0;n<keys.length;n++){
  const s=game();s.upgrades.forge=forge;let calls=0;const rolls=[(n+.1)/keys.length,.999,.95];
  const before=s.materials.iron,r=randomCraft(s,()=>rolls[calls++]??.5);assert.ok(r.ok);assert.equal(r.item.base,keys[n]);
  assert.equal(r.item.tier,forge===4?3:forge===2?2:1);assert.equal(before-s.materials.iron,8);assert.equal(r.item.grade,'rare');seen.add(r.item.base);
 }assert.equal(seen.size,keys.length);
 const s=game();s.materials.iron=7;const before=snapshot(s);assert.equal(randomCraft(s).ok,false);assert.equal(snapshot(s),before);
});
test('auto equip upgrades full slots, preserves removed items and never buys twice',()=>{
 const s=game(),h=s.heroes[0];h.grid.weapon={w:1,h:3};const old=plain(s,'sword1h');assert.ok(autoPlace(s,h,old.id).ok);
 const better=plain(s,'axe1h');better.implicit={atk:100};s.itemRev++;const before=equipmentScore(h,s),gold=h.gold;
 const r=autoEquip(s,h);assert.equal(r.changed,1);assert.ok(equipmentScore(h,s)>before);assert.ok(h.placed.some(p=>p.id===better.id));assert.ok(s.warehouse.includes(old.id));assert.equal(gold-h.gold,better.price);
 const again=autoEquip(s,h);assert.equal(again.changed,0);assert.equal(gold-h.gold,better.price);assert.ok(restore(serialize(s)));
});
test('auto equip respects level, class, affordability and two-handed activation',()=>{
 const s=game(),h=s.heroes[0];h.grid.weapon={w:2,h:4};
 const plate=plain(s,'plate'),staff=plain(s,'staff'),axe=plain(s,'axe2h');axe.implicit={atk:100};
 s.upgrades.forge=4;const high=craft(s,'sword1h',3,()=>.5).item;
 h.gold=0;assert.equal(autoEquip(s,h).changed,0);h.gold=10000;autoEquip(s,h);
 assert.ok(h.placed.some(p=>p.id===axe.id));for(const i of [plate,staff,high])assert.ok(s.warehouse.includes(i.id));
 assert.ok([...activation(h,s.items).values()].every(a=>a.active));assert.ok(statsOf(h,s).load<=1.5);
});
test('full warehouse permits a one-for-one swap but no item loss',()=>{
 const s=game(),h=s.heroes[0];h.grid.weapon={w:1,h:3};const old=plain(s,'sword1h');autoPlace(s,h,old.id);
 const better=plain(s,'axe1h');better.implicit={atk:200};while(s.warehouse.length<80)plain(s,'staff');
 const count=Object.keys(s.items).length;assert.equal(randomCraft(s).ok,false);autoEquip(s,h);
 assert.equal(s.warehouse.length,80);assert.equal(Object.keys(s.items).length,count);assert.ok(s.warehouse.includes(old.id));assert.ok(restore(serialize(s)));
});
test('plate is paladin-only, including manual placement, and legacy equipment returns intact',()=>{
 const s=game(),h=s.heroes[0],plate=plain(s,'plate');assert.equal(autoPlace(s,h,plate.id).ok,false);
 const p=makeHero(s,'paladin');p.gold=1000;s.heroes.push(p);assert.ok(autoPlace(s,p,plate.id).ok);
 p.classId='barbarian';const loaded=restore(serialize(s));assert.ok(loaded);assert.ok(loaded.warehouse.includes(plate.id));assert.equal(loaded.items[plate.id].purchased,true);assert.equal(loaded.heroes[1].placed.length,0);
});
test('ten active heroes, extra recruits wait without simulation or boss scaling',()=>{
 const s=game();while(s.heroes.length<10)assert.ok(recruit(s).ok);const hp=bossStats(s).hp;
 const r=recruit(s);assert.equal(r.waiting,true);assert.equal(s.heroes.length,10);assert.equal(s.reserve.length,1);assert.equal(bossStats(s).hp,hp);
 const before=JSON.stringify(s.reserve);tick(s,.1);assert.equal(JSON.stringify(s.reserve),before);const restored=restore(serialize(s));assert.ok(restored);assert.equal(restored.reserve[0].id,r.hero.id);
});
test('legacy rosters move overflow into reserve with their equipment and growth intact',()=>{
 const s=game();for(let i=1;i<15;i++)s.heroes.push(makeHero(s,'barbarian'));
 const last=s.heroes.at(-1);last.level=42;last.gold=1000;const item=plain(s,'sword1h');assert.ok(autoPlace(s,last,item.id).ok);
 delete s.reserve;const restored=restore(serialize(s));assert.ok(restored);assert.equal(restored.heroes.length,10);assert.equal(restored.reserve.length,5);assert.equal(restored.reserve.at(-1).level,42);assert.equal(restored.reserve.at(-1).placed[0].id,item.id);assert.ok(restore(serialize(restored)));
});
test('replacement retires outgoing hero, transfers growth and money, refunds skills and preserves gear',()=>{
 const s=game(),old=s.heroes[0];old.level=30;old.xp=123;old.skillPoints=25;old.skillRanks={[skillsOf(old)[0].id]:3};old.skillPoints=26;
 const item=plain(s,'sword1h');autoPlace(s,old,item.id);const incoming=makeHero(s,'paladin');s.reserve.push(incoming);const gold=old.gold+incoming.gold;
 const r=replaceHero(s,old.id,incoming.id);assert.ok(r.ok);assert.equal(s.heroes[0].id,incoming.id);assert.equal(s.reserve.length,0);assert.equal(incoming.level,30);assert.equal(incoming.xp,123);assert.equal(incoming.gold,gold);assert.equal(incoming.skillPoints,29);assert.deepEqual(incoming.path,[]);assert.ok(s.warehouse.includes(item.id));assert.ok(restore(serialize(s)));
});
test('replacement is atomic when storage is full or a boss fight is active',()=>{
 const s=game(),h=s.heroes[0],item=plain(s,'sword1h');autoPlace(s,h,item.id);const incoming=makeHero(s,'paladin');s.reserve.push(incoming);
 while(s.warehouse.length<80)plain(s,'ring');const before=snapshot(s);assert.equal(replaceHero(s,h.id,incoming.id).ok,false);assert.equal(snapshot(s),before);
 s.warehouse.pop();s.raid={};assert.equal(replaceHero(s,h.id,incoming.id).ok,false);assert.equal(s.heroes[0].id,h.id);
});

test('legacy barbarian set plate becomes chain while preserving rolled stats and inserts',()=>{
 const s=game(),h=s.heroes[0],item=plain(s,'plate');item.grade='set';item.setId='mountain';item.setIndex=2;item.name='산맥의 아들의 판금 갑옷';item.sockets=1;item.inserts=['gem:ruby:0'];
 const before={...item.implicit};const loaded=restore(serialize(s));assert.ok(loaded);const migrated=loaded.items[item.id];assert.equal(migrated.base,'chain');assert.ok(migrated.name.includes('사슬'));assert.deepEqual(migrated.implicit,before);assert.deepEqual(migrated.inserts,item.inserts);
});
