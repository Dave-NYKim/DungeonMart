import { CLASSES, ZONES, MONSTERS, MATERIALS, HERO_GRADES, BOSS_TYPE, classOf, skillsOf, titleOf } from './data.js';
import { GRADES, gradeColor, displayName, itemBase, TIER_NAMES } from './items.js';
import { installGearUI, itemLines, iconFor } from './gear-ui.js';
import { createGame, tick, statsOf, powerOf, xpNeeded, availableZone, assignZone, recruit, setSpawnRate, promote, upgradeSkill, resetSkills, upgradeMart, editTown, summonBoss, RAID_COST, serialize, restore, gearSummary, pickupFieldDrop, warehouseUsed, warehouseCapacity } from './engine.js';
import { WorldRenderer, portrait, monsterPortrait, drawHero } from './render.js';
import { pixelIcon } from './pixel-icons.js';
import { MART, ARRIVAL, REGIONS, POIS, poiAt, regionAt, MOVABLE_IDS, DECORATIONS, TOWN_BOUNDS, snapTown, placementError, freshTown, applyTownLayout } from './world.js';
import { skillIcon, skillById, SKILL_CATALOG, drawSkillEffect, heroIdentity } from './skill-visuals.js';
import { installMapInput } from './map-input.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'dungeon-mart-save-v1';
let state, saveAvailable = true, saveLoadError = false;
try { const raw = localStorage.getItem(SAVE_KEY); state = raw && restore(raw); saveLoadError = !!raw && !state; } catch { saveAvailable = false; }
state ||= createGame();
applyTownLayout(state.town);
let selected = state.heroes[0].id, selectedZone = 0, view = 'world', speed = 1, paused = false, last = performance.now(), accumulator = 0, uiTimer = 0, saveTimer = 0, signature = '', toastTimer;
let profileTab='overview', previewSkillId=null, previewStarted=performance.now(), previewPaused=false, previewElapsed=0, previewSlow=false;
let pointerHeld=false;
document.addEventListener('pointerdown',()=>pointerHeld=true);
document.addEventListener('pointerup',()=>pointerHeld=false);
document.addEventListener('pointercancel',()=>pointerHeld=false);
window.addEventListener('blur',()=>pointerHeld=false);
let townTool={kind:'move',id:'mart'}, townUndo=[];
const selectedHero = () => state.heroes.find(h => h.id === selected) || state.heroes[0];
const fmt = n => Math.floor(n).toLocaleString('ko-KR');
const clock = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const statusNames = { arrive: '입장 · 마트로 이동', hunt: '자동 사냥 중', depart: '사냥터로 이동', return: '마트로 귀환', recover: '마트에서 회복', dead: '부활 대기' };
const statusOf = h => h.standby && ['recover','return'].includes(h.state) ? '마을 대기' : `${statusNames[h.state]}${h.state==='hunt'?` · ACT ${ZONES[h.zone].act}`:''}`;
const tierOf = h => `${titleOf(h)}(${h.path.length+1}차)`;
const icon = pixelIcon;
function toast(message, error = false) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').className = `visible${error ? ' error' : ''}`; toastTimer = setTimeout(() => $('toast').className = '', 3500); }
function result(r) { toast(r.message, !r.ok); if (r.ok) { signature = ''; renderUI(true); save(false); } return r; }
function save(notify = false) {
  // Preserve an unreadable save until the owner explicitly exports or replaces it.
  if (saveLoadError) { if (notify) toast('기존 저장을 읽지 못했습니다. 안내 메뉴에서 저장 파일을 복구하거나 새 게임을 시작하세요.', true); return; }
  try { localStorage.setItem(SAVE_KEY, serialize(state)); saveAvailable = true; $('save-status').textContent = '저장 완료'; if (notify) toast('이 브라우저에 진행 상황을 저장했습니다.'); }
  catch { saveAvailable = false; $('save-status').textContent = '저장 불가'; if (notify) toast('브라우저 저장 공간에 접근할 수 없습니다. 안내 메뉴에서 파일로 내보내세요.', true); }
}
function returnProfileViews(){
 if($('hero-modal').open)return;
 for(const id of ['workshop','skills']){$('management-panel').append($(`${id}-view`));$(`${id}-view`).hidden=id!==view;}
}
function setProfileTab(next){
 profileTab=next;
 for(const id of ['workshop','skills']){$('management-panel').append($(`${id}-view`));$(`${id}-view`).hidden=id!==view;}
 $('detail-panel').hidden=next!=='overview';$('profile-hunt').hidden=next!=='hunt';
 if(next==='equipment'){$('profile-content').append($('workshop-view'));$('workshop-view').hidden=false;renderWorkshop();}
 if(next==='skills'){$('profile-content').append($('skills-view'));$('skills-view').hidden=false;renderSkills();}
 renderProfileChrome();$('profile-scroll').scrollTop=0;
}
function renderProfileChrome(){
 const h=selectedHero();$('hero-modal-title').textContent=`${h.name} · ${tierOf(h)}`;
 $('profile-selector').innerHTML=`<button class="small-button" data-action="profile-prev" aria-label="이전 용사">‹</button><span style="color:${classOf(h).color}">${heroIdentity(h).epithet} · Lv.${h.level}</span><button class="small-button" data-action="profile-next" aria-label="다음 용사">›</button><button class="small-button" data-action="profile-follow">${renderer.followId===h.id?'추적 중 · 지도 보기':'이 용사 따라가기 ↗'}</button>`;
 $('profile-tabs').innerHTML=[['overview','정보 · 외형'],['equipment','장비'],['skills','전직 · 스킬'],['hunt','사냥 · 기록']].map(([id,name])=>`<button data-action="profile-tab" data-tab="${id}" class="${profileTab===id?'active':''}" aria-pressed="${profileTab===id}">${name}</button>`).join('');
 $('profile-hunt').innerHTML=`<div class="surface"><h3>${h.name}의 모험</h3><p>${heroIdentity(h).origin} · ${classOf(h).role}<br>누적 처치 ${fmt(h.kills)} · 보유 골드 ${fmt(h.gold)} G<br>현재 ${statusOf(h)}</p><button class="primary-button" data-action="profile-follow">이 용사 따라가기 ↗</button></div><div class="section-title"><h3>사냥터 배정</h3></div><div class="profile-zones"><button class="surface" data-action="assign" data-zone="-1"><strong>마을 대기</strong><p>${h.standby?'현재 대기 중':'사냥을 멈추고 마트에서 대기'}</p></button>${ZONES.map(z=>`<button class="surface" data-action="assign" data-zone="${z.id}" ${availableZone(state,z.id)?'':'disabled'}><strong>ACT ${z.act} · ${z.name}</strong><p>${h.zone===z.id&&!h.standby?'현재 배정 중':availableZone(state,z.id)?'이 사냥터로 배정':`Lv.${z.level} 해금`}</p></button>`).join('')}</div>`;
}
function openProfile(tab='overview') { renderDetail();if(!$('hero-modal').open)$('hero-modal').showModal();setProfileTab(tab); }
function selectHero(id) { selected=id;previewSkillId=null;signature='';renderUI(true);openProfile(); }
function setView(next) {
  $('hero-modal').close();returnProfileViews();
  if(next==='skills'){openProfile('skills');return;}
  if(next==='workshop'){openProfile('equipment');return;}
  view = next;
  renderer.editing=next==='town';renderer.editGhost=null;
  if(next==='town'){renderer.focus(1808,1200,.72);renderTown();}
  $('management-panel').hidden = view === 'world';
  for (const id of ['heroes', 'expedition', 'workshop', 'skills', 'bestiary', 'journal', 'town']) $(`${id}-view`).hidden = id !== view;
  const headings = { world: '사냥터', heroes: '용사 관리', expedition: '사냥터 배정', workshop: '인벤토리 · 제작소', skills: '전직 & 스킬', bestiary: '몬스터 도감', journal: '마트 소식', town:'마을 꾸미기' };
  $('page-title').textContent = headings[view];
  $('page-description').textContent = view === 'heroes' ? '용사를 눌러 장비·전직·스킬을 관리하세요.' : view === 'expedition' ? '용사 아이콘을 끌어서 마을 대기 또는 액트 열에 놓으세요.' : '';
  signature = ''; renderUI(true);
  requestAnimationFrame(() => { renderer.resize(); updateCameraChrome(); });
}
function renderNav() { $('nav').innerHTML = [['world','map','맵'],['heroes','sword','용사'],['expedition','map','사냥터'],['town','shop','마을'],['bestiary','book','도감'],['journal','book','소식']].map(([id,i,n])=>`<button class="nav-button ${view===id?'active':''}" data-action="view" data-view="${id}" aria-label="${n}" aria-pressed="${view===id}">${icon(i)}<span>${n}</span></button>`).join('') + `<button class="nav-button" data-action="help" aria-label="게임 안내">${icon('save')}<span>설정</span></button>`; }
function renderResources() { $('resources').innerHTML = [['coin','마트 운영금',state.treasury,' G'],['iron','철 조각',state.materials.iron,''],['gem','마력석',state.materials.crystal,''],['skull','영혼 결정',state.materials.soul,'']].map(([i,n,v,s])=>`<div class="resource">${icon(i)}<div><small>${n}</small><strong>${fmt(v)}${s}</strong></div></div>`).join(''); }
function renderRoster() {
  $('hero-count').textContent = `${state.heroes.length} / 20`;
  $('roster-summary').innerHTML = `<span>총 전투력 <strong>${fmt(state.heroes.reduce((v,h)=>v+powerOf(h,state),0))}</strong></span><span>사냥 중 ${state.heroes.filter(h=>h.state==='hunt').length}</span>`;
  const list = $('hero-list'), scroll = list.scrollTop, left = list.scrollLeft;
  list.innerHTML = state.heroes.map(h=>`<button class="hero-card ${h.id===selected?'selected':''}" data-action="select" data-id="${h.id}" aria-label="${h.name}, ${tierOf(h)}, 레벨 ${h.level}" aria-pressed="${h.id===selected}"><div class="hero-avatar" style="--hero-color:${classOf(h).color}"><canvas class="roster-portrait" data-portrait="${h.id}" width="72" height="96" aria-hidden="true"></canvas></div><div><div class="hero-name"><strong style="color:${HERO_GRADES[h.grade].color}">${h.name}</strong><small>Lv.${h.level}</small></div><div class="hero-class"><span style="color:${HERO_GRADES[h.grade].color}">${HERO_GRADES[h.grade].name}</span> · ${tierOf(h)}</div><div class="bar"><span style="width:${h.hp/statsOf(h,state).hp*100}%"></span></div><div class="hero-status ${h.state}"><i class="status-dot"></i>${statusOf(h)}</div></div></button>`).join('');
  list.scrollTop = scroll; list.scrollLeft = left;
  for(const canvas of list.querySelectorAll('[data-portrait]')) portrait(canvas,state.heroes.find(h=>h.id===canvas.dataset.portrait),state);
}
function renderDetail() {
  const h=selectedHero(),st=statsOf(h,state);
  $('detail-panel').innerHTML = `<div class="detail-identity"><div class="detail-top"><span class="eyebrow">ADVENTURER PROFILE</span><span>${h.path.length+1}차 직업</span></div><div class="portrait-stage"><span class="portrait-sigil" style="color:${heroIdentity(h).accent}">${icon(classOf(h).glyph)}</span><canvas id="hero-portrait" width="252" height="316" aria-label="${h.name}의 현재 장비 외형"></canvas><div class="level-orb">${h.level}</div></div><div class="detail-name"><h2 style="color:${HERO_GRADES[h.grade].color}">${h.name}</h2><p><span style="color:${HERO_GRADES[h.grade].color}">${HERO_GRADES[h.grade].name} · 기본 능력치 ×${HERO_GRADES[h.grade].multiplier}</span></p><p class="hero-epithet">${heroIdentity(h).epithet}</p><p>${heroIdentity(h).origin}</p><p><span class="class-tag">${titleOf(h)}</span> · ${classOf(h).role}</p></div><div class="palette-row" aria-label="코스튬 색상">${[['equipment','장비 외형','#b5a57b'],['ash','잿빛','#9b9f9e'],['crimson','핏빛','#ae655c'],['forest','숲','#799c81'],['midnight','밤','#838fb6']].map(([v,n,c])=>`<button class="palette-swatch ${h.costume.palette===v?'active':''}" style="--swatch:${c}" data-action="costume" data-value="${v}" title="${n} 코스튬" aria-label="${n} 코스튬" aria-pressed="${h.costume.palette===v}"></button>`).join('')}</div></div>
+    <div class="detail-core"><div class="health-label"><span id="detail-status">${statusOf(h)}</span><span id="detail-health"></span></div><div class="bar health-bar"><span id="detail-hp"></span></div><div class="bar xp-bar" title="경험치"><span id="detail-xp"></span></div><div class="stats-grid"><div><small>공격력</small><strong>${Math.round(st.atk)}</strong></div><div><small>방어력</small><strong>${Math.round(st.def)}</strong></div><div><small>치명타</small><strong>${Math.round(st.crit*100)}<small style="display:inline">%</small></strong></div></div></div>
+    <div class="detail-gear"><div class="detail-section-heading"><span>장비창 요약</span><button class="text-button" data-action="profile-tab" data-tab="equipment">장비 관리 ↗</button></div><div class="gear-slots">${(()=>{const g=gearSummary(h,state);return [['weapon','무기'],['body','몸 방어구'],['accessory','장신구']].map(([k,n])=>{const item=g[k];return `<button class="gear-slot" data-action="profile-tab" data-tab="equipment"><span class="gear-icon" style="color:${item?gradeColor(item):''}">${icon(item?iconFor(item):k==='weapon'?classOf(h).glyph:k==='body'?'armor':'gem')}</span><span><small>${n} · 배치 ${h.placed.length}개 · 무게 ${Math.round(st.load*100)}%</small><strong style="color:${item?gradeColor(item):'#939c86'}">${item?displayName(item):'없음'}</strong></span><span>›</span></button>`;}).join('');})()}</div></div>
+    <div class="detail-skills"><div class="detail-section-heading"><span>자동 사용 스킬</span><button class="text-button" data-action="profile-tab" data-tab="skills">스킬 ${h.skillPoints?`+${h.skillPoints}`:'관리'} ↗</button></div><div class="skills-preview">${skillsOf(h).map((sk,i)=>`<button class="skill-mini ${sk.passive?'passive':''}" title="${sk.name}: ${sk.desc}" aria-label="${sk.name}: ${sk.desc}" data-action="preview" data-id="${sk.id}"><span>${skillIcon(skillById(sk.id)||sk)}</span><span class="cooldown-mask" data-cooldown="${sk.id}" data-cd="${sk.cd||1}"></span><small>${sk.rank}</small></button>`).join('')}</div></div>
+    <div class="detail-actions"><div class="wallet"><span>용사 보유 골드</span><strong id="hero-gold">${fmt(h.gold)} G</strong></div><button class="primary-button full" data-action="profile-tab" data-tab="skills">${icon('tree')} ${h.path.length===2?'스킬 빌드 관리':'전직 트리 살펴보기'}</button></div>`.replace(/^\+/gm,'');
  portrait($('hero-portrait'),h,state);updateDetail();
}
function updateDetail() {
  const h=selectedHero(),st=statsOf(h,state);if(!$('detail-hp'))return;
  $('detail-hp').style.width=`${h.hp/st.hp*100}%`; $('detail-xp').style.width=`${h.xp/xpNeeded(h)*100}%`;
  $('detail-health').textContent=`${Math.ceil(h.hp)} / ${Math.ceil(st.hp)}`; $('detail-status').textContent=statusOf(h);$('hero-gold').textContent=`${fmt(h.gold)} G`;
  for(const el of document.querySelectorAll('[data-cooldown]')) el.style.height=`${Math.min(100,(h.cooldowns[el.dataset.cooldown]||0)/Number(el.dataset.cd)*100)}%`;
}
function zoneChip(h){const st=statsOf(h,state);return `<button class="zone-hero ${h.id===selected?'selected':''}" data-action="select" data-id="${h.id}" data-hero="${h.id}" style="--hero-color:${classOf(h).color}" title="${h.name} · Lv.${h.level} · ${statusOf(h)}" aria-label="${h.name}, 레벨 ${h.level}, ${statusOf(h)}"><canvas data-portrait="${h.id}" width="48" height="64" aria-hidden="true"></canvas><small style="color:${HERO_GRADES[h.grade].color}">${h.level}</small><i class="status-dot ${h.state}"></i><span class="chip-hp"><span style="width:${Math.max(0,h.hp/st.hp*100)}%"></span></span></button>`;}
function renderActs() {
  const columns=[{id:-1,name:'마을 대기',sub:'사냥을 쉬고 마트에서 대기',heroes:state.heroes.filter(h=>h.standby),open:true,color:'#cfc9a0'},...ZONES.map(z=>({id:z.id,zone:z,name:`ACT ${z.act} · ${z.name}`,heroes:state.heroes.filter(h=>!h.standby&&h.zone===z.id),open:availableZone(state,z.id),color:z.color}))];
  const html=`<div class="zone-board" id="zone-board">${columns.map(col=>`<section class="zone-column ${col.id===-1?'town':''} ${col.open?'':'locked'} ${col.zone&&selectedZone===col.id?'active':''}" data-drop-zone="${col.id}" style="--act-color:${col.color}" aria-label="${col.name}"><header>${col.zone?`<button class="zone-title" data-action="zone" data-zone="${col.id}" aria-pressed="${selectedZone===col.id}">${col.name}</button>`:`<strong class="zone-title">${col.name}</strong>`}<small>${col.open?`${col.heroes.length}명${col.zone?` · Lv.${col.zone.level}+`:''}`:`Lv.${col.zone.level} 해금 ${icon('lock')}`}</small></header><div class="zone-heroes">${col.heroes.map(zoneChip).join('')||`<span class="zone-empty">${col.open?'여기에 놓기':'잠김'}</span>`}</div><footer>${col.zone?`<div class="spawn-control"><span>젠</span><div class="spawn-options" role="group" aria-label="ACT ${col.zone.act} 몬스터 재생성 속도">${[1,2,3,4,5].map(v=>`<button class="small-button ${state.spawnRates[col.id]===v?'active':''}" data-action="spawn-rate" data-zone="${col.id}" data-value="${v}" aria-pressed="${state.spawnRates[col.id]===v}">${v}×</button>`).join('')}</div></div><small>${MATERIALS[col.zone.material].name} · ${(1.8/state.spawnRates[col.id]).toFixed(2)}초 간격</small>`:`<small>${col.sub}</small>`}</footer></section>`).join('')}</div>`;
  const host=$('expedition-view');if(host._markup===html)return;host._markup=html;host.innerHTML=html;
  for(const canvas of host.querySelectorAll('[data-portrait]'))portrait(canvas,state.heroes.find(h=>h.id===canvas.dataset.portrait),state);
}
function costsHTML(cost) { return Object.entries(cost).map(([k,v])=>`<span class="${state.materials[k]<v?'insufficient':''}">${MATERIALS[k].name} ${v}</span>`).join(''); }
const gearUI=installGearUI($('workshop-view'),{state:()=>state,hero:()=>selectedHero(),icon,fmt,result:r=>result(r),toast});
function renderWorkshop() { gearUI.render(); }
let treeNode=null;
function treeNodesOf(h){const c=classOf(h);return [{node:c,tier:1,parent:null},...c.branches.map(b=>({node:b,tier:2,parent:c})),...c.branches.flatMap(b=>b.children.map(n=>({node:n,tier:3,parent:b})))];}
function treeInfo(h,n){
 if(n.tier===1)return {state:'chosen',sub:'기본 직업',eligible:false};
 const level=n.tier===2?20:40,chosen=h.path.includes(n.node.id),eligible=n.tier===2?!h.path.length:h.path.length===1&&h.path[0]===n.parent.id;
 if(chosen)return {state:'chosen',sub:'현재 계열',eligible:false};
 if(eligible)return h.level>=level?{state:'eligible',sub:'클릭하여 전직',eligible:true}:{state:'waiting',sub:`Lv.${level} 필요`,eligible:false};
 return {state:'other',sub:n.tier===3&&!h.path.length?'2차 전직 후 선택':'다른 계열',eligible:false};
}
function renderSkills() {
 const h=selectedHero(),c=classOf(h),nodes=treeNodesOf(h);
 const focusId=nodes.some(n=>n.node.id===treeNode)?treeNode:(h.path.at(-1)||c.id);
 const nodeHTML=n=>{const info=treeInfo(h,n),sk=skillById(`${n.node.id}-0`);return `<button class="tree-node ${info.state} ${n.node.id===focusId?'focus':''}" data-action="tree-node" data-id="${n.node.id}" aria-pressed="${n.node.id===focusId}" title="${n.node.name} · ${info.sub}"><span class="node-icon">${skillIcon(sk)}</span><strong>${n.node.name}</strong><small>${info.sub}</small></button>`;};
 const tree=`<ul class="d2-tree" aria-label="전직 트리"><li>${nodeHTML(nodes[0])}<ul>${c.branches.map(b=>`<li>${nodeHTML(nodes.find(n=>n.node===b))}<ul>${b.children.map(ch=>`<li>${nodeHTML(nodes.find(n=>n.node===ch))}</li>`).join('')}</ul></li>`).join('')}</ul></li></ul>`;
 const f=nodes.find(n=>n.node.id===focusId),finfo=treeInfo(h,f),cost=f.tier===2?'철 조각 35 · 마력석 12':f.tier===3?'마력석 25 · 영혼 결정 15':'';
 const detail=`<div class="tree-detail"><div class="tree-detail-head"><span class="node-icon">${skillIcon(skillById(`${f.node.id}-0`))}</span><div><small>${f.tier}차 · ${f.parent?f.parent.name+' → ':''}${f.node.name}</small><h3>${f.node.name}</h3><p>${f.node.theme||`${f.node.role} · ${f.node.weapon}`}${cost?` · 전직 비용 ${cost}`:''}</p></div><span class="tree-state ${finfo.state}">${finfo.sub}</span></div><div class="tree-skill-list">${f.node.skills.map((sd,idx)=>{const sk=skillById(`${f.node.id}-${idx}`);return `<button class="tree-skill" data-action="preview" data-id="${sk.id}" title="${sd.desc}">${skillIcon(sk)}<span><strong>${sd.name}</strong><small>${sd.passive?'패시브 효과':'효과 미리보기 ▷'}</small></span></button>`;}).join('')}</div></div>`;
 const scroll=$('skills-view').scrollTop;
 $('skills-view').innerHTML=`<div class="skill-studio"><section id="skill-preview" class="skill-preview" aria-label="스킬 효과 미리보기"></section><div class="skill-tree-content"><div class="surface tree-intro"><h3>${h.name} · ${tierOf(h)}</h3><p>계열 아이콘을 누르면 그 계열의 스킬을 미리 봅니다. 조건을 갖춘 계열은 <b>클릭 즉시 전직</b>합니다 (Lv.20 → 2차, Lv.40 → 3차). 전직은 되돌릴 수 없습니다.</p></div>${tree}${detail}<div class="section-title" style="margin-top:24px"><h3>배운 스킬 · ${h.skillPoints} P</h3><button class="text-button" data-action="reset-skills">포인트 초기화 · 무료</button></div>${skillsOf(h).map(sk=>`<div class="skill-row"><button class="skill-mini" data-action="preview" data-id="${sk.id}" aria-label="${sk.name} 미리보기">${skillIcon(skillById(sk.id))}</button><div class="skill-info"><h4>${sk.name}<span>Lv.${sk.rank} / 5</span></h4><p>${sk.desc}</p></div><button class="icon-button" data-action="skill" data-id="${sk.id}" aria-label="${sk.name} 강화" title="${sk.rank} 포인트 사용" ${h.skillPoints<sk.rank||sk.rank>=5?'disabled':''}>+</button></div>`).join('')}</div></div>`;
 $('skills-view').scrollTop=scroll;renderPreview();
}
function renderPreview(){
 const host=$('skill-preview');if(!host)return;
 const h=selectedHero();let sk=skillById(previewSkillId);if(!sk||sk.classId!==h.classId){sk=SKILL_CATALOG.find(s=>s.classId===h.classId);previewSkillId=sk.id;}
 const learned=skillsOf(h).some(s=>s.id===sk.id);
 host.innerHTML=`<div class="preview-heading">${skillIcon(sk)}<div><small>${sk.nodeName} · ${learned?'습득한 스킬':'미습득 · 미리보기 가능'}</small><h3>${sk.name}</h3></div></div><canvas id="preview-canvas" width="640" height="300" aria-label="${sk.name} 효과 시연"></canvas><div class="preview-controls"><button class="small-button" data-action="preview-replay">↻ 다시 보기</button><button class="small-button" data-action="preview-pause">${previewPaused?'▷ 재생':'Ⅱ 멈춤'}</button><button class="small-button ${previewSlow?'active':''}" data-action="preview-slow">0.5×</button></div><p>${sk.desc}</p><div class="preview-facts"><span>${sk.passive?'상시 발동':`재사용 ${sk.cd}초`}</span><span>${sk.passive?'패시브':'자동 시전'}</span></div><small class="muted">${sk.passive?'패시브는 능력 보조 효과를 오라로 표현합니다.':'실제 전투와 같은 이펙트를 사용하는 연출 미리보기입니다.'}</small>`;
}
function drawPreview(now){
 const canvas=$('preview-canvas');if(!canvas||!canvas.checkVisibility())return;const sk=skillById(previewSkillId);if(!sk)return;
 const elapsed=(previewPaused?previewElapsed:now-previewStarted)/1000*(previewSlow?.5:1),phase=elapsed%3.2,t=Math.max(0,Math.min(1,(phase-.35)/1.25));
 const c=canvas.getContext('2d');c.clearRect(0,0,640,300);c.fillStyle='#152a28';c.fillRect(0,0,640,300);
 const glow=c.createRadialGradient(400,160,10,400,160,250);glow.addColorStop(0,'#47644b');glow.addColorStop(1,'#1b302c');c.fillStyle=glow;c.fillRect(0,0,640,300);
 c.strokeStyle='#8fa78122';c.lineWidth=1;for(let x=-200;x<800;x+=48){c.beginPath();c.moveTo(320+(x-320)*.3,100);c.lineTo(x,300);c.stroke();}for(let y=120;y<300;y+=30){c.beginPath();c.moveTo(0,y);c.lineTo(640,y);c.stroke();}
 const h=selectedHero(),targets=[{x:410,y:190},{x:482,y:163},{x:493,y:225}],from={x:135,y:194};
 for(const [i,b] of targets.entries()){const recoil=t>.2&&t<.55&&!sk.passive?Math.sin(t*20)*4:0;c.fillStyle='#826943';c.fillRect(b.x-3+recoil,b.y-44,6,46);c.fillRect(b.x-20+recoil,b.y-35,40,5);c.fillStyle='#b9a878';c.beginPath();c.arc(b.x+recoil,b.y-44,12,0,Math.PI*2);c.fill();c.strokeStyle='#725143';c.lineWidth=3;c.beginPath();c.arc(b.x+recoil,b.y-44,6,0,Math.PI*2);c.stroke();c.fillStyle='#172922';c.fillRect(b.x-23,b.y+8,46,4);c.fillStyle='#c6b884';c.fillRect(b.x-23,b.y+8,46*(phase>.8&&!sk.passive?.45:1),4);}
 drawHero(c,h,state,from.x,from.y,1.25,elapsed,false,{moving:false,attack:phase>.25&&phase<.8});
 if(phase>.35&&phase<1.65)drawSkillEffect(c,sk,from,targets[0],t,targets);
 c.fillStyle='#d3dec0';c.font='12px monospace';c.fillText(sk.passive?'PASSIVE · 상시 효과':'SKILL PREVIEW · 자유 시연',20,25);c.fillStyle='#a5b99d';c.fillText(phase<.35?'시전 준비':phase<1.65?'효과 발동':'다음 시연 대기',20,278);
 canvas.dataset.skill=sk.id;canvas.dataset.phase=String(t);
}
function renderTown(){
 const host=$('town-view');host.innerHTML=`<div class="town-intro"><div><h3>나만의 던전 마을</h3><p>시설을 선택한 뒤 지도에서 새 위치를 누르세요. 드래그로 지도 이동 · 편집 중 사냥은 잠시 멈춥니다.</p></div><div class="town-actions"><button class="small-button" data-action="town-undo" ${townUndo.length?'':'disabled'}>↶ 되돌리기</button><button class="small-button" data-action="town-reset">기본 배치</button><button class="primary-button" data-action="view" data-view="world">꾸미기 완료</button></div></div><div class="town-tools"><div><h4>시설 이동 · 무료</h4><div class="tool-row">${POIS.filter(p=>MOVABLE_IDS.includes(p.id)).map(p=>`<button class="small-button ${townTool.id===p.id?'active':''}" data-action="town-tool" data-kind="move" data-id="${p.id}">${p.name}</button>`).join('')}</div></div><div><h4>마을 장식 · 무료 · ${state.town.decorations.length}/300</h4><div class="tool-row">${Object.entries(DECORATIONS).map(([id,d])=>`<button class="small-button ${townTool.type===id?'active':''}" data-action="town-tool" data-kind="decorate" data-type="${id}">${d.name}</button>`).join('')}<button class="small-button ${townTool.kind==='erase'?'active':''}" data-action="town-tool" data-kind="erase">장식 지우기</button></div></div></div><p class="town-feedback" id="town-feedback" role="status">${townTool.kind==='move'?POIS.find(p=>p.id===townTool.id)?.name+' 이동 위치를 선택하세요.':townTool.kind==='erase'?'지울 장식을 누르세요.':DECORATIONS[townTool.type]?.name+' 배치 위치를 선택하세요.'} 배치는 즉시 저장됩니다.</p>`;
}
function townGhost(point){
 const p=snapTown(point.x,point.y),def=townTool.kind==='move'?POIS.find(o=>o.id===townTool.id):DECORATIONS[townTool.type]||{width:32,height:32};
 const error=townTool.kind==='move'?placementError(state.town,townTool.id,p.x,p.y):p.x<TOWN_BOUNDS.left||p.x>TOWN_BOUNDS.right||p.y<TOWN_BOUNDS.top||p.y>TOWN_BOUNDS.bottom?'마을 안에 배치하세요.':'';
 renderer.editGhost={...p,width:def.width,height:def.height,valid:!error};if($('town-feedback'))$('town-feedback').textContent=error||`${townTool.kind==='erase'?'장식 삭제':'여기에 배치'} · ${p.x}, ${p.y}`;
}
function placeTown(point){
 if(townTool.kind==='move'){const object=poiAt(point.x,point.y);if(object&&MOVABLE_IDS.includes(object.id)){townTool={kind:'move',id:object.id};renderTown();return;}}
 const before=structuredClone(state.town),r=editTown(state,{...townTool,x:point.x,y:point.y});if(r.ok){townUndo.push(before);if(townUndo.length>20)townUndo.shift();signature='';save();renderUI(true);}toast(r.message,!r.ok);townGhost(point);
}
const traits={coward:'동료가 쓰러지면 잠시 후퇴',revive:'근처의 시체를 되살리는 원거리 시전자',tough:'높은 체력 · 느린 이동',melee:'가까운 용사를 추격하는 근접 공격',charged:'피격 시 일정 확률로 전격 반격',charge:'빠른 접근과 연속 공격',poison:'원거리 독 공격 · 지속 피해',fire:'주기적인 범위 화염 공격',drain:'원거리 공격으로 생명력 흡수',curse:'공격 시 일시적으로 용사 약화',spawn:'주기적으로 작은 하수인 생성',boss:'봉인문에서 소환되는 재의 군주 · 잿불 폭발과 부하 소환'};
function renderBestiary(){ $('bestiary-view').innerHTML=ZONES.map(z=>`<article class="surface bestiary-act" style="--act-color:${z.color}"><div class="section-title"><div><div class="eyebrow">ACT ${z.act} · ${z.en}</div><h3 style="margin-top:8px">${z.name}</h3></div><span class="muted">Lv.${z.level}+</span></div><p>${z.theme} · 주요 재료: ${MATERIALS[z.material].name}</p><div class="monster-grid">${z.monsters.map(id=>{const m=MONSTERS[id];return `<div class="monster-entry"><canvas class="monster-portrait" data-monster="${id}" width="64" height="72" aria-hidden="true"></canvas><strong style="color:${m.color}">${m.name}</strong><small>${m.en}</small><p>${traits[m.trait]}</p></div>`;}).join('')}</div><p class="source-note">몬스터 구성 참고: <a href="https://classic.battle.net/diablo2exp/monsters/act${z.id+1}.shtml" target="_blank" rel="noopener noreferrer">Blizzard · The Arreat Summit, Act ${z.act}</a></p></article>`).join('')+'<p class="source-note">몬스터 명칭·액트 분류를 참고했습니다. 그래픽은 직접 그린 픽셀 아트이며, 능력치와 전투 수치는 Dungeon Mart 기준입니다.</p>'; for(const canvas of document.querySelectorAll('[data-monster]'))monsterPortrait(canvas,canvas.dataset.monster); }
function renderUI(force=false){
  if(!force&&(pointerHeld||document.activeElement?.tagName==='SELECT'))return;
  renderResources();renderRoster();renderActs();updateDetail();
  $('selected-hero-button').textContent = `${selectedHero().name} · 정보 ↗`;
  $('day-label').textContent=`DAY ${String(state.day).padStart(2,'0')}`;$('playtime').textContent=clock(state.time);$('kill-counter').textContent=`누적 처치 ${fmt(state.kills)}`;
  $('activity-log').innerHTML=state.logs.slice(0,3).map(l=>`<div class="log-row ${l.type}"><time>${clock(l.time)}</time><span class="log-message">${l.message}</span></div>`).join('');
  const h=selectedHero();const nextSig=JSON.stringify([selected,view,h.level,h.path,h.placed,h.costume,h.skillRanks,h.skillPoints,state.itemRev,state.warehouse.length,state.fieldDrops.length,Object.values(state.drawer.gems).join(),Object.values(state.drawer.runes).join(),state.upgrades,state.materials]);
  renderDropBadges();
  if(force||signature!==nextSig){signature=nextSig;renderNav();renderDetail();if($('hero-modal').open)renderProfileChrome();if(view==='workshop'||$('hero-modal').open&&profileTab==='equipment')renderWorkshop();if(view==='skills'||$('hero-modal').open&&profileTab==='skills')renderSkills();if(view==='bestiary')renderBestiary();if(view==='town')renderTown();}
  renderRaid();
  $('objective').textContent=!state.crafted?'첫 영업 목표: 장비 한 개 제작하기':!state.sales?'다음 목표: 용사의 장비창에 장비 배치하기':!state.heroes.some(h=>h.level>=8)?'다음 목표: 용사 Lv.8 달성 · ACT II 해금':'오늘도 던전 한가운데, 정상 영업.';
  const timeControlsHTML=`<button data-action="pause" class="${paused?'active':''}" aria-label="${paused?'게임 재개':'게임 일시정지'}" title="${paused?'재개':'일시정지'}">${icon(paused?'play':'pause')}</button>${[1,2,4].map(n=>`<button data-action="speed" data-value="${n}" class="${speed===n&&!paused?'active':''}" aria-label="${n}배속">${n}×</button>`).join('')}`;
  if ($('time-controls')._markup !== timeControlsHTML) { $('time-controls').innerHTML = timeControlsHTML; $('time-controls')._markup = timeControlsHTML; }
}
function renderRaid(){
  const b=state.raid&&state.enemies.find(e=>e.id===state.raid.bossId),hud=$('boss-hud'),button=$('summon-boss');
  button.disabled=!!state.raid;button.classList.toggle('active',!!state.raid);button.textContent=state.raid?'보스 전투 중':`보스 소환 · ${RAID_COST} G`;
  if(!b){hud.hidden=true;hud._markup='';return;}
  const m=MONSTERS[b.type],left=Math.max(0,state.raid.ends-state.time),fighters=state.heroes.filter(h=>h.state==='hunt'&&Math.hypot(h.x-b.x,h.y-b.y)<320).length;
  const html=`<div class="boss-title"><span>BOSS</span><strong>${m.name}</strong><small>${m.en}</small></div><div class="boss-bar"><span style="width:${Math.max(0,b.hp/b.maxHp*100).toFixed(1)}%"></span></div><div class="boss-meta"><span>${fmt(b.hp)} / ${fmt(b.maxHp)}</span><span>교전 ${fighters}명 · 남은 시간 ${clock(left)}</span></div>`;
  hud.hidden=false;if(hud._markup!==html){hud._markup=html;hud.innerHTML=html;}
}
function openModal(title,body,footer=''){ $('modal-content').innerHTML=`<div class="modal-heading"><h2>${title}</h2><button data-action="close" aria-label="닫기">×</button></div>${body}${footer?`<div class="modal-footer">${footer}</div>`:''}`;if(!$('modal').open)$('modal').showModal(); }
function help(){$('hero-modal').close();openModal('던전 한가운데, 오늘도 정상 영업.',`<p class="modal-description">당신은 편의점 주인입니다. 용사들의 전투는 자동으로, 성장의 방향은 당신의 손으로.</p><div class="help-steps"><div class="help-step"><strong>01. 사냥은 용사에게</strong><p>지도는 휠·핀치로 확대하고 드래그로 이동합니다. 액트 버튼과 미니맵으로 이동하세요. 체력이 낮거나 전리품이 쌓이면 마트로 돌아와 무료로 회복합니다. 사망 시 10초 후 부활합니다.</p></div><div class="help-step"><strong>02. 전리품과 제작</strong><p>몬스터가 떨어뜨린 장비와 재료는 귀환 시 마을 창고에 입고됩니다. 세트·유니크는 지도에 빛기둥으로 남으니 클릭해서 가져오세요. 5분이 지나면 자동으로 창고에 들어옵니다.</p></div><div class="help-step"><strong>03. 장비창은 격자</strong><p>용사마다 무기칸·방어구칸·장신구칸 크기가 다릅니다. 창고의 장비를 격자에 놓는 순간 효과가 나고, 처음 놓을 때 용사 골드가 마트 운영금으로 들어옵니다. 홈에 보석·각인석을 박고, 각인석 조합으로 진언을 완성해 보세요.</p></div><div class="help-step"><strong>04. 나만의 전직과 외형</strong><p>20·40레벨에 전직을 선택하세요. 레벨업 포인트로 스킬을 강화하고, 프로필의 색상 버튼으로 무료 코스튬을 적용하세요.</p></div></div><p class="modal-description">10초마다 자동 저장됩니다. 창을 숨기면 사냥은 잠시 멈추며, 오프라인 보상은 아직 없습니다. ${!saveAvailable?'현재 브라우저 저장이 불가능하니 파일로 내보내세요.':''}${saveLoadError?'기존 저장 파일을 읽지 못해 보호 중입니다. 파일을 불러오거나 새 게임을 선택하세요.':''}</p>`,`<button class="small-button" data-action="export">저장 파일 내보내기</button><button class="small-button" data-action="import">불러오기</button><button class="small-button" data-action="new-game">새 게임</button><button class="primary-button" data-action="close">영업 계속하기</button>`);}

