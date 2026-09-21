import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,zoneStats,summonActBoss,xpNeeded,statsOf,serialize,restore,COMBAT_REVISION} from '../src/engine.js';

test('all 29 stage boundaries put ACT1 above previous ACT4, including act bosses',()=>{
 let previous;
 for(let tier=0;tier<3;tier++)for(let stage=1;stage<=10;stage++){
  const s=createGame();Object.assign(s.difficulty,{tier,stage,unlocked:2,unlockedStage:10});s.campaign.clears[`${tier}:${stage}`]=4;
  const first=zoneStats(s,0),last=zoneStats(s,3),boss1=summonActBoss(s,0).boss;s.raid=null;
  const boss4=summonActBoss(s,3).boss;
  if(previous)for(const key of ['hp','atk']){assert.ok(first[key]>previous.last[key]);assert.ok(boss1[key]>previous.boss4[key]);}
  previous={last,boss4};
 }
});
test('XP stays unchanged until level10 and accelerates sharply at 40; stat growth stays linear',()=>{
 for(let level=1;level<10;level++)assert.equal(xpNeeded({level}),Math.floor(35+level*17+level**1.45*3));
 assert.ok(xpNeeded({level:10})>xpNeeded({level:9})*4);
 assert.ok(xpNeeded({level:40})>xpNeeded({level:39})*14);
 for(let level=11;level<100;level++){assert.ok(xpNeeded({level})>xpNeeded({level:level-1})*1.2);assert.ok(Number.isSafeInteger(xpNeeded({level})));}
 const s=createGame(),h=s.heroes[0],at=level=>{h.level=level;return statsOf(h,s);};
 const a=at(10),b=at(11),c=at(90),d=at(91);
 for(const key of ['atk','def','hp'])assert.ok(Math.abs((b[key]-a[key])-(d[key]-c[key]))<1e-8);
});
test('combat migration preserves hero progress and enemy health percentage',()=>{
 const s=createGame();s.difficulty={tier:1,stage:1,unlocked:1,unlockedStage:1,lockedUntil:0};s.campaign.clears['1:1']=4;
 const b=summonActBoss(s,0).boss;b.hp=b.maxHp*.4;s.heroes[0].level=60;s.heroes[0].xp=12345;s.combatRevision=1;
 const r=restore(serialize(s));assert.ok(r);assert.equal(r.combatRevision,COMBAT_REVISION);assert.equal(r.heroes[0].level,60);assert.equal(r.heroes[0].xp,12345);assert.ok(Math.abs(r.enemies.find(e=>e.id===b.id).hp/r.enemies.find(e=>e.id===b.id).maxHp-.4)<1e-10);
});
