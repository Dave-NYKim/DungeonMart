import { REGIONS } from './world.js';
export { MART } from './world.js';
const skill = (name, desc, effect, power = 1, cd = 8) => ({ name, desc, effect, power, cd });
const passive = (name, desc, effect, power = 1) => ({ name, desc, effect, power, passive: true });
const branch = (id, name, theme, skills, children = []) => ({ id, name, theme, skills, children });

export const CLASSES = [
  { id: 'barbarian', name: '바바리안', color: '#d7966f', weapon: '양손 도끼', glyph: 'axe', role: '근접 · 물리', range: 24,
    skills: [skill('강타', '대상에게 220% 물리 피해.', 'hit', 2.2, 5), skill('전장의 함성', '6초간 공격력과 방어력 증가.', 'rage', 1, 13)],
    branches: [
      branch('berserker', '광전사', '출혈 · 연속 공격', [skill('난도질', '빠른 연속 공격으로 300% 피해.', 'hit', 3, 7), skill('피의 돌진', '대상에게 피해를 주고 출혈 부여.', 'bleed', 1.6, 9), passive('격분', '공격 속도 20% 증가.', 'haste', .2)], [
        branch('blood', '혈투사', '출혈과 흡혈', [skill('상처 찢기', '출혈 중인 적에게 피해가 2배.', 'rend', 2.8, 7), skill('피의 폭주', '궁극기 · 주변 적에게 출혈, 피해 일부 흡수.', 'blood', 4, 25), passive('피의 갈증', '공격 피해의 12%를 체력으로 흡수.', 'leech', .12)]),
        branch('warlord', '전쟁광', '연속 처치', [skill('살육 도약', '대상 주변 적에게 220% 피해.', 'aoe', 2.2, 9), skill('끝없는 학살', '궁극기 · 주변에 600% 피해, 공격 강화.', 'frenzy', 6, 26), passive('살육의 기세', '적 처치 후 6초간 공격 강화.', 'onkill', 1)])
      ]),
      branch('destroyer', '파괴자', '광역 · 강한 일격', [skill('회전 베기', '주변 적에게 200% 피해.', 'aoe', 2, 8), skill('지면 강타', '충격파로 적들에게 피해와 감속.', 'slow', 1.8, 10), passive('중량 무기', '공격력 25% 증가.', 'damage', .25)], [
        branch('crusher', '분쇄자', '방어 파괴', [skill('갑옷 파쇄', '피해를 주고 6초간 받는 피해 증가.', 'curse', 2, 8), skill('대지 붕괴', '궁극기 · 광역 피해와 3초 기절.', 'stun', 5, 25), passive('약점 붕괴', '약화된 적에게 피해 30% 증가.', 'expose', .3)]),
        branch('iron', '철혈 수호자', '생존 · 반격', [skill('도발', '주변 적이 자신을 공격하고 보호막 획득.', 'taunt', 1, 10), skill('불굴', '궁극기 · 8초간 강한 보호막과 피해 감소.', 'fortify', 3, 25), passive('보복', '받은 피해의 45%를 공격자에게 반사.', 'thorns', .45)])
      ])
    ] },
  { id: 'necromancer', name: '네크로맨서', color: '#a5b98b', weapon: '완드', glyph: 'skull', role: '원거리 · 소환', range: 82,
    skills: [skill('해골 소환', '해골 1기를 소환해 함께 공격. 18초 유지.', 'summon', 1, 20), skill('뼈 창', '뼈 투사체로 200% 피해.', 'hit', 2, 6)],
    branches: [
      branch('summoner', '소환술사', '소환수 강화', [skill('해골 마법사', '원거리 해골 마법사를 소환.', 'summon', 1.3, 19), skill('망자의 명령', '소환수들이 대상을 집중 공격.', 'command', 2.5, 9), passive('군단 확장', '소환 가능 수 2기 증가.', 'capacity', 2)], [
        branch('undead', '망자의 군주', '대규모 군단', [skill('해골 기사', '강력한 해골 기사 소환.', 'summon', 2, 20), skill('망자의 군세', '궁극기 · 임시 해골 군단 소환.', 'army', 1.5, 28), passive('군단의 결속', '소환수 공격력 40% 증가.', 'petdamage', .4)]),
        branch('golem', '골렘 지배자', '정예 소환', [skill('철 골렘', '강력한 골렘 소환.', 'golem', 3.5, 22), skill('거신 각성', '궁극기 · 소환수 강화, 주변 충격파.', 'command', 7, 28), passive('영혼 집중', '소환 한도 2 감소, 소환 피해 100% 증가.', 'concentrate', 1)])
      ]),
      branch('curser', '저주술사', '약화 · 시체', [skill('쇠약의 저주', '적의 공격력 감소, 받는 피해 증가.', 'curse', 1, 9), skill('시체 폭발', '근처 시체를 소모해 주변에 300% 피해.', 'corpse', 3, 7), passive('잔류 원혼', '저주받은 적 처치 시 주변 적에게 저주.', 'spread', 1)], [
        branch('plague', '역병술사', '지속 독 피해', [skill('역병 구름', '주변 적에게 지속 독 피해.', 'poison', 2, 9), skill('죽음의 전염', '궁극기 · 넓은 범위에 독과 저주.', 'plague', 4, 26), passive('부패', '지속 피해 50% 증가.', 'dot', .5)]),
        branch('reaper', '영혼 수확자', '영혼 · 생명 흡수', [skill('영혼 흡수', '피해를 주며 체력 회복.', 'drain', 2.5, 7), skill('사신 강림', '궁극기 · 주변 적을 공격하고 생명 흡수.', 'blood', 5, 27), passive('영혼 저장', '적 처치 시 다음 스킬 강화.', 'soul', 1)])
      ])
    ] },
  { id: 'amazon', name: '아마존', color: '#c7b16d', weapon: '활 / 투창', glyph: 'bow', role: '원거리 · 관통', range: 95,
    skills: [skill('관통 공격', '대상과 인접한 적에게 170% 피해.', 'pierce', 1.7, 6), skill('회피 기동', '적과 거리를 벌리고 다음 공격 강화.', 'evade', 1, 12)],
    branches: [
      branch('archer', '명사수', '활 · 정밀 사격', [skill('다중 사격', '주변 3명의 적에게 170% 피해.', 'multi', 1.7, 8), skill('표적 지정', '대상에게 피해를 주고 약점 노출.', 'curse', 1, 10), passive('정밀 조준', '치명타 확률 15% 증가.', 'crit', .15)], [
        branch('hawk', '매의 눈', '단일 대상 저격', [skill('급소 사격', '대상에게 350% 피해.', 'hit', 3.5, 9), skill('필살의 화살', '궁극기 · 850% 관통 피해.', 'pierce', 8.5, 28), passive('사냥감 추적', '정예와 보스에게 피해 40% 증가.', 'boss', .4)]),
        branch('arrows', '화살 폭풍', '다수 대상 공격', [skill('분열 화살', '여러 적에게 230% 피해.', 'multi', 2.3, 8), skill('화살비', '궁극기 · 넓은 범위에 550% 피해.', 'storm', 5.5, 25), passive('연속 사격', '기본 공격 시 25% 확률로 추가 타격.', 'double', .25)])
      ]),
      branch('javelin', '투창 전사', '투창 · 번개', [skill('번개 투창', '명중 후 주변 적에게 번개 피해.', 'chain', 2, 8), skill('밀쳐내기', '주변 적을 밀어내고 피해.', 'knock', 1.5, 11), passive('충전', '기본 공격 4회마다 다음 스킬 강화.', 'charge', 1)], [
        branch('tempest', '폭풍의 창', '연쇄 번개', [skill('연쇄 번개', '최대 5명의 적에게 번개 전이.', 'chain', 2.5, 8), skill('뇌우', '궁극기 · 넓은 범위에 낙뢰.', 'storm', 6, 26), passive('과충전', '스킬 공격력 30% 증가.', 'spell', .3)]),
        branch('valkyrie', '발키리', '분신 · 생존', [skill('영체 분신', '함께 싸우는 전사 소환.', 'summon', 2.5, 20), skill('천상의 강림', '궁극기 · 분신 집중 공격과 자기 보호막.', 'ascend', 5, 26), passive('전투 결속', '소환수가 있으면 공격력 30% 증가.', 'bond', .3)])
      ])
    ] },
  { id: 'sorceress', name: '소서리스', color: '#9da8d1', weapon: '지팡이', glyph: 'staff', role: '원거리 · 마법', range: 88,
    skills: [skill('마력탄', '대상에게 200% 마법 피해.', 'hit', 2, 5), skill('마력 보호막', '8초간 피해를 흡수하는 보호막.', 'shield', 1, 14)],
    branches: [
      branch('elemental', '원소술사', '화염 · 냉기', [skill('화염구', '폭발 피해와 화상.', 'fire', 2.2, 8), skill('서리 파동', '주변 적에게 피해와 감속.', 'slow', 1.7, 10), passive('원소 공명', '서로 다른 스킬을 연속 사용하면 피해 증가.', 'resonance', .2)], [
        branch('firelord', '화염 지배자', '광역 · 화상', [skill('화염 장벽', '주변 적에게 화상 부여.', 'fire', 2.8, 9), skill('유성 낙하', '궁극기 · 넓은 범위에 폭발과 화상.', 'meteor', 6, 28), passive('연소', '화상 피해 60% 증가.', 'dot', .6)]),
        branch('frostlord', '빙결 지배자', '감속 · 빙결', [skill('얼음 창', '관통 피해와 감속.', 'slow', 2.8, 8), skill('눈보라', '궁극기 · 넓은 범위 피해와 빙결.', 'freeze', 4.5, 26), passive('산산조각', '감속·빙결된 적 처치 시 주변에 파편 피해.', 'shatter', 1)])
      ]),
      branch('arcane', '비전술사', '전격 · 공간', [skill('전격 사슬', '여러 적에게 전격 피해.', 'chain', 2, 8), skill('차원 도약', '안전한 위치로 이동하며 주변 공격.', 'teleport', 1.8, 12), passive('마력 순환', '스킬 재사용 대기시간 12% 감소.', 'cooldown', .12)], [
        branch('lightning', '뇌전 지배자', '연쇄 · 폭발', [skill('전류 구체', '주변 적들에게 연쇄 전격.', 'chain', 3, 9), skill('낙뢰 폭주', '궁극기 · 넓은 범위에 강력한 낙뢰.', 'storm', 6.5, 27), passive('잔류 전류', '약화된 적에게 피해 35% 증가.', 'expose', .35)]),
        branch('dimension', '차원술사', '군중 제어', [skill('중력 우물', '주변 적을 끌어모으고 피해.', 'gravity', 2, 10), skill('차원 붕괴', '궁극기 · 밀집한 적에게 공간 폭발.', 'storm', 7, 28), passive('시간 왜곡', '스킬 재사용 대기시간 추가 20% 감소.', 'cooldown', .2)])
      ])
    ] },
  { id: 'paladin', name: '팔라딘', color: '#c8c2a8', weapon: '전쟁 망치', glyph: 'shield', role: '근접 · 신성', range: 28,
    skills: [skill('성스러운 일격', '170% 피해를 주고 체력 회복.', 'drain', 1.7, 6), skill('빛의 가호', '보호막과 일시적인 피해 감소.', 'guard', 1, 13)],
    branches: [
      branch('crusader', '성전사', '신성 · 공격', [skill('열의', '연속 타격으로 300% 피해.', 'hit', 3, 8), skill('심판의 낙인', '피해와 함께 적의 약점 노출.', 'curse', 1.3, 10), passive('신성 무장', '기본 공격 피해 25% 증가.', 'basic', .25)], [
        branch('judge', '심판관', '표식 · 처형', [skill('징벌의 망치', '약화된 적에게 더 큰 피해.', 'judgment', 3, 8), skill('최후의 심판', '궁극기 · 주변 적에게 강력한 신성 피해.', 'storm', 6, 27), passive('단죄', '체력이 35% 이하인 적에게 피해 40% 증가.', 'execute', .4)]),
        branch('sun', '태양 기사', '신성 · 화염', [skill('불꽃 오라', '주변 적에게 화상 피해.', 'fire', 2.5, 9), skill('태양 강림', '궁극기 · 신성 화염으로 주변 소각.', 'meteor', 5.5, 26), passive('정화의 불꽃', '기본 공격에 화상 부여.', 'burnbasic', 1)])
      ]),
      branch('guardian', '수호기사', '오라 · 회복', [skill('수호 오라', '주변 아군에게 보호막과 피해 감소.', 'aura', 1, 12), skill('치유의 빛', '근처에서 체력이 가장 낮은 아군 회복.', 'heal', 1.8, 8), passive('헌신', '회복 스킬 사용 시 자신도 추가 회복.', 'devotion', .15)], [
        branch('sanctuary', '성역 수호자', '아군 보호', [skill('보호의 결계', '주변 아군에게 강한 보호막.', 'aura', 2, 12), skill('절대 성역', '궁극기 · 주변 아군 보호막과 피해 감소.', 'aura', 4, 27), passive('굳건한 믿음', '방어력 30% 증가.', 'defense', .3)]),
        branch('priest', '빛의 사제', '집중 치유', [skill('정화', '주변 아군 회복과 보호막 부여.', 'cleanse', 1.6, 10), skill('구원의 빛', '궁극기 · 주변 아군 대량 회복.', 'groupheal', 5, 26), passive('넘치는 축복', '초과 회복량을 보호막으로 전환.', 'overheal', 1)])
      ])
    ] }
];

