// 장비창(격자)·창고·서랍·제작·조합 화면. 게임 규칙은 engine.js/items.js에 있고 여기서는 표시와 입력만 담당한다.
import { CLASSES, MATERIALS } from './data.js';
import { BASES, GRADES, GEMS, GEM_QUALITY, RUNES, RUNE_LIST, RUNE_TIERS, RUNE_TIER_COLORS, SETS, MANTRAS, uniqueById, itemBase, itemStats, itemPassives, weightOf, gradeColor, displayName, describeStat, insertName, insertColor, effectiveGrid, dims, levelReq, TIER_NAMES, PART_NAMES, ZONE_NAMES, PASSIVE_NAMES, RECIPES, fits, mantraFor } from './items.js';
import { statsOf, gearBonus, placeItem, autoPlace, unplaceItem, rotateItem, salvage, craft, craftCost, craftTierAllowed, insertSocket, combine, warehouseCapacity, warehouseUsed, salvageValue, WAREHOUSE_SIZES } from './engine.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const MAT = { iron: '철 조각', crystal: '마력석', soul: '영혼 결정' };
export function iconFor(item) {
  const b = itemBase(item);
  if (b.glyph === 'spear') return 'arrow';
  if (b.glyph) return b.glyph;
  return b.kind === 'weapon' ? 'sword' : b.kind === 'offhand' ? 'shield' : b.zone === 'armor' ? 'armor' : b.type === 'charm' ? 'book' : 'gem';
}
export function itemLines(item, s) {
  const b = itemBase(item), lines = [];
  const stat = (k, v) => describeStat(k, v) || (k === 'weightMult' ? `무게 ${Math.round(v * 100)}%` : null);
  const implicit = Object.entries(item.implicit).map(([k, v]) => stat(k, v)).filter(Boolean);
  if (implicit.length) lines.push({ kind: 'implicit', text: implicit.join(' · ') });
  for (const a of item.affixes) { const t = Object.entries(a.stats).map(([k, v]) => stat(k, v)).filter(Boolean).join(' · '); if (t) lines.push({ kind: a.kind, text: a.kind === 'fixed' ? t : `${a.name} · ${t}` }); }
  item.inserts.forEach((key, i) => { if (!key) { lines.push({ kind: 'socket', text: `홈 ${i + 1} · 비어 있음` }); return; } const st = Object.entries(insertStatsOf(item, key)).map(([k, v]) => stat(k, v)).filter(Boolean).join(' · '); lines.push({ kind: 'insert', text: `${insertName(key)} · ${st}`, color: insertColor(key) }); });
  if (item.mantra) { const m = MANTRAS.find(m => m.id === item.mantra); lines.push({ kind: 'mantra', text: `진언 '${m.name}' · ${Object.entries(m.stats).map(([k, v]) => stat(k, v)).filter(Boolean).join(' · ')}` }); }
  const passives = itemPassives(item); for (const [k, v] of Object.entries(passives)) if (PASSIVE_NAMES[k]) lines.push({ kind: 'passive', text: `${PASSIVE_NAMES[k]} ${v >= 1 && Number.isInteger(v) ? `+${v}` : `+${Math.round(v * 100)}%`}` });
  if (item.uniqueId) { const u = uniqueById(item.uniqueId); if (u) lines.push({ kind: 'desc', text: u.desc }); }
  if (item.origin === 'migrate') lines.push({ kind: 'desc', text: '이전 버전에서 가져온 장비' });
  return lines;
}
function insertStatsOf(item, key) { const b = itemBase(item); const cat = b.kind === 'weapon' ? 'weapon' : b.zone === 'armor' ? 'armor' : 'other'; const [type, id, q] = key.split(':'); if (type === 'gem') { const row = GEMS[id][cat]; return { [row[0]]: row[1 + Number(q)] }; } return RUNES[id][cat]; }
export function itemTitle(item, s) { return `${displayName(item)} · ${GRADES[item.grade].name} ${TIER_NAMES[item.tier]} ${itemBase(item).names[item.tier - 1]}\n${itemLines(item, s).map(l => l.text).join('\n')}`; }
const classNames = b => b.classes ? b.classes.map(c => CLASSES.find(x => x.id === c).name).join('·') : '공용';

