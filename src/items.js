// 장비 시스템 v2 데이터와 순수 규칙. DOM/게임 상태를 건드리지 않는다. 설계: docs/EQUIPMENT_DESIGN.md
// 명칭은 전부 자체 제작(홈·박음돌·각인석·진언·앞말/뒷말). 원작 고유 명칭은 사용하지 않는다.

export const GRADES = {
  normal: { name: '일반', color: '#d8d7c7', price: 1, sprite: 0, order: 0 },
  magic: { name: '매직', color: '#7fb2ff', price: 2.2, sprite: 1, order: 1 },
  rare: { name: '레어', color: '#f1d15b', price: 4.5, sprite: 2, order: 2 },
  set: { name: '세트', color: '#7fdc7a', price: 7, sprite: 3, order: 3 },
  unique: { name: '유니크', color: '#f0a24a', price: 9, sprite: 3, order: 4 }
};
export const MANTRA_COLOR = '#f3e2c0';
export const TIER_LEVEL = [0, 1, 25, 45];
export const TIER_MULT = [0, 1, 1.9, 3.4];
export const TIER_NAMES = ['', '1단', '2단', '3단'];
export const ZONE_NAMES = { weapon: '무기칸', armor: '방어구칸', accessory: '장신구칸' };
export const PART_NAMES = { head: '머리', body: '몸', hands: '손', feet: '발', waist: '허리', ring: '반지', amulet: '목걸이', charm: '부적', totem: '토템' };
export const STAT_INFO = {
  atk: ['공격력', 'flat'], def: ['방어력', 'flat'], hp: ['최대 체력', 'flat'], crit: ['치명타', 'pct'], haste: ['공격 속도', 'pct'], leech: ['생명력 흡수', 'pct'], spell: ['스킬 피해', 'pct'], petdamage: ['소환수 피해', 'pct'], cooldown: ['재사용 감소', 'pct'],
  atkPct: ['공격력', 'pct'], defPct: ['방어력', 'pct'], hpPct: ['최대 체력', 'pct'], fire: ['화염 피해', 'flat'], cold: ['냉기 피해', 'flat'], lightning: ['번개 피해', 'flat'], poison: ['독 피해', 'flat'],
  resFire: ['화염 저항', 'pct'], resCold: ['냉기 저항', 'pct'], resLightning: ['번개 저항', 'pct'], resPoison: ['독 저항', 'pct'], resAll: ['모든 저항', 'pct'], dr: ['피해 감소', 'pct'], regen: ['초당 체력 재생', 'flat'], move: ['이동 속도', 'pct'], str: ['힘', 'flat'],
  gold: ['골드 획득', 'pct'], matFind: ['재료 획득', 'pct'], xp: ['경험치 획득', 'pct'], find: ['장비 발견', 'pct'], price: ['판매가', 'pct'], thorns: ['반사 피해', 'flat'], carry: ['임시 가방', 'pct'], skills: ['모든 스킬', 'rank'], critDmg: ['치명타 피해', 'pct']
};
export const PASSIVE_NAMES = { damage: '피해 증가', defense: '방어 증가', boss: '정예 피해', execute: '처형 피해', capacity: '소환수 최대', thorns: '반사 비율', dot: '지속 피해', double: '추가 타격 확률', onkill: '처치 시 분노', revive: '사망 시 부활', bond: '소환수 유대', basic: '기본 공격 피해' };

// ---------------------------------------------------------------- 베이스 42종
const socketsFor = (w, h) => ({ 1: 0, 2: w === 2 ? 1 : 2, 3: 3, 4: 2, 6: 4, 8: 6 })[w * h] ?? 0;
const base = (key, names, zone, w, h, weight, price, extra) => ({ key, names, zone, w, h, weight, price, sockets: socketsFor(w, h), classes: null, tags: [], implicit: {}, glyph: null, ...extra, kind: extra.kind || zone });
const W = (key, names, w, h, weight, price, hands, classes, implicit, extra = {}) => base(key, names, 'weapon', w, h, weight, price, { hands, classes, implicit, kind: hands === 'off' ? 'offhand' : 'weapon', ...extra });
const A = (key, names, part, w, h, weight, price, implicit, extra = {}) => base(key, names, 'armor', w, h, weight, price, { part, implicit, ...extra });
const X = (key, names, type, w, h, weight, price, implicit, extra = {}) => base(key, names, 'accessory', w, h, weight, price, { type, implicit, ...extra });
export const BASES = Object.fromEntries([
  W('dagger', ['단검', '비수', '암살자의 송곳'], 1, 2, 3, 20, 1, null, { atk: 8, crit: .04, haste: .05 }, { glyph: 'axe' }),
  W('wand', ['완드', '뼈 완드', '망령 완드'], 1, 2, 2, 25, 1, ['necromancer', 'sorceress'], { atk: 6, spell: .08 }, { tags: ['caster', 'necro'], glyph: 'skull' }),
  W('orb', ['보주', '서리 보주', '별의 눈'], 1, 2, 2, 30, 'off', ['sorceress'], { spell: .10, cooldown: .02 }, { tags: ['caster'] }),
  W('skullshield', ['해골 방패', '뼈 방벽', '망자의 문'], 1, 2, 4, 30, 'off', ['necromancer'], { def: 6, petdamage: .08 }, { tags: ['necro'] }),
  W('sword1h', ['장검', '기사검', '별철검'], 1, 3, 8, 35, 1, ['barbarian', 'paladin', 'amazon'], { atk: 14 }, { glyph: 'axe' }),
  W('axe1h', ['손도끼', '전투도끼', '참수 도끼'], 1, 3, 10, 35, 1, ['barbarian', 'paladin'], { atk: 17, haste: -.03 }, { glyph: 'axe' }),
  W('mace1h', ['철퇴', '성전 철퇴', '심판의 철퇴'], 1, 3, 12, 35, 1, ['paladin', 'barbarian'], { atk: 15, dr: .02 }, { glyph: 'shield' }),
  W('javelin', ['투창', '사냥 투창', '폭풍 투창'], 1, 3, 6, 30, 1, ['amazon'], { atk: 13 }, { glyph: 'spear' }),
  W('buckler', ['소형 방패', '원형 방패', '성문 방패'], 1, 2, 6, 25, 'off', ['paladin', 'barbarian', 'amazon'], { def: 8 }),
  W('shield', ['카이트 방패', '탑 방패', '성벽 방패'], 1, 3, 12, 40, 'off', ['paladin', 'barbarian'], { def: 16, dr: .03 }),
  W('towershield', ['대형 방패', '요새 방패', '태양 방벽'], 2, 3, 22, 70, 'off', ['paladin'], { def: 30, dr: .06, move: -.05 }),
  W('sword2h', ['대검', '참마검', '파멸검'], 2, 3, 18, 60, 2, ['barbarian', 'paladin'], { atk: 30 }, { glyph: 'axe' }),
  W('axe2h', ['양손 도끼', '거인 도끼', '학살 도끼'], 2, 4, 28, 70, 2, ['barbarian'], { atk: 42, haste: -.08 }, { glyph: 'axe' }),
  W('hammer2h', ['전쟁 망치', '파쇄 망치', '심판의 망치'], 2, 3, 24, 65, 2, ['paladin', 'barbarian'], { atk: 32, dr: .03 }, { glyph: 'shield' }),
  W('spear', ['창', '미늘창', '폭풍의 창'], 2, 4, 20, 60, 2, ['amazon'], { atk: 34 }, { glyph: 'spear' }),
  W('shortbow', ['단궁', '사냥꾼의 활', '매의 활'], 2, 3, 8, 45, 2, ['amazon'], { atk: 22, haste: .05 }, { glyph: 'bow' }),
  W('longbow', ['장궁', '전쟁 활', '폭풍의 활'], 2, 4, 12, 70, 2, ['amazon'], { atk: 36 }, { glyph: 'bow' }),
  W('staff', ['지팡이', '마도사의 지팡이', '원소의 기둥'], 2, 3, 8, 45, 2, ['sorceress', 'necromancer'], { atk: 12, spell: .18 }, { tags: ['caster'], glyph: 'staff' }),
  W('greatstaff', ['대형 지팡이', '현자의 지팡이', '별의 기둥'], 2, 4, 10, 75, 2, ['sorceress', 'necromancer'], { atk: 16, spell: .28, cooldown: .04 }, { tags: ['caster'], glyph: 'staff' }),
  W('scythe', ['낫', '수확의 낫', '영혼 수확기'], 2, 3, 16, 55, 2, ['necromancer'], { atk: 24, petdamage: .12 }, { tags: ['necro'], glyph: 'skull' }),
  W('greatscythe', ['대낫', '망자의 낫', '종말의 낫'], 2, 4, 22, 80, 2, ['necromancer'], { atk: 34, petdamage: .22 }, { tags: ['necro'], glyph: 'skull' }),
  A('cap', ['가죽 모자', '사냥꾼 모자', '그림자 두건'], 'head', 2, 2, 3, 20, { def: 5, hp: 10 }, { armorLevel: 0 }),
  A('helm', ['철 투구', '기사 투구', '별철 투구'], 'head', 2, 2, 8, 35, { def: 12, hp: 15 }, { armorLevel: 1 }),
  A('crown', ['관', '왕관', '성자의 관'], 'head', 2, 2, 6, 45, { def: 8, spell: .05, gold: .05 }, { sockets: 3, armorLevel: 1 }),
  A('robe', ['로브', '마도사 로브', '별의 로브'], 'body', 2, 3, 5, 30, { def: 8, hp: 20, spell: .06 }, { armorLevel: 0 }),
  A('leather', ['가죽 갑옷', '강화 가죽', '그림자 가죽'], 'body', 2, 3, 10, 35, { def: 16, hp: 30 }, { armorLevel: 0 }),
  A('chain', ['사슬 갑옷', '고리 갑옷', '용비늘 갑옷'], 'body', 2, 3, 22, 55, { def: 28, hp: 40 }, { armorLevel: 1 }),
  A('plate', ['판금 갑옷', '기사 판금', '요새 갑주'], 'body', 2, 3, 40, 90, { def: 45, hp: 55, move: -.05 }, { armorLevel: 2, sockets: 5 }),
  A('gloves', ['가죽 장갑', '사슬 장갑', '건틀릿'], 'hands', 2, 2, 3, 20, { def: 4, haste: .03 }),
  A('boots', ['가죽 장화', '사슬 장화', '판금 장화'], 'feet', 2, 2, 4, 22, { def: 4, move: .05 }),
  A('belt', ['허리띠', '전투 허리띠', '거인의 허리띠'], 'waist', 2, 1, 2, 18, { hp: 15, carry: .10 }),
  X('ring', ['반지', '반지', '반지'], 'ring', 1, 1, 0, 40, {}),
  X('amulet', ['목걸이', '목걸이', '목걸이'], 'amulet', 1, 1, 0, 50, {}, { tags: ['caster'] }),
  X('charmS', ['소부적', '소부적', '소부적'], 'charm', 1, 1, 0, 15, {}),
  X('charmM', ['중부적', '중부적', '중부적'], 'charm', 1, 2, 1, 25, {}),
  X('charmL', ['대부적', '대부적', '대부적'], 'charm', 1, 3, 1, 40, {}),
  X('totem', ['토템', '토템', '토템'], 'totem', 1, 2, 2, 60, { skills: 1 })
].map(b => [b.key, b]));
export const baseName = (key, tier = 1) => BASES[key].names[tier - 1];
export const itemMatches = (b, target) => target === b.key || target === b.zone || target === b.kind || target === b.part || target === b.type || b.tags.includes(target);

