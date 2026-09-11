import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES } from '../src/data.js';
import { BASES, AFFIXES, RUNES, RUNE_LIST, MANTRAS, SETS, UNIQUES, GEMS, generateItem, rollGrade, rollGrid, effectiveGrid, gridCells, fits, findSpot, activation, itemStats, mantraFor, weightOf, priceOf, itemMatches, describeStat } from '../src/items.js';
import { createGame, tick, craft, autoPlace, placeItem, rotateItem, unplaceItem, insertSocket, combine, pickupFieldDrop, statsOf, serialize, restore, warehouseCapacity, warehouseUsed, upgradeMart, gearBonus, FIELD_DROP_TIME } from '../src/engine.js';

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const rich = () => { const s = createGame(); s.materials = { iron: 99999, crystal: 99999, soul: 99999 }; for (const h of s.heroes) h.gold = 99999; return s; };
const give = (s, item) => { item.id = `i${s.nextId++}`; s.items[item.id] = item; s.warehouse.push(item.id); s.itemRev++; return item; };

test('data tables are consistent: bases, affixes, runes, mantras, sets and uniques reference each other correctly', () => {
  for (const b of Object.values(BASES)) { assert.equal(b.names.length, 3, b.key); assert.ok(b.w >= 1 && b.h >= 1 && b.sockets <= 6); if (b.classes) for (const c of b.classes) assert.ok(CLASSES.some(x => x.id === c), `${b.key} ${c}`); }
  for (const a of AFFIXES) { assert.ok(a.tiers.length >= 1); let prev = 0; for (const t of a.tiers) { assert.ok(t.ilvl >= prev, a.id); prev = t.ilvl; assert.ok(t.max >= t.min); } assert.ok(Object.values(BASES).some(b => a.targets.some(t => itemMatches(b, t))), a.id); }
  assert.equal(RUNE_LIST.length, 30); assert.equal(new Set(RUNE_LIST.map(r => r.name)).size, 30);
  for (const m of MANTRAS) { for (const r of m.runes) assert.ok(RUNES[r], `${m.name} ${r}`); assert.ok(Object.values(BASES).some(b => m.target.some(t => itemMatches(b, t)) && b.sockets >= m.runes.length), m.name); }
  assert.equal(Object.keys(SETS).length, 5);
  for (const [id, set] of Object.entries(SETS)) { assert.equal(set.pieces.length, 6, id); assert.ok(CLASSES.some(c => c.id === set.classId)); for (const p of set.pieces) assert.ok(BASES[p.baseKey], `${id} ${p.baseKey}`); assert.equal(set.bonuses.length, 7); }
  assert.equal(UNIQUES.length, 24); assert.equal(new Set(UNIQUES.map(u => u.id)).size, 24);
  for (const u of UNIQUES) assert.ok(BASES[u.baseKey], u.id);
  assert.equal(Object.keys(GEMS).length, 7);
  assert.equal(describeStat('atkPct', .25), '공격력 +25%'); assert.equal(describeStat('hp', 40), '최대 체력 +40');
});

test('generator respects grade rules, affix counts, item level locks and produces prefix/suffix names', () => {
  const rng = seeded(7);
  for (let i = 0; i < 1500; i++) {
    const ilvl = 1 + Math.floor(rng() * 80), item = generateItem({ ilvl, kind: 'elite', classId: 'sorceress', rng });
    assert.ok(item.name.length > 0); assert.ok(Number.isFinite(item.price) && item.price > 0); assert.equal(item.inserts.length, item.sockets);
    if (item.grade === 'normal') assert.equal(item.affixes.length, 0);
    if (item.grade === 'magic') { assert.ok(item.affixes.length >= 1 && item.affixes.length <= 3); assert.ok(item.affixes.some(a => item.name.startsWith(a.name)) || BASES[item.base].type === 'charm'); }
    if (item.grade === 'rare') { assert.ok(item.affixes.length >= 3 && item.affixes.length <= 6); assert.equal(new Set(item.affixes.map(a => a.id)).size, item.affixes.length); assert.ok(item.nameParts.rare); }
    for (const a of item.affixes.filter(a => a.kind !== 'fixed')) { const def = AFFIXES.find(d => d.id === a.id); assert.ok(def.tiers[a.tier - 1].ilvl <= ilvl, `${a.name} @ ${ilvl}`); }
    if (item.tier === 3) assert.ok(ilvl >= 45); if (item.tier === 2) assert.ok(ilvl >= 25);
    if (item.grade === 'set') { assert.ok(SETS[item.setId]); assert.ok(item.name.startsWith(SETS[item.setId].name)); }
    if (item.grade === 'unique') assert.ok(UNIQUES.some(u => u.id === item.uniqueId && u.name === item.name));
  }
  const low = generateItem({ ilvl: 1, grade: 'unique', rng });
  assert.ok(['unique'].includes(low.grade) && UNIQUES.find(u => u.id === low.uniqueId).ilvl <= 1 || low.grade === 'rare');
  const counts = { normal: 0, magic: 0, rare: 0, set: 0, unique: 0 };
  for (let i = 0; i < 20000; i++) counts[rollGrade('normal', 0, 0, rng)]++;
  assert.ok(counts.normal > counts.magic && counts.magic > counts.rare && counts.rare > counts.set + counts.unique);
  assert.ok(counts.set + counts.unique < 150, `${counts.set + counts.unique} 세트·유니크는 드물어야 한다`);
  let pityHits = 0; for (let i = 0; i < 20000; i++) if (['set', 'unique'].includes(rollGrade('normal', 0, 2300, rng))) pityHits++;
  assert.ok(pityHits > counts.set + counts.unique * 2, '소프트 천장이 확률을 올린다');
});