export const ZONES = [
  { id: 0, name: '잿빛 황야', en: 'ASHEN WILDS', act: 'I', theme: '황야 · 묘지', level: 1, color: '#9caa86', x: REGIONS[0].x, y: REGIONS[0].y, radius: 380, hp: 70, atk: 9, xp: 18, gold: 8, material: 'iron', monsters: ['fallen', 'shaman', 'zombie', 'skeleton'] },
  { id: 1, name: '태양의 무덤', en: 'TOMB OF THE SUN', act: 'II', theme: '사막 · 고대 무덤', level: 8, color: '#c9a66e', x: REGIONS[1].x, y: REGIONS[1].y, radius: 380, hp: 270, atk: 24, xp: 60, gold: 20, material: 'crystal', monsters: ['scarab', 'mummy', 'viper', 'maggot'] },
  { id: 2, name: '몰락한 밀림', en: 'FALLEN JUNGLE', act: 'III', theme: '밀림 · 폐사원', level: 20, color: '#72a68d', x: REGIONS[2].x, y: REGIONS[2].y, radius: 380, hp: 750, atk: 49, xp: 145, gold: 38, material: 'soul', monsters: ['fetish', 'hulk', 'zealot', 'council'] },
  { id: 3, name: '불타는 지옥', en: 'BURNING HELLS', act: 'IV', theme: '용암 · 혼돈의 성채', level: 35, color: '#cc7b66', x: REGIONS[3].x, y: REGIONS[3].y, radius: 380, hp: 1700, atk: 82, xp: 290, gold: 65, material: 'soul', monsters: ['finger', 'megademon', 'knight', 'mother'] }
];
// Original creature names; stable IDs preserve existing saves.
// Difficulty ladder: three tiers × ten stages. Nightmare 1 must clearly out-muscle Normal 10.
export const DIFFICULTIES = [
  { id: 'normal', name: '노멀', en: 'NORMAL', mult: 1, reward: 1, bossHp: 150000, bossAtk: 200, color: '#9baa83' },
  { id: 'nightmare', name: '나이트메어', en: 'NIGHTMARE', mult: 5 ** 10, reward: 3, bossHp: 150000 * 5 ** 10, bossAtk: 200 * 5 ** 10, color: '#a982c9' },
  { id: 'hell', name: '헬', en: 'HELL', mult: 5 ** 20, reward: 8, bossHp: 150000 * 5 ** 20, bossAtk: 200 * 5 ** 20, color: '#d8705a' }
];
export const STAGES = 10;
export const stageMult = stage => 5 ** (stage - 1);
// Within one difficulty the acts climb gently: ACT IV is stronger than ACT I but not by orders of magnitude.
export const ACT_FACTORS = { hp: [1, 1.3, 1.7, 2.2], atk: [1, 1.25, 1.55, 1.9] };
export const BASE_MONSTER = { hp: 90, atk: 14 };
export const BOSS_TYPE = 'ashlord';
export const MONSTERS = {
  cryptwarden: {name:'묘역의 파수장',en:'Ossuary Warden',shape:'boss',color:'#b5a0dd',trait:'boss',hp:8,speed:28,range:36},
  tombemperor: {name:'황금 무덤의 황제',en:'Tomb Emperor',shape:'boss',color:'#e0bc70',trait:'boss',hp:8,speed:26,range:36},
  thornking: {name:'고대 가시왕',en:'Thornroot King',shape:'boss',color:'#91be76',trait:'boss',hp:8,speed:24,range:40},
  gatekeeper: {name:'용암문의 집행자',en:'Gate Executioner',shape:'boss',color:'#ed9762',trait:'boss',hp:8,speed:28,range:40},
  ashlord: { name: '재의 군주 바라칸', en: 'Barakhan, Lord of Cinders', shape: 'boss', color: '#d4683a', trait: 'boss', hp: 14, speed: 24, range: 36 },
  fallen: { name: '잿불 발톱', en: 'Emberclaw', shape: 'imp', color: '#a7644e', trait: 'coward', hp: .8, speed: 30 },
  shaman: { name: '뼈가면 술사', en: 'Bone-mask Ritualist', shape: 'shaman', color: '#c38459', trait: 'revive', hp: .8, speed: 18, range: 85 },
  zombie: { name: '좀비', en: 'Zombie', shape: 'zombie', color: '#87917a', trait: 'tough', hp: 1.5, speed: 12 },
  skeleton: { name: '스켈레톤', en: 'Skeleton', shape: 'skeleton', color: '#c5c0a2', trait: 'melee', hp: 1, speed: 23 },
  scarab: { name: '수정 갑충', en: 'Crystal Beetle', shape: 'beetle', color: '#ae925c', trait: 'charged', hp: 1.1, speed: 24 },
  mummy: { name: '미라', en: 'Mummy', shape: 'mummy', color: '#c2b58e', trait: 'tough', hp: 1.5, speed: 13 },
  viper: { name: '흑요 칼뱀', en: 'Obsidian Serpent', shape: 'snake', color: '#aaa071', trait: 'charge', hp: 1, speed: 40 },
  maggot: { name: '맹독 모래충', en: 'Venom Maw', shape: 'worm', color: '#b3956d', trait: 'poison', hp: 1.3, speed: 14, range: 70 },
  fetish: { name: '덩굴 주술사', en: 'Vine Witch', shape: 'shaman', color: '#9d9767', trait: 'revive', hp: .8, speed: 35, range: 65 },
  hulk: { name: '가시나무 거수', en: 'Thornwood Brute', shape: 'hulk', color: '#738b67', trait: 'tough', hp: 1.8, speed: 14 },
  zealot: { name: '녹슨 파수꾼', en: 'Rusted Sentinel', shape: 'knight', color: '#ae9f73', trait: 'charge', hp: 1, speed: 34 },
  council: { name: '잿빛 사교도', en: 'Ash Cultist', shape: 'mage', color: '#a47860', trait: 'fire', hp: 1.2, speed: 20, range: 90 },
  finger: { name: '장막 망령', en: 'Shroud Wraith', shape: 'ghost', color: '#a29ab5', trait: 'drain', hp: .9, speed: 24, range: 100 },
  megademon: { name: '현무암 거수', en: 'Basalt Brute', shape: 'demon', color: '#bd6451', trait: 'fire', hp: 1.6, speed: 25 },
  knight: { name: '흑철 망령기사', en: 'Blackiron Knight', shape: 'knight', color: '#938b9f', trait: 'curse', hp: 1.1, speed: 21, range: 90 },
  mother: { name: '포자 번식체', en: 'Spore Brood', shape: 'hulk', color: '#a28476', trait: 'spawn', hp: 1.7, speed: 12 }
};
export const MATERIALS = { iron: { name: '철 조각', color: '#b3b6b4' }, crystal: { name: '마력석', color: '#a69bce' }, soul: { name: '영혼 결정', color: '#cf8b71' }, relic: { name: '유물의 정수', color: '#f0c56a' } };
export const STAT_NAMES = { atk: '공격력', def: '방어력', hp: '최대 체력', crit: '치명타', haste: '공격 속도', leech: '생명력 흡수', spell: '스킬 피해', petdamage: '소환수 피해', cooldown: '재사용 감소' };
export const classOf = hero => CLASSES.find(c => c.id === hero.classId);
export const nodesOf = hero => {
  const cls = classOf(hero);
  const second = cls.branches.find(b => b.id === hero.path[0]);
  const third = second?.children.find(b => b.id === hero.path[1]);
  return [cls, second, third].filter(Boolean);
};
export const skillsOf = hero => nodesOf(hero).flatMap(n => n.skills.map((s, i) => ({ ...s, id: `${n.id}-${i}`, rank: (hero.skillRanks[`${n.id}-${i}`] || 1) + (hero._skillBonus || 0) })));
export const titleOf = hero => nodesOf(hero).at(-1).name;

// Hero quality is independent of equipment rarity and cosmetic appearance.
export const HERO_GRADES = [
  { name: '노멀', color: '#ffffff', chance: .60, multiplier: 1 },
  { name: '매직', color: '#609fff', chance: .25, multiplier: 1.2 },
  { name: '레어', color: '#ffdc55', chance: .12, multiplier: 1.45 },
  { name: '전설', color: '#ff6060', chance: .03, multiplier: 1.8 }
];