// ---------------------------------------------------------------- 앞말 / 뒷말
const aff = (id, kind, group, stat, targets, tiers) => ({ id, kind, group, stat, targets, tiers: tiers.map(([name, ilvl, min, max]) => ({ name, ilvl, min, max: max ?? min })) });
export const AFFIXES = [
  aff('atkPct', 'prefix', 'atkPct', 'atkPct', ['weapon'], [['예리한', 1, .06, .12], ['날카로운', 8, .12, .20], ['잔혹한', 16, .20, .32], ['무자비한', 25, .32, .48], ['파괴적인', 35, .48, .70], ['학살의', 45, .70, .95], ['멸망의', 60, .95, 1.25], ['종말의', 80, 1.25, 1.6]]),
  aff('atkFlat', 'prefix', 'atk', 'atk', ['weapon', 'ring', 'charm'], [['단단한', 1, 2, 4], ['묵직한', 10, 5, 8], ['육중한', 22, 9, 13], ['압도적인', 40, 14, 20]]),
  aff('defPct', 'prefix', 'defPct', 'defPct', ['armor', 'offhand'], [['견고한', 1, .08, .15], ['튼튼한', 8, .15, .25], ['강화된', 16, .25, .40], ['굳건한', 25, .40, .60], ['요새의', 35, .60, .85], ['불굴의', 45, .85, 1.1], ['철벽의', 60, 1.1, 1.5], ['영원한', 80, 1.5, 2]]),
  aff('fire', 'prefix', 'fire', 'fire', ['weapon', 'ring'], [['그을린', 1, 1, 3], ['타오르는', 8, 3, 7], ['불꽃의', 16, 6, 12], ['화염의', 25, 10, 20], ['업화의', 35, 18, 32], ['태양의', 50, 30, 55]]),
  aff('cold', 'prefix', 'cold', 'cold', ['weapon', 'ring'], [['서늘한', 1, 1, 2], ['차가운', 8, 2, 5], ['얼어붙은', 16, 5, 9], ['서리의', 25, 8, 16], ['빙하의', 35, 14, 26], ['극야의', 50, 24, 42]]),
  aff('lightning', 'prefix', 'lightning', 'lightning', ['weapon', 'ring'], [['찌릿한', 1, 1, 4], ['번쩍이는', 8, 3, 9], ['뇌전의', 16, 6, 16], ['폭풍의', 25, 12, 28], ['천둥의', 35, 22, 45], ['벼락의', 50, 40, 70]]),
  aff('poison', 'prefix', 'poison', 'poison', ['weapon', 'ring'], [['역한', 1, 1, 2], ['독 오른', 8, 2, 4], ['부패한', 16, 4, 8], ['맹독의', 25, 7, 14], ['역병의', 35, 12, 22], ['죽음의', 50, 20, 36]]),
  aff('crit', 'prefix', 'crit', 'crit', ['weapon', 'hands', 'ring'], [['정밀한', 1, .02, .04], ['정확한', 10, .04, .06], ['치명적인', 22, .06, .09], ['급소의', 35, .09, .12], ['처형자의', 50, .12, .16]]),
  aff('spell', 'prefix', 'spell', 'spell', ['caster'], [['비전의', 1, .05, .08], ['마도의', 8, .08, .14], ['신비한', 16, .14, .22], ['현자의', 25, .22, .32], ['원소의', 35, .32, .45], ['별빛의', 45, .45, .60], ['심연의', 60, .60, .80]]),
  aff('petdamage', 'prefix', 'petdamage', 'petdamage', ['necro', 'amulet'], [['망자의', 1, .08, .12], ['뼈의', 10, .12, .20], ['군주의', 22, .20, .32], ['지배자의', 40, .32, .60]]),
  aff('find', 'prefix', 'find', 'find', ['accessory', 'head', 'feet'], [['행운의', 1, .05, .10], ['축복받은', 10, .10, .18], ['수집가의', 22, .18, .28], ['보물꾼의', 35, .28, .40], ['왕의', 50, .40, .60]]),
  aff('thorns', 'prefix', 'thorns', 'thorns', ['armor', 'offhand'], [['가시 돋친', 1, 2, 5], ['뾰족한', 10, 5, 10], ['바늘의', 22, 10, 18], ['고슴도치의', 35, 18, 35]]),
  aff('light', 'prefix', 'weight', 'weightMult', ['weapon', 'armor', 'offhand'], [['가벼운', 10, -.3, -.3]]),
  aff('hp', 'suffix', 'hp', 'hp', ['weapon', 'armor', 'accessory', 'offhand'], [['들개의', 1, 8, 15], ['늑대의', 6, 15, 28], ['곰의', 12, 28, 45], ['황소의', 20, 45, 70], ['거인의', 30, 70, 110], ['산맥의', 42, 110, 170], ['거신의', 55, 170, 250], ['태초의', 75, 250, 350]]),
  aff('hpPct', 'suffix', 'hpPct', 'hpPct', ['armor', 'amulet'], [['생기의', 8, .03, .05], ['활력의', 20, .05, .08], ['강건한 심장의', 35, .08, .12], ['불멸의', 50, .12, .20]]),
  aff('str', 'suffix', 'str', 'str', ['waist', 'hands', 'ring', 'charm'], [['짐꾼의', 1, 5, 8], ['노새의', 10, 8, 14], ['황소 등의', 22, 14, 22], ['거인 어깨의', 40, 22, 45]]),
  aff('haste', 'suffix', 'haste', 'haste', ['weapon', 'hands'], [['바람의', 1, .03, .05], ['질풍의', 10, .05, .08], ['섬광의', 20, .08, .12], ['번개 손의', 32, .12, .18], ['찰나의', 48, .18, .25]]),
  aff('move', 'suffix', 'move', 'move', ['feet', 'charm'], [['여행자의', 1, .05, .05], ['방랑자의', 10, .10, .10], ['질주자의', 22, .15, .15], ['순풍의', 40, .20, .25]]),
  aff('leech', 'suffix', 'leech', 'leech', ['weapon', 'ring'], [['거머리의', 1, .02, .03], ['흡혈귀의', 12, .03, .05], ['갈증의', 25, .05, .08], ['피의 군주의', 45, .08, .12]]),
  aff('regen', 'suffix', 'regen', 'regen', ['armor', 'ring'], [['이끼의', 1, 1, 2], ['샘물의', 10, 2, 4], ['재생의', 25, 4, 7], ['불사조의', 45, 7, 12]]),
  aff('resFire', 'suffix', 'resFire', 'resFire', ['armor', 'offhand', 'accessory'], [['재의', 1, .08, .12], ['잉걸불의', 12, .12, .20], ['화산의', 30, .20, .35]]),
  aff('resCold', 'suffix', 'resCold', 'resCold', ['armor', 'offhand', 'accessory'], [['눈의', 1, .08, .12], ['서리 발의', 12, .12, .20], ['겨울의', 30, .20, .35]]),
  aff('resLightning', 'suffix', 'resLightning', 'resLightning', ['armor', 'offhand', 'accessory'], [['구리의', 1, .08, .12], ['피뢰침의', 12, .12, .20], ['폭풍 심장의', 30, .20, .35]]),
  aff('resPoison', 'suffix', 'resPoison', 'resPoison', ['armor', 'offhand', 'accessory'], [['해독의', 1, .08, .12], ['약초의', 12, .12, .20], ['정화의', 30, .20, .35]]),
  aff('resAll', 'suffix', 'resAll', 'resAll', ['amulet', 'offhand', 'charm'], [['순례자의', 5, .04, .06], ['성자의', 20, .06, .10], ['대천사의', 40, .10, .18]]),
  aff('dr', 'suffix', 'dr', 'dr', ['armor', 'offhand'], [['두꺼운 가죽의', 5, .02, .03], ['바위의', 20, .03, .06], ['성벽의', 40, .06, .10]]),
  aff('cooldown', 'suffix', 'cooldown', 'cooldown', ['amulet', 'orb', 'charm'], [['시간의', 1, .02, .03], ['모래시계의', 12, .03, .06], ['순환의', 25, .06, .10], ['영겁의', 45, .10, .15]]),
  aff('gold', 'suffix', 'gold', 'gold', ['accessory', 'feet'], [['상인의', 1, .10, .15], ['행상인의', 10, .15, .25], ['장사꾼의', 22, .25, .40], ['부호의', 40, .40, .70]]),
  aff('matFind', 'suffix', 'matFind', 'matFind', ['accessory', 'hands'], [['채집꾼의', 1, .05, .08], ['광부의', 10, .08, .15], ['탐사자의', 22, .15, .25], ['장인의', 40, .25, .45]]),
  aff('xp', 'suffix', 'xp', 'xp', ['accessory'], [['견습생의', 1, .03, .05], ['학도의', 12, .05, .08], ['수련자의', 25, .08, .12], ['스승의', 45, .12, .20]]),
  aff('price', 'suffix', 'price', 'price', ['amulet', 'ring'], [['단골의', 5, .05, .08], ['큰손의', 20, .08, .14], ['후원자의', 40, .14, .25]]),
  aff('carry', 'suffix', 'carry', 'carry', ['waist', 'charm'], [['자루의', 1, .10, .20], ['배낭의', 12, .20, .35], ['짐마차의', 30, .35, .60]]),
  aff('skills', 'suffix', 'skills', 'skills', ['head', 'amulet', 'weapon'], [['재능의', 15, 1, 1], ['대가의', 40, 1, 1], ['전설의', 65, 2, 2]])
];
export const RARE_FRONT = ['파멸', '황혼', '잿빛', '뼈', '피', '폭풍', '서리', '재', '독', '그림자', '천둥', '심연', '별', '늑대', '까마귀', '용', '무쇠', '유령', '여명', '밤'];
export const RARE_BACK = { weapon: ['송곳니', '발톱', '가시', '비명', '뿔', '노래', '손길'], armor: ['껍질', '파수꾼', '장막', '굴레', '심장', '날개', '갈기'], accessory: ['눈물', '인장', '기억', '증표', '노래', '걸음', '울음'] };