document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
  const h=selectedHero(),a=b.dataset.action;
  if(a==='view')setView(b.closest('#nav')&&b.dataset.view===view?'world':b.dataset.view);
  if(a==='profile')openProfile();
  if(a==='profile-tab'){if(!$('hero-modal').open)openProfile(b.dataset.tab);else setProfileTab(b.dataset.tab);}
  if(a==='profile-prev'||a==='profile-next'){const i=state.heroes.findIndex(h=>h.id===selected),tab=profileTab;selected=state.heroes[(i+(a==='profile-next'?1:state.heroes.length-1))%state.heroes.length].id;previewSkillId=null;signature='';renderUI(true);setProfileTab(tab);}
  if(a==='profile-follow'){$('hero-modal').close();setView('world');renderer.focusHero(h,true);updateCameraChrome();toast(`${h.name}을 따라갑니다. 지도를 드래그하면 추적이 해제됩니다.`);}
  if(a==='preview'){previewSkillId=b.dataset.id;previewStarted=performance.now();previewElapsed=0;previewPaused=false;if(profileTab!=='skills'||!$('skill-preview')){setProfileTab('skills');}renderPreview();if(innerWidth<=900)$('skill-preview').scrollIntoView({block:'start',behavior:'smooth'});}
  if(a==='preview-replay'){previewStarted=performance.now();previewElapsed=0;previewPaused=false;renderPreview();}
  if(a==='preview-pause'){if(!previewPaused)previewElapsed=performance.now()-previewStarted;else previewStarted=performance.now()-previewElapsed;previewPaused=!previewPaused;renderPreview();}
  if(a==='preview-slow'){previewSlow=!previewSlow;previewStarted=performance.now();previewElapsed=0;renderPreview();}
  if(a==='town-tool'){townTool={kind:b.dataset.kind,type:b.dataset.type,id:b.dataset.id};renderer.editGhost=null;renderTown();}
  if(a==='town-undo'&&townUndo.length){const old=townUndo.pop();result(editTown(state,{kind:'restore',town:old}));renderTown();}
  if(a==='town-reset'){townUndo.push(structuredClone(state.town));if(townUndo.length>20)townUndo.shift();result(editTown(state,{kind:'restore',town:freshTown()}));renderTown();}

  if(a==='close-profile')$('hero-modal').close();
  if(a==='select'){if(suppressSelect)return;selectHero(b.dataset.id);}
  if(a==='zone'){selectedZone=Number(b.dataset.zone);{const z=ZONES[selectedZone];renderer.focus(z.x,z.y-32,1);updateCameraChrome();}renderActs();}
  if(a==='spawn-rate')result(setSpawnRate(state,Number(b.dataset.zone),Number(b.dataset.value)));
  if(a==='assign')result(assignZone(state,h,Number(b.dataset.zone)));
  if(a==='save')save(true);
  if(a==='speed'){speed=Number(b.dataset.value);paused=false;renderUI();}
  if(a==='pause'){paused=!paused;renderUI();}
  if(a==='focus-drop'){const d=state.fieldDrops.find(d=>d.id===b.dataset.id);if(d){$('hero-modal').close();setView('world');renderer.focus(d.x,d.y-20,1.5);updateCameraChrome();}}
  if(a==='pickup'){const r=pickupFieldDrop(state,b.dataset.id);result(r);if(r.ok)showPickup(r.item);}
  if(a==='facility')result(upgradeMart(state,b.dataset.id));
  if(a==='skill')result(upgradeSkill(state,h,b.dataset.id));
  if(a==='reset-skills')result(resetSkills(state,h));
  if(a==='costume'){h.costume.palette=b.dataset.value;signature='';renderUI(true);save();}
  if(a==='recruit')openModal('새로운 용사를 맞이하세요',`<p class="modal-description">120 G · 현재 ${state.heroes.length} / 20명<br>직업은 5종 중 각각 20% 확률로 등장합니다. 등급은 직업과 별도로 결정됩니다.</p><div class="recruit-grid">${HERO_GRADES.map(g=>`<div class="recruit-choice" style="--hero-color:${g.color};color:${g.color}"><strong>${g.name} · ${g.chance*100}%</strong><small>기본 공격력·방어력·체력 ×${g.multiplier}</small></div>`).join('')}</div><p class="modal-description">등급은 영입 후 유지됩니다. 장비 능력치는 별도로 더해집니다.</p><button class="primary-button full" data-action="hire" ${state.heroes.length>=20||state.treasury<120?'disabled':''}>무작위 용사 영입 · 120 G</button>`);
  if(a==='hire'){const r=result(recruit(state));if(r.ok){$('modal').close();setView('world');selectHero(r.hero.id);renderer.focusHero(r.hero,true);updateCameraChrome();toast(`${HERO_GRADES[r.hero.grade].name} · ${classOf(r.hero).name} ${r.hero.name} 영입! 도착장에서 이동합니다.`);}}
  if(a==='tree-node'){treeNode=b.dataset.id;const n=treeNodesOf(h).find(n=>n.node.id===treeNode),info=treeInfo(h,n);if(info.eligible){const r=result(promote(state,h,n.node.id));if(!r.ok)renderSkills();}else{previewSkillId=`${treeNode}-0`;previewStarted=performance.now();previewElapsed=0;previewPaused=false;renderSkills();}}
  if(a==='promote'){const c=classOf(h),node=c.branches.flatMap(b=>[b,...b.children]).find(n=>n.id===b.dataset.id);openModal(`${node.name} 전직`, `<p class="modal-description">${h.name}의 전직 계열을 ${node.name}(으)로 선택합니다. 전직 계열은 이 버전에서 되돌릴 수 없습니다.</p><div class="costs">${costsHTML(h.path.length?{crystal:25,soul:15}:{iron:35,crystal:12})}</div>`,`<button class="small-button" data-action="close">돌아가기</button><button class="primary-button" data-action="confirm-promote" data-id="${node.id}" data-hero="${h.id}">전직하기</button>`);}
  if(a==='confirm-promote'){const r=result(promote(state,state.heroes.find(h=>h.id===b.dataset.hero),b.dataset.id));if(r.ok)$('modal').close();}
  if(a==='summon-boss'){const r=result(summonBoss(state));if(r.ok){setView('world');renderer.focus(r.boss.x,r.boss.y-30,1);updateCameraChrome();}}
  if(a==='camera-home'){renderer.home();updateCameraChrome();}
  if(a==='camera-arrival'){renderer.focus(ARRIVAL.x,ARRIVAL.y-96,1);updateCameraChrome();}
  if(a==='camera-fit'){renderer.overview();updateCameraChrome();}
  if(a==='camera-hero'){if(renderer.followId)renderer.followId=null;else renderer.focusHero(h,true);updateCameraChrome();}
  if(a==='camera-in'||a==='camera-out'){renderer.zoom(renderer.camera.zoom*(a==='camera-in'?1.3:1/1.3));updateCameraChrome();}
  if(a==='expand-map'){setView('world');document.body.classList.toggle('map-expanded');requestAnimationFrame(()=>{renderer.resize();updateCameraChrome();});}
  if(a==='close')$('modal').close();
  if(a==='open-gear'){$('modal').close();gearUI.select(b.dataset.id);openProfile('equipment');}
  if(a==='help')help();
  if(a==='export'){const blob=new Blob([serialize(state)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='dungeon-mart-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('저장 파일을 내보냈습니다.');}
  if(a==='import'){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const file=input.files[0];if(!file)return;if(file.size>5_000_000){toast('저장 파일이 너무 큽니다.',true);return;}try{const next=restore(await file.text());if(!next){toast('올바른 Dungeon Mart 저장 파일이 아닙니다.',true);return;}openModal('진행 상황 불러오기','<p class="modal-description">현재 진행 상황을 선택한 파일로 교체합니다.</p>','<button class="small-button" data-action="close">취소</button><button class="primary-button" id="confirm-import">불러오기</button>');$('confirm-import').onclick=()=>{state=next;applyTownLayout(state.town);townUndo=[];selected=state.heroes[0].id;saveLoadError=false;signature='';renderer.home();save();renderUI(true);$('modal').close();toast('진행 상황을 불러왔습니다.');};}catch{toast('저장 파일을 읽지 못했습니다.',true);}};input.click();}
  if(a==='new-game')openModal('새 영업 시작','<p class="modal-description">현재 용사, 장비, 진행 상황이 모두 초기화됩니다. 보관하려면 먼저 저장 파일을 내보내세요.</p>','<button class="small-button" data-action="help">돌아가기</button><button class="primary-button" data-action="confirm-new">초기화하고 시작</button>');
  if(a==='confirm-new'){state=createGame();townUndo=[];selected=state.heroes[0].id;selectedZone=0;saveLoadError=false;paused=false;speed=1;signature='';setView('world');renderer.home();updateCameraChrome();save();$('modal').close();toast('새로운 영업을 시작합니다.');}
});
let zoneDrag=null,suppressSelect=false;
const dropColumnAt=(x,y)=>document.elementFromPoint(x,y)?.closest('[data-drop-zone]')||null;
$('expedition-view').addEventListener('pointerdown',e=>{const chip=e.target.closest('.zone-hero');if(!chip||e.button)return;zoneDrag={id:chip.dataset.hero,x:e.clientX,y:e.clientY,chip,active:false,ghost:null};});
document.addEventListener('pointermove',e=>{
  const d=zoneDrag;if(!d)return;
  if(!d.active){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<8)return;d.active=true;d.ghost=d.chip.cloneNode(true);d.ghost.className='zone-hero drag-ghost';d.ghost.removeAttribute('data-action');document.body.append(d.ghost);portrait(d.ghost.querySelector('canvas'),state.heroes.find(h=>h.id===d.id),state);d.chip.classList.add('dragging');document.body.classList.add('zone-dragging');}
  d.ghost.style.transform=`translate(${e.clientX-26}px,${e.clientY-44}px)`;
  const col=dropColumnAt(e.clientX,e.clientY);for(const c of document.querySelectorAll('.zone-column'))c.classList.toggle('drop-target',c===col&&!c.classList.contains('locked'));
  e.preventDefault();
});
function endZoneDrag(e,drop){
  const d=zoneDrag;zoneDrag=null;if(!d||!d.active)return;
  d.ghost.remove();d.chip.classList.remove('dragging');document.body.classList.remove('zone-dragging');for(const c of document.querySelectorAll('.zone-column'))c.classList.remove('drop-target');
  suppressSelect=true;setTimeout(()=>suppressSelect=false,80);
  const col=drop?dropColumnAt(e.clientX,e.clientY):null,hero=state.heroes.find(h=>h.id===d.id);if(!col||!hero)return;
  if(col.classList.contains('locked')){toast('아직 열리지 않은 사냥터입니다.',true);return;}
  const zone=Number(col.dataset.dropZone);if(zone===-1?hero.standby:!hero.standby&&hero.zone===zone)return;
  result(assignZone(state,hero,zone));
}
document.addEventListener('pointerup',e=>endZoneDrag(e,true));document.addEventListener('pointercancel',e=>endZoneDrag(e,false));
$('modal').addEventListener('click',event=>{if(event.target===$('modal')){const r=$('modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('modal').close();}});
$('hero-modal').addEventListener('click',event=>{if(event.target===$('hero-modal')){const r=$('hero-modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('hero-modal').close();}});
$('hero-modal').addEventListener('close',returnProfileViews);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('modal').open&&!$('hero-modal').open&&view!=='world')setView('world');});
const renderer=new WorldRenderer($('world'),$('minimap'));
function updateCameraChrome(){
  const zoom=renderer.camera.zoom;$('zoom-label').textContent=`${Math.round(zoom*100)}%`;$('map-location').textContent=renderer.location;
  $('follow-button').classList.toggle('active',!!renderer.followId);$('follow-button').textContent=renderer.followId?'추적 중':'헌터 추적';
  const expanded=document.body.classList.contains('map-expanded');$('expand-map').setAttribute('aria-pressed',String(expanded));
  $('world').dataset.followId=renderer.followId||'';
  $('world').dataset.zoom=String(zoom);$('world').dataset.cameraX=String(renderer.camera.x);$('world').dataset.cameraY=String(renderer.camera.y);
}
const dropAt=p=>state.fieldDrops.find(d=>Math.abs(d.x-p.x)<18&&p.y<d.y+10&&p.y>d.y-130)||null;
function showPickup(item){const lines=itemLines(item,state);openModal(`${GRADES[item.grade].name} 획득!`,`<div class="pickup-card" style="--item-color:${gradeColor(item)}"><span class="wh-icon big">${icon(iconFor(item))}</span><div><h3 style="color:${gradeColor(item)}">${displayName(item)}</h3><small>${TIER_NAMES[item.tier]} ${itemBase(item).names[item.tier-1]} · ${item.w}×${item.h} · ${item.weight}kg</small><ul class="detail-lines">${lines.map(l=>`<li class="${l.kind}">${l.text}</li>`).join('')}</ul></div></div><p class="modal-description">창고에 보관했습니다. 용사 장비창에 놓으면 바로 효과가 납니다.</p>`,`<button class="small-button" data-action="close">나중에</button><button class="primary-button" data-action="open-gear" data-id="${item.id}">장비창 열기</button>`);}
function renderDropBadges(){const host=$('drop-badges');if(!host)return;const html=state.fieldDrops.map(d=>{const item=state.items[d.id];if(!item)return '';const left=Math.max(0,d.expires-state.time);return `<button class="drop-badge ${item.grade}" data-action="focus-drop" data-id="${d.id}" title="클릭하면 빛기둥으로 이동합니다. 지도에서 빛기둥을 클릭해 획득하세요.">✦ ${displayName(item)} <small>${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}</small></button>`;}).join('');if(host._markup!==html){host._markup=html;host.innerHTML=html;}}
function showPoi(p){
  if(p.interaction==='training'){openProfile('skills');return;}
  if(p.interaction==='shop'){openProfile('equipment');return;}
  if(p.interaction==='recruit'){document.querySelector('[data-action="recruit"]').click();return;}
  if(p.interaction==='bestiary'){setView('bestiary');return;}
  openModal(p.name,`<p class="modal-description">${p.description}</p><div class="surface"><p>${p.status==='reserved'?'향후 기능을 위해 확보한 공간입니다. 현재는 배치와 이동 동선만 마련되어 있습니다.':'지역 내 휴식과 탐험을 위한 공간입니다.'}</p></div>`,`<button class="primary-button" data-action="close">지도 계속 보기</button>`);
}
installMapInput($('world'),renderer,{
  change:updateCameraChrome,
  pick:event=>{if(renderer.editing){placeTown(renderer.point(event));return;}const p=renderer.point(event);const drop=dropAt(p);if(drop){const r=pickupFieldDrop(state,drop.id);result(r);if(r.ok)showPickup(r.item);return;}const hero=state.heroes.find(h=>Math.abs(h.x-p.x)<16&&p.y<h.y+8&&p.y>h.y-40);if(hero){selectHero(hero.id);return;}const object=poiAt(p.x,p.y);if(object){showPoi(object);return;}const z=regionAt(p.x,p.y);if(z?.zone!==undefined){selectedZone=z.zone;renderActs();}},
  hover:event=>{if(renderer.editing){if(event)townGhost(renderer.point(event));return;}const tip=$('map-tooltip');renderer.hovered=null;if(!event){tip.hidden=true;return;}const p=renderer.point(event),drop=dropAt(p),enemy=drop?null:state.enemies.find(e=>Math.abs(e.x-p.x)<18&&p.y<e.y+8&&p.y>e.y-44),object=drop?null:poiAt(p.x,p.y);if(!drop&&!enemy&&!object){tip.hidden=true;return;}
    if(drop){const item=state.items[drop.id];tip.innerHTML=`<span style="color:${gradeColor(item)}">${GRADES[item.grade].name} · ${displayName(item)}</span><small>클릭하여 획득 · ${Math.ceil(Math.max(0,drop.expires-state.time))}초 후 자동 입고</small>`;}
    else if(enemy){const m=MONSTERS[enemy.type];tip.innerHTML=`${enemy.elite?'정예 ':''}${m.name}<small>${Math.ceil(enemy.hp)} / ${Math.ceil(enemy.maxHp)} HP · ${m.en}</small>`;}
    else{renderer.hovered=object;tip.innerHTML=`${object.name}<small>${object.status==='reserved'?'확장 예정 · 클릭하여 설계 확인':object.interaction==='recruit'?'클릭하여 헌터 고용':object.interaction==='shop'?'클릭하여 제작소 열기':'클릭하여 자세히 보기'}</small>`;}
    tip.hidden=false;const r=$('world').getBoundingClientRect();tip.style.left=`${Math.max(5,Math.min(event.clientX-r.left+15,r.width-230))}px`;tip.style.top=`${Math.max(5,event.clientY-r.top-70)}px`;
  }
});
let miniDragging=false;
const moveMini=e=>{const p=renderer.miniPoint(e);renderer.focus(p.x,p.y,Math.max(renderer.camera.zoom,.75));updateCameraChrome();};
$('minimap').addEventListener('pointerdown',e=>{miniDragging=true;$('minimap').setPointerCapture(e.pointerId);moveMini(e);});
$('minimap').addEventListener('pointermove',e=>{if(miniDragging)moveMini(e);});
for(const name of['pointerup','pointercancel','lostpointercapture'])$('minimap').addEventListener(name,()=>miniDragging=false);
$('world').addEventListener('keydown',e=>{const k=e.key;if(['+','=','-','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','h','H','0'].includes(k))e.preventDefault();if(k==='+'||k==='=')renderer.zoom(renderer.camera.zoom*1.3);if(k==='-')renderer.zoom(renderer.camera.zoom/1.3);if(k==='0')renderer.overview();if(k.toLowerCase()==='h')renderer.home();if(k==='ArrowLeft')renderer.pan(100,0);if(k==='ArrowRight')renderer.pan(-100,0);if(k==='ArrowUp')renderer.pan(0,100);if(k==='ArrowDown')renderer.pan(0,-100);updateCameraChrome();});
$('save-icon').innerHTML=icon('save');
window.addEventListener('pagehide',()=>save());
document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;if(document.hidden)save();});
function frame(now){const elapsed=Math.min((now-last)/1000,.15);last=now;if(!paused&&!document.hidden&&!renderer.editing){accumulator+=elapsed*speed;while(accumulator>=.1){tick(state,.1);accumulator-=.1;}}renderer.draw(state,selected,selectedZone);drawPreview(now);updateCameraChrome();uiTimer+=elapsed;saveTimer+=elapsed;if(uiTimer>.65){renderUI();uiTimer=0;}if(saveTimer>10){save();saveTimer=0;}requestAnimationFrame(frame);}
renderUI(true);requestAnimationFrame(frame);
if(saveLoadError||!saveAvailable)help();else if(state.time<1)setTimeout(()=>toast('첫 영업을 시작합니다. 제작소에서 용사들의 첫 장비를 만들어 보세요.'),900);
