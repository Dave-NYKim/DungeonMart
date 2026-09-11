import { CLASSES, ZONES, MONSTERS, MART, RARITIES, HERO_GRADES, classOf, skillsOf, nodesOf, BOSS_TYPE } from './data.js';

import { WORLD, ARRIVAL, CAMPS, REGIONS, BOSS_LAIR, contains, isWalkable, applyTownLayout, freshTown, validateTown, placementError, snapTown, DECORATIONS, TOWN_BOUNDS, currentTownLayout } from './world.js';
import { moveEntity as move, nearestWalkable, displaceEntity } from './navigation.js';

export const VERSION = 2;
export const MAX_HEROES = 20;
const names = ['라그나', '모르트', '에이라', '세레나', '루시안', '카인', '리브', '애쉬', '노아', '베른', '이리스', '레온', '루나', '테오', '벨라', '시온', '레이', '에덴', '니아', '로웬'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const xpNeeded = h => Math.floor(35 + h.level * 17 + h.level ** 1.45 * 3);
export const availableZone = (s, z) => s.heroes.some(h => h.level >= ZONES[z].level);
export const passiveValue = (h, key) => skillsOf(h).filter(s => s.passive && s.effect === key).reduce((v, s) => v + s.power * (1 + (s.rank - 1) * .16), 0);
export function statsOf(h, s) {
  const base = { atk: 15 + h.level * 3.3, def: 3 + h.level * 1.3, hp: 150 + h.level * 17, crit: .05, haste: 0, leech: 0, spell: 0, petdamage: 0, cooldown: 0 };
  if (['barbarian', 'paladin'].includes(h.classId)) { base.hp *= 1.25; base.def += 4; }
  for (const key of ['atk','def','hp']) base[key] *= HERO_GRADES[h.grade ?? 0].multiplier;
  for (const id of Object.values(h.equipment)) {
    const item = s.inventory.find(i => i.id === id);
    if (item) for (const [key, value] of Object.entries(item.stats)) base[key] = (base[key] || 0) + value;
  }
  for (const key of ['crit', 'haste', 'leech', 'spell', 'petdamage', 'cooldown']) base[key] += passiveValue(h, key);
  base.atk *= 1 + passiveValue(h, 'damage') + (h.pets.length ? passiveValue(h, 'bond') : 0);
  base.def *= 1 + passiveValue(h, 'defense');
  base.cooldown = Math.min(.6, base.cooldown);
  base.crit = Math.min(.8, base.crit);
  return base;
}
export const powerOf = (h, s) => Math.round(statsOf(h, s).atk * 4 + statsOf(h, s).def * 2 + statsOf(h, s).hp * .12);
export function makeHero(s, classId, grade = 0) {
  const h = { id: `h${s.nextId++}`, name: names[s.heroes.length] || `용사 ${s.heroes.length + 1}`, classId, grade, level: 1, xp: 0, gold: 100, path: [], skillRanks: {}, skillPoints: 0,
    hp: 200, shield: 0, x: MART.x + (s.heroes.length % 5 - 2) * 36, y: MART.y + 64, zone: 0, standby: false, state: 'depart', target: null, cooldowns: {}, attackCd: 0, recovery: 0,
    bag: { iron: 0, crystal: 0, soul: 0 }, bagKills: 0, kills: 0, arrivalStage: 0, arrivalWait: 0, equipment: { weapon: null, armor: null, accessory: null }, costume: { palette: 'equipment' }, pets: [], buffs: {}, soul: 0, attacks: 0 };
  h.hp = statsOf(h, s).hp;
  return h;
}
export function createGame() {
  const s = { version: VERSION, worldRevision: WORLD.revision, town: freshTown(), nextId: 1, time: 0, day: 1, treasury: 10000, operatingGrantApplied: true, materials: { iron: 48, crystal: 9, soul: 0 }, heroes: [], inventory: [], enemies: [], corpses: [], effects: [], logs: [], raid: null, bossKills: 0, kills: 0, crafted: 0, sales: 0, upgrades: { forge: 0, clinic: 0 }, zoneKills: [0, 0, 0, 0], spawnCd: [0, 0, 0, 0], spawnRates: [1, 1, 1, 1], objectives: [] };
  applyTownLayout(s.town);
  for (const cls of CLASSES) s.heroes.push(makeHero(s, cls.id));
  log(s, '던전 마트 영업 시작. 다섯 용사가 황야로 향합니다.', 'system');
  log(s, '첫 납품 재료가 도착했습니다. 제작소에서 장비를 만들어 보세요.', 'loot');
  for (const z of ZONES) for (let i = 0; i < 7; i++) spawnEnemy(s, z.id, false, i);
  return s;
}
export function log(s, message, type = 'info') {
  s.logs.unshift({ time: s.time, message, type });
  s.logs.length = Math.min(60, s.logs.length);
}
function effect(s, x, y, text, color = '#ddd0a7', kind = 'text', to = null) {
  if (s.effects.length > 160) s.effects.shift();
  s.effects.push({ x, y, text, color, kind, to, life: kind === 'text' ? 1.1 : .45, max: kind === 'text' ? 1.1 : .45 });
}
export function spawnEnemy(s, zone, elite = false, variant) {
  const z = ZONES[zone];
  const type = z.monsters[variant === undefined ? Math.floor(Math.random() * z.monsters.length) : variant % z.monsters.length];
  const m = MONSTERS[type];
  const camps=CAMPS.filter(c=>c.zone===zone),camp=camps[Math.floor(Math.random()*camps.length)];
  const angle = Math.random() * Math.PI * 2, radius = camp.radius * (.15 + Math.random() * .85);
  const spawn=nearestWalkable({x:camp.x+Math.cos(angle)*radius,y:camp.y+Math.sin(angle)*radius});
  const hp = z.hp * m.hp * (elite ? 4 : 1);
  const e = { id: `e${s.nextId++}`, type, zone, x: spawn.x, y: spawn.y, hp, maxHp: hp, atk: z.atk * (elite ? 1.7 : 1), elite,
    cd: Math.random(), specialCd: 7, contributors: {}, dots: [], slow: 0, stun: 0, curse: 0, fear: 0, taunt: null, summoned: false };
  s.enemies.push(e);
  return e;
}
// During a boss raid every hero fights in ACT IV and standby is suspended.
const zoneOf = (s, h) => s.raid ? 3 : h.zone;
const restingOf = (s, h) => h.standby && !s.raid;
export const RAID_COST = 500, RAID_DURATION = 240;
function nearby(s, target, radius = 80) { return s.enemies.filter(e => e.hp > 0 && e.zone === target.zone && dist(e, target) < radius); }
function heal(s, h, value, source = h) {
  const max = statsOf(h, s).hp, extra = Math.max(0, h.hp + value - max);
  h.hp = Math.min(max, h.hp + value);
  if (passiveValue(source, 'overheal')) h.shield = Math.min(max, h.shield + extra);
  effect(s, h.x, h.y - 24, `+${Math.round(value)}`, '#9bce9c');
  // Healing grants support credit on nearby fights; death rewards are still a shared pool.
  for (const e of s.enemies) if (e.hp > 0 && e.contributors[h.id] && dist(e, source) < 180) e.contributors[source.id] = (e.contributors[source.id] || 0) + value * .5;
}
function hurtHero(s, h, raw, e) {
  const stat = statsOf(h, s);
  let value = Math.max(1, raw * 100 / (100 + stat.def * 4));
  if (h.buffs.guard > 0) value *= .55;
  if (h.buffs.rage > 0) value *= .8;
  if (h.buffs.weaken > 0) value *= 1.3;
  const absorbed = Math.min(h.shield, value);
  h.shield -= absorbed; value -= absorbed; h.hp -= value;
  if (value > 1) effect(s, h.x, h.y - 14, `−${Math.ceil(value)}`, '#cc7e71');
  if (e && passiveValue(h, 'thorns')) damage(s, h, e, raw * passiveValue(h, 'thorns'), false, true);
  if (h.hp <= 0) {
    h.hp = 0; h.state = 'dead'; h.recovery = 10; h.x = MART.x + Math.random() * 35 - 18; h.y = MART.y + 45; h.pets = []; h.target = null;
    log(s, `${h.name} 쓰러짐. 마트에서 10초 후 부활합니다.`, 'danger');
  }
}
function damage(s, h, e, raw, spell = false, reactive = false) {
  if (!e || e.hp <= 0) return;
  const st = statsOf(h, s);
  let amount = raw * (h.buffs.rage > 0 ? 1.3 : 1) * (h.buffs.weaken > 0 ? .8 : 1);
  if (spell) amount *= 1 + st.spell;
  if (e.curse > 0) amount *= 1.25 + passiveValue(h, 'expose');
  if (e.elite) amount *= 1 + passiveValue(h, 'boss');
  if (e.hp < e.maxHp * .35) amount *= 1 + passiveValue(h, 'execute');
  const crit = Math.random() < st.crit;
  if (crit) amount *= 1.65;
  e.hp -= amount;
  e.contributors[h.id] = (e.contributors[h.id] || 0) + amount;
  if (st.leech) h.hp = Math.min(st.hp, h.hp + amount * st.leech);
  effect(s, e.x, e.y - 15, `${Math.round(amount)}${crit ? '!' : ''}`, crit ? '#f2ce78' : '#d8d4c8');
  effect(s, h.x, h.y - 8, '', classOf(h).color, 'line', { x: e.x, y: e.y - 8 });
  if (e.hp <= 0) kill(s, h, e);
  else if (!reactive && MONSTERS[e.type].trait === 'charged' && Math.random() < .18) {
    effect(s, e.x, e.y, '', '#91b9dc', 'ring');
    hurtHero(s, h, e.atk * .6, null);
  }
}
function bossBehaviour(s, e, target, targets, dt) {
  e.summonCd = (e.summonCd ?? 12) - dt;
  if (e.specialCd <= 0) {
    e.specialCd = 7;
    for (const h of s.heroes) if (h.state === 'hunt' && dist(h, e) < 110) hurtHero(s, h, e.atk * .7, null);
    effect(s, e.x, e.y, '', '#ff8a3c', 'ring'); effect(s, e.x, e.y - 40, '잿불 폭발', '#ffb457');
  }
  if (e.summonCd <= 0) {
    e.summonCd = 15;
    const minions = s.enemies.filter(n => n.minion && n.hp > 0).length;
    for (let i = 0; i < 2 && minions + i < 6; i++) { const n = spawnEnemy(s, 3, false, i); n.x = e.x + (i ? 40 : -40); n.y = e.y + 20; n.hp = Math.round(n.maxHp * .35); n.maxHp = n.hp; n.summoned = true; n.minion = true; }
    effect(s, e.x, e.y - 40, '부하 소환', '#c9a0ff');
  }
}
export function summonBoss(s) {
  const m = MONSTERS[BOSS_TYPE];
  if (s.raid) return { ok: false, message: `${m.name}이(가) 이미 나타나 있습니다.` };
  if (s.treasury < RAID_COST) return { ok: false, message: `보스 소환에는 운영금 ${RAID_COST} G가 필요합니다.` };
  if (!s.heroes.some(h => h.state !== 'arrive')) return { ok: false, message: '출전할 수 있는 용사가 없습니다.' };
  s.treasury -= RAID_COST;
  const party = s.heroes.reduce((v, h) => v + powerOf(h, s), 0), avgHp = s.heroes.reduce((v, h) => v + statsOf(h, s).hp, 0) / s.heroes.length;
  const spawn = nearestWalkable(BOSS_LAIR), hp = Math.round(Math.max(3000, party * 14));
  const e = { id: `e${s.nextId++}`, type: BOSS_TYPE, zone: 3, x: spawn.x, y: spawn.y, hp, maxHp: hp, atk: Math.round(avgHp * .2), elite: false, boss: true, minion: false,
    cd: 2, specialCd: 5, summonCd: 12, contributors: {}, dots: [], slow: 0, stun: 0, curse: 0, fear: 0, taunt: null, summoned: false };
  s.enemies.push(e);
  s.raid = { bossId: e.id, started: s.time, ends: s.time + RAID_DURATION };
  for (const h of s.heroes) { if (h.state === 'hunt' || h.state === 'depart') { h.state = 'depart'; h.target = null; } else if (h.state === 'recover' && h.hp >= statsOf(h, s).hp) h.state = 'depart'; }
  effect(s, e.x, e.y, '', m.color, 'ring');
  log(s, `혼돈의 봉인문이 열렸다! ${m.name} 출현 · 모든 용사가 ACT IV로 출격합니다.`, 'boss');
  return { ok: true, message: `${m.name} 소환! 모든 용사가 ACT IV로 향합니다.`, boss: e };
}
function endRaid(s, outcome, e) {
  const m = MONSTERS[BOSS_TYPE];
  s.raid = null;
  s.enemies = s.enemies.filter(n => !n.boss && !n.minion);
  for (const h of s.heroes) if (h.state === 'hunt' || h.state === 'depart') { h.state = h.standby ? 'return' : 'depart'; h.target = null; }
  if (outcome === 'win') {
    const z = ZONES[3], participants = s.heroes.filter(p => e.contributors[p.id] > 0), bounty = 2000;
    for (const p of participants) { p.xp += z.xp * 20; p.gold += z.gold * 25; p.kills++; p.bag.soul += 3; levelUp(s, p); }
    s.treasury += bounty; s.bossKills++;
    log(s, `${m.name} 처치! 현상금 ${bounty} G · 참여 용사 ${participants.length}명 · 영혼 결정 3개씩`, 'boss');
  } else log(s, `${m.name}이(가) 봉인문 너머로 물러났습니다. 다음 기회에 다시 도전하세요.`, 'boss');
}
function kill(s, h, e) {
  if (e.boss) { s.kills++; effect(s, e.x, e.y - 30, '보스 처치!', '#ffd27a'); endRaid(s, 'win', e); return; }
  s.kills++; s.zoneKills[e.zone]++;
  const z = ZONES[e.zone], reward = e.elite ? 5 : 1;
  s.corpses.push({ x: e.x, y: e.y, zone: e.zone, type: e.type, life: 12, revived: e.revived || e.summoned });
  if (s.corpses.length > 100) s.corpses.shift();
  const participants = s.heroes.filter(p => e.contributors[p.id] > 0 && p.state !== 'dead');
  const share = Math.max(1, participants.length);
  for (const p of participants) {
    p.xp += z.xp * reward / share; p.gold += z.gold * reward / share; p.kills++;
    p.bag[z.material] += reward / share; p.bag.iron += e.zone > 0 ? reward / share : 0;
    p.bagKills++;
    levelUp(s, p);
  }
  h.soul = Math.min(5, h.soul + (passiveValue(h, 'soul') ? 1 : 0));
  if (passiveValue(h, 'onkill')) h.buffs.rage = 6;
  if (passiveValue(h, 'spread') && e.curse > 0) nearby(s, e, 90).forEach(n => n.curse = 6);
  if (passiveValue(h, 'shatter') && (e.slow > 0 || e.stun > 0)) nearby(s, e, 60).forEach(n => damage(s, h, n, statsOf(h, s).atk * .7, true, true));
  if (e.elite) log(s, `ACT ${z.act} 정예 ${MONSTERS[e.type].name} 처치! 전리품 5배.`, 'loot');
  for (const n of nearby(s, e, 85)) if (MONSTERS[n.type].trait === 'coward') n.fear = 2;
}
export function levelUp(s, h) {
  let gained = 0;
  while (h.level < 60 && h.xp >= xpNeeded(h)) { h.xp -= xpNeeded(h); h.level++; h.skillPoints++; gained++; }
  if (h.level === 60) h.xp = 0;
  if (gained) {
    h.hp = statsOf(h, s).hp;
    effect(s, h.x, h.y - 36, 'LEVEL UP', '#ead29a');
    log(s, `${h.name} Lv.${h.level} 달성 · 스킬 포인트 +${gained}`, 'level');
  }
}
function cast(s, h, sk, target) {
  const st = statsOf(h, s), t = target;
  const allies = s.heroes.filter(p => p.state !== 'dead' && dist(p, h) < 175);
  const p = sk.power * (1 + (sk.rank - 1) * .18);
  let amp = 1 + h.soul * .12;
  if (passiveValue(h, 'charge') && h.attacks >= 4) { amp += .4; h.attacks = 0; }
  if (h.lastSkill !== sk.id) amp += passiveValue(h, 'resonance');
  const hit = (e, mult = 1) => damage(s, h, e, st.atk * p * amp * mult, true);
  const area = (radius = 85) => nearby(s, t || h, radius);
  const dot = (e, type) => { e.dots = e.dots.filter(d => !(d.heroId === h.id && d.type === type)); e.dots.push({ heroId: h.id, type, damage: st.atk * p * .22 * (1 + passiveValue(h, 'dot')), life: 5, tick: 1 }); };
  const summon = (power, count = 1) => {
    const cap = Math.max(1, 3 + passiveValue(h, 'capacity') - (passiveValue(h, 'concentrate') ? 2 : 0));
    for (let i = 0; i < count; i++) {
      if (h.pets.length >= cap) h.pets.shift();
      h.pets.push({ power, life: 18, cd: .2 * i, x: h.x, y: h.y, kind: sk.effect === 'golem' ? 'golem' : 'skeleton' });
    }
  };
  switch (sk.effect) {
    case 'hit': hit(t); break;
    case 'rage': h.buffs.rage = 6 + sk.rank; break;
    case 'shield': h.shield = Math.max(h.shield, st.hp * .25 * p); h.buffs.shield = 8; break;
    case 'guard': case 'fortify': h.shield = Math.max(h.shield, st.hp * .2 * p); h.buffs.guard = 8; break;
    case 'taunt': nearby(s, h, 130).forEach(e => { e.taunt = h.id; e.curse = Math.max(e.curse, 2); }); h.shield += st.hp * .2; h.buffs.guard = 6; break;
    case 'bleed': hit(t); if (t.hp > 0) dot(t, 'bleed'); break;
    case 'rend': hit(t, t.dots.some(d => d.type === 'bleed') ? 2 : 1); break;
    case 'curse': hit(t); t.curse = 6; break;
    case 'judgment': hit(t, t.curse > 0 ? 1.6 : 1); break;
    case 'drain': hit(t); heal(s, h, st.atk * p * .65); break;
    case 'blood': area(110).forEach(e => { hit(e); if (e.hp > 0) dot(e, 'bleed'); }); heal(s, h, st.atk * p); break;
    case 'frenzy': area(105).forEach(e => hit(e)); h.buffs.rage = 8; break;
    case 'aoe': case 'storm': area(sk.effect === 'storm' ? 140 : 90).forEach(e => hit(e)); break;
    case 'multi': case 'pierce': case 'chain': area(sk.effect === 'chain' ? 155 : 110).slice(0, sk.effect === 'chain' ? 5 : 3).forEach(e => { hit(e); if (sk.effect === 'chain') e.curse = Math.max(e.curse, 2); }); break;
    case 'slow': case 'freeze': case 'stun': area(sk.effect === 'freeze' ? 140 : 90).forEach(e => { hit(e); e.slow = 5; if (sk.effect !== 'slow') e.stun = 3; }); break;
    case 'poison': case 'plague': case 'fire': case 'meteor': area(['meteor', 'plague'].includes(sk.effect) ? 145 : 85).forEach(e => { hit(e); if (e.hp > 0) dot(e, ['poison', 'plague'].includes(sk.effect) ? 'poison' : 'fire'); if (sk.effect === 'plague') e.curse = 6; }); break;
    case 'summon': case 'golem': summon(p); break;
    case 'army': summon(p, 5); break;
    case 'command': case 'ascend': hit(t, 1 + h.pets.length * .35); h.pets.forEach(pet => pet.cd = 0); if (sk.effect === 'ascend') h.shield = Math.max(h.shield, st.hp * .4); break;
    case 'corpse': {
      const idx = s.corpses.findIndex(c => c.zone === h.zone && dist(c, t) < 140);
      if (idx < 0) return false;
      const corpse = s.corpses.splice(idx, 1)[0]; nearby(s, corpse, 140).forEach(e => hit(e)); break;
    }
    case 'evade': case 'teleport': case 'knock': {
      if (sk.effect !== 'evade') area(95).forEach(e => { hit(e); if (sk.effect === 'knock') displaceEntity(e,e.x+(e.x-h.x)*.3,e.y+(e.y-h.y)*.3); });
      const d = Math.max(1, dist(h, t)); displaceEntity(h,h.x+(h.x-t.x)/d*45,h.y+(h.y-t.y)/d*45); h.buffs.rage = 3; break;
    }
    case 'gravity': area(140).forEach(e => { hit(e); displaceEntity(e,e.x+(t.x-e.x)*.7,e.y+(t.y-e.y)*.7); e.slow = 4; }); break;
    case 'aura': allies.forEach(a => { a.shield = Math.max(a.shield, statsOf(a, s).hp * .15 * p); a.buffs.guard = 6; for (const e of s.enemies) if (e.contributors[a.id] && dist(e, h) < 180) e.contributors[h.id] = (e.contributors[h.id] || 0) + 10; }); break;
    case 'heal': { const weak = [...allies].sort((a, b) => a.hp / statsOf(a, s).hp - b.hp / statsOf(b, s).hp)[0]; if (!weak || weak.hp > statsOf(weak, s).hp * .85) return false; heal(s, weak, st.atk * p * 2, h); break; }
    case 'cleanse': case 'groupheal': allies.forEach(a => { heal(s, a, st.atk * p * 1.5, h); if (sk.effect === 'cleanse') { a.buffs.poison = 0; a.buffs.weaken = 0; a.shield += st.atk; } }); break;
  }
  if (['heal', 'cleanse', 'groupheal'].includes(sk.effect) && passiveValue(h, 'devotion')) heal(s, h, st.hp * passiveValue(h, 'devotion'));
  h.soul = 0; h.lastSkill = sk.id;
  effect(s, h.x, h.y - 40, sk.name, classOf(h).color);
  if(s.effects.length>150)s.effects.shift();
  s.effects.push({kind:'skill',skillId:sk.id,x:t?.x??h.x,y:t?.y??h.y,from:{x:h.x,y:h.y},to:{x:t?.x??h.x,y:t?.y??h.y},targets:area(155).slice(0,5).map(e=>({x:e.x,y:e.y})),life:1.25,max:1.25});
  return true;
}
function deposit(s, h) {
  let total = 0;
  for (const k of Object.keys(h.bag)) { total += h.bag[k]; s.materials[k] += h.bag[k]; h.bag[k] = 0; }
  if (total > 0) log(s, `${h.name} 귀환 · 재료 ${Math.round(total)}개 입고`, 'loot');
  h.bagKills = 0;
}
export function tick(s, dt) {
  applyTownLayout(s.town);
  dt = clamp(dt, 0, .25);
  s.time += dt; s.day = 1 + Math.floor(s.time / 300);
  s.effects.forEach(e => e.life -= dt); s.effects = s.effects.filter(e => e.life > 0);
  s.corpses.forEach(c => c.life -= dt); s.corpses = s.corpses.filter(c => c.life > 0);
  for (const z of ZONES) {
    s.spawnCd[z.id] -= dt * s.spawnRates[z.id];
    if (s.raid && z.id === 3) { const boss = s.enemies.find(n => n.id === s.raid.bossId && n.hp > 0); if (!boss) endRaid(s, 'lost'); else if (s.time >= s.raid.ends) endRaid(s, 'timeout'); }
    const count = s.enemies.filter(e => e.zone === z.id && e.hp > 0).length;
    const desired = Math.min(18, 7 + s.heroes.filter(h => zoneOf(s, h) === z.id && !restingOf(s, h)).length);
    if (count < desired && s.spawnCd[z.id] <= 0) { const elite = s.zoneKills[z.id] >= 18 && !s.enemies.some(e => e.zone === z.id && e.elite && e.hp > 0); if (elite) s.zoneKills[z.id] = 0; spawnEnemy(s, z.id, elite); s.spawnCd[z.id] = 1.8; }
  }
  for (const h of s.heroes) {
    const st = statsOf(h, s);
    h.hp = Math.min(h.hp, st.hp);
    for (const key of Object.keys(h.buffs)) h.buffs[key] = Math.max(0, h.buffs[key] - dt);
    for (const key of Object.keys(h.cooldowns)) h.cooldowns[key] = Math.max(0, h.cooldowns[key] - dt);
    if (!h.buffs.shield && !h.buffs.guard) h.shield = Math.max(0, h.shield - dt * 4);
    if (h.state === 'dead') { h.recovery -= dt; if (h.recovery <= 0) { h.state = 'recover'; h.hp = st.hp * .35; deposit(s, h); } continue; }
    if (h.state === 'arrive') {
      if(h.arrivalStage===-1){h.arrivalWait=Math.max(0,h.arrivalWait-dt);h.x=ARRIVAL.berth.x-(h.arrivalWait/4)*160;h.y=ARRIVAL.y;if(h.arrivalWait===0){h.arrivalStage=0;h.x=240;}}
      else if(h.arrivalStage===0){if(move(h,ARRIVAL.reception,76,dt)){h.arrivalStage=1;h.arrivalWait=1.5;}}
      else if(h.arrivalStage===1){h.arrivalWait-=dt;if(h.arrivalWait<=0){h.arrivalStage=2;log(s,`${h.name} 등록 완료 · 마트로 이동합니다.`,'level');}}
      else if(move(h,{x:MART.x,y:MART.y+40},76,dt)){h.state='depart';log(s,`${h.name} 마트 도착 · 첫 사냥을 시작합니다.`,'level');}
      continue;
    }
    if (h.buffs.poison > 0) { hurtHero(s, h, 5 * dt, null); if (h.state === 'dead') continue; }
    if (h.state === 'recover') {
      h.hp = Math.min(st.hp, h.hp + st.hp * (.12 + s.upgrades.clinic * .04) * dt);
      if (h.hp >= st.hp) { h.pets = []; if (!restingOf(s, h)) h.state = 'depart'; }
      continue;
    }
    if (restingOf(s, h) && (h.state === 'depart' || h.state === 'hunt')) { h.state = 'return'; h.target = null; }
    if (h.state === 'return' || h.hp < st.hp * .28 || (h.bagKills >= 12 && !s.raid)) {
      h.state = 'return'; h.target = null;
      if (move(h, { x: MART.x + (Number(h.id.slice(1)) % 5 - 2) * 36, y: MART.y + 64 }, 112, dt)) { deposit(s, h); h.state = 'recover'; }
      continue;
    }
    const zoneId = zoneOf(s, h), z = ZONES[zoneId], boss = s.raid && s.enemies.find(e => e.id === s.raid.bossId && e.hp > 0), dest = boss || z;
    if (h.state === 'depart') { if (move(h, dest, 112, dt) || dist(h, dest) < (boss ? 150 : 130)) h.state = 'hunt'; continue; }
    let target = s.enemies.find(e => e.id === h.target && e.hp > 0 && e.zone === zoneId);
    if (!target) { target = s.enemies.filter(e => e.zone === zoneId && e.hp > 0).sort((a, b) => dist(a, h) - dist(b, h))[0]; h.target = target?.id; }
    if (!target) continue;
    const range = classOf(h).range;
    if (dist(h, target) > range) move(h, target, 58, dt);
    h.attackCd -= dt;
    if (dist(h, target) <= range + 5 && h.attackCd <= 0) {
      damage(s, h, target, st.atk * (1 + passiveValue(h, 'basic')));
      h.attacks++;
      if (passiveValue(h, 'double') > Math.random()) damage(s, h, target, st.atk);
      if (passiveValue(h, 'burnbasic') && target.hp > 0) target.dots.push({ heroId: h.id, type: 'fire', damage: st.atk * .15, life: 3, tick: 1 });
      h.attackCd = 1.15 / (1 + st.haste);
    }
    if (h.state === 'dead') continue;
    if (target.hp > 0 && dist(h, target) < range + 30) {
      const ready = skillsOf(h).filter(sk => !sk.passive && !h.cooldowns[sk.id]);
      for (const sk of ready) {
        if (cast(s, h, sk, target)) { h.cooldowns[sk.id] = sk.cd * (1 - st.cooldown); break; }
      }
    }
    for (const pet of h.pets) {
      pet.life -= dt; pet.cd -= dt;
      move(pet, { x: target.x + Math.sin(pet.life) * 15, y: target.y + 12 }, 85, dt);
      if (dist(pet, target) < 35 && pet.cd <= 0 && target.hp > 0) { damage(s, h, target, st.atk * pet.power * .55 * (1 + st.petdamage + passiveValue(h, 'concentrate'))); pet.cd = 1.3; }
    }
    h.pets = h.pets.filter(p => p.life > 0);
  }
  for (const e of [...s.enemies]) {
    if (e.hp <= 0) continue;
    e.slow = Math.max(0, e.slow - dt); e.stun = Math.max(0, e.stun - dt); e.curse = Math.max(0, e.curse - dt); e.fear = Math.max(0, e.fear - dt);
    for (const dot of e.dots) { dot.life -= dt; dot.tick -= dt; if (dot.tick <= 0) { const h = s.heroes.find(h => h.id === dot.heroId); if (h) damage(s, h, e, dot.damage, false, true); dot.tick = 1; } }
    e.dots = e.dots.filter(d => d.life > 0);
    if (e.hp <= 0 || e.stun > 0) continue;
    const m = MONSTERS[e.type];
    let targets = s.heroes.filter(h => zoneOf(s, h) === e.zone && h.state === 'hunt' && dist(h, e) < (e.boss ? 260 : 155));
    let target = targets.find(h => h.id === e.taunt) || targets.sort((a, b) => dist(a, e) - dist(b, e))[0];
    if (!target) continue;
    if (e.fear > 0 && !e.boss) { move(e, ZONES[e.zone], m.speed, dt); continue; }
    const distance = dist(e, target);
    if (distance > (m.range || 23)) move(e, target, m.speed * (e.slow ? .45 : 1), dt);
    e.cd -= dt; e.specialCd -= dt;
    if (e.cd <= 0 && distance < (m.range || 23) + 7) {
      hurtHero(s, target, e.atk * (e.curse > 0 ? .75 : 1), e);
      if (m.trait === 'poison') target.buffs.poison = 4;
      if (m.trait === 'curse') target.buffs.weaken = 4;
      if (m.trait === 'drain') e.hp = Math.min(e.maxHp, e.hp + e.atk * .3);
      if (m.range) effect(s, e.x, e.y - 8, '', m.color, 'line', { x: target.x, y: target.y - 8 });
      e.cd = e.boss ? (e.hp < e.maxHp * .3 ? 1 : 1.6) : m.trait === 'charge' ? 1.1 : 1.8;
    }
    if (e.boss) { bossBehaviour(s, e, target, targets, dt); continue; }
    if (e.specialCd <= 0) {
      e.specialCd = 9;
      if (m.trait === 'revive') {
        const i = s.corpses.findIndex(c => c.zone === e.zone && !c.revived && dist(c, e) < 130);
        if (i >= 0 && s.enemies.filter(n => n.zone === e.zone && n.hp > 0).length < 22) { const c = s.corpses.splice(i, 1)[0]; const n = spawnEnemy(s, e.zone); n.type = c.type; n.x = c.x; n.y = c.y; n.hp = n.maxHp * .4; n.revived = true; effect(s, n.x, n.y, '부활', '#b392c9'); }
      }
      if (m.trait === 'spawn' && s.enemies.filter(n => n.zone === e.zone && n.hp > 0).length < 22) { const n = spawnEnemy(s, e.zone, false, 0); n.x = e.x + 12; n.y = e.y; n.hp *= .3; n.maxHp = n.hp; n.summoned = true; }
      if (m.trait === 'fire') { targets.filter(h => dist(h, target) < 65).forEach(h => hurtHero(s, h, e.atk * .6, null)); effect(s, target.x, target.y, '', '#c77c50', 'ring'); }
    }
  }
  // Gentle spacing keeps a party legible while sharing the same road or target.
  for(let i=0;i<s.heroes.length;i++)for(let j=i+1;j<s.heroes.length;j++){
    const a=s.heroes[i],b=s.heroes[j];if(a.state==='dead'||b.state==='dead')continue;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=32)continue;
    const angle=d>.01?Math.atan2(dy,dx):(i+j)*2.4,nudge=Math.min((32-d)*.5,dt*28),nx=Math.cos(angle)*nudge,ny=Math.sin(angle)*nudge;
    if(isWalkable(a.x-nx,a.y-ny)){a.x-=nx;a.y-=ny;}if(isWalkable(b.x+nx,b.y+ny)){b.x+=nx;b.y+=ny;}
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);
}
// zone -1 keeps the hero resting at the mart (마을 대기) until reassigned.
export function assignZone(s, h, zone) {
  if (zone === -1) {
    if (h.standby) return { ok: false, message: `${h.name}은(는) 이미 마을에서 대기 중입니다.` };
    h.standby = true; h.target = null;
    if (h.state === 'depart' || h.state === 'hunt') h.state = 'return';
    log(s, `${h.name} → 마을 대기`);
    return { ok: true, message: `${h.name}이(가) 마트로 돌아와 대기합니다.` };
  }
  if (!ZONES[zone] || !availableZone(s, zone)) return { ok: false, message: `용사 한 명이 Lv.${ZONES[zone]?.level || '?'}에 도달하면 열립니다.` };
  const resumed = h.standby;
  h.zone = zone; h.target = null; h.standby = false;
  if (resumed && h.state === 'recover' && h.hp >= statsOf(h, s).hp) h.state = 'depart';
  else if (!['dead', 'recover', 'arrive'].includes(h.state)) h.state = 'return';
  log(s, `${h.name} → ACT ${ZONES[zone].act} ${ZONES[zone].name} 배정`);
  return { ok: true, message: `${h.name}의 사냥터를 변경했습니다. 마트 경유 후 출발합니다.` };
}
export function recruit(s) {
  if (s.heroes.length >= MAX_HEROES) return { ok: false, message: '최대 20명까지 영입할 수 있습니다.' };
  if (s.treasury < 120) return { ok: false, message: '마트 운영금 120 G가 필요합니다.' };
  const classId = CLASSES[Math.floor(Math.random() * CLASSES.length)].id;
  const roll = Math.random(); let total = 0;
  const grade = HERO_GRADES.findIndex(g => (total += g.chance) > roll);
  s.treasury -= 120; const h = makeHero(s, classId, grade < 0 ? 3 : grade); h.x=ARRIVAL.berth.x-160;h.y=ARRIVAL.y;h.state='arrive';h.arrivalStage=-1;h.arrivalWait=4;s.heroes.push(h);
  log(s, `${h.name} · ${HERO_GRADES[h.grade].name} ${classOf(h).name} 헌터 도착장에 도착`, 'level');
  return { ok: true, message: `${h.name} 영입 완료`, hero: h };
}
export function setSpawnRate(s, zone, rate) {
  if (!Number.isInteger(zone) || !ZONES[zone] || !Number.isInteger(rate) || rate < 1 || rate > 5) return { ok: false, message: '재생성 속도는 1~5배로 설정하세요.' };
  s.spawnRates[zone] = rate;
  return { ok: true, message: `ACT ${ZONES[zone].act} 몬스터 재생성 ${rate}배` };
}
const affixes = [{ key: 'crit', value: .06, name: '정밀한' }, { key: 'haste', value: .1, name: '신속한' }, { key: 'leech', value: .035, name: '흡혈의' }, { key: 'spell', value: .12, name: '비전의' }, { key: 'petdamage', value: .18, name: '망자의' }, { key: 'cooldown', value: .04, name: '시간의' }];
export function craft(s, slot, classId, rarity) {
  const r = RARITIES[rarity];
  if (!r || !['weapon', 'armor', 'accessory'].includes(slot) || !CLASSES.some(c => c.id === classId)) return { ok: false, message: '제작 항목을 확인하세요.' };
  if (s.inventory.length >= 120) return { ok: false, message: '재고가 가득 찼습니다. 불필요한 장비를 분해하세요.' };
  if (Object.entries(r.cost).some(([k, v]) => s.materials[k] < v)) return { ok: false, message: '제작 재료가 부족합니다.' };
  for (const [k, v] of Object.entries(r.cost)) s.materials[k] -= v;
  const cls = CLASSES.find(c => c.id === classId), mult = r.mult * (1 + s.upgrades.forge * .12);
  const stats = slot === 'weapon' ? { atk: Math.round(15 * mult) } : slot === 'armor' ? { def: Math.round(7 * mult), hp: Math.round(35 * mult) } : { hp: Math.round(24 * mult), crit: .025 * mult };
  const pool = [...affixes]; let prefix = '';
  for (let i = 0; i < r.bonuses; i++) { const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; stats[a.key] = (stats[a.key] || 0) + a.value * (1 + rarity * .3); if (!i) prefix = a.name + ' '; }
  const item = { id: `i${s.nextId++}`, slot, classId: slot === 'weapon' ? classId : null, rarity, name: prefix + (slot === 'weapon' ? cls.weapon.split(' / ')[0] : slot === 'armor' ? ['여행자의 가죽갑옷', '수호자의 사슬갑옷', '왕실 판금갑옷', '심연의 갑주'][rarity] : ['낡은 부적', '달빛 목걸이', '황혼의 인장', '불멸의 성물'][rarity]), stats, price: r.price, purchased: false,
    appearance: { weapon: cls.glyph, armor: rarity, color: r.color, aura: slot === 'accessory' ? rarity : 0 } };
  s.inventory.push(item); s.crafted++;
  log(s, `${r.name} ${item.name} 제작 완료`, 'loot');
  return { ok: true, message: `${item.name} 제작 완료! 용사를 선택해 구매·장착하세요.`, item };
}
export function equip(s, h, id) {
  const item = s.inventory.find(i => i.id === id);
  if (!item) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  if (item.classId && item.classId !== h.classId) return { ok: false, message: '이 직업이 사용할 수 없는 무기입니다.' };
  if (!item.purchased && h.gold < item.price) return { ok: false, message: `${h.name}의 골드가 부족합니다. ${item.price} G가 필요합니다.` };
  if (!item.purchased) { h.gold -= item.price; s.treasury += item.price; s.sales += item.price; item.purchased = true; }
  for (const other of s.heroes) if (other.equipment[item.slot] === id) other.equipment[item.slot] = null;
  h.equipment[item.slot] = id;
  h.hp = Math.min(h.hp, statsOf(h, s).hp);
  log(s, `${h.name} · ${item.name} 장착`, 'loot');
  return { ok: true, message: `${h.name}에게 ${item.name} 장착 완료` };
}
export function salvage(s, id) {
  const item = s.inventory.find(i => i.id === id);
  if (!item) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  if (s.heroes.some(h => Object.values(h.equipment).includes(id))) return { ok: false, message: '장착 중인 장비는 분해할 수 없습니다.' };
  for (const [k, v] of Object.entries(RARITIES[item.rarity].cost)) s.materials[k] += Math.floor(v * .5);
  s.inventory = s.inventory.filter(i => i.id !== id);
  return { ok: true, message: '장비 분해 완료 · 제작 재료 50% 반환' };
}
export function promote(s, h, id) {
  const nodes = nodesOf(h), stage = h.path.length + 2;
  if (stage > 3) return { ok: false, message: '최종 전직을 완료했습니다.' };
  const choices = stage === 2 ? classOf(h).branches : nodes[1].children;
  const node = choices.find(b => b.id === id);
  if (!node) return { ok: false, message: '현재 계열에서 선택할 수 없는 전직입니다.' };
  const level = stage === 2 ? 20 : 40, cost = stage === 2 ? { iron: 35, crystal: 12 } : { crystal: 25, soul: 15 };
  if (h.level < level) return { ok: false, message: `${stage}차 전직에는 Lv.${level}이 필요합니다.` };
  if (Object.entries(cost).some(([k, v]) => s.materials[k] < v)) return { ok: false, message: '전직 재료가 부족합니다.' };
  for (const [k, v] of Object.entries(cost)) s.materials[k] -= v;
  h.path.push(id); h.cooldowns = {};
  log(s, `${h.name} → ${node.name} ${stage}차 전직!`, 'level');
  return { ok: true, message: `${node.name} 전직 완료 · 새 스킬이 자동으로 사용됩니다.` };
}
export function upgradeSkill(s, h, id) {
  const sk = skillsOf(h).find(sk => sk.id === id);
  if (!sk || sk.rank >= 5 || h.skillPoints < sk.rank) return { ok: false, message: '스킬 포인트가 없거나 최대 레벨입니다.' };
  h.skillPoints -= sk.rank; h.skillRanks[id] = sk.rank + 1;
  return { ok: true, message: `${sk.name} Lv.${sk.rank + 1}` };
}
export function resetSkills(s, h) { h.skillPoints += Object.values(h.skillRanks).reduce((sum, rank) => sum + rank * (rank - 1) / 2, 0); h.skillRanks = {}; return { ok: true, message: '스킬 포인트를 전부 돌려받았습니다.' }; }
export function upgradeMart(s, facility) {
  if (!['forge', 'clinic'].includes(facility)) return { ok: false, message: '시설을 선택하세요.' };
  const cost = 150 * (s.upgrades[facility] + 1);
  if (s.upgrades[facility] >= 5) return { ok: false, message: '최고 레벨 시설입니다.' };
  if (s.treasury < cost) return { ok: false, message: `마트 운영금 ${cost} G가 필요합니다.` };
  s.treasury -= cost; s.upgrades[facility]++;
  return { ok: true, message: '시설 개선 완료' };
}
export function editTown(s, action) {
  const next=structuredClone(s.town),p=snapTown(action.x,action.y);
  if(action.kind==='move'){
    const error=placementError(next,action.id,p.x,p.y);if(error)return {ok:false,message:error};
    next.buildings[action.id]=p;
  }else if(action.kind==='decorate'){
    if(!Object.hasOwn(DECORATIONS,action.type))return {ok:false,message:'장식을 선택하세요.'};
    if(next.decorations.length>=300)return {ok:false,message:'장식은 최대 300개까지 배치할 수 있습니다.'};
    if(p.x<TOWN_BOUNDS.left||p.x>TOWN_BOUNDS.right||p.y<TOWN_BOUNDS.top||p.y>TOWN_BOUNDS.bottom)return {ok:false,message:'마을 안에 배치하세요.'};
    next.decorations=next.decorations.filter(d=>d.x!==p.x||d.y!==p.y);next.decorations.push({...p,type:action.type});
  }else if(action.kind==='erase')next.decorations=next.decorations.filter(d=>Math.hypot(d.x-p.x,d.y-p.y)>24);
  else if(action.kind==='restore'){if(!validateTown(action.town))return {ok:false,message:'배치 정보를 확인하세요.'};Object.assign(next,structuredClone(action.town));}
  else return {ok:false,message:'편집 도구를 선택하세요.'};
  if(!validateTown(next))return {ok:false,message:'시설 배치와 주요 도로를 확인하세요.'};
  s.town=next;applyTownLayout(s.town);
  for(const h of s.heroes){if(h.arrivalStage===-1)continue;if(h.state==='recover'||h.state==='dead'){h.x=MART.x+(Number(h.id.slice(1))%5-2)*32;h.y=MART.y+48;}if(!isWalkable(h.x,h.y))Object.assign(h,nearestWalkable(h));}
  return {ok:true,message:action.kind==='move'?'시설을 옮겼습니다.':'마을 배치를 저장했습니다.'};
}
export function serialize(s) { return JSON.stringify({ ...s, effects: [], savedAt: Date.now() }); }
export function restore(raw) {
  const previousTown=currentTownLayout();
  try {
    if (typeof raw !== 'string' || raw.length > 5_000_000) return null;
    const s = JSON.parse(raw);
    const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const num = v => typeof v === 'number' && Number.isFinite(v);
    const nums = v => obj(v) && Object.values(v).every(num);
    const safe = (v, depth = 0) => {
      if (depth > 15) return false;
      if (typeof v === 'string') return v.length < 500 && !/[<>"&]/.test(v);
      if (typeof v === 'number') return Number.isFinite(v);
      if (v === null || typeof v === 'boolean') return true;
      if (typeof v === 'object') return Object.entries(v).every(([k, x]) => !['__proto__', 'constructor', 'prototype'].includes(k) && safe(x, depth + 1));
      return false;
    };
    if (!obj(s) || !safe(s) || ![1,VERSION].includes(s.version)) return null;
    if (!Array.isArray(s.heroes) || !s.heroes.length || s.heroes.length > MAX_HEROES || !Array.isArray(s.inventory) || s.inventory.length > 120 || !Array.isArray(s.enemies) || s.enemies.length > 150) return null;
    if (!['time','day','treasury','nextId','kills','crafted','sales'].every(k => num(s[k]) && s[k] >= 0) || !Number.isInteger(s.nextId)) return null;
    if (!nums(s.materials) || !['iron','crystal','soul'].every(k => num(s.materials[k]) && s.materials[k] >= 0)) return null;
    if (!obj(s.upgrades) || !['forge','clinic'].every(k => Number.isInteger(s.upgrades[k]) && s.upgrades[k] >= 0 && s.upgrades[k] <= 5)) return null;
    if (!['zoneKills','spawnCd'].every(k => Array.isArray(s[k]) && s[k].length === 4 && s[k].every(num))) return null;
    if (!Array.isArray(s.logs) || s.logs.length > 60 || !s.logs.every(l => obj(l) && num(l.time) && typeof l.message === 'string' && ['info','system','loot','danger','level','boss'].includes(l.type))) return null;
    if (!Array.isArray(s.corpses) || !s.corpses.every(c => obj(c) && ['x','y','life','zone'].every(k=>num(c[k])) && ZONES[c.zone] && MONSTERS[c.type])) return null;
    s.spawnRates ??= [1,1,1,1]; s.raid ??= null; s.bossKills ??= 0;
    if (s.raid !== null && (!obj(s.raid) || typeof s.raid.bossId !== 'string' || !num(s.raid.started) || !num(s.raid.ends))) return null;
    if (!Number.isInteger(s.bossKills) || s.bossKills < 0) return null;
    if (!Array.isArray(s.spawnRates) || s.spawnRates.length !== 4 || !s.spawnRates.every(v => Number.isInteger(v) && v >= 1 && v <= 5)) return null;
    const ids = new Set();
    for (const h of s.heroes) {
      if (!obj(h) || !/^h\d+$/.test(h.id) || ids.has(h.id)) return null; ids.add(h.id);
      h.grade ??= 0; h.standby = h.standby === true;
      if (!Number.isInteger(h.grade) || !HERO_GRADES[h.grade]) return null;
      if (typeof h.name !== 'string' || !CLASSES.some(c=>c.id===h.classId) || !Array.isArray(h.path) || h.path.length > 2 || !obj(h.equipment) || !nums(h.skillRanks) || !nums(h.cooldowns) || !nums(h.buffs) || !nums(h.bag)) return null;
      if (!['hp','xp','gold','x','y','attackCd','recovery','bagKills','kills','shield','skillPoints','soul','attacks'].every(k=>num(h[k])) || h.hp < 0 || h.gold < 0) return null;
      if (!Number.isInteger(h.level) || h.level < 1 || h.level > 60 || !ZONES[h.zone] || !['hunt','depart','return','recover','dead','arrive'].includes(h.state)) return null;
      if (!['iron','crystal','soul'].every(k=>num(h.bag[k]) && h.bag[k]>=0) || !obj(h.costume) || !['equipment','ash','crimson','forest','midnight'].includes(h.costume.palette)) return null;
      if (!Array.isArray(h.pets) || h.pets.length > 12 || !h.pets.every(p=>obj(p) && ['x','y','power','life','cd'].every(k=>num(p[k])) && ['skeleton','golem'].includes(p.kind))) return null;
      const c=classOf(h), second=c.branches.find(b=>b.id===h.path[0]);
      if (h.path.length && !second || h.path.length===2 && !second.children.some(b=>b.id===h.path[1])) return null;
      if (!Object.entries(h.skillRanks).every(([id,rank])=>skillsOf(h).some(sk=>sk.id===id) && Number.isInteger(rank) && rank>=1 && rank<=5)) return null;
    }
    for (const i of s.inventory) {
      if (!obj(i) || !/^i\d+$/.test(i.id) || ids.has(i.id)) return null;ids.add(i.id);
      if (!['weapon','armor','accessory'].includes(i.slot) || !RARITIES[i.rarity] || !num(i.price) || typeof i.name!=='string' || typeof i.purchased!=='boolean' || !nums(i.stats) || !obj(i.appearance)) return null;
      if (i.slot==='weapon' && !CLASSES.some(c=>c.id===i.classId) || i.slot!=='weapon' && i.classId!==null) return null;
      if (!/^#[0-9a-f]{6}$/i.test(i.appearance.color) || !num(i.appearance.armor)) return null;
    }
    for (const h of s.heroes) for (const slot of ['weapon','armor','accessory']) {
      const id=h.equipment[slot];if(id!==null && !s.inventory.some(i=>i.id===id && i.slot===slot && i.purchased && (!i.classId||i.classId===h.classId))) return null;
    }
    for (const e of s.enemies) {
      if (!obj(e) || !MONSTERS[e.type] || !ZONES[e.zone] || !/^e\d+$/.test(e.id) || !nums(e.contributors)) return null;
      if (!['hp','maxHp','atk','x','y','cd','specialCd','slow','stun','curse','fear'].every(k=>num(e[k])) || !Array.isArray(e.dots)) return null;
      if (!e.dots.every(d=>obj(d) && ['damage','life','tick'].every(k=>num(d[k])) && typeof d.heroId==='string')) return null;
      e.boss = e.boss === true; e.minion = e.minion === true; if (e.boss && !num(e.summonCd)) e.summonCd = 12;
    }
    if (s.raid && !s.enemies.some(e => e.boss && e.id === s.raid.bossId && e.hp > 0)) s.raid = null;
    if (!s.raid) s.enemies = s.enemies.filter(e => !e.boss && !e.minion);
    s.town ??= freshTown();
    if(!validateTown(s.town))return null;
    if(s.worldRevision!==undefined&&(!Number.isInteger(s.worldRevision)||s.worldRevision<1||s.worldRevision>WORLD.revision))return null;
    for(const h of s.heroes){h.arrivalStage??=0;h.arrivalWait??=0;if(h.state==='arrive'&&(![-1,0,1,2].includes(h.arrivalStage)||!num(h.arrivalWait)))return null;}
    applyTownLayout(s.town);
    if(s.version===1||s.worldRevision!==WORLD.revision){
      const old=s.version===1?[{x:235,y:235},{x:785,y:235},{x:235,y:635},{x:785,y:635}]:[{x:656,y:608},{x:2944,y:608},{x:656,y:2160},{x:2944,y:2160}];
      for(const h of s.heroes){
        const p=nearestWalkable(h.state==='hunt'?{x:REGIONS[h.zone].x+clamp(h.x-old[h.zone].x,-260,260),y:REGIONS[h.zone].y+clamp(h.y-old[h.zone].y,-240,240)}:{x:MART.x+(Number(h.id.slice(1))%5-2)*32,y:MART.y+48});
        h.x=p.x;h.y=p.y;h.target=null;h.pets=[];h.arrivalStage=0;h.arrivalWait=0;
        if(!['hunt','dead','recover'].includes(h.state))h.state='depart';
      }
      for(const e of s.enemies){const p=nearestWalkable({x:REGIONS[e.zone].x+clamp(e.x-old[e.zone].x,-280,280),y:REGIONS[e.zone].y+clamp(e.y-old[e.zone].y,-240,240)});e.x=p.x;e.y=p.y;}
      s.corpses=[];s.version=VERSION;s.worldRevision=WORLD.revision;log(s,'새 대륙 도착 · 마을과 사냥터 배치를 갱신했습니다.','system');
    }
    // One-time operating fund correction, preserving all other progression.
    if (s.operatingGrantApplied !== true) { s.treasury = 10000; s.operatingGrantApplied = true; }
    s.effects = [];
    return s;
  } catch { return null; } finally { applyTownLayout(previousTown); }
}