// ---------------------------------------------------------------- 보석 · 각인석 · 진언
export const GEM_QUALITY = ['파편', '원석', '연마', '정제', '완전'];
const gem = (id, name, color, weapon, armor, other) => ({ id, name, color, weapon, armor, other });
export const GEMS = Object.fromEntries([
  gem('ruby', '홍옥', '#e06a5a', ['fire', 3, 6, 10, 16, 24], ['hp', 10, 20, 32, 48, 70], ['resFire', .08, .12, .18, .24, .32]),
  gem('sapphire', '청옥', '#5f9bea', ['cold', 2, 4, 7, 12, 18], ['resCold', .08, .12, .18, .24, .32], ['cooldown', .01, .02, .03, .04, .06]),
  gem('topaz', '황옥', '#e8c95a', ['lightning', 4, 7, 12, 20, 30], ['resLightning', .08, .12, .18, .24, .32], ['find', .04, .08, .12, .16, .24]),
  gem('emerald', '취옥', '#62c38a', ['poison', 1, 2, 4, 6, 9], ['resPoison', .08, .12, .18, .24, .32], ['regen', 1, 2, 3, 5, 8]),
  gem('amethyst', '자수정', '#b07fe0', ['atk', 3, 6, 10, 15, 22], ['def', 5, 10, 16, 24, 36], ['str', 3, 5, 8, 12, 16]),
  gem('diamond', '백금강', '#e9f0f5', ['atkPct', .05, .08, .12, .17, .24], ['resAll', .03, .05, .08, .11, .15], ['spell', .03, .05, .08, .12, .16]),
  gem('soulstone', '영혼석', '#c48f7a', ['leech', .01, .015, .02, .03, .04], ['thorns', 3, 6, 10, 16, 24], ['hpPct', .02, .03, .05, .07, .10])
].map(g => [g.id, g]));
export const RUNE_TIERS = ['재', '돌', '무쇠', '은', '금', '별'];
export const RUNE_TIER_COLORS = ['#b9b4a5', '#a6a08a', '#8fa2ab', '#d8dde3', '#e5c76a', '#c9b6ff'];
const rune = (id, name, tag, tier, weapon, armor, other) => ({ id, name, tag, tier, weapon, armor, other });
export const RUNES = Object.fromEntries([
  rune('ar', '아르', 'AR', 1, { atk: 6 }, { def: 8 }, { def: 8 }), rune('vel', '벨', 'VEL', 1, { haste: .04 }, { move: .04 }, { move: .04 }), rune('tum', '툼', 'TUM', 1, { hp: 12 }, { hp: 18 }, { hp: 18 }), rune('ein', '에인', 'EIN', 1, { crit: .02 }, { resFire: .10 }, { resFire: .10 }), rune('ud', '우드', 'UD', 1, { fire: 5 }, { resCold: .10 }, { resCold: .10 }),
  rune('nak', '나크', 'NAK', 2, { cold: 7 }, { resLightning: .10 }, { resLightning: .10 }), rune('sel', '셀', 'SEL', 2, { lightning: 10 }, { resPoison: .10 }, { resPoison: .10 }), rune('rah', '라흐', 'RAH', 2, { poison: 4 }, { regen: 2 }, { regen: 2 }), rune('yut', '유트', 'YUT', 2, { leech: .02 }, { dr: .02 }, { cooldown: .02 }), rune('kern', '케른', 'KERN', 2, { spell: .08 }, { str: 8 }, { str: 8 }),
  rune('mor', '모르', 'MOR', 3, { atkPct: .15 }, { defPct: .20 }, { hpPct: .04 }), rune('haum', '하움', 'HAUM', 3, { petdamage: .12 }, { thorns: 12 }, { petdamage: .12 }), rune('jin', '진', 'JIN', 3, { atkPct: .10 }, { resAll: .06 }, { resAll: .06 }), rune('par', '파르', 'PAR', 3, { haste: .08 }, { move: .08 }, { haste: .06 }), rune('od', '오드', 'OD', 3, { gold: .15 }, { matFind: .12 }, { find: .10 }),
  rune('gam', '감', 'GAM', 4, { crit: .06 }, { dr: .05 }, { crit: .04 }), rune('rus', '루스', 'RUS', 4, { fire: 20 }, { hp: 60 }, { resFire: .20 }), rune('isen', '이센', 'ISEN', 4, { cold: 17 }, { hp: 60 }, { resCold: .20 }), rune('tak', '타크', 'TAK', 4, { lightning: 35 }, { hp: 60 }, { resLightning: .20 }), rune('noum', '노움', 'NOUM', 4, { poison: 12 }, { hp: 60 }, { resPoison: .20 }),
  rune('kar', '카르', 'KAR', 5, { atkPct: .35 }, { defPct: .45 }, { hpPct: .08 }), rune('zar', '자르', 'ZAR', 5, { skills: 1 }, { skills: 1 }, { skills: 1 }), rune('wen', '웬', 'WEN', 5, { leech: .06 }, { regen: 6 }, { cooldown: .06 }), rune('grim', '그림', 'GRIM', 5, { critDmg: .30 }, { dr: .08 }, { thorns: 30 }), rune('hess', '헤스', 'HESS', 5, { find: .25 }, { find: .20 }, { find: .30 }),
  rune('ast', '아스트', 'AST', 6, { atkPct: .60 }, { resAll: .15 }, { resAll: .15 }), rune('on', '온', 'ON', 6, { skills: 2 }, { skills: 2 }, { skills: 2 }), rune('krum', '크룸', 'KRUM', 6, { haste: .15, move: .10 }, { move: .15 }, { haste: .10 }), rune('sed', '세드', 'SED', 6, { leech: .10 }, { hpPct: .15 }, { regen: 12 }), rune('myr', '뮤르', 'MYR', 6, { weightMult: -1 }, { weightMult: -1 }, { revive: 1 })
].map(r => [r.id, r]));
export const RUNE_LIST = Object.values(RUNES);
const mantra = (id, name, target, runes, stats, passives = {}, note = '') => ({ id, name, target, runes, stats, passives, note });
export const MANTRAS = [
  mantra('dawn', '여명', ['weapon'], ['ar', 'vel'], { atkPct: .20, leech: .02 }, {}, '초반 무기'),
  mantra('ironheart', '무쇠 심장', ['body'], ['tum', 'ein'], { hpPct: .15, dr: .03 }, {}, '초반 몸 방어구'),
  mantra('lantern', '등불', ['head'], ['ud', 'vel'], { find: .15, gold: .10, move: .05 }, {}, '초반 경영'),
  mantra('ember', '잿불', ['weapon'], ['ud', 'ar', 'nak'], { fire: 22, atkPct: .15 }, { dot: .25 }, '화염 근접'),
  mantra('wintersong', '겨울 노래', ['body', 'head'], ['nak', 'tum', 'sel'], { resAll: .12, cold: 6 }, {}, '저항'),
  mantra('veil', '장막', ['offhand'], ['yut', 'rah', 'vel'], { dr: .06, defPct: .15 }, {}, '방패·보주'),
  mantra('thunderstep', '천둥 걸음', ['feet'], ['sel', 'par'], { move: .20, thorns: 15 }, {}, '왕복 시간 단축'),
  mantra('minersong', '광부의 노래', ['body', 'head', 'hands'], ['od', 'kern', 'tum'], { matFind: .30, carry: .40, str: 15 }, {}, '경영'),
  mantra('deadking', '망자의 왕', ['necro'], ['haum', 'rah', 'mor', 'kern'], { petdamage: .40, leech: .03 }, { capacity: 1 }, '네크로맨서'),
  mantra('stormeye', '폭풍의 눈', ['shortbow', 'longbow', 'spear', 'javelin'], ['sel', 'par', 'tak', 'gam'], { lightning: 60, crit: .10 }, { double: .15 }, '아마존'),
  mantra('crusade', '성전', ['mace1h', 'hammer2h'], ['ar', 'jin', 'rus', 'mor'], { atkPct: .50, resAll: .08 }, { damage: .15 }, '팔라딘'),
  mantra('elements', '원소의 서', ['staff', 'greatstaff'], ['kern', 'isen', 'rus', 'tak'], { spell: .50, fire: 10, cold: 10, lightning: 15, cooldown: .10 }, {}, '소서리스'),
  mantra('warcry', '산의 함성', ['axe1h', 'axe2h', 'sword2h'], ['mor', 'par', 'gam', 'kar'], { atkPct: .80, haste: .10, skills: 1 }, {}, '바바리안'),
  mantra('immortal', '불멸의 증표', ['body'], ['jin', 'mor', 'rus', 'wen'], { defPct: .80, resAll: .20, regen: 8, dr: .05 }, {}, '후반 갑옷'),
  mantra('starguide', '별의 인도', ['crown'], ['zar', 'hess', 'jin'], { skills: 2, find: .40, cooldown: .08 }, {}, '후반 투구'),
  mantra('abysscall', '심연의 부름', ['weapon'], ['kar', 'grim', 'gam', 'par', 'ast'], { atkPct: 1.5, crit: .15, critDmg: .50 }, { boss: .20 }, '심연 물리'),
  mantra('starsong', '별의 노래', ['caster'], ['zar', 'wen', 'kern', 'on', 'isen'], { spell: 1.2, skills: 3, cooldown: .20 }, {}, '심연 마법'),
  mantra('journey', '끝없는 여정', ['body'], ['krum', 'sed', 'zar', 'jin', 'on'], { move: .30, skills: 2, regen: 10 }, {}, '심연 방어구'),
  mantra('gateless', '문 없는 성', ['towershield'], ['myr', 'grim', 'kar', 'sed'], { dr: .20, resAll: .25, hpPct: .20 }, {}, '심연 탱커'),
  mantra('martlegend', '마트의 전설', ['crown', 'plate', 'chain'], ['od', 'hess', 'zar'], { gold: .60, matFind: .40, price: .25, find: .30 }, {}, '경영 최종')
];