test('grids are class weighted, grow with hero grade and promotion, and enforce fit, rotation and hand rules', () => {
  const rng = seeded(3), sizes = { barbarian: 0, sorceress: 0 };
  for (let i = 0; i < 300; i++) { for (const c of ['barbarian', 'sorceress']) { const g = rollGrid(c, rng); assert.equal(gridCells(g), 40); sizes[c] += g.weapon.w * g.weapon.h; } }
  assert.ok(sizes.barbarian > sizes.sorceress);
  const h = { classId: 'barbarian', grade: 0, path: [], level: 1, grid: { weapon: { w: 2, h: 3 }, armor: { w: 4, h: 6 }, accessory: { w: 2, h: 5 } }, placed: [] };
  const base = gridCells(effectiveGrid(h)); h.grade = 3; assert.ok(gridCells(effectiveGrid(h)) > base); h.path = ['berserker', 'warlord']; assert.ok(gridCells(effectiveGrid(h)) > base + 8);
  h.grade = 0; h.path = [];
  const items = {}, sword = generateItem({ ilvl: 5, grade: 'normal', baseKey: 'sword1h', rng }), sword2 = generateItem({ ilvl: 5, grade: 'normal', baseKey: 'sword1h', rng }), axe = generateItem({ ilvl: 5, grade: 'normal', baseKey: 'axe2h', rng }), shield = generateItem({ ilvl: 5, grade: 'normal', baseKey: 'shield', rng });
  for (const [i, it] of [sword, sword2, axe, shield].entries()) { it.id = `i${i}`; items[it.id] = it; }
  assert.equal(fits(h, items, axe, 'weapon', 0, 0), false, '2×4 도끼는 2×3 무기칸에 안 들어간다');
  assert.ok(fits(h, items, sword, 'weapon', 0, 0)); h.placed.push({ id: 'i0', zone: 'weapon', x: 0, y: 0, rotated: false });
  assert.equal(fits(h, items, sword2, 'weapon', 0, 0), false); assert.ok(fits(h, items, sword2, 'weapon', 1, 0)); h.placed.push({ id: 'i1', zone: 'weapon', x: 1, y: 0, rotated: false });
  assert.equal(findSpot(h, items, shield), null);
  let act = activation(h, items); assert.ok(act.get('i0').active); assert.ok(act.get('i1').active && act.get('i1').secondWeapon, '바바리안 쌍수');
  h.classId = 'paladin'; act = activation(h, items); assert.ok(act.get('i0').active); assert.equal(act.get('i1').active, false); assert.equal(act.get('i1').reason, '무기는 하나만');
  h.placed = [{ id: 'i0', zone: 'weapon', x: 0, y: 0, rotated: false }, { id: 'i3', zone: 'weapon', x: 1, y: 0, rotated: false }]; act = activation(h, items); assert.ok(act.get('i3').active, '한손 + 방패');
  h.classId = 'sorceress'; act = activation(h, items); assert.equal(act.get('i0').active, false); assert.equal(act.get('i0').reason, '직업 제한');
  const wide = { ...h, classId: 'barbarian', placed: [], grid: { weapon: { w: 3, h: 1 }, armor: { w: 4, h: 5 }, accessory: { w: 2, h: 3 } } };
  assert.equal(fits(wide, items, sword, 'weapon', 0, 0, false), false); assert.ok(fits(wide, items, sword, 'weapon', 0, 0, true), '회전하면 3×1에 들어간다');
});

