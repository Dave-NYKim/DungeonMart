import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,serialize,restore,statsOf} from '../src/engine.js';
import {POIS} from '../src/world.js';
test('souls travel before their clinic countdown and persist mid-journey',()=>{
 const s=createGame(),h=s.heroes[0],clinic=POIS.find(p=>p.id==='spring');
 h.state='dead';h.hp=0;h.recovery=12;h.x=clinic.x+400;h.y=clinic.y+12;h.pets=[];
 tick(s,.25);assert.equal(h.hp,0);assert.equal(h.recovery,12);assert.equal(h.soulAtClinic,false);assert.ok(h.x<clinic.x+400);
 const restored=restore(serialize(s));assert.ok(restored);const saved=restored.heroes[0];assert.equal(saved.state,'dead');assert.equal(saved.recovery,12);assert.equal(saved.x,h.x);
 for(let i=0;i<12;i++)tick(s,.25);assert.equal(h.soulAtClinic,true);assert.ok(h.recovery>10);assert.equal(h.hp,0);
 for(let i=0;i<35;i++)tick(s,.25);assert.equal(h.state,'dead');
 for(let i=0;i<14;i++)tick(s,.25);assert.notEqual(h.state,'dead');assert.equal(h.hp,statsOf(h,s).hp);
});

test('monster specials add damage and accelerate with difficulty',async()=>{
 const {spawnEnemy}=await import('../src/engine.js');const {skillsOf}=await import('../src/data.js');const losses=[];
 for(let tier=0;tier<3;tier++){
  const s=createGame(),h=s.heroes[0];s.heroes=[h];s.enemies=[];s.spawnCd=[999,999,999,999];
  const e=spawnEnemy(s,0,false,0);e.type='fallen';e.tier=tier;e.hp=e.maxHp=1e6;e.atk=10;e.cd=100;e.specialCd=0;e.fear=0;
  h.x=e.x;h.y=e.y;h.zone=0;h.state='hunt';h.attackCd=100;h.target=e.id;h.shield=0;h.buffs={};for(const sk of skillsOf(h))h.cooldowns[sk.id]=100;
  const hp=h.hp;tick(s,.1);losses.push(hp-h.hp);assert.equal(e.specialCd,[9,7.5,6][tier]);assert.ok(e._casting>0);
 }
 assert.ok(losses[0]>0);assert.ok(losses[1]>losses[0]);assert.ok(losses[2]>losses[1]);
});