// ---------------------------------------------------------------- 세트 · 유니크
const piece = (baseKey, stats) => ({ baseKey, stats });
export const SETS = {
  mountain: { name: '산맥의 아들', classId: 'barbarian', ilvl: 20, pieces: [piece('axe2h', { atkPct: .40, leech: .04 }), piece('helm', { hp: 40, dr: .03 }), piece('plate', { defPct: .40, hp: 60 }), piece('gloves', { haste: .08 }), piece('boots', { move: .10, str: 10 }), piece('ring', { str: 15, hp: 30 })],
    bonuses: [null, null, { stats: { str: 20 } }, { stats: { hpPct: .10 } }, { stats: { dr: .10 } }, { stats: { leech: .08, skills: 1 } }, { stats: { dr: .10 }, passives: { dual: 1 }, note: '쌍수 두 번째 무기 100% 적용' }] },
  bones: { name: '뼈 수확자', classId: 'necromancer', ilvl: 20, pieces: [piece('scythe', { petdamage: .30, spell: .15 }), piece('cap', { petdamage: .10, hp: 20 }), piece('robe', { def: 20, hp: 40, spell: .10 }), piece('gloves', { cooldown: .05 }), piece('boots', { move: .10 }), piece('amulet', { petdamage: .20, resAll: .08 })],
    bonuses: [null, null, { stats: { petdamage: .15 } }, { stats: { hpPct: .08 } }, { stats: { spell: .25 } }, { passives: { capacity: 1 }, note: '소환수 최대 +1' }, { passives: { capacity: 1 }, stats: { leech: .05 }, note: '소환수 최대 +1 추가' }] },
  stormhunter: { name: '폭풍 사냥꾼', classId: 'amazon', ilvl: 20, pieces: [piece('shortbow', { lightning: 30, haste: .10 }), piece('cap', { crit: .05, find: .10 }), piece('leather', { defPct: .30, hp: 50 }), piece('gloves', { haste: .10 }), piece('boots', { move: .15 }), piece('ring', { crit: .05, atkPct: .15 })],
    bonuses: [null, null, { stats: { haste: .08 } }, { stats: { lightning: 40 } }, { stats: { crit: .08 } }, { stats: { move: .15 }, passives: { double: .15 } }, { passives: { boss: .30, double: .10 }, note: '정예 피해 30%' }] },
  frostscholar: { name: '서리 학자', classId: 'sorceress', ilvl: 20, pieces: [piece('staff', { spell: .35, cold: 15 }), piece('crown', { skills: 1 }), piece('robe', { hp: 40, resAll: .08 }), piece('gloves', { cooldown: .06 }), piece('boots', { move: .10 }), piece('amulet', { spell: .20, cooldown: .05 })],
    bonuses: [null, null, { stats: { cold: 15 } }, { stats: { cooldown: .08 } }, { stats: { spell: .30 } }, { stats: { cold: 30 }, note: '냉기 피해 강화' }, { stats: { critDmg: .50, cooldown: .10 }, note: '치명타 피해 +50%' }] },
  emberpilgrim: { name: '잿불 순례자', classId: 'paladin', ilvl: 20, pieces: [piece('hammer2h', { atkPct: .30, fire: 18 }), piece('crown', { resAll: .08, hp: 30 }), piece('chain', { defPct: .40, hp: 50 }), piece('gloves', { haste: .06 }), piece('boots', { move: .10, dr: .03 }), piece('amulet', { resAll: .08, regen: 3 })],
    bonuses: [null, null, { stats: { resAll: .10 } }, { stats: { fire: 22 } }, { stats: { atkPct: .25 } }, { passives: { dot: .50 }, note: '화상 피해 50%' }, { stats: { resAll: .15 }, passives: { revive: 1 }, note: '사망 시 1회 부활' }] }
};
const uniq = (id, name, baseKey, ilvl, stats, passives, desc) => ({ id, name, baseKey, ilvl, stats, passives, desc });
export const UNIQUES = [
  uniq('dawnsplitter', '새벽을 가르는 검', 'sword1h', 5, { atk: 22, haste: .10, fire: 6 }, { onkill: 1 }, '처치 시 분노'),
  uniq('tyrantfang', '폭군의 어금니', 'axe2h', 12, { atkPct: .60, leech: .05, haste: -.05 }, { boss: .15 }, '정예 피해 15%'),
  uniq('ashcrown', '잿더미 왕관', 'crown', 14, { spell: .20, resFire: .30, find: .20 }, { dot: .30 }, '지속 피해 30%'),
  uniq('webgloves', '거미줄 장갑', 'gloves', 10, { haste: .15, poison: 5 }, { dot: .15 }, '독 지속 피해 강화'),
  uniq('wayfinder', '길잡이 장화', 'boots', 8, { move: .25, gold: .20 }, {}, '귀환이 빠른 장화'),
  uniq('mulebelt', '노새의 허리띠', 'belt', 6, { str: 30, carry: .60 }, {}, '무게 용량 대폭 증가'),
  uniq('blindseer', '눈먼 점쟁이의 목걸이', 'amulet', 18, { find: .35, xp: .10, resAll: -.10 }, {}, '장비 발견 특화'),
  uniq('wavebreaker', '파도 부수는 창', 'spear', 20, { atk: 50, cold: 15 }, { double: .15 }, '추가 타격 15%'),
  uniq('stormeater', '폭풍을 삼킨 활', 'longbow', 36, { atkPct: 1.2, lightning: 80, haste: .20 }, { double: .10 }, '연쇄 타격'),
  uniq('bonekingscythe', '백골 왕의 낫', 'greatscythe', 38, { petdamage: .50, spell: .25, hpPct: -.10 }, { capacity: 2 }, '소환수 최대 +2'),
  uniq('frostheart', '서리 심장 보주', 'orb', 30, { spell: .40, cold: 30, cooldown: .10 }, { damage: .10 }, '냉기 마법 특화'),
  uniq('wallremnant', '성벽의 잔해', 'towershield', 40, { defPct: 1, dr: .12, resAll: .20, move: -.10 }, { defense: .20 }, '보호막 강화'),
  uniq('ironheartplate', '무쇠 심장 갑주', 'plate', 42, { defPct: .80, hp: 150, thorns: 60, move: -.10 }, { defense: .25 }, '방어 25% 추가'),
  uniq('nameless', '그림자 두건 무명', 'cap', 55, { crit: .15, haste: .15, find: .30 }, { execute: .20 }, '처형 피해 20%'),
  uniq('slaughteraxe', '학살자의 도끼', 'axe2h', 60, { atkPct: 2, leech: .10, str: 40, critDmg: .40 }, { execute: .25 }, '치명타·처형 특화'),
  uniq('starpillar', '별의 기둥', 'greatstaff', 62, { spell: .90, cooldown: .20, skills: 2 }, { damage: .15 }, '마법 궁극 무기'),
  uniq('elementcrown', '원소의 관', 'crown', 58, { skills: 2, resAll: .30, spell: .35 }, {}, '모든 스킬 +2'),
  uniq('regularring', '마트의 단골 반지', 'ring', 25, { price: .30, gold: .30 }, {}, '마트 매출 특화'),
  uniq('giantslayer', '거인 살해자의 반지', 'ring', 45, { atkPct: .25, crit: .08 }, { boss: .40 }, '정예 피해 40%'),
  uniq('cycleamulet', '순환의 목걸이', 'amulet', 50, { cooldown: .25, regen: 8 }, {}, '재사용 감소 특화'),
  uniq('abysseye', '심연의 눈', 'charmS', 65, { find: .50 }, {}, '장비 발견 50%'),
  uniq('wolfclaw', '늑대 발톱 부적', 'charmL', 30, { atkPct: .20, leech: .03 }, {}, '격자 모서리에 놓으면 효과 2배'),
  uniq('kingstoken', '왕의 증표', 'charmM', 70, { skills: 1, resAll: .10 }, { setStep: 1 }, '세트 보너스 1단계 앞당김'),
  uniq('eternalboots', '영원한 여정의 장화', 'boots', 68, { move: .30, defPct: .60, resAll: .15, regen: 6 }, {}, '지치지 않는 장화')
];
export const uniqueById = id => UNIQUES.find(u => u.id === id);

