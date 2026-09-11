import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, HERO_GRADES } from '../src/data.js';
import { createGame, recruit, statsOf, tick, setSpawnRate, serialize, restore } from '../src/engine.js';
test('random recruitment independently reaches all classes and grades, charges once and scales base stats',()=>{
 const s=createGame();s.treasury=10000;const random=Math.random;
 try {for(let i=0;i<5;i++)for(let g=0;g<4;g++){
  const rolls=[(i+.5)/5,HERO_GRADES.slice(0,g).reduce((v,x)=>v+x.chance,0)+.001];Math.random=()=>rolls.shift()??.5;
  const before=s.treasury,r=recruit(s);assert.ok(r.ok);assert.equal(r.hero.classId,CLASSES[i].id);assert.equal(r.hero.grade,g);assert.equal(s.treasury,before-120);
  const normal={...r.hero,grade:0};for(const key of ['hp','atk','def'])assert.equal(statsOf(r.hero,s)[key],statsOf(normal,s)[key]*HERO_GRADES[g].multiplier);
  assert.equal(r.hero.hp,statsOf(r.hero,s).hp);s.heroes.pop();
 }}finally{Math.random=random;}
});
test('act respawn multipliers independently shorten refill time without accelerating world time',()=>{
 const s=createGame();s.heroes=[];s.enemies=[];s.spawnCd=[1.8,1.8,1.8,1.8];
 [1,2,3,5].forEach((v,i)=>assert.ok(setSpawnRate(s,i,v).ok));
 for(let i=0;i<4;i++)tick(s,.1);
 assert.equal(s.enemies.filter(e=>e.zone===3).length,1);assert.equal(s.enemies.filter(e=>e.zone!==3).length,0);assert.equal(s.time,.4);
 assert.equal(setSpawnRate(s,0,6).ok,false);assert.equal(setSpawnRate(s,0,2.5).ok,false);assert.equal(s.spawnRates[0],1);
});
test('grades and rates persist, legacy fields default safely and invalid settings are rejected',()=>{
 const s=createGame();s.heroes[0].grade=3;setSpawnRate(s,2,4);const saved=restore(serialize(s));assert.equal(saved.heroes[0].grade,3);assert.deepEqual(saved.spawnRates,[1,1,4,1]);
 delete s.spawnRates;s.heroes.forEach(h=>delete h.grade);const legacy=restore(serialize(s));assert.deepEqual(legacy.spawnRates,[1,1,1,1]);assert.ok(legacy.heroes.every(h=>h.grade===0));
 s.spawnRates=[1,1,0,5];assert.equal(restore(serialize(s)),null);s.spawnRates=[1,1,1,1];s.heroes[0].grade=8;assert.equal(restore(serialize(s)),null);
});

test('test build starts with ten thousand mart gold',()=>{assert.equal(createGame().treasury,10000);});

test('existing saves receive the operating fund correction once without losing progression',()=>{
 const s=createGame();delete s.operatingGrantApplied;s.treasury=80;s.materials={iron:666,crystal:132,soul:0};
 const next=restore(serialize(s));assert.equal(next.treasury,10000);assert.deepEqual(next.materials,s.materials);assert.deepEqual(next.heroes,s.heroes);
 next.treasury-=120;assert.equal(restore(serialize(next)).treasury,9880);
});