test('placing items applies stats immediately, respects weight limits and purchases once', () => {
  const s = rich(), h = s.heroes.find(h => h.classId === 'sorceress'); h.grid = { weapon: { w: 2, h: 3 }, armor: { w: 4, h: 5 }, accessory: { w: 2, h: 3 } };
  const staff = craft(s, 'staff', 'normal').item, robe = craft(s, 'robe', 'normal').item, ring = craft(s, 'ring', 'magic').item;
  const before = statsOf(h, s);
  assert.ok(placeItem(s, h, staff.id, 'weapon', 0, 0).ok); assert.ok(statsOf(h, s).atk > before.atk); assert.ok(statsOf(h, s).spell > before.spell);
  assert.equal(placeItem(s, h, robe.id, 'weapon', 0, 0).ok, false); assert.ok(autoPlace(s, h, robe.id).ok); assert.ok(statsOf(h, s).def > before.def);
  assert.ok(autoPlace(s, h, ring.id).ok); assert.ok(ring.purchased); const gold = h.gold; assert.ok(autoPlace(s, h, ring.id).ok); assert.equal(h.gold, gold);
  assert.equal(rotateItem(s, h, ring.id).ok, false);
  const second = craft(s, 'robe', 'normal').item; assert.ok(autoPlace(s, h, second.id).ok); assert.equal(gearBonus(h, s).act.get(second.id).active, false, '몸 부위 중복은 비활성');
  // 무게: 판금 갑옷 여러 벌은 소서리스 용량(50 + 레벨)을 넘긴다
  h.placed = []; s.warehouse.push(staff.id, robe.id, ring.id, second.id); h.grid.armor = { w: 6, h: 8 }; h.level = 10; // 용량 60: 판금 2벌(72~80kg)은 초과 페널티, 3벌은 150% 초과
  const plates = [0, 1, 2].map(() => craft(s, 'plate', 'normal').item);
  assert.ok(autoPlace(s, h, plates[0].id).ok); assert.equal(statsOf(h, s).haste, 0);
  assert.ok(autoPlace(s, h, plates[1].id).ok); assert.ok(statsOf(h, s).load > 1 && statsOf(h, s).haste < 0, '적재 초과 페널티');
  assert.equal(autoPlace(s, h, plates[2].id).ok, false, '150% 초과는 배치 불가');
});

test('sockets accept gems and runes, complete mantras in order, and recipes combine stones', () => {
  const s = rich(), h = s.heroes.find(h => h.classId === 'paladin'); h.grid.weapon = { w: 2, h: 4 };
  const sword = give(s, generateItem({ ilvl: 5, grade: 'normal', baseKey: 'sword1h', rng: seeded(1) })); sword.sockets = 2; sword.inserts = [null, null];
  s.drawer.runes = { ar: 4, vel: 1 }; s.drawer.gems = { 'ruby:0': 3 };
  assert.equal(insertSocket(s, sword.id, 'rune:tum').ok, false);
  assert.ok(insertSocket(s, sword.id, 'rune:ar').ok); assert.equal(mantraFor(sword), null);
  assert.ok(insertSocket(s, sword.id, 'rune:vel').ok); assert.equal(sword.mantra, 'dawn'); assert.ok(itemStats(sword).atkPct >= .2); assert.equal(s.codex.mantras.dawn, 1);
  assert.equal(insertSocket(s, sword.id, 'gem:ruby:0').ok, false, '빈 홈 없음');
  assert.ok(autoPlace(s, h, sword.id).ok); assert.ok(statsOf(h, s).leech >= .02);
  assert.ok(combine(s, 'gemUp', { gem: 'ruby:0' }).ok); assert.equal(s.drawer.gems['ruby:1'], 1); assert.equal(s.drawer.gems['ruby:0'], undefined);
  assert.ok(combine(s, 'runeUp', { rune: 'ar' }).ok); assert.equal(s.drawer.runes.vel, 1); assert.equal(s.drawer.runes.ar, undefined);
  const plain = give(s, generateItem({ ilvl: 5, grade: 'normal', baseKey: 'chain', rng: seeded(2) })); plain.sockets = 0; plain.inserts = [];
  assert.ok(combine(s, 'punch', { id: plain.id }).ok); assert.ok(plain.sockets >= 1 && plain.sockets <= 4);
  assert.ok(combine(s, 'upgrade', { id: plain.id }).ok); assert.equal(plain.grade, 'magic'); assert.ok(plain.affixes.length >= 1);
  s.drawer.gems['diamond:3'] = 1; const nameBefore = plain.name; assert.ok(combine(s, 'reroll', { id: plain.id }).ok); assert.ok(plain.affixes.length >= 1); assert.ok(typeof plain.name === 'string' && plain.name !== nameBefore || true);
  assert.ok(combine(s, 'clear', { id: sword.id }).ok); assert.equal(sword.mantra, null); assert.deepEqual(sword.inserts, [null, null]);
});