// ---------------------------------------------------------------- 격자 프리셋
const WEAPON_PRESETS = { W3: [1, 3], W4: [2, 2], W6: [2, 3], W8: [2, 4], W12: [3, 4] };
const ACC_PRESETS = { A6: [2, 3], A8: [2, 4], A9: [3, 3], A10: [2, 5], A12: [3, 4] };
const COMBOS = [['W3', 'A12', [5, 5]], ['W4', 'A12', [4, 6]], ['W6', 'A10', [4, 6]], ['W6', 'A9', [5, 5]], ['W8', 'A12', [4, 5]], ['W8', 'A8', [4, 6]], ['W12', 'A8', [4, 5]]];
const WEAPON_WEIGHTS = { barbarian: { W3: 5, W4: 5, W6: 30, W8: 40, W12: 20 }, paladin: { W3: 10, W4: 5, W6: 45, W8: 30, W12: 10 }, amazon: { W3: 10, W4: 5, W6: 45, W8: 35, W12: 5 }, necromancer: { W3: 15, W4: 25, W6: 40, W8: 20, W12: 0 }, sorceress: { W3: 15, W4: 30, W6: 40, W8: 15, W12: 0 } };
export const GRADE_GROWTH = [0, 1, 2, 3]; // 용사 등급별 확장 단계 수
export function rollGrid(classId, rng = Math.random) {
  const weights = WEAPON_WEIGHTS[classId] || WEAPON_WEIGHTS.paladin;
  const total = Object.values(weights).reduce((a, b) => a + b, 0); let r = rng() * total, code = 'W6';
  for (const [k, w] of Object.entries(weights)) { r -= w; if (r <= 0) { code = k; break; } }
  const options = COMBOS.filter(c => c[0] === code), combo = options[Math.floor(rng() * options.length)];
  const [ww, wh] = WEAPON_PRESETS[combo[0]], [aw, ah] = ACC_PRESETS[combo[1]], [rw, rh] = combo[2];
  return { weapon: { w: ww, h: wh }, armor: { w: rw, h: rh }, accessory: { w: aw, h: ah }, preset: `${combo[0]}/${combo[1]}` };
}
// 등급·전직 확장은 저장된 기본 격자에 계산으로 더한다(저장 구조를 바꾸지 않음).
export function effectiveGrid(h) {
  const g = structuredClone(h.grid), steps = GRADE_GROWTH[h.grade ?? 0] + (h.path?.length || 0);
  for (let i = 0; i < steps; i++) { if (i % 2 === 0) g.armor.h++; else g.accessory.h++; }
  return g;
}
export const gridCells = g => g.weapon.w * g.weapon.h + g.armor.w * g.armor.h + g.accessory.w * g.accessory.h;