export function installGearUI(host, ctx) {
  const ui = { sel: null, insertSel: null, filter: 'all', sort: 'grade', craftCat: 'weapon', craftBase: 'sword1h', craftGrade: 'normal', craftTier: 1, tab: 'craft' };
  let drag = null, suppressClick = false;
  const S = () => ctx.state(), H = () => ctx.hero();
  const locationOf = id => { const s = S(); if (s.warehouse.includes(id)) return { text: '창고' }; for (const h of s.heroes) { if (h.placed.some(p => p.id === id)) return { text: `${h.name} 장비창`, hero: h }; if (h.bagItems.includes(id)) return { text: `${h.name} 가방`, hero: h }; } if (s.fieldDrops.some(d => d.id === id)) return { text: '빛기둥' }; return { text: '?' }; };
  const usable = (item, h) => { const b = itemBase(item); return (!b.classes || b.classes.includes(h.classId)) && h.level >= levelReq(item); };
  const fitsSomewhere = (item, h) => { const s = S(), zone = itemBase(item).zone, g = effectiveGrid(h)[zone]; for (const r of [false, true]) for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (fits(h, s.items, item, zone, x, y, r, h.placed.some(p => p.id === item.id) ? item.id : null)) return true; return false; };

  function gridHTML(h, s, zone) {
    const g = effectiveGrid(h)[zone], bonus = gearBonus(h, s), cells = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) cells.push(`<div class="grid-cell" data-zone="${zone}" data-x="${x}" data-y="${y}"></div>`);
    const items = h.placed.filter(p => p.zone === zone).map(p => { const item = s.items[p.id]; if (!item) return ''; const d = dims({ ...item, rotated: p.rotated }), a = bonus.act.get(p.id), col = gradeColor(item); return `<div class="grid-item ${a?.active ? '' : 'inactive'} ${ui.sel === p.id ? 'selected' : ''} ${item.mantra ? 'mantra' : ''}" data-drag-id="${p.id}" data-gear="select" data-id="${p.id}" style="--x:${p.x};--y:${p.y};--w:${d.w};--h:${d.h};--item-color:${col}" title="${esc(itemTitle(item, s))}${a?.reason ? `\n비활성: ${a.reason}` : ''}${a?.secondWeapon ? '\n보조 무기' : ''}"><span class="grid-icon">${ctx.icon(iconFor(item))}</span>${d.w * d.h >= 3 ? `<span class="grid-label">${esc(displayName(item))}</span>` : ''}${item.sockets ? `<span class="grid-sockets">${item.inserts.map(k => `<i style="background:${k ? insertColor(k) : '#3a3f36'}"></i>`).join('')}</span>` : ''}${a?.reason ? `<span class="grid-reason">${esc(a.reason)}</span>` : ''}</div>`; }).join('');
    const info = zone === 'weapon' ? (() => { let hands = 0; for (const p of h.placed) if (p.zone === 'weapon' && bonus.act.get(p.id)?.active) hands += itemBase(s.items[p.id]).hands === 2 ? 2 : 1; return `손 ${hands}/2${h.classId === 'barbarian' ? ' · 쌍수 가능' : ''}`; })() : zone === 'armor' ? `부위 ${Object.values(PART_NAMES).slice(0, 5).map((n, i) => ['head', 'body', 'hands', 'feet', 'waist'][i]).filter(part => h.placed.some(p => p.zone === 'armor' && bonus.act.get(p.id)?.active && itemBase(s.items[p.id]).part === part)).length}/5` : `반지 ${h.placed.filter(p => p.zone === 'accessory' && bonus.act.get(p.id)?.active && itemBase(s.items[p.id]).type === 'ring').length}/2 · 목걸이 ${h.placed.filter(p => p.zone === 'accessory' && bonus.act.get(p.id)?.active && itemBase(s.items[p.id]).type === 'amulet').length}/1`;
    return `<div class="zone-panel"><h4>${ZONE_NAMES[zone]} <small>${g.w}×${g.h} · ${info}</small></h4><div class="grid-zone" data-grid-zone="${zone}" style="--w:${g.w};--h:${g.h}">${cells.join('')}${items}</div></div>`;
  }
  function heroPanel(h, s) {
    const st = statsOf(h, s), bonus = gearBonus(h, s), load = Math.round(st.load * 100);
    const sets = Object.entries(bonus.sets).map(([id, n]) => `<span class="set-chip">${SETS[id].name} ${n}/${SETS[id].pieces.length}</span>`).join('');
    return `<div class="gear-hero"><div><strong style="color:${CLASSES.find(c => c.id === h.classId).color}">${esc(h.name)}</strong> <small>Lv.${h.level} · 골드 ${ctx.fmt(h.gold)} G · 총 ${effectiveGrid(h).weapon.w * effectiveGrid(h).weapon.h + effectiveGrid(h).armor.w * effectiveGrid(h).armor.h + effectiveGrid(h).accessory.w * effectiveGrid(h).accessory.h}칸</small></div><div class="weight-row" title="무게 100% 초과: 속도 -10% · 120% 초과: -25% · 150% 초과: 배치 불가"><span>무게 ${Math.round(st.weight)} / ${st.capacity}</span><div class="bar weight-bar ${load > 120 ? 'over2' : load > 100 ? 'over' : ''}"><span style="width:${Math.min(100, load / 1.5)}%"></span></div><span>${load}%</span></div>${sets ? `<div class="set-row">${sets}</div>` : ''}<div class="gear-stat-row">${[['공격력', Math.round(st.atk)], ['방어력', Math.round(st.def)], ['체력', Math.round(st.hp)], ['치명타', `${Math.round(st.crit * 100)}%`], ['공속', `${Math.round(st.haste * 100)}%`], ['이동', `${Math.round(st.move * 100)}%`], ['스킬', `${Math.round(st.spell * 100)}%`], ['발견', `${Math.round(st.find * 100)}%`]].map(([n, v]) => `<span><small>${n}</small><b>${v}</b></span>`).join('')}</div></div>`;
  }
  function warehouseHTML(h, s) {
    let list = s.warehouse.map(id => s.items[id]).filter(Boolean);
    if (ui.filter === 'usable') list = list.filter(i => usable(i, h) && fitsSomewhere(i, h)); else if (ui.filter === 'sockets') list = list.filter(i => i.sockets > 0); else if (ui.filter !== 'all') list = list.filter(i => itemBase(i).zone === ui.filter);
    list.sort((a, b) => ui.sort === 'grade' ? GRADES[b.grade].order - GRADES[a.grade].order || b.ilvl - a.ilvl : ui.sort === 'price' ? b.price - a.price : b.ilvl - a.ilvl);
    const rows = list.map(i => { const b = itemBase(i), ok = usable(i, h), fit = ok && fitsSomewhere(i, h); return `<div class="wh-item ${ui.sel === i.id ? 'selected' : ''} ${ok ? '' : 'unusable'}" data-drag-id="${i.id}" data-gear="select" data-id="${i.id}" style="--item-color:${gradeColor(i)}" title="${esc(itemTitle(i, s))}"><span class="wh-icon">${ctx.icon(iconFor(i))}</span><div class="wh-text"><strong>${esc(displayName(i))}</strong><small>${GRADES[i.grade].name} · ${TIER_NAMES[i.tier]} ${b.names[i.tier - 1]} · ${i.w}×${i.h} · ${weightOf(i)}kg · ${classNames(b)}${i.sockets ? ` · 홈 ${i.inserts.filter(Boolean).length}/${i.sockets}` : ''}${i.purchased ? '' : ` · ${ctx.fmt(Math.round(i.price * (1 + statsOf(h, s).price)))} G`}</small></div><button class="small-button" data-gear="auto" data-id="${i.id}" ${fit ? '' : 'disabled'} title="${!ok ? '이 용사는 사용할 수 없음' : !fit ? '빈 자리 없음' : '빈 자리에 자동 배치'}">${!ok ? '사용 불가' : '배치'}</button></div>`; }).join('');
    return `<div class="wh-head"><h4>마을 창고 <small>${warehouseUsed(s)} / ${warehouseCapacity(s)}칸</small></h4><div class="wh-controls"><select id="wh-filter">${[['all', '전체'], ['usable', '이 용사 사용 가능'], ['weapon', '무기·보조'], ['armor', '방어구'], ['accessory', '장신구'], ['sockets', '홈 있음']].map(([v, n]) => `<option value="${v}" ${ui.filter === v ? 'selected' : ''}>${n}</option>`).join('')}</select><select id="wh-sort">${[['grade', '등급순'], ['ilvl', '레벨순'], ['price', '가격순']].map(([v, n]) => `<option value="${v}" ${ui.sort === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div><div class="wh-list" data-wh-drop>${rows || '<div class="empty-state">창고가 비어 있습니다. 용사가 귀환하면 전리품이 들어오고, 아래 제작소에서 만들 수도 있습니다.</div>'}</div>`;
  }
  function detailHTML(h, s) {
    const item = s.items[ui.sel]; if (!item) return `<div class="gear-detail empty"><p>장비를 선택하면 상세 정보와 조합 메뉴가 여기에 표시됩니다. 창고의 장비를 장비창 격자로 끌어다 놓거나 <b>배치</b>를 누르세요. 놓는 순간 효과가 적용됩니다.</p></div>`;
    const b = itemBase(item), loc = locationOf(item.id), here = loc.hero === h, placedHere = h.placed.some(p => p.id === item.id), lines = itemLines(item, s), st = statsOf(h, s);
    const setBlock = item.setId ? (() => { const set = SETS[item.setId], have = new Set(h.placed.map(p => s.items[p.id]).filter(i => i?.setId === item.setId).map(i => i.setIndex)), n = gearBonus(h, s).sets[item.setId] || 0; return `<div class="set-block"><h5>${set.name} 세트 · ${n}/${set.pieces.length}</h5><ul>${set.pieces.map((p, i) => `<li class="${have.has(i) ? 'have' : ''}">${have.has(i) ? '✓' : '·'} ${BASES[p.baseKey].names[0]}</li>`).join('')}</ul><ul>${set.bonuses.map((bn, i) => bn ? `<li class="${n >= i ? 'have' : ''}">${i}부위 · ${[...Object.entries(bn.stats || {}).map(([k, v]) => describeStat(k, v)), ...(bn.note ? [bn.note] : [])].filter(Boolean).join(', ')}</li>` : '').join('')}</ul></div>`; })() : '';
    const recipes = [];
    if (item.grade === 'normal' && !item.sockets && b.sockets) recipes.push(['punch', '홈 뚫기 · 철 20 마력석 10']);
    if (item.inserts.some(Boolean)) recipes.push(['clear', '홈 비우기']);
    if (['magic', 'rare'].includes(item.grade)) recipes.push(['reroll', `재련 · 정제 백금강 1 + 마력석 10${item.grade === 'rare' ? ' + 영혼 결정 10' : ''}`]);
    if (item.grade === 'normal' && !item.inserts.some(Boolean)) recipes.push(['upgrade', '매직으로 승급 · 마력석 5']); else if (item.grade === 'magic') recipes.push(['upgrade', '레어로 승급 · 정제 보석 3 + 마력석 20']);
    if (['set', 'unique'].includes(item.grade) && item.tier < 3) recipes.push(['tierUp', `${item.tier + 1}단으로 · 영혼 결정 ${item.tier === 1 ? 30 : 80} + 완전 보석 ${item.tier === 1 ? 2 : 3}`]);
    const canInsert = ui.insertSel && item.inserts.includes(null) && ['창고', `${h.name} 장비창`].includes(loc.text);
    return `<div class="gear-detail" style="--item-color:${gradeColor(item)}"><div class="detail-head"><span class="wh-icon big">${ctx.icon(iconFor(item))}</span><div><h4>${esc(displayName(item))}</h4><small>${item.mantra ? '진언 · ' : ''}${GRADES[item.grade].name} · ${TIER_NAMES[item.tier]} ${b.names[item.tier - 1]} · ${item.w}×${item.h} · ${weightOf(item)}kg · Lv.${levelReq(item)} · ${classNames(b)} · ${loc.text}${item.purchased ? ' · 구매 완료' : ` · ${ctx.fmt(Math.round(item.price * (1 + st.price)))} G`}</small></div></div><ul class="detail-lines">${lines.map(l => `<li class="${l.kind}" ${l.color ? `style="color:${l.color}"` : ''}>${esc(l.text)}</li>`).join('')}</ul>${setBlock}<div class="detail-actions">${!placedHere ? `<button class="primary-button" data-gear="auto" data-id="${item.id}" ${usable(item, h) && fitsSomewhere(item, h) && loc.text !== '빛기둥' ? '' : 'disabled'}>${h.name}에게 배치</button>` : `<button class="small-button" data-gear="unplace" data-id="${item.id}">창고로 보내기</button><button class="small-button" data-gear="rotate" data-id="${item.id}" ${item.w === item.h ? 'disabled' : ''}>회전</button>`}${loc.text === '창고' ? `<button class="small-button danger" data-gear="salvage" data-id="${item.id}" title="${Object.entries(salvageValue(item)).map(([k, v]) => `${MAT[k]} ${v}`).join(', ')}">분해</button>` : ''}${canInsert ? `<button class="small-button" data-gear="insert" data-id="${item.id}">${esc(insertName(ui.insertSel))} 박기</button>` : ''}</div>${recipes.length ? `<div class="detail-recipes">${recipes.map(([r, label]) => `<button class="small-button" data-gear="recipe" data-recipe="${r}" data-id="${item.id}">${RECIPES[r].name}<small>${label}</small></button>`).join('')}</div>` : ''}</div>`;
  }
  function drawerHTML(s) {
    const gems = Object.entries(s.drawer.gems).filter(([, n]) => n > 0).sort(), runes = Object.entries(s.drawer.runes).filter(([, n]) => n > 0).sort((a, b) => RUNE_LIST.indexOf(RUNES[a[0]]) - RUNE_LIST.indexOf(RUNES[b[0]]));
    const chip = (key, label, color, n, canMerge, mergePayload) => `<span class="drawer-chip ${ui.insertSel === key ? 'selected' : ''}" style="--chip:${color}"><button data-gear="pick-insert" data-key="${key}" title="선택 후 장비의 '박기'를 누르세요">${label} <b>×${n}</b></button>${canMerge ? `<button class="merge" data-gear="merge" data-payload="${mergePayload}" title="3개를 합쳐 한 단계 위로">합성</button>` : ''}</span>`;
    return `<div class="gear-drawer"><h4>박음돌 서랍 <small>보석·각인석을 선택한 뒤 홈 있는 장비에 박으세요. 같은 것 3개는 합성할 수 있습니다.</small></h4><div class="chip-row">${gems.map(([k, n]) => { const [g, q] = k.split(':'); return chip(`gem:${k}`, `${GEM_QUALITY[q]} ${GEMS[g].name}`, GEMS[g].color, n, n >= 3 && Number(q) < 4, `gem:${k}`); }).join('') || '<small class="muted">보석 없음</small>'}</div><div class="chip-row">${runes.map(([k, n]) => { const r = RUNES[k]; return chip(`rune:${k}`, `${r.name} <i>${r.tag}</i>`, RUNE_TIER_COLORS[r.tier - 1], n, n >= 3 && RUNE_LIST.indexOf(r) < RUNE_LIST.length - 1, `rune:${k}`); }).join('') || '<small class="muted">각인석 없음 · 정예·후반 몬스터가 떨어뜨립니다</small>'}</div><details class="mantra-list"><summary>진언 목록 · 발견 ${Object.keys(s.codex.mantras).length}/${MANTRAS.length}</summary><ul>${MANTRAS.map(m => { const found = s.codex.mantras[m.id]; return `<li class="${found ? 'have' : ''}"><b>${m.name}</b> · ${m.runes.length}홈 ${m.note} · ${found ? m.runes.map(r => RUNES[r].name).join(' → ') + ' · ' + Object.entries(m.stats).map(([k, v]) => describeStat(k, v)).filter(Boolean).join(', ') : '홈 있는 일반 장비에 각인석을 순서대로 박아 발견'}</li>`; }).join('')}</ul></details></div>`;
  }
  function craftHTML(h, s) {
    const cat = ui.craftCat, bases = Object.values(BASES).filter(b => b.zone === cat), base = BASES[ui.craftBase]?.zone === cat ? BASES[ui.craftBase] : bases[0]; ui.craftBase = base.key;
    const g = effectiveGrid(h)[cat], fit = (b => (b.w <= g.w && b.h <= g.h) || (b.h <= g.w && b.w <= g.h));
    const cost = craftCost(ui.craftGrade, ui.craftTier), costHTML = Object.entries(cost).map(([k, v]) => `<span class="${s.materials[k] < v ? 'insufficient' : ''}">${MATERIALS[k].name} ${v}</span>`).join('');
    return `<div class="gear-craft"><h4>대장간 제작 <small>재료는 공용 · 만든 장비는 창고로 · 첫 배치 때 용사 골드로 구매</small></h4><div class="form-row"><label>종류<select id="craft-cat">${Object.entries(ZONE_NAMES).map(([k, n]) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${n.replace('칸', '')}</option>`).join('')}</select></label><label>베이스<select id="craft-base">${bases.map(b => `<option value="${b.key}" ${base.key === b.key ? 'selected' : ''}>${b.names[ui.craftTier - 1]} ${b.w}×${b.h} · ${classNames(b)}${fit(b) && (!b.classes || b.classes.includes(h.classId)) ? ' ✓' : ''}</option>`).join('')}</select></label><label>등급<select id="craft-grade">${[['normal', '일반'], ['magic', '매직'], ['rare', '레어']].map(([v, n]) => `<option value="${v}" ${ui.craftGrade === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>단계<select id="craft-tier">${[1, 2, 3].map(t => `<option value="${t}" ${ui.craftTier === t ? 'selected' : ''} ${craftTierAllowed(s, t) ? '' : 'disabled'}>${TIER_NAMES[t]}${craftTierAllowed(s, t) ? '' : ` (제작대 Lv.${t === 2 ? 2 : 4})`}</option>`).join('')}</select></label></div><p class="craft-note">${base.names[ui.craftTier - 1]} · ${base.w}×${base.h} · ${base.weight}kg · 홈 최대 ${base.sockets} · ${Object.entries(base.implicit).map(([k, v]) => describeStat(k, v)).filter(Boolean).join(' · ') || '접사만 붙는 장신구'}${fit(base) ? '' : ` · <b class="warn">${h.name}의 ${ZONE_NAMES[cat]}(${g.w}×${g.h})에 들어가지 않음</b>`}</p><div class="cost-row"><div class="costs">${costHTML}</div><button class="primary-button" data-gear="craft">${ctx.icon('axe')} 제작</button></div></div>`;
  }
  function facilityHTML(s) {
    return `<div class="facility-grid">${[['forge', '제작대', '제작 아이템 레벨 +12 · Lv.2 2단, Lv.4 3단 베이스'], ['clinic', '회복 시설', '초당 회복 속도 +4%p'], ['warehouse', '창고', `보관 ${WAREHOUSE_SIZES.join(' → ')}칸`]].map(([id, n, d]) => `<div class="surface"><h3>${n} <span class="muted">Lv.${s.upgrades[id]}</span></h3><p>${d}</p><button class="small-button" data-action="facility" data-id="${id}" ${s.upgrades[id] >= 5 ? 'disabled' : ''}>${s.upgrades[id] >= 5 ? '최고 레벨' : `시설 개선 · ${150 * (s.upgrades[id] + 1)} G`}</button></div>`).join('')}</div>`;
  }
  function render() {
    const s = S(), h = H(); if (!s.items[ui.sel]) ui.sel = null; if (ui.insertSel && (ui.insertSel.startsWith('gem:') ? !s.drawer.gems[ui.insertSel.slice(4)] : !s.drawer.runes[ui.insertSel.slice(5)])) ui.insertSel = null;
    const scroll = host.querySelector('.wh-list')?.scrollTop || 0;
    host.innerHTML = `<div class="gear-layout"><section class="gear-left">${heroPanel(h, s)}${['weapon', 'armor', 'accessory'].map(z => gridHTML(h, s, z)).join('')}<p class="gear-hint">창고에서 끌어다 놓거나 <b>배치</b>를 누르세요. 격자 안에서도 끌어 옮길 수 있고, 창고 목록에 놓으면 빼냅니다. 회색 빗금은 조건 미달로 효과가 없는 장비입니다.</p></section><section class="gear-right">${warehouseHTML(h, s)}</section><section class="gear-bottom">${detailHTML(h, s)}${drawerHTML(s)}${craftHTML(h, s)}${facilityHTML(s)}</section></div>`;
    const list = host.querySelector('.wh-list'); if (list) list.scrollTop = scroll;
  }
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-gear]'); if (!b || b.disabled || suppressClick) return;
    const s = S(), h = H(), a = b.dataset.gear, id = b.dataset.id;
    if (a === 'select') { ui.sel = ui.sel === id && e.target.closest('.grid-item') ? null : id; render(); return; }
    if (a === 'auto') { ui.sel = id; ctx.result(autoPlace(s, h, id)); return; }
    if (a === 'unplace') { ctx.result(unplaceItem(s, h, id)); return; }
    if (a === 'rotate') { ctx.result(rotateItem(s, h, id)); return; }
    if (a === 'salvage') { ui.sel = null; ctx.result(salvage(s, id)); return; }
    if (a === 'insert') { ctx.result(insertSocket(s, id, ui.insertSel)); return; }
    if (a === 'recipe') { ctx.result(combine(s, b.dataset.recipe, { id })); return; }
    if (a === 'pick-insert') { ui.insertSel = ui.insertSel === b.dataset.key ? null : b.dataset.key; render(); return; }
    if (a === 'merge') { const [type, ...rest] = b.dataset.payload.split(':'); ctx.result(type === 'gem' ? combine(s, 'gemUp', { gem: rest.join(':') }) : combine(s, 'runeUp', { rune: rest[0] })); return; }
    if (a === 'craft') { const r = craft(s, ui.craftBase, ui.craftGrade, ui.craftTier); if (r.ok) ui.sel = r.item.id; ctx.result(r); return; }
  });
  host.addEventListener('change', e => {
    const el = e.target; if (!el.id) return;
    if (el.id === 'wh-filter') ui.filter = el.value; if (el.id === 'wh-sort') ui.sort = el.value;
    if (el.id === 'craft-cat') ui.craftCat = el.value; if (el.id === 'craft-base') ui.craftBase = el.value; if (el.id === 'craft-grade') ui.craftGrade = el.value; if (el.id === 'craft-tier') ui.craftTier = Number(el.value);
    if (['wh-filter', 'wh-sort', 'craft-cat', 'craft-base', 'craft-grade', 'craft-tier'].includes(el.id)) render();
  });
  // ---- 드래그 앤 드롭: 격자 아이템/창고 행 → 격자 셀 또는 창고 목록
  const cellAt = (x, y) => document.elementsFromPoint(x, y).find(el => el.classList?.contains('grid-cell')) || null;
  const clearMarks = () => { for (const c of host.querySelectorAll('.grid-cell.ok,.grid-cell.bad')) c.classList.remove('ok', 'bad'); for (const z of host.querySelectorAll('.wh-list.drop-target')) z.classList.remove('drop-target'); };
  function markTarget(e) {
    clearMarks(); const s = S(), h = H(), item = s.items[drag.id]; if (!item) return null;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) { const wh = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.hasAttribute?.('data-wh-drop')); if (wh && drag.fromGrid) { wh.classList.add('drop-target'); return { wh: true }; } return null; }
    const zone = cell.dataset.zone, d = dims({ ...item, rotated: drag.rotated }), x = Number(cell.dataset.x) - drag.ox, y = Number(cell.dataset.y) - drag.oy;
    const ok = itemBase(item).zone === zone && fits(h, s.items, item, zone, x, y, drag.rotated, drag.fromGrid ? drag.id : null);
    const zoneEl = host.querySelector(`[data-grid-zone="${zone}"]`);
    for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) zoneEl?.querySelector(`.grid-cell[data-x="${x + i}"][data-y="${y + j}"]`)?.classList.add(ok ? 'ok' : 'bad');
    return { zone, x, y, ok };
  }
  host.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-drag-id]'); if (!el || e.button || e.target.closest('button')) return;
    const fromGrid = !!el.closest('.grid-zone');
    if (e.pointerType !== 'mouse' && !fromGrid) return; // 터치에서는 창고 행 스크롤을 우선하고 '배치' 버튼을 쓴다
    const s = S(), item = s.items[el.dataset.dragId]; if (!item) return;
    const r = el.getBoundingClientRect(), cell = fromGrid ? r.width / Number(getComputedStyle(el).getPropertyValue('--w')) : 0;
    const placed = fromGrid ? H().placed.find(p => p.id === item.id) : null;
    drag = { id: item.id, fromGrid, rotated: placed?.rotated || false, ox: fromGrid ? Math.floor((e.clientX - r.left) / cell) : 0, oy: fromGrid ? Math.floor((e.clientY - r.top) / cell) : 0, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, el };
    if (fromGrid) e.preventDefault();
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved) { if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return; drag.moved = true; const item = S().items[drag.id], d = dims({ ...item, rotated: drag.rotated }); drag.ghost = document.createElement('div'); drag.ghost.className = 'drag-ghost-item'; drag.ghost.style.setProperty('--w', d.w); drag.ghost.style.setProperty('--h', d.h); drag.ghost.style.setProperty('--item-color', gradeColor(item)); drag.ghost.innerHTML = `<span class="grid-icon">${ctx.icon(iconFor(item))}</span>`; document.body.append(drag.ghost); drag.el.classList.add('dragging'); document.body.classList.add('gear-dragging'); }
    drag.ghost.style.transform = `translate(${e.clientX - 14}px,${e.clientY - 14}px)`;
    drag.target = markTarget(e); e.preventDefault();
  });
  const endDrag = (e, drop) => {
    const d = drag; if (!d) return; drag = null; if (!d.moved) return;
    d.ghost?.remove(); d.el.classList.remove('dragging'); document.body.classList.remove('gear-dragging'); clearMarks();
    suppressClick = true; setTimeout(() => suppressClick = false, 80);
    if (!drop) return; const target = d.target, s = S(), h = H();
    if (!target) return;
    if (target.wh) { ctx.result(unplaceItem(s, h, d.id)); return; }
    ui.sel = d.id; ctx.result(placeItem(s, h, d.id, target.zone, target.x, target.y, d.rotated));
  };
  document.addEventListener('pointerup', e => endDrag(e, true)); document.addEventListener('pointercancel', e => endDrag(e, false));
  document.addEventListener('keydown', e => { if (drag?.moved && (e.key === 'r' || e.key === 'R')) { drag.rotated = !drag.rotated; const item = S().items[drag.id], d = dims({ ...item, rotated: drag.rotated }); drag.ghost.style.setProperty('--w', d.w); drag.ghost.style.setProperty('--h', d.h); } });
  return { render, ui, select: id => { ui.sel = id; } };
}
