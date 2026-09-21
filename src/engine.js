import { defaultHeroName } from './hero-identity.js';
import { CLASSES, ZONES, MONSTERS, MART, HERO_GRADES, classOf, skillsOf, nodesOf, BOSS_TYPE, DIFFICULTIES, STAGES, stageMult, ACT_FACTORS, BASE_MONSTER } from './data.js';
import { BASES, GRADES, GEMS, RUNES, RUNE_LIST, SETS, MANTRAS, uniqueById, itemBase, itemStats, itemPassives, weightOf, priceOf, mantraFor, rollGrid, effectiveGrid, fits, findSpot, totalWeight, weightCapacity, activation, setProgress, summarizeGear, generateItem, rollDropGrade, rollCraftGrade, makeItem, insertStats, insertName, displayName, dims, levelReq, TIER_LEVEL } from './items.js';

import { WORLD, POIS, ARRIVAL, CAMPS, REGIONS, BOSS_LAIR, ACT_BOSS_POIS, contains, isWalkable, applyTownLayout, freshTown, validateTown, placementError, snapTown, DECORATIONS, TOWN_BOUNDS, currentTownLayout } from './world.js';
import { moveEntity as move, nearestWalkable, displaceEntity } from './navigation.js';

export const VERSION = 3;
export const COMBAT_REVISION = 2;
export const FIELD_DROP_TIME = 300, MAX_FIELD_DROPS = 20;
export const WAREHOUSE_SIZES = [80, 100, 120, 144, 168, 192];
const RES_KEY = { fire: 'resFire', cold: 'resCold', lightning: 'resLightning', poison: 'resPoison' };
export const MAX_HEROES = 20;
const names = ['라그나', '모르트', '에이라', '세레나', '루시안', '카인', '리브', '애쉬', '노아', '베른', '이리스', '레온', '루나', '테오', '벨라', '시온', '레이', '에덴', '니아', '로웬'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const xpNeeded = h => {
 const l=h.level,base=35+l*17+l**1.45*3;
 return Math.floor(base*(l<10?1:4*1.22**(Math.min(l,39)-10))*(l>=40?12*1.24**(l-39):1));
};
// Every hero can reach level 100; promotions still unlock at 20 and 40.
export const LEVEL_CAPS = [100, 100, 100];
export const levelCap = h => LEVEL_CAPS[Math.min(h.path.length, 2)];
export const campaignKey=s=>`${s.difficulty.tier}:${s.difficulty.stage}`;
export const actProgress=s=>s.campaign?.clears?.[campaignKey(s)]??0;
export const availableZone=(s,z)=>Number.isInteger(z)&&z>=0&&z<4&&z<=actProgress(s);
export const ACT_BOSS_TYPES=['cryptwarden','tombemperor','thornking','gatekeeper'];
export const finalBossUnlocked=s=>actProgress(s)>=4;
function rallyHeroes(s){for(const h of s.heroes){h.target=null;delete h.restStop;if(h.state==='dead')continue;if(h.state==='arrive'&&h.arrivalStage===-1){h.x=ARRIVAL.reception.x;h.y=ARRIVAL.reception.y;h.arrivalStage=2;h.arrivalWait=0;}h.state='depart';}}
export function summonActBoss(s,zone){
 if(!availableZone(s,zone))return {ok:false,message:'이전 액트 보스를 먼저 처치하세요.'};
 if(s.raid)return {ok:false,message:'진행 중인 보스전을 먼저 끝내세요.'};
 const poi=POIS.find(p=>p.id===ACT_BOSS_POIS[zone]),pos=nearestWalkable({x:poi.x,y:poi.y+110}),stats=bossStats(s),e={id:`e${s.nextId++}`,type:ACT_BOSS_TYPES[zone],zone,tier:s.difficulty.tier,...pos,hp:Math.round(stats.hp*[.18,.32,.5,.72][zone]),atk:Math.round(stats.atk*[.35,.5,.65,.8][zone]),boss:true,actBoss:zone,elite:false,cd:2,specialCd:5,summonCd:14,spinCd:12,facing:0,spin:null,contributors:{},dots:[],slow:0,stun:0,curse:0,fear:0,taunt:null,summoned:false};
 e.maxHp=e.hp;s.enemies.push(e);s.raid={bossId:e.id,zone,kind:'act',started:s.time,ends:s.time+RAID_DURATION};rallyHeroes(s);log(s,`ACT ${zone+1} · ${MONSTERS[e.type].name} 도전!`,'boss');return {ok:true,message:'모든 용사가 액트 보스로 향합니다.',boss:e};
}
export function restAtOasis(s,h){if(s.raid||h.state==='dead'||!availableZone(s,1))return {ok:false,message:'지금은 휴식할 수 없습니다.'};h.restStop='oasis';h.state='return';h.target=null;return {ok:true,message:'오아시스로 이동해 회복합니다.'};}

export const passiveValue = (h, key) => skillsOf(h).filter(s => s.passive && s.effect === key).reduce((v, s) => v + s.power * (1 + (s.rank - 1) * .16), 0) + (h._itemPassives?.[key] || 0);
const gearCache = new WeakMap();
const addStats = (into, from, mult = 1) => { for (const [k, v] of Object.entries(from || {})) into[k] = (into[k] || 0) + v * mult; return into; };
// 장비창 합산: 활성 판정 → 아이템 접사/박음돌/진언 → 세트 보너스. 배치가 바뀔 때만 다시 계산한다.
export function gearBonus(h, s) {
  const items = s.items || {}, placed = h.placed || [];
  const sig = `${s.itemRev || 0}|${h.level}|${h.classId}|${h.path.join()}|${h.grade}|${placed.map(p => `${p.id}${p.x}${p.y}${p.rotated ? 'r' : ''}`).join(',')}`;
  const cached = gearCache.get(h);
  if (cached && cached.sig === sig) { h._itemPassives = cached.bonus.passives; h._skillBonus = cached.bonus.skillBonus; return cached.bonus; }
  const act = activation(h, items), passives = {}, stats = {}; let weight = 0;
  for (const p of placed) { const item = items[p.id]; if (!item) continue; weight += weightOf(item); if (act.get(p.id)?.active) addStats(passives, itemPassives(item)); }
  const sets = setProgress(h, items, act), grid = effectiveGrid(h);
  for (const [setId, count] of Object.entries(sets)) { const set = SETS[setId]; if (!set) continue; for (let n = 2; n <= Math.min(set.pieces.length, count + (passives.setStep || 0)); n++) { const b = set.bonuses[n]; if (b) { addStats(stats, b.stats); addStats(passives, b.passives); } } }
  const dual = h.path[1] === 'warlord' || passives.dual > 0;
  for (const p of placed) {
    const item = items[p.id], a = act.get(p.id); if (!item || !a?.active) continue;
    let mult = a.secondWeapon && !dual ? .6 : 1;
    if (item.uniqueId === 'wolfclaw') { const d = dims({ ...item, rotated: p.rotated }), g = grid.accessory; if ((p.x === 0 || p.x + d.w === g.w) && (p.y === 0 || p.y + d.h === g.h)) mult *= 2; }
    addStats(stats, itemStats(item), mult);
  }
  const bonus = { stats, passives, weight, act, sets, capacity: weightCapacity(h, stats.str || 0), skillBonus: Math.max(0, Math.round(stats.skills || 0)) };
  gearCache.set(h, { sig, bonus }); h._itemPassives = passives; h._skillBonus = bonus.skillBonus;
  return bonus;
}
export function statsOf(h, s) {
  const base = { atk: 15 + h.level * 3.3, def: 3 + h.level * 1.3, hp: 150 + h.level * 17, crit: .05, haste: 0, leech: 0, spell: 0, petdamage: 0, cooldown: 0, fire: 0, cold: 0, lightning: 0, poison: 0, resFire: 0, resCold: 0, resLightning: 0, resPoison: 0, resAll: 0, dr: 0, regen: 0, move: 0, str: 0, gold: 0, matFind: 0, xp: 0, find: 0, price: 0, thorns: 0, carry: 0, critDmg: 0, revive: 0, skills: 0 };
  if (['barbarian', 'paladin'].includes(h.classId)) { base.hp *= 1.25; base.def += 4; }
  for (const key of ['atk','def','hp']) base[key] *= HERO_GRADES[h.grade ?? 0].multiplier;
  const g = gearBonus(h, s);
  for (const [key, value] of Object.entries(g.stats)) if (key in base) base[key] += value;
  base.atk *= 1 + (g.stats.atkPct || 0); base.def *= 1 + (g.stats.defPct || 0); base.hp *= 1 + (g.stats.hpPct || 0);
  for (const key of ['crit', 'haste', 'leech', 'spell', 'petdamage', 'cooldown']) base[key] += passiveValue(h, key);
  base.atk *= 1 + passiveValue(h, 'damage') + (h.pets.length ? passiveValue(h, 'bond') : 0);
  base.def *= 1 + passiveValue(h, 'defense');
  const load = g.capacity > 0 ? g.weight / g.capacity : 0;
  if (load > 1.2) { base.haste -= .25; base.move -= .25; base.regen = 0; } else if (load > 1) { base.haste -= .1; base.move -= .1; }
  base.revive = (base.revive || 0) + passiveValue(h, 'revive');
  for (const key of ['resFire', 'resCold', 'resLightning', 'resPoison']) base[key] = Math.min(.75, base[key] + base.resAll);
  base.dr = Math.min(.4, base.dr); base.cooldown = Math.min(.6, base.cooldown); base.crit = Math.min(.8, base.crit); base.move = Math.max(-.5, base.move); base.haste = Math.max(-.5, base.haste);
  base.load = load; base.weight = g.weight; base.capacity = g.capacity;
  return base;
}
export const powerOf = (h, s) => Math.round(statsOf(h, s).atk * 4 + statsOf(h, s).def * 2 + statsOf(h, s).hp * .12);
export function makeHero(s, classId, grade = 0) {
  const h = { id: `h${s.nextId++}`, name: defaultHeroName(classId,s.heroes.filter(h=>h.classId===classId).length), nameRevision: 1, classId, grade, level: 1, xp: 0, gold: 100, path: [], skillRanks: {}, skillPoints: 0,
    hp: 200, shield: 0, x: MART.x + (s.heroes.length % 5 - 2) * 36, y: MART.y + 64, zone: 0, standby: false, state: 'depart', target: null, cooldowns: {}, attackCd: 0, recovery: 0,
    bag: { iron: 0, crystal: 0, soul: 0, relic: 0 }, bagKills: 0, kills: 0, arrivalStage: 0, arrivalWait: 0, grid: rollGrid(classId), placed: [], bagItems: [], reviveCd: 0, costume: { palette: 'equipment' }, pets: [], buffs: {}, soul: 0, attacks: 0 };
  h.hp = statsOf(h, s).hp;
  return h;
}
export function createGame() {
  const s = { version: VERSION, campaign:{clears:{}}, combatRevision: COMBAT_REVISION, worldRevision: WORLD.revision, town: freshTown(), nextId: 1, time: 0, day: 1, treasury: 0, operatingGrantApplied: true, materials: { iron: 48, crystal: 9, soul: 0, relic: 0 }, heroes: [], items: {}, warehouse: [], drawer: { gems: {}, runes: {} }, fieldDrops: [], pity: 0, codex: { sets: {}, uniques: {}, mantras: {}, setPieces: {} }, itemRev: 0, enemies: [], corpses: [], effects: [], logs: [], raid: null, bossKills: 0, yield: freshYield(0), difficulty: freshDifficulty(), speed: 2, kills: 0, crafted: 0, sales: 0, upgrades: { forge: 0, clinic: 0, warehouse: 0 }, zoneKills: [0, 0, 0, 0], spawnCd: [0, 0, 0, 0], spawnRates: [1, 1, 1, 1], objectives: [] };
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
  s.effects.push({ x, y, text, color, kind, to, life: kind === 'text' ? 1.1 : kind.startsWith('boss-') ? .9 : .45, max: kind === 'text' ? 1.1 : kind.startsWith('boss-') ? .9 : .45 });
}
export const DIFFICULTY_LOCK = 300;
function freshDifficulty() { return { tier: 0, stage: 1, unlocked: 0, unlockedStage: 1, lockedUntil: 0 }; }
export function difficultyOf(s) { return DIFFICULTIES[s.difficulty.tier]; }
export function zoneStats(s, zone) {
  const D = difficultyOf(s), st = stageMult(s.difficulty.stage), z = ZONES[zone], reward = D.reward * (1 + (s.difficulty.stage - 1) * .15);
  return { hp: BASE_MONSTER.hp * ACT_FACTORS.hp[zone] * D.mult * st, atk: BASE_MONSTER.atk * ACT_FACTORS.atk[zone] * D.mult * st, xp: z.xp * reward, gold: z.gold * reward, mat: 1 + (s.difficulty.stage - 1) * .1 + s.difficulty.tier * .5 };
}
export function setDifficulty(s, tier, stage) {
  if (!Number.isInteger(tier) || !DIFFICULTIES[tier] || !Number.isInteger(stage) || stage < 1 || stage > STAGES) return { ok: false, message: '잘못된 난이도입니다.' };
  if (tier > s.difficulty.unlocked || tier === s.difficulty.unlocked && stage > s.difficulty.unlockedStage) return { ok: false, message: '이전 단계의 보스를 처치해야 해금됩니다.' };
  if (tier === s.difficulty.tier && stage === s.difficulty.stage) return { ok: false, message: '이미 선택한 난이도입니다.' };
  if (s.raid) return { ok: false, message: '보스 전투 중에는 난이도를 바꿀 수 없습니다.' };
  const wait = s.difficulty.lockedUntil - s.time;
  if (wait > 0) return { ok: false, message: `난이도는 변경 후 5분 동안 고정됩니다. ${Math.ceil(wait / 60)}분 뒤에 다시 시도하세요.` };
  s.difficulty.tier = tier; s.difficulty.stage = stage; s.difficulty.lockedUntil = s.time + DIFFICULTY_LOCK;
  s.enemies = s.enemies.filter(n => n.boss || n.minion); s.corpses = [];
  for (const h of s.heroes){h.target=null;if(!availableZone(s,h.zone)){h.zone=0;if(h.state==='hunt')h.state='depart';}}
  log(s, `난이도 변경: ${DIFFICULTIES[tier].name} ${stage}단계 · 몬스터가 새로 나타납니다.`, 'system');
  return { ok: true, message: `${DIFFICULTIES[tier].name} ${stage}단계로 변경했습니다. 5분 동안 고정됩니다.` };
}
export function spawnEnemy(s, zone, elite = false, variant) {
  const z = ZONES[zone];
  const type = z.monsters[variant === undefined ? Math.floor(Math.random() * z.monsters.length) : variant % z.monsters.length];
  const m = MONSTERS[type];
  const camps=CAMPS.filter(c=>c.zone===zone),camp=camps[Math.floor(Math.random()*camps.length)];
  const angle = Math.random() * Math.PI * 2, radius = camp.radius * (.15 + Math.random() * .85);
  const spawn=nearestWalkable({x:camp.x+Math.cos(angle)*radius,y:camp.y+Math.sin(angle)*radius});
  const zs = zoneStats(s, zone), hp = zs.hp * m.hp * (elite ? 4 : 1);
  const e = { id: `e${s.nextId++}`, type, zone, tier: s.difficulty.tier, x: spawn.x, y: spawn.y, hp, maxHp: hp, atk: zs.atk * (elite ? 1.7 : 1), elite,
    cd: Math.random(), specialCd: 7, contributors: {}, dots: [], slow: 0, stun: 0, curse: 0, fear: 0, taunt: null, summoned: false };
  s.enemies.push(e);
  return e;
}
// During a boss raid every hero fights in ACT IV and standby is suspended.
const zoneOf = (s, h) => s.raid ? (s.raid.zone??3) : h.zone;
const restingOf = (s, h) => h.standby && !s.raid;
export const RAID_COST = 500, RAID_DURATION = 240, RAID_COOLDOWN = 1200;
export const raidCooldownLeft = s => Math.max(0, (s.raidReadyAt || 0) - s.time);
export const RAID_RESET_PER_MINUTE = 100;
export const raidResetCost = s => Math.ceil(raidCooldownLeft(s) / 60) * RAID_RESET_PER_MINUTE;
export function resetRaidCooldown(s) {
  const left = raidCooldownLeft(s);
  if (left <= 0) return { ok: false, message: '봉인문은 이미 열려 있습니다.' };
  const cost = raidResetCost(s);
  if (s.treasury < cost) return { ok: false, message: `쿨타임 초기화에는 운영금 ${cost} G가 필요합니다.` };
  s.treasury -= cost; s.raidReadyAt = s.time;
  log(s, `운영금 ${cost} G로 봉인문 쿨타임 ${Math.ceil(left / 60)}분을 초기화했습니다.`, 'system');
  return { ok: true, message: `쿨타임을 초기화했습니다 (${cost} G). 이제 보스를 소환할 수 있습니다.` };
}
function nearby(s, target, radius = 80) { return s.enemies.filter(e => e.hp > 0 && e.zone === target.zone && dist(e, target) < radius); }
function heal(s, h, value, source = h) {
  const max = statsOf(h, s).hp, extra = Math.max(0, h.hp + value - max);
  h.hp = Math.min(max, h.hp + value);
  if (passiveValue(source, 'overheal')) h.shield = Math.min(max, h.shield + extra);
  effect(s, h.x, h.y - 24, `+${Math.round(value)}`, '#9bce9c');
  // Healing grants support credit on nearby fights; death rewards are still a shared pool.
  for (const e of s.enemies) if (e.hp > 0 && e.contributors[h.id] && dist(e, source) < 180) e.contributors[source.id] = (e.contributors[source.id] || 0) + value * .5;
}
function hurtHero(s, h, raw, e, element = null) {
  if(h.state==='dead'||h.hp<=0)return;
  const stat = statsOf(h, s);
  let value = Math.max(1, raw * 100 / (100 + stat.def * 4));
  if (element && RES_KEY[element]) value *= 1 - stat[RES_KEY[element]];
  value *= 1 - stat.dr;
  if (h.buffs.guard > 0) value *= .55;
  if (h.buffs.rage > 0) value *= .8;
  if (h.buffs.weaken > 0) value *= 1.3;
  const absorbed = Math.min(h.shield, value);
  h.shield -= absorbed; value -= absorbed; h.hp -= value;
  if (value > 1) effect(s, h.x, h.y - 14, `−${Math.ceil(value)}`, '#cc7e71');
  if (e && passiveValue(h, 'thorns')) damage(s, h, e, raw * passiveValue(h, 'thorns'), false, true);
  if (e && stat.thorns) damage(s, h, e, stat.thorns, false, true);
  if (h.hp <= 0) {
    if (stat.revive > 0 && !(h.reviveCd > 0)) { h.hp = stat.hp * .5; h.reviveCd = 600; h.shield = 0; effect(s, h.x, h.y - 40, '부활!', '#ffe9a8'); log(s, `${h.name} · 장비의 힘으로 쓰러지지 않았습니다.`, 'level'); return; }
    h.hp = 0; h.state = 'dead'; h.recovery = 12; h.soulAtClinic=false; h.buffs={};h.shield=0; h.pets = []; h.target = null;
    log(s, `${h.name} 쓰러짐. 영혼이 회복소로 돌아갑니다.`, 'danger');
  }
}
function damage(s, h, e, raw, spell = false, reactive = false) {
  if (!e || e.hp <= 0) return;
  const st = statsOf(h, s);
  let amount = raw * (h.buffs.rage > 0 ? 1.3 : 1) * (h.buffs.weaken > 0 ? .8 : 1);
  if (spell) amount *= 1 + st.spell;
  if (e.curse > 0) amount *= 1.25 + passiveValue(h, 'expose');
  if (e.elite || e.boss) amount *= 1 + passiveValue(h, 'boss');
  if (e.hp < e.maxHp * .35) amount *= 1 + passiveValue(h, 'execute');
  if (!spell && !reactive) {
    amount += st.fire + st.cold + st.lightning;
    if (st.cold > 0) e.slow = Math.max(e.slow, 1.2);
    if (st.poison > 0 && !e.dots.some(d => d.heroId === h.id && d.type === 'venom')) e.dots.push({ heroId: h.id, type: 'venom', damage: st.poison, life: 3, tick: 1 });
  }
  const crit = Math.random() < st.crit;
  if (crit) amount *= 1.65 + st.critDmg;
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
// Boss facings match the sprite strip: S, SW, W, NW, N, NE, E, SE (screen y grows downward).
export const FACING_VECTORS = [[0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]].map(([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; });
export function facingTo(from, to) { const a = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2; return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
export const SPIN = { first: 9, cooldown: 18, step: .3, range: 230, cone: Math.cos(Math.PI / 6), damage: .55, weaken: 3 };
// Dark spin: the boss turns through all eight facings, loosing a shadow beam each step. Heroes
// inside the beam's 60° cone take dark damage and are weakened.
function darkBeam(s, e, facing) {
  const [dx, dy] = FACING_VECTORS[facing], oy = e.y - 30;
  for (const h of s.heroes) {
    if (h.state !== 'hunt' || zoneOf(s, h) !== e.zone) continue;
    const rx = h.x - e.x, ry = h.y - e.y, d = Math.hypot(rx, ry);
    if (d <= 0 || d > SPIN.range || (rx * dx + ry * dy) / d < SPIN.cone) continue;
    hurtHero(s, h, e.atk * SPIN.damage, e, null); h.buffs.weaken = Math.max(h.buffs.weaken || 0, SPIN.weaken);
  }
  effect(s, e.x, oy, '', '#a56cff', 'dark', { x: e.x + dx * SPIN.range, y: oy + dy * SPIN.range });
}
function bossBehaviour(s, e, target, targets, dt) {
  if(Number.isInteger(e.actBoss)){
    e.facing=facingTo(e,target);e.summonCd-=dt;
    if(e.specialCd<=0){e.specialCd=[8,7,9,6][e.actBoss];const radius=[85,120,100,140][e.actBoss];for(const h of targets.filter(h=>dist(h,e)<radius))hurtHero(s,h,e.atk*[.9,1.1,.8,1.3][e.actBoss],e,e.actBoss===3?'fire':null);effect(s,e.x,e.y,'',MONSTERS[e.type].color,'boss-blast');effect(s,e.x,e.y-55,['묘역의 비명','왕릉의 심판','가시 폭발','용암 분출'][e.actBoss],MONSTERS[e.type].color);}
    if(e.summonCd<=0){e.summonCd=18;if(s.enemies.filter(n=>n.minion&&n.hp>0).length<4){const n=spawnEnemy(s,e.zone,false,e.actBoss===0?3:0);Object.assign(n,nearestWalkable({x:e.x+60,y:e.y+40}));n.hp=n.maxHp=Math.round(n.maxHp*.5);n.minion=true;n.summoned=true;effect(s,n.x,n.y,'',MONSTERS[e.type].color,'boss-summon');}}return;
  }
  e.summonCd = (e.summonCd ?? 12) - dt; e.spinCd = (e.spinCd ?? SPIN.first) - dt;
  if (e.spin) {
    const step = Math.min(7, Math.floor((s.time - e.spin.started) / SPIN.step));
    while (e.spin.step < step) { e.spin.step++; e.facing = e.spin.step; darkBeam(s, e, e.facing); }
    if (s.time - e.spin.started >= SPIN.step * 8) { e.spin = null; e.facing = facingTo(e, target); }
    return;
  }
  e.facing = facingTo(e, target);
  if (e.spinCd <= 0) {
    e.spinCd = SPIN.cooldown; e.spin = { started: s.time, step: -1 };
    effect(s, e.x, e.y - 40, '암흑 선회', '#c9a0ff'); bossBehaviour(s, e, target, targets, 0); return;
  }
  if (e.specialCd <= 0) {
    e.specialCd = 7;
    for (const h of s.heroes) if (h.state === 'hunt' && dist(h, e) < 110) hurtHero(s, h, e.atk * .7, null);
    effect(s, e.x, e.y, '', '#ff8a3c', 'boss-blast'); effect(s, e.x, e.y - 40, '잿불 폭발', '#ffb457');
  }
  if (e.summonCd <= 0) {
    e.summonCd = 15;
    const minions = s.enemies.filter(n => n.minion && n.hp > 0).length;
    for (let i = 0; i < 2 && minions + i < 6; i++) { const n = spawnEnemy(s, 3, false, i); n.x = e.x + (i ? 40 : -40); n.y = e.y + 20; n.hp = Math.round(n.maxHp * .35); n.maxHp = n.hp; n.summoned = true; n.minion = true; }
    effect(s, e.x, e.y, '', '#c9a0ff', 'boss-summon');
    effect(s, e.x, e.y - 40, '부하 소환', '#c9a0ff');
  }
}
// Fixed difficulty targets: equipment improves the party without strengthening its opponent.
export function bossStats(s) {
  const d = difficultyOf(s), stage = s.difficulty.stage;
  return { hp: Math.round(d.bossHp * stageMult(stage) * Math.max(1, s.heroes.length / 5)), atk: Math.round(d.bossAtk * stageMult(stage)) };
}
export function summonBoss(s) {
  const m = MONSTERS[BOSS_TYPE];
  if(!finalBossUnlocked(s))return {ok:false,message:'ACT 4 보스 처치 후 최종보스를 소환할 수 있습니다.'};
  if (s.raid) return { ok: false, message: `${m.name}이(가) 이미 나타나 있습니다.` };
  if (raidCooldownLeft(s) > 0) { const left = raidCooldownLeft(s); return { ok: false, message: `봉인문이 아직 닫혀 있습니다. ${Math.ceil(left / 60)}분 후 다시 소환할 수 있습니다.` }; }
  if (s.treasury < RAID_COST) return { ok: false, message: `보스 소환에는 운영금 ${RAID_COST} G가 필요합니다.` };
  if (!s.heroes.some(h => h.state !== 'dead')) return { ok: false, message: '출전할 수 있는 용사가 없습니다.' };
  s.treasury -= RAID_COST;
  const spawn = nearestWalkable(BOSS_LAIR), {hp, atk} = bossStats(s);
  const e = { id: `e${s.nextId++}`, type: BOSS_TYPE, zone: 3, x: spawn.x, y: spawn.y, hp, maxHp: hp, atk, elite: false, boss: true, minion: false,
    cd: 2, specialCd: 5, summonCd: 12, spinCd: SPIN.first, spin: null, facing: 0, contributors: {}, dots: [], slow: 0, stun: 0, curse: 0, fear: 0, taunt: null, summoned: false };
  s.enemies.push(e);
  s.raid = { bossId: e.id, zone:3,kind:'final', started: s.time, ends: s.time + RAID_DURATION }; s.raidReadyAt = s.time + RAID_COOLDOWN;
  rallyHeroes(s);
  effect(s, e.x, e.y, '', m.color, 'ring');
  log(s, `혼돈의 봉인문이 열렸다! ${m.name} 출현 · 모든 용사가 마을 북쪽 봉인진으로 출격합니다.`, 'boss');
  return { ok: true, message: `${m.name} 소환! 모든 용사가 마을 북쪽 봉인진으로 향합니다.`, boss: e };
}
function endRaid(s, outcome, e) {
  const m = MONSTERS[e?.type||BOSS_TYPE];
  const act=e?.actBoss;
  s.raid = null;
  s.enemies = s.enemies.filter(n => !n.boss && !n.minion);
  for (const h of s.heroes) if (h.state === 'hunt' || h.state === 'depart') { h.state = h.standby ? 'return' : 'depart'; h.target = null; }
  if(outcome==='win'&&Number.isInteger(act)){
    const key=campaignKey(s),before=actProgress(s);s.campaign.clears[key]=Math.max(before,act+1);
    const bounty=Math.round((250+act*150)*difficultyOf(s).reward);s.treasury+=bounty;
    for(const h of s.heroes.filter(h=>e.contributors[h.id]>0)){h.kills++;h.xp+=zoneStats(s,act).xp*12;h.bag.soul+=act+1;levelUp(s,h);}
    log(s,`${m.name} 처치 · ${bounty} G${act>=before?act===3?' · 최종보스 소환 해금':` · ACT ${act+2} 해금`:''}`,'boss');return;
  }
  if (outcome === 'win') {
    const D = difficultyOf(s), zs = zoneStats(s, 3), participants = s.heroes.filter(p => e.contributors[p.id] > 0), bounty = Math.round(2000 * D.reward);
    for (const p of participants) { p.xp += zs.xp * 20; p.gold += zs.gold * 25; p.kills++; p.bag.soul += 3 * D.reward; levelUp(s, p); }
    s.treasury += bounty; s.bossKills++;
    const f = s.difficulty;
    if (f.tier === f.unlocked && f.stage === f.unlockedStage && (f.unlockedStage < STAGES || f.unlocked < DIFFICULTIES.length - 1)) {
      if (f.unlockedStage < STAGES) f.unlockedStage++;
      else if (f.unlocked < DIFFICULTIES.length - 1) { f.unlocked++; f.unlockedStage = 1; }
      log(s, `${DIFFICULTIES[f.unlocked].name} ${f.unlockedStage}단계가 열렸습니다! 사냥터 화면에서 선택하세요.`, 'boss');
    }
    log(s, `${m.name} 처치! 현상금 ${bounty} G · 참여 용사 ${participants.length}명 · 영혼 결정 3개씩`, 'boss');
    if (participants.length) bossLoot(s, e, participants);
  } else log(s, `${m.name}이(가) 봉인문 너머로 물러났습니다. 다음 기회에 다시 도전하세요.`, 'boss');
}
function kill(s, h, e) {
  if (e.boss) { s.kills++; effect(s, e.x, e.y - 30, '보스 처치!', '#ffd27a'); endRaid(s, 'win', e); return; }
  s.kills++; s.zoneKills[e.zone]++;
  const z = ZONES[e.zone], zs = zoneStats(s, e.zone), reward = e.elite ? 5 : 1;
  s.corpses.push({ x: e.x, y: e.y, zone: e.zone, type: e.type, life: 12, revived: e.revived || e.summoned });
  if (s.corpses.length > 100) s.corpses.shift();
  const participants = s.heroes.filter(p => e.contributors[p.id] > 0 && p.state !== 'dead');
  const share = Math.max(1, participants.length);
  for (const p of participants) {
    const st = statsOf(p, s);
    p.xp += zs.xp * reward / share * (1 + st.xp); p.gold += zs.gold * reward / share * (1 + st.gold); p.kills++;
    p.bag[z.material] += reward / share * (1 + st.matFind) * zs.mat; p.bag.iron += e.zone > 0 ? reward / share * (1 + st.matFind) * zs.mat : 0;
    p.bagKills++;
    levelUp(s, p);
  }
  if (participants.length) dropLoot(s, e, participants);
  h.soul = Math.min(5, h.soul + (passiveValue(h, 'soul') ? 1 : 0));
  if (passiveValue(h, 'onkill')) h.buffs.rage = 6;
  if (passiveValue(h, 'spread') && e.curse > 0) nearby(s, e, 90).forEach(n => n.curse = 6);
  if (passiveValue(h, 'shatter') && (e.slow > 0 || e.stun > 0)) nearby(s, e, 60).forEach(n => damage(s, h, n, statsOf(h, s).atk * .7, true, true));
  if (e.elite) log(s, `ACT ${z.act} 정예 ${MONSTERS[e.type].name} 처치! 전리품 5배.`, 'loot');
  for (const n of nearby(s, e, 85)) if (MONSTERS[n.type].trait === 'coward') n.fear = 2;
}
export function levelUp(s, h) {
  let gained = 0;
  const cap = levelCap(h);
  while (h.level < cap && h.xp >= xpNeeded(h)) { h.xp -= xpNeeded(h); h.level++; h.skillPoints++; gained++; }
  if(h.level>=cap)h.xp=0;
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
// ---------------------------------------------------------------- 드롭 · 창고
export const warehouseCapacity = s => WAREHOUSE_SIZES[s.upgrades.warehouse || 0];
export const warehouseUsed = s => s.warehouse.length;
export const bagCapacity = (h, s) => Math.floor(6 * (1 + statsOf(h, s).carry));
const SALVAGE = { normal: { iron: 3 }, magic: { iron: 6, crystal: 1 }, rare: { iron: 10, crystal: 4, soul: 1 }, set: { iron: 15, crystal: 8, soul: 4 }, unique: { iron: 15, crystal: 8, soul: 4 } };
export function salvageValue(item) { const out = {}; for (const [k, v] of Object.entries(SALVAGE[item.grade])) out[k] = v * item.tier; if (item.grade === 'set' || item.grade === 'unique') out.relic = 1; return out; }
function destroyItem(s, id) { delete s.items[id]; s.warehouse = s.warehouse.filter(x => x !== id); s.fieldDrops = s.fieldDrops.filter(d => d.id !== id); for (const h of s.heroes) { h.placed = h.placed.filter(p => p.id !== id); h.bagItems = h.bagItems.filter(x => x !== id); } s.itemRev++; }
function locate(s, id) {
  if (s.warehouse.includes(id)) return { kind: 'warehouse' };
  for (const h of s.heroes) { if (h.placed.some(p => p.id === id)) return { kind: 'hero', hero: h }; if (h.bagItems.includes(id)) return { kind: 'bag', hero: h }; }
  if (s.fieldDrops.some(d => d.id === id)) return { kind: 'field' };
  return null;
}
// 창고에 자리가 없으면 자동 분해해 재료로 돌린다.
const PROTECTED_GRADES = ['set', 'unique'];
// Free warehouse slots for a set/unique item by salvaging the cheapest common gear first. Never touches set/unique.
function makeRoom(s, needed) {
  for (const g of ['normal', 'magic', 'rare']) {
    const ids = s.warehouse.filter(id => s.items[id]?.grade === g).sort((a, b) => (s.items[a].ilvl || 0) - (s.items[b].ilvl || 0));
    for (const id of ids) {
      if (warehouseUsed(s) + needed <= warehouseCapacity(s)) return true;
      for (const [k, v] of Object.entries(salvageValue(s.items[id]))) s.materials[k] += v;
      destroyItem(s, id);
    }
  }
  return warehouseUsed(s) + needed <= warehouseCapacity(s);
}
function recordAcquired(s, item, migrating = false) {
  if (!item.setId && !item.uniqueId) return;
  s.codex.setPieces ??= {};
  if (item.setId) s.codex.setPieces[`${item.setId}:${item.setIndex}`] = 1;
  if (item.uniqueId && uniqueById(item.uniqueId) && !item.codexRecorded) s.codex.uniques[item.uniqueId] = migrating ? Math.max(1, s.codex.uniques[item.uniqueId] || 0) : (s.codex.uniques[item.uniqueId] || 0) + 1;
  item.codexRecorded = true;
}
export function storeItem(s, id, why = '입고') {
  const item = s.items[id]; if (!item) return false;
  const need = 1, protectedItem = PROTECTED_GRADES.includes(item.grade);
  if (protectedItem && warehouseUsed(s) + need > warehouseCapacity(s)) {
    const before = s.warehouse.length;
    if (makeRoom(s, need)) log(s, `${displayName(item)} 자리를 만들려고 낮은 등급 장비 ${before - s.warehouse.length}개를 자동 분해했습니다.`, 'info');
  }
  if (warehouseUsed(s) + need <= warehouseCapacity(s)) { s.warehouse.push(id); recordAcquired(s, item); return true; }
  if (protectedItem) return false; // set/unique are never auto-salvaged; the caller keeps the item where it was
  for (const [k, v] of Object.entries(salvageValue(item))) s.materials[k] += v;
  log(s, `창고가 가득 차 ${displayName(item)} 자동 분해 (${why})`, 'info');
  destroyItem(s, id);
  return false;
}
function registerItem(s, item) { item.id = `i${s.nextId++}`; s.items[item.id] = item; s.itemRev++; return item; }
function dropLoot(s, e, participants) {
  const z = ZONES[e.zone], ilvl = z.level + Math.floor(Math.random() * 8) + (e.elite ? 3 : 0), kind = e.elite ? 'elite' : 'normal';
  const findPct = Math.max(...participants.map(p => statsOf(p, s).find));
  const owner = participants[Math.floor(Math.random() * participants.length)];
  dropEquipment(s, e, owner, ilvl, kind, findPct);
  if (Math.random() < (e.elite ? .25 : .04)) { const ids = Object.keys(GEMS), id = ids[Math.floor(Math.random() * ids.length)], q = Math.min(4, Math.floor(ilvl / 16) + (Math.random() < .25 ? 1 : 0)); s.drawer.gems[`${id}:${q}`] = (s.drawer.gems[`${id}:${q}`] || 0) + 1; }
  if (Math.random() < (e.elite ? .15 : .015)) {
    const maxTier = Math.min(6, e.zone + 1 + (e.elite ? 1 : 0)), tier = Math.max(1, maxTier - Math.floor(Math.random() ** 2 * maxTier)), pool = RUNE_LIST.filter(r => r.tier === tier), r = pool[Math.floor(Math.random() * pool.length)];
    s.drawer.runes[r.id] = (s.drawer.runes[r.id] || 0) + 1; log(s, `각인석 ${r.name} 획득`, 'loot');
  }
}
// A successful equipment roll creates only a set/unique beam; ineligible levels yield no equipment.
function dropEquipment(s, e, owner, ilvl, kind, findPct) {
  const grade = rollDropGrade(kind, findPct);
  if (!grade) return;
  const generated = generateItem({ ilvl, grade, kind, classId: owner.classId, codex: s.codex, source: kind === 'boss' ? 'boss' : 'drop' });
  if (!PROTECTED_GRADES.includes(generated.grade)) return;
  const item = registerItem(s, generated);
  s.fieldDrops.push({ id: item.id, zone: e.zone, x: Math.round(e.x), y: Math.round(e.y), expires: s.time + FIELD_DROP_TIME });
  if (s.fieldDrops.length > MAX_FIELD_DROPS) { const old = s.fieldDrops.shift(); if (!storeItem(s, old.id, '오래된 빛기둥')) s.fieldDrops.unshift(old); }
  effect(s, e.x, e.y - 30, `${GRADES[item.grade].name}!`, GRADES[item.grade].color);
  log(s, `✦ ${GRADES[item.grade].name} ${item.name} 발견! 빛기둥을 눌러 획득하세요.`, 'loot');
}
function bossLoot(s, e, participants) {
  const ilvl = Math.min(85, 45 + s.bossKills * 2), findPct = Math.max(...participants.map(p => statsOf(p, s).find));
  const owner = participants[Math.floor(Math.random() * participants.length)];
  dropEquipment(s, e, owner, ilvl, 'boss', findPct);
}
// 창고의 같은 등급 장비를 한꺼번에 분해한다. 세트·유니크는 하나씩만.
export function salvageAll(s, grade) {
  if (!['normal', 'magic', 'rare'].includes(grade)) return { ok: false, message: '세트·유니크는 하나씩 분해하세요.' };
  const ids = s.warehouse.filter(id => s.items[id]?.grade === grade);
  if (!ids.length) return { ok: false, message: `창고에 ${GRADES[grade].name} 장비가 없습니다.` };
  const gain = {};
  for (const id of ids) { for (const [k, v] of Object.entries(salvageValue(s.items[id]))) { gain[k] = (gain[k] || 0) + v; s.materials[k] += v; } destroyItem(s, id); }
  const text = Object.entries(gain).map(([k, v]) => `${({ iron: '철', crystal: '마력석', soul: '영혼 결정', relic: '유물의 정수' })[k]} ${v}`).join(', ');
  log(s, `${GRADES[grade].name} 장비 ${ids.length}개 분해 · ${text}`, 'info');
  return { ok: true, message: `${GRADES[grade].name} ${ids.length}개 분해 · ${text}` };
}
export function pickupFieldDrop(s, id) {
  const drop = s.fieldDrops.find(d => d.id === id), item = s.items[id];
  if (!drop || !item) return { ok: false, message: '이미 사라진 전리품입니다.' };
  const stored = storeItem(s, id, '빛기둥 획득');
  if (!stored) return { ok: false, message: `창고에 아이템 1개를 보관할 자리가 없어 ${item.name}을(를) 가져오지 못했습니다. 창고를 정리하거나 확장한 뒤 다시 누르세요.` };
  s.fieldDrops = s.fieldDrops.filter(d => d.id !== id);
  log(s, `${GRADES[item.grade].name} ${item.name} 획득 · 창고 입고`, 'loot');
  return { ok: true, message: `${item.name} 획득! 창고에 보관했습니다.`, item };
}
// Offline income is estimated from what heroes actually bring home while the game runs.
export const OFFLINE = { efficiency: .6, capSeconds: 8 * 3600, minSeconds: 60, window: 120 };
const MATERIAL_KEYS = ['iron', 'crystal', 'soul'];
function freshYield(time) { return { rate: { iron: 0, crystal: 0, soul: 0 }, acc: { iron: 0, crystal: 0, soul: 0 }, since: time }; }
function rollYield(s) {
  const y = s.yield, minutes = (s.time - y.since) / 60;
  if (minutes < OFFLINE.window / 60) return;
  for (const k of MATERIAL_KEYS) { y.rate[k] = y.rate[k] * .6 + (y.acc[k] / minutes) * .4; y.acc[k] = 0; }
  y.since = s.time;
}
export function offlineRate(s) { return { ...s.yield.rate }; }
export function settleOffline(s, since, now = Date.now()) {
  const seconds = clamp((now - since) / 1000, 0, OFFLINE.capSeconds);
  if (!Number.isFinite(since) || seconds < OFFLINE.minSeconds || s.raid) return null;
  const gained = {};
  for (const k of MATERIAL_KEYS) gained[k] = Math.floor(s.yield.rate[k] * (seconds / 60) * OFFLINE.efficiency);
  if (!MATERIAL_KEYS.some(k => gained[k] > 0)) return null;
  for (const k of MATERIAL_KEYS) s.materials[k] += gained[k];
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
  log(s, `오프라인 ${hours ? `${hours}시간 ` : ''}${minutes}분 동안 용사들이 재료를 모아 왔습니다: 철 ${gained.iron} · 마력석 ${gained.crystal} · 영혼 ${gained.soul}`, 'loot');
  return { seconds, gained, capped: (now - since) / 1000 > OFFLINE.capSeconds };
}
function deposit(s, h) {
  let total = 0;
  for (const k of Object.keys(h.bag)) { total += h.bag[k]; if (s.yield.acc[k] !== undefined) s.yield.acc[k] += h.bag[k]; s.materials[k] += h.bag[k]; h.bag[k] = 0; }
  const n = h.bagItems.length;
  for (const id of h.bagItems) storeItem(s, id, `${h.name} 귀환`);
  h.bagItems = [];
  if (total > 0 || n) log(s, `${h.name} 귀환 · 재료 ${Math.round(total)}개${n ? ` · 장비 ${n}개` : ''} 입고`, 'loot');
  h.bagKills = 0;
}
export function tick(s, dt) {
  applyTownLayout(s.town);
  dt = clamp(dt, 0, .25);
  s.time += dt; s.day = 1 + Math.floor(s.time / 300);
  rollYield(s);
  s.effects.forEach(e => e.life -= dt); s.effects = s.effects.filter(e => e.life > 0);
  s.corpses.forEach(c => c.life -= dt); s.corpses = s.corpses.filter(c => c.life > 0);
  for (const d of [...s.fieldDrops]) if (s.time >= d.expires) { const item = s.items[d.id]; if (!item) { s.fieldDrops = s.fieldDrops.filter(x => x !== d); continue; } if (storeItem(s, d.id, '5분 경과')) { s.fieldDrops = s.fieldDrops.filter(x => x !== d); log(s, `${item.name}이(가) 창고에 자동 입고되었습니다.`, 'loot'); } else { d.expires = s.time + FIELD_DROP_TIME; log(s, `창고가 가득 차 ${item.name} 빛기둥이 5분 더 남아 있습니다. 창고를 정리하세요.`, 'danger'); } }
  for (const z of ZONES) {
    s.spawnCd[z.id] -= dt * s.spawnRates[z.id];
    if (s.raid && z.id === (s.raid.zone??3)) { const boss = s.enemies.find(n => n.id === s.raid.bossId && n.hp > 0); if (!boss) endRaid(s, 'lost'); else if (s.time >= s.raid.ends) endRaid(s, 'timeout',boss); }
    const count = s.enemies.filter(e => e.zone === z.id && e.hp > 0).length;
    const desired = Math.min(18, 7 + s.heroes.filter(h => zoneOf(s, h) === z.id && !restingOf(s, h)).length);
    if (count < desired && s.spawnCd[z.id] <= 0) { const elite = s.zoneKills[z.id] >= 18 && !s.enemies.some(e => e.zone === z.id && e.elite && e.hp > 0); if (elite) s.zoneKills[z.id] = 0; spawnEnemy(s, z.id, elite); s.spawnCd[z.id] = 1.8; }
  }
  for (const h of s.heroes) {
    const st = statsOf(h, s);
    h.hp = Math.min(h.hp, st.hp);
    for (const key of Object.keys(h.buffs)) h.buffs[key] = Math.max(0, h.buffs[key] - dt);
    for (const key of Object.keys(h.cooldowns)) h.cooldowns[key] = Math.max(0, h.cooldowns[key] - dt);
    h.reviveCd = Math.max(0, (h.reviveCd || 0) - dt);
    if (st.regen > 0 && h.state !== 'dead' && h.hp < st.hp) h.hp = Math.min(st.hp, h.hp + st.regen * dt);
    if (!h.buffs.shield && !h.buffs.guard) h.shield = Math.max(0, h.shield - dt * 4);
    if (h.state === 'dead') {
      const clinic=POIS.find(p=>p.id==='spring'),goal={x:clinic.x,y:clinic.y+12},d=dist(h,goal);
      h.hp=0;h.pets=[];h.target=null;
      if(d>3){h.soulAtClinic=false;const step=Math.min(d,160*dt);h.x+=(goal.x-h.x)/d*step;h.y+=(goal.y-h.y)/d*step;}
      else {h.x=goal.x;h.y=goal.y;h.soulAtClinic=true;h.recovery=Math.max(0,h.recovery-dt);
        if(h.recovery===0){h.hp=st.hp;h.state=restingOf(s,h)?'recover':'depart';h.soulAtClinic=false;Object.assign(h,nearestWalkable({x:clinic.x,y:clinic.y+44}));deposit(s,h);log(s,`${h.name} · 회복소에서 부활했습니다.`,'level');}
      }continue;
    }
    if(s.raid&&['arrive','return','recover'].includes(h.state)){if(h.state==='arrive'&&h.arrivalStage===-1){h.x=ARRIVAL.reception.x;h.y=ARRIVAL.reception.y;h.arrivalStage=2;h.arrivalWait=0;}h.state='depart';h.target=null;delete h.restStop;}
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
      if (h.hp >= st.hp) {delete h.restStop; h.pets = []; if (!restingOf(s, h)) h.state = 'depart'; }
      continue;
    }
    if (restingOf(s, h) && (h.state === 'depart' || h.state === 'hunt')) { h.state = 'return'; h.target = null; }
    if (!s.raid&&(h.state === 'return' || h.hp < st.hp * .28 || h.bagKills >= 12)) {
      h.state = 'return'; h.target = null;
      const stop=h.restStop==='oasis'?POIS.find(p=>p.id==='oasis'):null;
      if (move(h, stop?nearestWalkable({x:stop.x,y:stop.y+48}):{ x: MART.x + (Number(h.id.slice(1)) % 5 - 2) * 36, y: MART.y + 64 }, 112 * (1 + st.move), dt)) { deposit(s, h); h.state = 'recover'; }
      continue;
    }
    const zoneId = zoneOf(s, h), z = ZONES[zoneId], boss = s.raid && s.enemies.find(e => e.id === s.raid.bossId && e.hp > 0), dest = boss || z;
    if (h.state === 'depart') { if (move(h, dest, 112 * (1 + st.move), dt) || dist(h, dest) < (boss ? 150 : 130)) h.state = 'hunt'; continue; }
    let target = s.enemies.find(e => e.id === h.target && e.hp > 0 && e.zone === zoneId && (!s.raid||e.boss||e.minion));
    if (!target) { target = s.enemies.filter(e => e.zone === zoneId && e.hp > 0 && (!s.raid||e.boss||e.minion)).sort((a, b) => dist(a, h) - dist(b, h))[0]; h.target = target?.id; }
    if (!target) continue;
    const range = classOf(h).range;
    if (dist(h, target) > range) move(h, target, 58 * (1 + st.move * .5), dt);
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
    e._attackPose=Math.max(0,(e._attackPose||0)-dt);e._casting=Math.max(0,(e._casting||0)-dt);e._moving=false;
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
    if (e.boss && e.spin) { bossBehaviour(s, e, target, targets, dt); continue; }
    const distance = dist(e, target);
    e._facing=target.x<e.x?-1:1;
    if (distance > (m.range || 23)){const ox=e.x,oy=e.y;move(e, target, m.speed * (e.slow ? .45 : 1), dt);e._moving=Math.hypot(e.x-ox,e.y-oy)>.01;}
    e.cd -= dt; e.specialCd -= dt;
    if (e.cd <= 0 && distance < (m.range || 23) + 7) {
      e._attackPose=.4;
      hurtHero(s, target, e.atk * (e.curse > 0 ? .75 : 1), e, m.trait === 'poison' ? 'poison' : m.trait === 'charged' ? 'lightning' : m.trait === 'drain' ? 'cold' : null);
      if (m.trait === 'poison') target.buffs.poison = 4 * (1 - statsOf(target, s).resPoison);
      if (m.trait === 'curse') target.buffs.weaken = 4;
      if (m.trait === 'drain') e.hp = Math.min(e.maxHp, e.hp + e.atk * .3);
      if (m.range) effect(s, e.x, e.y - 8, '', m.color, 'line', { x: target.x, y: target.y - 8 });
      e.cd = e.boss ? (e.hp < e.maxHp * .3 ? 1 : 1.6) : m.trait === 'charge' ? 1.1 : 1.8;
    }
    if (e.boss) { bossBehaviour(s, e, target, targets, dt); continue; }
    if (e.specialCd <= 0) {
      e.specialCd = [9,7.5,6][e.tier??0];e._casting=.65;e._attackPose=.65;
      const skillPower=[1.3,1.65,2][e.tier??0];
      const skillNames={revive:'망자 부활',spawn:'포자 번식',fire:'화염 폭발',poison:'맹독 분사',curse:'쇠약의 눈',drain:'생기 흡수',charged:'전하 방출',charge:'돌진',tough:'지면 강타',melee:'강한 일격',coward:'발톱 난무'};
      effect(s,e.x,e.y-55,skillNames[m.trait]||'강타',m.color);
      effect(s,e.x,e.y,'',m.color,'ring');
      if(['poison','curse','drain','charged'].includes(m.trait)){
        const element={poison:'poison',drain:'cold',charged:'lightning'}[m.trait];
        hurtHero(s,target,e.atk*skillPower,e,element||null);
        if(m.trait==='poison')target.buffs.poison=4*(1-statsOf(target,s).resPoison);
        if(m.trait==='curse')target.buffs.weaken=4;
        if(m.trait==='drain')e.hp=Math.min(e.maxHp,e.hp+e.atk*.4);
        effect(s,e.x,e.y-20,'',m.color,'line',{x:target.x,y:target.y-15});
      }
      if(['charge','tough','melee','coward'].includes(m.trait)){if(m.trait==='charge')move(e,target,150,.3);const reach=m.trait==='tough'?70:50;for(const victim of targets.filter(h=>dist(h,e)<reach)){hurtHero(s,victim,e.atk*skillPower,e);effect(s,victim.x,victim.y,'',m.color,'ring');}}

      if (m.trait === 'revive') {
        const i = s.corpses.findIndex(c => c.zone === e.zone && !c.revived && dist(c, e) < 130);
        if (i >= 0 && s.enemies.filter(n => n.zone === e.zone && n.hp > 0).length < 22) { const c = s.corpses.splice(i, 1)[0]; const n = spawnEnemy(s, e.zone); n.type = c.type; n.x = c.x; n.y = c.y; n.hp = n.maxHp * .4; n.revived = true; effect(s, n.x, n.y, '부활', '#b392c9'); }
      }
      if (m.trait === 'spawn' && s.enemies.filter(n => n.zone === e.zone && n.hp > 0).length < 22) { const n = spawnEnemy(s, e.zone, false, 0); n.x = e.x + 12; n.y = e.y; n.hp *= .3; n.maxHp = n.hp; n.summoned = true; }
      if (m.trait === 'fire') { targets.filter(h => dist(h, target) < 65).forEach(h => hurtHero(s, h, e.atk * skillPower, e, 'fire')); effect(s, target.x, target.y, '', '#c77c50', 'ring'); }
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
  if (!ZONES[zone] || !availableZone(s, zone)) return { ok: false, message: '이전 액트 보스를 처치하면 열립니다.' };
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
// ---------------------------------------------------------------- 장비창 · 제작 · 조합
const gradeName = item => item.mantra ? '진언' : GRADES[item.grade].name;
export function placeItem(s, h, id, zone, x, y, rotated = false) {
  const item = s.items[id]; if (!item) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  const where = locate(s, id); if (!where || where.kind === 'field') return { ok: false, message: '먼저 빛기둥에서 획득하세요.' };
  if (where.kind === 'bag') return { ok: false, message: '귀환 후 창고에 입고되면 배치할 수 있습니다.' };
  if (itemBase(item).zone !== zone) return { ok: false, message: `${displayName(item)}은(는) ${zone === 'weapon' ? '무기칸' : zone === 'armor' ? '방어구칸' : '장신구칸'}에 놓을 수 없습니다.` };
  const own = where.kind === 'hero' && where.hero === h;
  if (!fits(h, s.items, item, zone, x, y, rotated, own ? id : null)) return { ok: false, message: '그 자리에는 들어가지 않습니다.' };
  const st = statsOf(h, s), load = (st.weight - (own ? weightOf(item) : 0) + weightOf(item)) / st.capacity;
  if (load > 1.5) return { ok: false, message: `${h.name}에게 너무 무겁습니다 (${Math.round(load * 100)}% / 150%).` };
  if (!item.purchased) {
    const price = Math.round(item.price * (1 + st.price));
    if (h.gold < price) return { ok: false, message: `${h.name}의 골드가 부족합니다. ${price} G가 필요합니다.` };
    h.gold -= price; s.treasury += price; s.sales += price; item.purchased = true;
    log(s, `${h.name} · ${displayName(item)} 구매 ${price} G`, 'loot');
  }
  if (where.kind === 'warehouse') s.warehouse = s.warehouse.filter(i => i !== id);
  else if (where.kind === 'hero' && !own) where.hero.placed = where.hero.placed.filter(p => p.id !== id);
  const existing = own ? h.placed.find(p => p.id === id) : null;
  if (existing) Object.assign(existing, { zone, x, y, rotated }); else h.placed.push({ id, zone, x, y, rotated });
  s.itemRev++;
  if (item.setId) s.codex.sets[item.setId] = Math.max(s.codex.sets[item.setId] || 0, gearBonus(h, s).sets[item.setId] || 0);
  h.hp = Math.min(h.hp, statsOf(h, s).hp);
  if (!own) log(s, `${h.name} · ${displayName(item)} 배치`, 'loot');
  return { ok: true, message: `${h.name}의 ${zone === 'weapon' ? '무기칸' : zone === 'armor' ? '방어구칸' : '장신구칸'}에 ${displayName(item)} 배치` };
}
export function autoPlace(s, h, id) {
  const item = s.items[id]; if (!item) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  const spot = findSpot(h, s.items, item, h.placed.some(p => p.id === id) ? id : null);
  if (!spot) return { ok: false, message: `${h.name}의 ${itemBase(item).zone === 'weapon' ? '무기칸' : itemBase(item).zone === 'armor' ? '방어구칸' : '장신구칸'}에 빈 자리가 없습니다.` };
  return placeItem(s, h, id, spot.zone, spot.x, spot.y, spot.rotated);
}
export function rotateItem(s, h, id) {
  const p = h.placed.find(p => p.id === id); if (!p) return { ok: false, message: '장비창에 없는 장비입니다.' };
  const item = s.items[id]; if (item.w === item.h) return { ok: false, message: '정사각형 장비는 회전할 필요가 없습니다.' };
  if (!fits(h, s.items, item, p.zone, p.x, p.y, !p.rotated, id)) return { ok: false, message: '회전하면 자리가 겹칩니다.' };
  p.rotated = !p.rotated; s.itemRev++;
  return { ok: true, message: `${displayName(item)} 회전` };
}
export function unplaceItem(s, h, id) {
  const p = h.placed.find(p => p.id === id); const item = s.items[id];
  if (!p || !item) return { ok: false, message: '장비창에 없는 장비입니다.' };
  if (warehouseUsed(s) + 1 > warehouseCapacity(s)) return { ok: false, message: '창고가 가득 찼습니다. 창고를 정리하거나 확장하세요.' };
  h.placed = h.placed.filter(x => x !== p); s.warehouse.push(id); s.itemRev++;
  h.hp = Math.min(h.hp, statsOf(h, s).hp);
  return { ok: true, message: `${displayName(item)}을(를) 창고로 보냈습니다.` };
}
export function salvage(s, id) {
  const item = s.items[id];
  if (!item) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  if (!s.warehouse.includes(id)) return { ok: false, message: '창고에 있는 장비만 분해할 수 있습니다.' };
  const gain = salvageValue(item);
  for (const [k, v] of Object.entries(gain)) s.materials[k] += v;
  destroyItem(s, id);
  return { ok: true, message: `${displayName(item)} 분해 · ${Object.entries(gain).map(([k, v]) => `${({ iron: '철', crystal: '마력석', soul: '영혼 결정', relic: '유물의 정수' })[k]} ${v}`).join(', ')}` };
}
const CRAFT_COST = { iron: 8 };
export function craftCost(tier = 1) { const out = {}; for (const [k, v] of Object.entries(CRAFT_COST)) out[k] = Math.round(v * [1, 1, 2.5, 5][tier]); return out; }
export const craftTierAllowed = (s, tier) => tier === 1 || (tier === 2 && s.upgrades.forge >= 2) || (tier === 3 && s.upgrades.forge >= 4);
export function craft(s, baseKey, tier = 1, rng = Math.random) {
  const b = BASES[baseKey];
  if (!b || ![1, 2, 3].includes(tier)) return { ok: false, message: '제작 항목을 확인하세요.' };
  if (!craftTierAllowed(s, tier)) return { ok: false, message: `${tier}단 베이스 제작에는 제작대 Lv.${tier === 2 ? 2 : 4}가 필요합니다.` };
  if (warehouseUsed(s) + 1 > warehouseCapacity(s)) return { ok: false, message: '창고가 가득 찼습니다. 장비를 분해하거나 창고를 확장하세요.' };
  const cost = craftCost(tier);
  if (Object.entries(cost).some(([k, v]) => s.materials[k] < v)) return { ok: false, message: '제작 재료가 부족합니다.' };
  for (const [k, v] of Object.entries(cost)) s.materials[k] -= v;
  const ilvl = Math.max(TIER_LEVEL[tier], 1 + s.upgrades.forge * 12 + Math.floor(Math.max(...s.heroes.map(h => h.level)) * .5));
  const item = registerItem(s, generateItem({ ilvl, grade: rollCraftGrade(rng), baseKey, tier, source: 'craft', rng }));
  s.warehouse.push(item.id); s.crafted++;
  log(s, `${gradeName(item)} ${item.name} 제작 완료`, 'loot');
  return { ok: true, message: `${gradeName(item)} · ${item.name} 제작 완료`, item };
}
const drawerKey = key => key.startsWith('gem:') ? ['gems', key.slice(4)] : ['runes', key.slice(5)];
export function drawerCount(s, key) { const [k, id] = drawerKey(key); return s.drawer[k][id] || 0; }
function takeDrawer(s, key, n = 1) { const [k, id] = drawerKey(key); s.drawer[k][id] -= n; if (s.drawer[k][id] <= 0) delete s.drawer[k][id]; }
function addDrawer(s, key, n = 1) { const [k, id] = drawerKey(key); s.drawer[k][id] = (s.drawer[k][id] || 0) + n; }
export function insertSocket(s, id, key) {
  const item = s.items[id]; if (!item) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  const [type, insertId] = key.split(':');
  if (!(type === 'gem' && GEMS[insertId]) && !(type === 'rune' && RUNES[insertId])) return { ok: false, message: '박음돌을 선택하세요.' };
  if (drawerCount(s, key) < 1) return { ok: false, message: '서랍에 그 박음돌이 없습니다.' };
  const slot = item.inserts.indexOf(null); if (slot < 0) return { ok: false, message: '빈 홈이 없습니다.' };
  const where = locate(s, id); if (!where || !['warehouse', 'hero'].includes(where.kind)) return { ok: false, message: '창고나 장비창에 있는 장비에만 박을 수 있습니다.' };
  takeDrawer(s, key); item.inserts[slot] = key;
  const m = mantraFor(item);
  if (m) { item.mantra = m.id; s.codex.mantras[m.id] = (s.codex.mantras[m.id] || 0) + 1; log(s, `✦ 진언 '${m.name}' 완성! ${displayName(item)}`, 'level'); }
  item.price = priceOf(item); s.itemRev++;
  return { ok: true, message: m ? `진언 '${m.name}'이 새겨졌습니다!` : `${insertName(key)}을(를) 박았습니다.` };
}
function gemsAtLeast(s, q) { return Object.entries(s.drawer.gems).filter(([k, n]) => Number(k.split(':')[1]) >= q && n > 0).sort((a, b) => Number(a[0].split(':')[1]) - Number(b[0].split(':')[1])); }
function consumeGems(s, q, n) { const avail = gemsAtLeast(s, q); let need = n; if (avail.reduce((v, [, c]) => v + c, 0) < n) return false; for (const [k, c] of avail) { const take = Math.min(c, need); takeDrawer(s, `gem:${k}`, take); need -= take; if (!need) break; } return true; }
export function combine(s, recipe, payload = {}) {
  const item = payload.id ? s.items[payload.id] : null;
  const needMaterials = cost => { if (Object.entries(cost).some(([k, v]) => s.materials[k] < v)) return '재료가 부족합니다.'; for (const [k, v] of Object.entries(cost)) s.materials[k] -= v; return null; };
  if (recipe === 'runeUp') {
    const r = RUNES[payload.rune], idx = RUNE_LIST.indexOf(r); if (!r || idx >= RUNE_LIST.length - 1) return { ok: false, message: '합성할 각인석을 선택하세요.' };
    if (drawerCount(s, `rune:${r.id}`) < 3) return { ok: false, message: `${r.name} 3개가 필요합니다.` };
    if (r.tier >= 4 && s.materials.soul < 5) return { ok: false, message: '은 계열 이상 합성에는 영혼 결정 5가 필요합니다.' };
    if (r.tier >= 4) s.materials.soul -= 5;
    takeDrawer(s, `rune:${r.id}`, 3); const next = RUNE_LIST[idx + 1]; addDrawer(s, `rune:${next.id}`);
    return { ok: true, message: `각인석 ${r.name} ×3 → ${next.name}` };
  }
  if (recipe === 'gemUp') {
    const [gid, q] = String(payload.gem || '').split(':'), g = GEMS[gid], quality = Number(q);
    if (!g || !(quality >= 0 && quality < 4)) return { ok: false, message: '합성할 보석을 선택하세요.' };
    if (drawerCount(s, `gem:${gid}:${quality}`) < 3) return { ok: false, message: `${g.name} 3개가 필요합니다.` };
    takeDrawer(s, `gem:${gid}:${quality}`, 3); addDrawer(s, `gem:${gid}:${quality + 1}`);
    return { ok: true, message: `${g.name} 합성 완료` };
  }
  if (!item) return { ok: false, message: '장비를 선택하세요.' };
  const where = locate(s, item.id); if (!where || !['warehouse', 'hero'].includes(where.kind)) return { ok: false, message: '창고나 장비창의 장비만 조합할 수 있습니다.' };
  const b = itemBase(item);
  if (recipe === 'punch') {
    if (item.grade !== 'normal' || item.sockets > 0 || !b.sockets) return { ok: false, message: '홈이 없는 일반 장비만 뚫을 수 있습니다.' };
    const err = needMaterials({ iron: 20, crystal: 10 }); if (err) return { ok: false, message: err };
    let n = 1; while (n < b.sockets && Math.random() < .5) n++;
    item.sockets = n; item.inserts = Array(n).fill(null); s.itemRev++;
    return { ok: true, message: `${displayName(item)}에 홈 ${n}개가 생겼습니다.` };
  }
  if (recipe === 'clear') {
    if (!item.inserts.some(Boolean)) return { ok: false, message: '비울 홈이 없습니다.' };
    item.inserts = item.inserts.map(() => null); item.mantra = null; item.price = priceOf(item); s.itemRev++;
    return { ok: true, message: '홈을 비웠습니다. 박음돌은 부서졌습니다.' };
  }
  if (recipe === 'reroll') {
    if (!['magic', 'rare'].includes(item.grade)) return { ok: false, message: '매직·레어 장비만 재련할 수 있습니다.' };
    if (drawerCount(s, 'gem:diamond:3') < 1) return { ok: false, message: '정제 백금강 1개가 필요합니다.' };
    const err = needMaterials(item.grade === 'rare' ? { crystal: 10, soul: 10 } : { crystal: 10 }); if (err) return { ok: false, message: err };
    takeDrawer(s, 'gem:diamond:3');
    const fresh = generateItem({ ilvl: item.ilvl, grade: item.grade, baseKey: item.base, tier: item.tier, source: 'recipe' });
    item.affixes = fresh.affixes; item.name = fresh.name; item.nameParts = fresh.nameParts; item.price = priceOf(item); s.itemRev++;
    return { ok: true, message: `재련 완료 · ${item.name}` };
  }
  if (recipe === 'upgrade') {
    if (item.grade === 'normal') { if (item.mantra || item.inserts.some(Boolean)) return { ok: false, message: '박음돌이 있는 장비는 승급할 수 없습니다.' }; const err = needMaterials({ crystal: 5 }); if (err) return { ok: false, message: err }; }
    else if (item.grade === 'magic') { if (gemsAtLeast(s, 3).reduce((v, [, c]) => v + c, 0) < 3) return { ok: false, message: '정제 등급 이상 보석 3개가 필요합니다.' }; const err = needMaterials({ crystal: 20 }); if (err) return { ok: false, message: err }; consumeGems(s, 3, 3); }
    else return { ok: false, message: '일반→매직, 매직→레어만 승급할 수 있습니다.' };
    const grade = item.grade === 'normal' ? 'magic' : 'rare', fresh = generateItem({ ilvl: item.ilvl, grade, baseKey: item.base, tier: item.tier, source: 'recipe' });
    item.grade = fresh.grade; item.affixes = fresh.affixes; item.name = fresh.name; item.nameParts = fresh.nameParts; item.quality = 0; item.sockets = Math.min(item.sockets, 2); item.inserts = item.inserts.slice(0, item.sockets); item.price = priceOf(item); s.itemRev++;
    return { ok: true, message: `승급 완료 · ${GRADES[item.grade].name} ${item.name}` };
  }
  if (recipe === 'tierUp') {
    if (!['set', 'unique'].includes(item.grade) || item.tier >= 3) return { ok: false, message: '3단 미만의 세트·유니크만 올릴 수 있습니다.' };
    const next = item.tier + 1, soul = next === 2 ? 30 : 80, gems = next === 2 ? 2 : 3;
    if (gemsAtLeast(s, 4).reduce((v, [, c]) => v + c, 0) < gems) return { ok: false, message: `완전 보석 ${gems}개가 필요합니다.` };
    const err = needMaterials({ soul }); if (err) return { ok: false, message: err };
    consumeGems(s, 4, gems);
    const def = item.setId ? SETS[item.setId].pieces[item.setIndex].stats : uniqueById(item.uniqueId)?.stats || item.affixes[0].stats;
    const mult = [1, 1, 1.8, 3.2];
    item.tier = next; item.implicit = Object.fromEntries(Object.entries(b.implicit).map(([k, v]) => [k, ['atk', 'def', 'hp', 'thorns', 'regen', 'str'].includes(k) ? Math.round(v * [0, 1, 1.9, 3.4][next]) : v]));
    item.affixes[0].stats = Object.fromEntries(Object.entries(def).map(([k, v]) => [k, ['atk', 'def', 'hp', 'thorns', 'regen', 'str', 'fire', 'cold', 'lightning', 'poison'].includes(k) ? Math.round(v * mult[next]) : v]));
    if (item.setId) item.name = `${SETS[item.setId].name}의 ${b.names[next - 1]}`;
    item.weight = Math.round(b.weight * [1, 1, 1.2, 1.4][next] * 10) / 10; item.price = priceOf(item); s.itemRev++;
    return { ok: true, message: `${displayName(item)} ${next}단 승급!` };
  }
  return { ok: false, message: '조합 항목을 선택하세요.' };
}
export function gearSummary(h, s) { return summarizeGear(h, s.items || {}, gearBonus(h, s).act); }
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
  h.path.push(id); h.cooldowns = {}; h.capNotified = false;
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
  if (!['forge', 'clinic', 'warehouse'].includes(facility)) return { ok: false, message: '시설을 선택하세요.' };
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
  for(const h of s.heroes){if(h.arrivalStage===-1)continue;if(h.state==='recover'){h.x=MART.x+(Number(h.id.slice(1))%5-2)*32;h.y=MART.y+48;}if(h.state!=='dead'&&!isWalkable(h.x,h.y))Object.assign(h,nearestWalkable(h));}
  return {ok:true,message:action.kind==='move'?'시설을 옮겼습니다.':'마을 배치를 저장했습니다.'};
}
export function serialize(s) { return JSON.stringify({ ...s, effects: [], savedAt: Date.now() }, (k, v) => k.startsWith('_') ? undefined : v); }
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
    if (!obj(s) || !safe(s) || ![1,2,VERSION].includes(s.version)) return null;
    const wasVersion = s.version;
    if (s.version < VERSION && !migrateItems(s)) return null;
    if (!Array.isArray(s.heroes) || !s.heroes.length || s.heroes.length > MAX_HEROES || !obj(s.items) || Object.keys(s.items).length > 2000 || !Array.isArray(s.warehouse) || !Array.isArray(s.fieldDrops) || !Array.isArray(s.enemies) || s.enemies.length > 150) return null;
    if (!['time','day','treasury','nextId','kills','crafted','sales'].every(k => num(s[k]) && s[k] >= 0) || !Number.isInteger(s.nextId)) return null;
    if (obj(s.materials)) s.materials.relic ??= 0;
    if (!nums(s.materials) || !['iron','crystal','soul','relic'].every(k => num(s.materials[k]) && s.materials[k] >= 0)) return null;
    s.raidReadyAt ??= 0; s.bossPity ??= 0; if (!num(s.raidReadyAt) || !num(s.bossPity)) return null;
    s.upgrades.warehouse ??= 0;
    if (!obj(s.upgrades) || !['forge','clinic','warehouse'].every(k => Number.isInteger(s.upgrades[k]) && s.upgrades[k] >= 0 && s.upgrades[k] <= 5)) return null;
    s.pity ??= 0; s.itemRev ??= 0; s.codex ??= { sets: {}, uniques: {}, mantras: {} }; s.drawer ??= { gems: {}, runes: {} };
    if (!num(s.pity) || !num(s.itemRev) || !obj(s.codex) || !nums(s.codex.sets) || !nums(s.codex.uniques) || !nums(s.codex.mantras) || !obj(s.drawer) || !nums(s.drawer.gems) || !nums(s.drawer.runes)) return null;
    s.codex.setPieces ??= {};
    if (!obj(s.codex.setPieces) || !Object.entries(s.codex.setPieces).every(([key, value]) => { const [id, index] = key.split(':'); return SETS[id] && /^[0-5]$/.test(index) && key === `${id}:${index}` && value === 1; })) return null;
    if (!Object.keys(s.drawer.gems).every(k => { const [g, q] = k.split(':'); return GEMS[g] && ['0','1','2','3','4'].includes(q) && s.drawer.gems[k] >= 0; }) || !Object.keys(s.drawer.runes).every(k => RUNES[k] && s.drawer.runes[k] >= 0)) return null;
    if (!['zoneKills','spawnCd'].every(k => Array.isArray(s[k]) && s[k].length === 4 && s[k].every(num))) return null;
    if (!Array.isArray(s.logs) || s.logs.length > 60 || !s.logs.every(l => obj(l) && num(l.time) && typeof l.message === 'string' && ['info','system','loot','danger','level','boss'].includes(l.type))) return null;
    if (!Array.isArray(s.corpses) || !s.corpses.every(c => obj(c) && ['x','y','life','zone'].every(k=>num(c[k])) && ZONES[c.zone] && MONSTERS[c.type])) return null;
    s.spawnRates ??= [1,1,1,1]; s.raid ??= null; s.bossKills ??= 0; s.speed = 2;
    if (!obj(s.difficulty)) s.difficulty = freshDifficulty();
    if (s.difficulty.unlockedStage === undefined) s.difficulty.unlockedStage = s.difficulty.tier === s.difficulty.unlocked ? s.difficulty.stage : 1;
    { const f = s.difficulty; if (![f.tier, f.stage, f.unlocked].every(Number.isInteger) || !DIFFICULTIES[f.tier] || !DIFFICULTIES[f.unlocked] || f.tier > f.unlocked || f.stage < 1 || f.stage > STAGES || !num(f.lockedUntil) || !Number.isInteger(f.unlockedStage) || f.unlockedStage < 1 || f.unlockedStage > STAGES || f.tier === f.unlocked && f.stage > f.unlockedStage) return null; }
    const legacyCampaign=s.campaign===undefined;
    if(legacyCampaign)s.campaign={clears:{[campaignKey(s)]:s.bossKills>0?4:0}};
    if(!obj(s.campaign)||!obj(s.campaign.clears)||!Object.entries(s.campaign.clears).every(([k,v])=>/^[0-2]:(?:[1-9]|10)$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=4))return null;
    if(s.raid){s.raid.zone??=3;s.raid.kind??='final';if(!ZONES[s.raid.zone]||!['act','final'].includes(s.raid.kind))return null;}
    if (!obj(s.yield) || !obj(s.yield.rate) || !obj(s.yield.acc) || !num(s.yield.since) || !MATERIAL_KEYS.every(k => num(s.yield.rate[k]) && s.yield.rate[k] >= 0 && num(s.yield.acc[k]) && s.yield.acc[k] >= 0)) s.yield = freshYield(num(s.time) ? s.time : 0);
    if (s.savedAt !== undefined && !num(s.savedAt)) delete s.savedAt;
    if (s.raid !== null && (!obj(s.raid) || typeof s.raid.bossId !== 'string' || !num(s.raid.started) || !num(s.raid.ends))) return null;
    if (!Number.isInteger(s.bossKills) || s.bossKills < 0) return null;
    if (!Array.isArray(s.spawnRates) || s.spawnRates.length !== 4 || !s.spawnRates.every(v => Number.isInteger(v) && v >= 1 && v <= 5)) return null;
    const ids = new Set();
    for (const h of s.heroes) {
      if (!obj(h) || !/^h\d+$/.test(h.id) || ids.has(h.id)) return null; ids.add(h.id);
      if(ZONES[h.zone]&&!availableZone(s,h.zone)){h.zone=0;if(h.state==='hunt')h.state='depart';}
      h.grade ??= 0; h.standby = h.standby === true;
      if (!Number.isInteger(h.grade) || !HERO_GRADES[h.grade]) return null;
      if (typeof h.name !== 'string' || !CLASSES.some(c=>c.id===h.classId) || !Array.isArray(h.path) || h.path.length > 2 || !obj(h.grid) || !Array.isArray(h.placed) || !Array.isArray(h.bagItems) || !nums(h.skillRanks) || !nums(h.cooldowns) || !nums(h.buffs) || !nums(h.bag)) return null;
      if(h.nameRevision!==1){if(names.includes(h.name)&&!h.customName)h.name=defaultHeroName(h.classId,s.heroes.slice(0,s.heroes.indexOf(h)).filter(other=>other.classId===h.classId).length);h.nameRevision=1;}
      h.reviveCd ??= 0; if (!num(h.reviveCd)) return null;
      if (!['weapon','armor','accessory'].every(z => obj(h.grid[z]) && Number.isInteger(h.grid[z].w) && Number.isInteger(h.grid[z].h) && h.grid[z].w >= 1 && h.grid[z].w <= 8 && h.grid[z].h >= 1 && h.grid[z].h <= 8)) return null;
      if (!['hp','xp','gold','x','y','attackCd','recovery','bagKills','kills','shield','skillPoints','soul','attacks'].every(k=>num(h[k])) || h.hp < 0 || h.gold < 0) return null;
      if (!Number.isInteger(h.level) || h.level < 1 || h.level > 100 || !ZONES[h.zone] || !['hunt','depart','return','recover','dead','arrive'].includes(h.state)) return null;
      if (obj(h.bag)) h.bag.relic ??= 0;
      if (!['iron','crystal','soul','relic'].every(k=>num(h.bag[k]) && h.bag[k]>=0) || !obj(h.costume) || !['equipment','ash','crimson','forest','midnight'].includes(h.costume.palette)) return null;
      if (!Array.isArray(h.pets) || h.pets.length > 12 || !h.pets.every(p=>obj(p) && ['x','y','power','life','cd'].every(k=>num(p[k])) && ['skeleton','golem'].includes(p.kind))) return null;
      const c=classOf(h), second=c.branches.find(b=>b.id===h.path[0]);
      if (h.path.length && !second || h.path.length===2 && !second.children.some(b=>b.id===h.path[1])) return null;
      if (!Object.entries(h.skillRanks).every(([id,rank])=>skillsOf(h).some(sk=>sk.id===id) && Number.isInteger(rank) && rank>=1 && rank<=5)) return null;
    }
    if (!validateItems(s, ids, num, obj, nums)) return null;
    for (const e of s.enemies) {
      if (!obj(e) || !MONSTERS[e.type] || !ZONES[e.zone] || !/^e\d+$/.test(e.id) || !nums(e.contributors)) return null;
      if (!['hp','maxHp','atk','x','y','cd','specialCd','slow','stun','curse','fear'].every(k=>num(e[k])) || !Array.isArray(e.dots)) return null;
      if (!e.dots.every(d=>obj(d) && ['damage','life','tick'].every(k=>num(d[k])) && typeof d.heroId==='string')) return null;
      if(e.actBoss!==undefined&&(!Number.isInteger(e.actBoss)||e.actBoss<0||e.actBoss>3||e.type!==ACT_BOSS_TYPES[e.actBoss]))return null;
      e.boss = e.boss === true; e.minion = e.minion === true; if (!Number.isInteger(e.tier) || !DIFFICULTIES[e.tier]) e.tier = 0; if (e.boss) { if (!num(e.summonCd)) e.summonCd = 12; if (!num(e.spinCd)) e.spinCd = SPIN.first; if (!Number.isInteger(e.facing) || e.facing < 0 || e.facing > 7) e.facing = 0; if (e.spin != null && !(obj(e.spin) && num(e.spin.started) && Number.isInteger(e.spin.step))) e.spin = null; }
    }
    if(legacyCampaign&&s.raid?.kind==='final'){const boss=s.enemies.find(e=>e.id===s.raid.bossId);if(boss)Object.assign(boss,nearestWalkable(BOSS_LAIR));rallyHeroes(s);}
    if (s.raid && !s.enemies.some(e => e.boss && e.id === s.raid.bossId && e.hp > 0)) s.raid = null;
    if (!s.raid) s.enemies = s.enemies.filter(e => !e.boss && !e.minion);
    s.town ??= freshTown();
    if(!validateTown(s.town))return null;
    if(s.worldRevision!==undefined&&(!Number.isInteger(s.worldRevision)||s.worldRevision<1||s.worldRevision>WORLD.revision))return null;
    for(const h of s.heroes){h.arrivalStage??=0;h.arrivalWait??=0;if(h.state==='arrive'&&(![-1,0,1,2].includes(h.arrivalStage)||!num(h.arrivalWait)))return null;}
    applyTownLayout(s.town);
    if(wasVersion===1||s.worldRevision!==WORLD.revision){
      const old=wasVersion===1?[{x:235,y:235},{x:785,y:235},{x:235,y:635},{x:785,y:635}]:[{x:656,y:608},{x:2944,y:608},{x:656,y:2160},{x:2944,y:2160}];
      for(const h of s.heroes){
        const p=nearestWalkable(h.state==='hunt'?{x:REGIONS[h.zone].x+clamp(h.x-old[h.zone].x,-260,260),y:REGIONS[h.zone].y+clamp(h.y-old[h.zone].y,-240,240)}:{x:MART.x+(Number(h.id.slice(1))%5-2)*32,y:MART.y+48});
        h.x=p.x;h.y=p.y;h.target=null;h.pets=[];h.arrivalStage=0;h.arrivalWait=0;
        if(!['hunt','dead','recover'].includes(h.state))h.state='depart';
      }
      for(const e of s.enemies){const p=nearestWalkable({x:REGIONS[e.zone].x+clamp(e.x-old[e.zone].x,-280,280),y:REGIONS[e.zone].y+clamp(e.y-old[e.zone].y,-240,240)});e.x=p.x;e.y=p.y;}
      s.corpses=[];s.version=VERSION;s.worldRevision=WORLD.revision;log(s,'새 대륙 도착 · 마을과 사냥터 배치를 갱신했습니다.','system');
    }
    // 예전 테스트 빌드의 일회성 운영금 보정은 종료. 기존 잔액은 그대로 두고 플래그만 기록한다.
    if (s.operatingGrantApplied !== true) s.operatingGrantApplied = true;
    if (s.combatRevision !== undefined && (!Number.isInteger(s.combatRevision) || s.combatRevision < 0 || s.combatRevision > COMBAT_REVISION)) return null;
    if (s.combatRevision !== COMBAT_REVISION) {
      for (const enemy of s.enemies) {
        const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
        const zs = zoneStats(s, enemy.zone), bs = enemy.boss ? bossStats(s) : null;
        enemy.maxHp = bs ? Math.round(bs.hp*(Number.isInteger(enemy.actBoss)?[.18,.32,.5,.72][enemy.actBoss]:1)) : zs.hp * MONSTERS[enemy.type].hp * (enemy.elite ? 4 : 1) * (enemy.minion ? .35 : 1);
        enemy.hp = enemy.maxHp * ratio; enemy.atk = bs ? Math.round(bs.atk*(Number.isInteger(enemy.actBoss)?[.35,.5,.65,.8][enemy.actBoss]:1)) : zs.atk * (enemy.elite ? 1.7 : 1);
      }
      s.combatRevision = COMBAT_REVISION;
    }
    for (const item of Object.values(s.items)) if (!s.fieldDrops.some(d => d.id === item.id)) recordAcquired(s, item, true);
    s.effects = [];
    for (const h of s.heroes) gearBonus(h, s);
    return s;
  } catch { return null; } finally { applyTownLayout(previousTown); }
}
const INSERT_OK = key => key === null || (typeof key === 'string' && (key.startsWith('gem:') ? (() => { const [, g, q] = key.split(':'); return GEMS[g] && ['0','1','2','3','4'].includes(q); })() : key.startsWith('rune:') && RUNES[key.slice(5)]));
function validateItems(s, ids, num, obj, nums) {
  const seen = new Map();
  const note = (id, where) => { if (seen.has(id)) return false; seen.set(id, where); return true; };
  for (const [id, i] of Object.entries(s.items)) {
    if (!obj(i) || i.id !== id || !/^i\d+$/.test(id) || ids.has(id)) return false; ids.add(id);
    const b = BASES[i.base]; if (!b || ![1,2,3].includes(i.tier) || !GRADES[i.grade] || typeof i.name !== 'string' || typeof i.purchased !== 'boolean' || !nums(i.implicit) || !Array.isArray(i.affixes) || !Number.isInteger(i.sockets) || i.sockets < 0 || i.sockets > 6 || !Array.isArray(i.inserts) || i.inserts.length !== i.sockets || !i.inserts.every(INSERT_OK)) return false;
    if (!i.affixes.every(a => obj(a) && typeof a.name === 'string' && nums(a.stats)) || !num(i.ilvl) || !num(i.weight) || !num(i.price)) return false;
    if (i.setId !== null && i.setId !== undefined && (!SETS[i.setId] || !Number.isInteger(i.setIndex) || !SETS[i.setId].pieces[i.setIndex])) return false;
    if (i.uniqueId && !uniqueById(i.uniqueId) && i.origin !== 'migrate') return false;
    if (i.mantra && !MANTRAS.some(m => m.id === i.mantra)) return false;
    i.w = b.w; i.h = b.h; i.rotated = false; i.quality ??= 0; i.nameParts ??= {}; i.origin ??= 'drop';
  }
  for (const id of s.warehouse) if (!s.items[id] || !note(id, 'w')) return false;
  for (const d of s.fieldDrops) if (!obj(d) || !s.items[d.id] || !ZONES[d.zone] || !num(d.x) || !num(d.y) || !num(d.expires) || !note(d.id, 'f')) return false;
  for (const h of s.heroes) {
    for (const id of h.bagItems) if (!s.items[id] || !note(id, 'b')) return false;
    for (const p of h.placed) {
      if (!obj(p) || !s.items[p.id] || !['weapon','armor','accessory'].includes(p.zone) || itemBase(s.items[p.id]).zone !== p.zone || !Number.isInteger(p.x) || !Number.isInteger(p.y) || typeof p.rotated !== 'boolean' || !note(p.id, 'h')) return false;
    }
    for (const p of h.placed) if (!fits(h, s.items, s.items[p.id], p.zone, p.x, p.y, p.rotated, p.id)) return false;
  }
  for (const id of Object.keys(s.items)) if (!seen.has(id)) s.warehouse.push(id);
  return true;
}
// version 1·2 저장: 슬롯 장비를 격자 장비로 바꾼다. 능력치는 implicit로 그대로 보존한다.
function migrateItems(s) {
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  s.items ??= {}; s.warehouse ??= []; s.fieldDrops ??= []; s.drawer ??= { gems: {}, runes: {} }; s.codex ??= { sets: {}, uniques: {}, mantras: {} }; s.pity ??= 0; s.itemRev ??= 0;
  if (!obj(s.upgrades)) return false; s.upgrades.warehouse ??= 0;
  const old = Array.isArray(s.inventory) ? s.inventory : [], WEAPON_OF = { barbarian: 'axe2h', necromancer: 'wand', amazon: 'shortbow', sorceress: 'staff', paladin: 'hammer2h' };
  for (const i of old) {
    if (!obj(i) || typeof i.id !== 'string' || !Number.isInteger(i.rarity) || i.rarity < 0 || i.rarity > 3 || !obj(i.stats)) return false;
    const baseKey = i.slot === 'weapon' ? WEAPON_OF[i.classId] : i.slot === 'armor' ? ['leather', 'chain', 'chain', 'plate'][i.rarity] : 'amulet';
    if (!BASES[baseKey]) return false;
    const item = makeItem(BASES[baseKey], { tier: 1, grade: ['normal', 'magic', 'rare', 'unique'][i.rarity], ilvl: 10 * (i.rarity + 1) });
    item.id = i.id; item.implicit = { ...i.stats }; item.name = i.rarity === 3 ? `옛 시대의 ${i.name}` : String(i.name); item.purchased = i.purchased === true; item.origin = 'migrate'; item.price = Number.isFinite(i.price) ? i.price : priceOf(item);
    if (i.rarity === 3) item.affixes = [{ id: 'legacy', kind: 'fixed', name: '옛 시대의 유물', tier: 3, stats: {} }];
    s.items[item.id] = item;
  }
  for (const h of s.heroes) {
    if (!obj(h)) return false;
    h.grid ??= rollGrid(h.classId); h.placed ??= []; h.bagItems ??= []; h.reviveCd ??= 0;
    const eq = obj(h.equipment) ? h.equipment : {};
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = s.items[eq[slot]]; if (!item) continue;
      const b = itemBase(item); if (b.zone === 'weapon' && (h.grid.weapon.w < b.w || h.grid.weapon.h < b.h)) h.grid.weapon = { w: b.w, h: b.h };
      const spot = findSpot(h, s.items, item);
      if (spot && !h.placed.some(p => p.id === item.id)) h.placed.push({ id: item.id, ...spot });
    }
    delete h.equipment;
  }
  const placed = new Set(s.heroes.flatMap(h => h.placed.map(p => p.id)));
  for (const i of old) if (!placed.has(i.id) && !s.warehouse.includes(i.id)) s.warehouse.push(i.id);
  delete s.inventory; s.version = VERSION;
  return true;
}