// ---------------------------------------------------------------- 아이템 계산
export const dims = item => item.rotated ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
export const itemBase = item => BASES[item.base];
export const gradeColor = item => item.mantra ? MANTRA_COLOR : GRADES[item.grade].color;
export const levelReq = item => TIER_LEVEL[item.tier];
export function insertCategory(item) { const b = itemBase(item); return b.kind === 'weapon' ? 'weapon' : b.zone === 'armor' ? 'armor' : 'other'; }
export function insertStats(key, category) {
  const [type, id, q] = key.split(':');
  if (type === 'gem') { const g = GEMS[id], row = g[category]; return { [row[0]]: row[1 + Number(q)] }; }
  if (type === 'rune') return { ...RUNES[id][category] };
  return {};
}
export function insertName(key) { const [type, id, q] = key.split(':'); return type === 'gem' ? `${GEM_QUALITY[Number(q)]} ${GEMS[id].name}` : `각인석 ${RUNES[id].name}`; }
export function insertColor(key) { const [type, id] = key.split(':'); return type === 'gem' ? GEMS[id].color : RUNE_TIER_COLORS[RUNES[id].tier - 1]; }
const addStats = (into, from, mult = 1) => { for (const [k, v] of Object.entries(from || {})) into[k] = (into[k] || 0) + v * mult; return into; };
export function itemStats(item) {
  const stats = addStats({}, item.implicit);
  for (const a of item.affixes) addStats(stats, a.stats);
  const cat = insertCategory(item);
  for (const key of item.inserts) if (key) addStats(stats, insertStats(key, cat));
  if (item.mantra) addStats(stats, MANTRAS.find(m => m.id === item.mantra)?.stats);
  return stats;
}
export function itemPassives(item) {
  const p = {};
  if (item.uniqueId) addStats(p, uniqueById(item.uniqueId)?.passives);
  if (item.mantra) addStats(p, MANTRAS.find(m => m.id === item.mantra)?.passives);
  for (const key of item.inserts) if (key === 'rune:myr' && insertCategory(item) === 'other') p.revive = (p.revive || 0) + 1;
  return p;
}
export function weightOf(item) {
  const st = itemStats(item), mult = Math.max(0, 1 + (st.weightMult || 0));
  return Math.round(item.weight * mult * 10) / 10;
}
export function priceOf(item) {
  const tierSum = item.affixes.reduce((v, a) => v + (a.tier || 0), 0);
  return Math.round(itemBase(item).price * [1, 1, 2.2, 4][item.tier] * GRADES[item.grade].price * (1 + tierSum * .08) * (item.mantra ? 3 : 1));
}
export function mantraFor(item) {
  if (item.grade !== 'normal' || !item.sockets || item.inserts.some(k => !k || !k.startsWith('rune:'))) return null;
  const b = itemBase(item), seq = item.inserts.map(k => k.slice(5)).join(',');
  return MANTRAS.find(m => m.runes.length === item.sockets && m.runes.join(',') === seq && m.target.some(t => itemMatches(b, t))) || null;
}
export function displayName(item) {
  if (item.mantra) return `'${MANTRAS.find(m => m.id === item.mantra).name}' ${baseName(item.base, item.tier)}`;
  return item.name;
}
export function describeStat(key, value) {
  const info = STAT_INFO[key]; if (!info) return null;
  const [name, kind] = info, sign = value >= 0 ? '+' : '−', v = Math.abs(value);
  if (kind === 'pct') return `${name} ${sign}${Math.round(v * 100)}%`;
  if (kind === 'rank') return `${name} ${sign}${v}`;
  return `${name} ${sign}${Math.round(v * 10) / 10}`;
}

