import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,makeHero,serialize,restore} from '../src/engine.js';
import {defaultHeroName,personalTint,renameHero} from '../src/hero-identity.js';
test('class names, personal colours and renamed saves persist',()=>{
 const s=createGame(),a=makeHero(s,'barbarian'),b=makeHero(s,'barbarian');s.heroes.push(a,b);
 assert.notEqual(personalTint(a),personalTint(b));assert.equal(a.name,defaultHeroName('barbarian',s.heroes.slice(0,-2).filter(h=>h.classId==='barbarian').length));
 assert.equal(renameHero(a,'  강철 전사  ').ok,true);assert.equal(a.name,'강철 전사');
 for(const name of ['', '   ','<img src=x>','가'.repeat(13)])assert.equal(renameHero(a,name).ok,false);
 const loaded=restore(serialize(s));assert.ok(loaded);assert.equal(loaded.heroes.find(h=>h.id===a.id).name,'강철 전사');assert.equal(personalTint(loaded.heroes.find(h=>h.id===a.id)),personalTint(a));
 a.name='세레나';delete a.nameRevision;delete a.customName;b.name='직접 지은 이름';delete b.nameRevision;
 const migrated=restore(serialize(s));assert.ok(migrated);assert.notEqual(migrated.heroes.find(h=>h.id===a.id).name,'세레나');assert.equal(migrated.heroes.find(h=>h.id===b.id).name,'직접 지은 이름');
});
