import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ACT_BOSS_COOLDOWN,actBossCooldownLeft,XP_RATE,zoneStats,bossStats,actProgress,availableZone,summonActBoss,summonBoss,finalBossUnlocked,tick,statsOf,serialize,restore,setDifficulty,restAtOasis} from '../src/engine.js';
import {ZONES} from '../src/data.js';
import {BOSS_LAIR,POIS,isWalkable,REGIONS,MART} from '../src/world.js';
import {moveEntity} from '../src/navigation.js';
function win(s,b){const h=s.heroes[0];b.hp=1;b.cd=b.specialCd=b.summonCd=999;h.hp=statsOf(h,s).hp;h.state='hunt';h.x=b.x;h.y=b.y+4;h.target=b.id;h.attackCd=0;h.buffs={};for(let i=0;i<5&&s.raid;i++)tick(s,.1);assert.equal(s.raid,null);}
test('act bosses gate each act and only final victory unlocks next difficulty stage',()=>{
 const s=createGame();s.treasury=10000;assert.deepEqual([0,1,2,3].map(z=>availableZone(s,z)),[true,false,false,false]);s.heroes[0].level=60;assert.equal(availableZone(s,3),false);assert.equal(summonBoss(s).ok,false);assert.equal(summonActBoss(s,1).ok,false);
 for(let z=0;z<4;z++){const r=summonActBoss(s,z);assert.ok(r.ok);assert.equal(r.boss.actBoss,z);assert.equal(summonActBoss(s,z).ok,false);assert.ok(restore(serialize(s))?.raid);win(s,r.boss);assert.equal(actProgress(s),z+1);assert.equal(s.difficulty.unlockedStage,1);}
 assert.ok(finalBossUnlocked(s));const final=summonBoss(s);assert.ok(final.ok);assert.ok(Math.hypot(final.boss.x-BOSS_LAIR.x,final.boss.y-BOSS_LAIR.y)<60);win(s,final.boss);assert.equal(s.difficulty.unlockedStage,2);assert.equal(s.bossKills,1);
 assert.ok(setDifficulty(s,0,2).ok);assert.equal(actProgress(s),0);assert.equal(summonBoss(s).ok,false);
});
test('all living states rally, dead heroes stay souls, and every act can reach northern arena',()=>{
 const s=createGame();s.campaign.clears['0:1']=4;s.treasury=10000;const states=['hunt','return','recover','depart','arrive'];
 for(let i=0;i<s.heroes.length;i++){const h=s.heroes[i];h.state=states[i%states.length];h.standby=true;h.hp=Math.max(1,statsOf(h,s).hp*.2);h.zone=i%4;h.x=REGIONS[h.zone].x;h.y=REGIONS[h.zone].y;}
 assert.ok(summonBoss(s).ok);assert.ok(s.heroes.every(h=>h.state==='depart'));tick(s,.1);assert.ok(s.heroes.every(h=>h.state!=='return'&&h.state!=='recover'));
 for(const pos of [MART,...REGIONS]){const e={x:pos.x,y:pos.y};let reached=false;for(let i=0;i<4000&&!reached;i++)reached=moveEntity(e,BOSS_LAIR,112,.1)||Math.hypot(e.x-BOSS_LAIR.x,e.y-BOSS_LAIR.y)<150;assert.ok(reached,`route ${pos.x},${pos.y}`);}
 assert.ok(isWalkable(BOSS_LAIR.x,BOSS_LAIR.y));
});
test('campaign migration preserves earned assets and validates progression',()=>{
 const s=createGame(),raw=JSON.parse(serialize(s));delete raw.campaign;raw.bossKills=1;const loaded=restore(JSON.stringify(raw));assert.ok(loaded);assert.equal(actProgress(loaded),4);assert.deepEqual(loaded.items,s.items);assert.equal(loaded.treasury,s.treasury);raw.bossKills=0;assert.equal(actProgress(restore(JSON.stringify(raw))),0);
 raw.campaign={clears:{'0:1':5}};assert.equal(restore(JSON.stringify(raw)),null);
});
test('oasis is a reachable healing destination, not an instant heal',()=>{
 const s=createGame(),h=s.heroes[0];s.campaign.clears['0:1']=1;h.hp=statsOf(h,s).hp*.5;const hp=h.hp;assert.ok(restAtOasis(s,h).ok);assert.equal(h.hp,hp);assert.equal(h.restStop,'oasis');const p=POIS.find(p=>p.id==='oasis');h.x=p.x;h.y=p.y+48;for(let i=0;i<30;i++)tick(s,.25);assert.ok(h.hp>hp);assert.ok(restore(serialize(s)));
});

test('reduced boss gold goes to treasury and only final participants receive personal gold',()=>{
 for(const [tier,mult]of [[0,1],[1,3],[2,8]]){
  const s=createGame();s.enemies=[];s.treasury=10000;Object.assign(s.difficulty,{tier,stage:1,unlocked:tier,unlockedStage:1});
  for(let z=0;z<4;z++){
   const before=s.treasury,gold=s.heroes.map(h=>h.gold),b=summonActBoss(s,z).boss;win(s,b);
   assert.equal(s.treasury-before,[25,40,55,70][z]*mult);assert.deepEqual(s.heroes.map(h=>h.gold),gold);
  }
  const b=summonBoss(s).boss,before=s.treasury,gold=s.heroes.map(h=>h.gold);win(s,b);
  assert.equal(s.treasury-before,200*mult);assert.equal(s.heroes[0].gold-gold[0],Math.floor(65*mult*2.5));
  for(let i=1;i<s.heroes.length;i++)assert.equal(s.heroes[i].gold,gold[i],'nonparticipants receive no personal bounty');
 }
});
test('a new game starts with one barbarian and no operating gold',()=>{
 const s=createGame();assert.deepEqual(s.heroes.map(h=>h.classId),['barbarian']);assert.equal(s.treasury,0);
});
test('monster XP is one tenth of the zone table',()=>{
 const s=createGame();assert.equal(XP_RATE,.1);for(let z=0;z<4;z++)assert.ok(Math.abs(zoneStats(s,z).xp-ZONES[z].xp*.1)<1e-9);
});
test('act bosses scale with party size and each act has a five-minute cooldown gold cannot reset',()=>{
 const s=createGame();assert.equal(bossStats(s).hp,30000);s.treasury=1e6;
 const b=summonActBoss(s,0).boss;assert.equal(b.maxHp,5400);win(s,b);
 const left=actBossCooldownLeft(s,0);assert.ok(left>ACT_BOSS_COOLDOWN-5&&left<=ACT_BOSS_COOLDOWN);assert.equal(summonActBoss(s,0).ok,false);
 const r=restore(serialize(s));assert.equal(actBossCooldownLeft(r,0),left);
 assert.ok(summonActBoss(s,1).ok,'other acts keep their own timers');
 s.raid=null;s.enemies=[];s.time+=left;assert.ok(summonActBoss(s,0).ok);
});