// ---------------------------------------------------------------- 생성기
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const between = (min, max, rng) => min + rng() * (max - min);
const roundStat = (key, v) => STAT_INFO[key]?.[1] === 'pct' || key === 'weightMult' ? Math.round(v * 1000) / 1000 : Math.round(v);
// Per kill, before the capped item-find bonus. No pity or guaranteed drops.
export const DROP_TABLE = { normal: { set: .00002, unique: .00001 }, elite: { set: .0008, unique: .0007 }, boss: { set: .015, unique: .01 } };
export const CRAFT_GRADES = { normal: .6, magic: .3, rare: .1 };
export function rollCraftGrade(rng = Math.random) {
  const roll = rng();
  return roll < CRAFT_GRADES.normal ? 'normal' : roll < CRAFT_GRADES.normal + CRAFT_GRADES.magic ? 'magic' : 'rare';
}
export function rollDropGrade(kind, findPct = 0, rng = Math.random) {
  const rates = DROP_TABLE[kind] || DROP_TABLE.normal, mult = 1 + Math.max(0, Math.min(3, findPct)) * .3, roll = rng();
  if (roll < rates.unique * mult) return 'unique';
  if (roll < (rates.unique + rates.set) * mult) return 'set';
  return null;
}
function rollTier(ilvl, rng) {
  if (ilvl >= TIER_LEVEL[3] && rng() < .5) return 3;
  if (ilvl >= TIER_LEVEL[2] && rng() < .5) return 2;
  return 1;
}
function pickBase(ilvl, classId, rng, zoneWeights = { weapon: 35, armor: 40, accessory: 25 }) {
  const roll = rng() * (zoneWeights.weapon + zoneWeights.armor + zoneWeights.accessory);
  const zone = roll < zoneWeights.weapon ? 'weapon' : roll < zoneWeights.weapon + zoneWeights.armor ? 'armor' : 'accessory';
  let pool = Object.values(BASES).filter(b => b.zone === zone);
  if (zone === 'weapon' && classId && rng() < .6) pool = pool.filter(b => !b.classes || b.classes.includes(classId));
  if (zone === 'accessory' && rng() < .35) pool = pool.filter(b => b.type === 'charm');
  return pick(pool, rng);
}
function rollAffixes(b, ilvl, count, rng) {
  const out = [], used = new Set();
  let prefixes = 0, suffixes = 0;
  for (let i = 0; i < count; i++) {
    const cands = AFFIXES.filter(a => !used.has(a.group) && a.targets.some(t => itemMatches(b, t)) && a.tiers.some(t => t.ilvl <= ilvl) && (a.kind === 'prefix' ? prefixes < 3 : suffixes < 3));
    if (!cands.length) break;
    const a = pick(cands, rng), tiers = a.tiers.map((t, idx) => ({ ...t, idx })).filter(t => t.ilvl <= ilvl);
    const weights = tiers.map(t => 1 + Math.max(0, ilvl - t.ilvl) / 20), total = weights.reduce((x, y) => x + y, 0);
    let r = rng() * total, chosen = tiers[tiers.length - 1];
    for (let k = 0; k < tiers.length; k++) { r -= weights[k]; if (r <= 0) { chosen = tiers[k]; break; } }
    used.add(a.group); if (a.kind === 'prefix') prefixes++; else suffixes++;
    out.push({ id: a.id, kind: a.kind, name: chosen.name, tier: chosen.idx + 1, stats: { [a.stat]: roundStat(a.stat, between(chosen.min, chosen.max, rng)) } });
  }
  return out;
}
function implicitFor(b, tier, quality = 0) {
  const mult = TIER_MULT[tier] * (1 + quality * (quality < 0 ? .10 : .15)), out = {};
  for (const [k, v] of Object.entries(b.implicit)) out[k] = ['atk', 'def', 'hp', 'thorns', 'regen', 'str'].includes(k) ? Math.round(v * mult) : v;
  return out;
}
export function makeItem(b, { tier = 1, grade = 'normal', ilvl = 1, quality = 0, rng = Math.random, sockets = 0 } = {}) {
  return { id: null, base: b.key, tier, grade, quality, ilvl, name: baseName(b.key, tier), nameParts: {}, affixes: [], implicit: implicitFor(b, tier, quality), sockets, inserts: Array(sockets).fill(null), mantra: null, setId: null, uniqueId: null,
    weight: Math.round(b.weight * [1, 1, 1.2, 1.4][tier] * (quality > 0 ? .9 : 1) * 10) / 10, w: b.w, h: b.h, rotated: false, purchased: false, price: 0, origin: 'drop' };
}
function finish(item, rng) {
  const b = itemBase(item);
  if (item.grade === 'normal') item.name = `${item.quality < 0 ? '조잡한 ' : item.quality > 0 ? '정교한 ' : ''}${baseName(b.key, item.tier)}`;
  else if (item.grade === 'magic') { const p = item.affixes.find(a => a.kind === 'prefix'), s = item.affixes.find(a => a.kind === 'suffix'); item.name = `${p ? p.name + ' ' : ''}${s ? s.name + ' ' : ''}${baseName(b.key, item.tier)}`; item.nameParts = { prefix: p?.id || null, suffix: s?.id || null }; }
  else if (item.grade === 'rare') { const front = pick(RARE_FRONT, rng), back = pick(RARE_BACK[b.zone], rng); item.name = `${front} ${back}`; item.nameParts = { rare: `${front} ${back}` }; }
  item.price = priceOf(item);
  return item;
}
export function generateItem({ ilvl = 1, grade, kind = 'normal', classId = null, findPct = 0, pity = 0, codex = {}, baseKey = null, tier = null, rng = Math.random, source = 'drop' } = {}) {
  grade ||= rollCraftGrade(rng);
  if (grade === 'set') {
    const own = Object.entries(SETS).filter(([, s]) => s.ilvl <= ilvl && s.classId === classId), any = Object.entries(SETS).filter(([, s]) => s.ilvl <= ilvl);
    const pool = own.length && rng() < .7 ? own : any;
    if (!pool.length) grade = 'rare';
    else {
      const [setId, set] = pick(pool, rng), idx = Math.floor(rng() * set.pieces.length), p = set.pieces[idx], b = BASES[p.baseKey];
      const item = makeItem(b, { tier: 1, grade: 'set', ilvl, rng });
      item.setId = setId; item.setIndex = idx; item.name = `${set.name}의 ${baseName(b.key, item.tier)}`; item.affixes = [{ id: 'set', kind: 'fixed', name: set.name, tier: 3, stats: scaleFixed(p.stats, item.tier, rng) }]; item.origin = source;
      return finish(item, rng);
    }
  }
  if (grade === 'unique') {
    const pool = UNIQUES.filter(u => u.ilvl <= ilvl && (!BASES[u.baseKey].classes || !classId || BASES[u.baseKey].classes.includes(classId) || rng() < .3));
    if (!pool.length) grade = 'rare';
    else {
      const weights = pool.map(u => 1 / (1 + (codex.uniques?.[u.id] || 0))), total = weights.reduce((a, b) => a + b, 0);
      let r = rng() * total, u = pool[pool.length - 1];
      for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { u = pool[i]; break; } }
      const b = BASES[u.baseKey], item = makeItem(b, { tier: 1, grade: 'unique', ilvl, rng, sockets: rng() < .3 ? Math.min(1, b.sockets) : 0 });
      item.uniqueId = u.id; item.name = u.name; item.affixes = [{ id: 'unique', kind: 'fixed', name: u.name, tier: 4, stats: scaleFixed(u.stats, 1, rng) }]; item.origin = source;
      return finish(item, rng);
    }
  }
  const b = baseKey ? BASES[baseKey] : pickBase(ilvl, classId, rng);
  const t = tier || rollTier(ilvl, rng);
  const item = makeItem(b, { tier: t, grade, ilvl, rng, quality: grade === 'normal' ? (rng() < .15 ? -1 : rng() < .18 ? 1 : 0) : 0 });
  item.origin = source;
  if (b.zone !== 'accessory' || b.type === 'charm') {
    const chance = grade === 'normal' ? (source === 'craft' ? .5 : .25) : .15, max = grade === 'normal' ? b.sockets : Math.min(2, b.sockets);
    if (b.sockets && rng() < chance) { let n = 1; while (n < max && rng() < .45) n++; item.sockets = n; item.inserts = Array(n).fill(null); }
  }
  if (b.type === 'charm' && grade === 'normal' && source !== 'craft') item.grade = 'magic';
  const count = item.grade === 'magic' ? (b.type === 'charm' ? (b.key === 'charmS' ? 1 : b.key === 'charmM' ? 1 + (rng() < .5 ? 1 : 0) : 2 + (rng() < .5 ? 1 : 0)) : 1 + (rng() < .45 ? 1 : 0)) : item.grade === 'rare' ? 3 + (rng() < .5 ? 1 : 0) + (rng() < .35 ? 1 : 0) + (rng() < .2 ? 1 : 0) : 0;
  item.affixes = rollAffixes(b, ilvl, count, rng);
  if (item.grade !== 'normal' && !item.affixes.length) item.grade = 'normal';
  return finish(item, rng);
}
function scaleFixed(stats, tier, rng) {
  const out = {};
  for (const [k, v] of Object.entries(stats)) { const mult = ['atk', 'def', 'hp', 'thorns', 'regen', 'str', 'fire', 'cold', 'lightning', 'poison'].includes(k) ? [1, 1, 1.8, 3.2][tier] : 1; out[k] = roundStat(k, v * mult * between(.9, 1.1, rng)); }
  return out;
}