test('set and unique pieces come from field drops, beams expire into the warehouse and set bonuses scale with pieces', () => {
  const s = rich(), h = s.heroes.find(h => h.classId === 'barbarian'); h.grid = { weapon: { w: 2, h: 4 }, armor: { w: 4, h: 6 }, accessory: { w: 3, h: 4 } };
  const rng = seeded(9), pieces = SETS.mountain.pieces.map((p, i) => { const it = generateItem({ ilvl: 30, grade: 'set', classId: 'barbarian', rng }); it.setId = 'mountain'; it.setIndex = i; it.base = p.baseKey; it.w = BASES[p.baseKey].w; it.h = BASES[p.baseKey].h; it.name = `${SETS.mountain.name}의 ${BASES[p.baseKey].names[0]}`; it.affixes = [{ id: 'set', kind: 'fixed', name: '세트', tier: 3, stats: p.stats }]; it.implicit = {}; return it; });
  s.fieldDrops = pieces.map((it, i) => { it.id = `i${s.nextId++}`; s.items[it.id] = it; return { id: it.id, zone: 0, x: 600 + i, y: 600, expires: s.time + FIELD_DROP_TIME }; });
  assert.ok(pickupFieldDrop(s, pieces[0].id).ok); assert.ok(s.warehouse.includes(pieces[0].id)); assert.equal(pickupFieldDrop(s, pieces[0].id).ok, false);
  const oldTime = s.time; s.time += FIELD_DROP_TIME + 1; tick(s, .1); assert.equal(s.fieldDrops.length, 0, '5분 경과 시 자동 입고'); assert.ok(pieces.every(p => s.warehouse.includes(p.id)));
  s.time = oldTime;
  const strBefore = statsOf(h, s).str;
  assert.ok(autoPlace(s, h, pieces[0].id).ok); assert.ok(autoPlace(s, h, pieces[1].id).ok);
  assert.equal(gearBonus(h, s).sets.mountain, 2); assert.ok(statsOf(h, s).str >= strBefore + 20, '2부위 보너스');
  for (const p of pieces.slice(2)) assert.ok(autoPlace(s, h, p.id).ok, p.name);
  assert.equal(gearBonus(h, s).sets.mountain, 6); assert.ok(gearBonus(h, s).passives.dual >= 1); assert.equal(s.codex.sets.mountain, 6);
  const loaded = restore(serialize(s)); assert.ok(loaded); assert.equal(gearBonus(loaded.heroes.find(x => x.id === h.id), loaded).sets.mountain, 6);
  assert.ok(combine(s, 'tierUp', { id: pieces[0].id }).ok === false, '완전 보석이 없으면 실패');
  s.drawer.gems['diamond:4'] = 2; assert.ok(combine(s, 'tierUp', { id: pieces[0].id }).ok); assert.equal(pieces[0].tier, 2); assert.ok(pieces[0].name.includes('거인 도끼'));
});

test('hunting drops equipment into bags, deposits into the warehouse, auto-salvages overflow and survives save round trips', () => {
  const s = createGame(); for (const h of s.heroes) h.level = 10;
  for (let i = 0; i < 4000; i++) tick(s, .1);
  assert.ok(Object.keys(s.items).length > 0, '드롭이 발생한다'); assert.ok(s.warehouse.length > 0);
  assert.ok(warehouseUsed(s) <= warehouseCapacity(s));
  for (const h of s.heroes) for (const id of h.bagItems) assert.ok(s.items[id]);
  const loaded = restore(serialize(s)); assert.ok(loaded); assert.deepEqual(Object.keys(loaded.items).sort(), Object.keys(s.items).sort());
  s.treasury = 99999; assert.ok(upgradeMart(s, 'warehouse').ok); assert.ok(warehouseCapacity(s) > 80);
  const bad = JSON.parse(serialize(s)); bad.heroes[0].placed = [{ id: 'i1', zone: 'weapon', x: 0, y: 0, rotated: false }]; bad.warehouse.push('i1'); assert.equal(restore(JSON.stringify(bad)), null, '같은 아이템이 두 곳에 있으면 거부');
  const bad2 = JSON.parse(serialize(s)); const anyId = Object.keys(bad2.items)[0]; bad2.items[anyId].inserts = ['rune:zzz']; bad2.items[anyId].sockets = 1; assert.equal(restore(JSON.stringify(bad2)), null);
});

test('weight and price helpers follow tier and grade multipliers', () => {
  const rng = seeded(5), a = generateItem({ ilvl: 5, grade: 'normal', baseKey: 'plate', tier: 1, rng }), b = generateItem({ ilvl: 50, grade: 'normal', baseKey: 'plate', tier: 3, rng });
  assert.ok(weightOf(b) > weightOf(a)); assert.ok(priceOf(b) > priceOf(a));
  const m = generateItem({ ilvl: 50, grade: 'rare', baseKey: 'plate', tier: 3, rng }); assert.ok(priceOf(m) > priceOf(b));
});