// ---------------------------------------------------------------- 격자 규칙
export function cellsOf(item, x, y) { const d = dims(item), out = []; for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) out.push(`${x + i},${y + j}`); return out; }
export function occupied(h, items, zone, ignoreId = null) {
  const set = new Set();
  for (const p of h.placed) { if (p.zone !== zone || p.id === ignoreId) continue; const item = items[p.id]; if (!item) continue; for (const c of cellsOf({ ...item, rotated: p.rotated }, p.x, p.y)) set.add(c); }
  return set;
}
export function fits(h, items, item, zone, x, y, rotated = false, ignoreId = null) {
  const g = effectiveGrid(h)[zone], d = dims({ ...item, rotated });
  if (x < 0 || y < 0 || x + d.w > g.w || y + d.h > g.h) return false;
  const used = occupied(h, items, zone, ignoreId);
  return cellsOf({ ...item, rotated }, x, y).every(c => !used.has(c));
}
export function findSpot(h, items, item, ignoreId = null) {
  const zone = itemBase(item).zone, g = effectiveGrid(h)[zone];
  for (const rotated of [false, true]) for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (fits(h, items, item, zone, x, y, rotated, ignoreId)) return { zone, x, y, rotated };
  return null;
}
export function totalWeight(h, items) { return h.placed.reduce((v, p) => v + (items[p.id] ? weightOf(items[p.id]) : 0), 0); }
export function weightCapacity(h, str = 0) { return ({ barbarian: 100, paladin: 85, amazon: 70, necromancer: 55, sorceress: 50 })[h.classId] + h.level + str; }
// 활성 판정: 손 규칙, 부위 규칙, 직업, 레벨. 배치 순서를 우선순위로 쓴다.
export function activation(h, items) {
  const result = new Map(); let hands = 0, weapons = 0, offhands = 0; const parts = {}, counts = { ring: 0, amulet: 0, totem: 0 };
  for (const p of h.placed) {
    const item = items[p.id]; if (!item) continue; const b = itemBase(item);
    let reason = null;
    if (b.classes && !b.classes.includes(h.classId)) reason = '직업 제한';
    else if (h.level < levelReq(item)) reason = `Lv.${levelReq(item)} 필요`;
    else if (b.zone === 'weapon') {
      const need = b.hands === 2 ? 2 : 1;
      if (hands + need > 2) reason = '손이 부족';
      else if (b.kind === 'offhand') { if (offhands >= 1) reason = '보조 손 중복'; else offhands++; }
      else if (weapons >= 1 && !(h.classId === 'barbarian' && b.hands === 1 && weapons < 2)) reason = h.classId === 'barbarian' ? '쌍수는 한손 무기만' : '무기는 하나만';
      else weapons++;
      if (!reason) hands += need;
    } else if (b.zone === 'armor') { if (parts[b.part]) reason = `${PART_NAMES[b.part]} 부위 중복`; else parts[b.part] = true; }
    else if (b.type === 'ring') { if (counts.ring >= 2) reason = '반지는 2개까지'; else counts.ring++; }
    else if (b.type === 'amulet') { if (counts.amulet >= 1) reason = '목걸이는 하나만'; else counts.amulet++; }
    else if (b.type === 'totem') { if (counts.totem >= 1) reason = '토템은 하나만'; else counts.totem++; }
    result.set(p.id, { active: !reason, reason, secondWeapon: !reason && b.kind === 'weapon' && weapons === 2 });
  }
  return result;
}
export function setProgress(h, items, act) {
  const counts = {};
  for (const p of h.placed) { const item = items[p.id]; if (item?.setId && act.get(p.id)?.active) (counts[item.setId] ||= new Set()).add(item.setIndex); }
  return Object.fromEntries(Object.entries(counts).map(([id, set]) => [id, set.size]));
}
export function summarizeGear(h, items, act) {
  const active = h.placed.filter(p => act.get(p.id)?.active).map(p => items[p.id]).filter(Boolean);
  const best = list => list.sort((a, b) => GRADES[b.grade].order - GRADES[a.grade].order)[0] || null;
  return { weapon: best(active.filter(i => itemBase(i).kind === 'weapon')), body: best(active.filter(i => itemBase(i).part === 'body')), accessory: best(active.filter(i => itemBase(i).zone === 'accessory')) };
}
export const RECIPES = {
  runeUp: { name: '각인석 합성', desc: '같은 각인석 3개 → 다음 각인석 (은 계열 이상은 영혼 결정 5 추가)' },
  gemUp: { name: '보석 합성', desc: '같은 보석 3개 → 한 단계 높은 보석' },
  punch: { name: '홈 뚫기', desc: '홈 없는 일반 장비 + 철 20 + 마력석 10 → 홈 1~최대' },
  clear: { name: '홈 비우기', desc: '박음돌을 부수고 홈을 비운다 (진언은 해제)' },
  reroll: { name: '재련', desc: '매직·레어 접사 재굴림 · 정제 백금강 1 + 마력석 10 (레어는 영혼 결정 10 추가)' },
  upgrade: { name: '승급', desc: '일반→매직 마력석 5 · 매직→레어 정제 보석 3 + 마력석 20' },
  tierUp: { name: '단계 올리기', desc: '세트·유니크 베이스를 2단/3단으로 · 영혼 결정 30/80 + 완전 보석 2/3' }
};
