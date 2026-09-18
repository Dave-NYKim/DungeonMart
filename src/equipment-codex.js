import { CLASSES } from './data.js';
import { BASES, SETS, UNIQUES, PASSIVE_NAMES, describeStat } from './items.js';

const stats = values => Object.entries(values || {}).map(([k,v]) => describeStat(k,v)).filter(Boolean).join(' · ');
const passives = values => Object.entries(values || {}).map(([k,v]) => `${PASSIVE_NAMES[k] || ({dual:'쌍수 두 번째 무기 적용',setStep:'세트 효과 단계'}[k]) || k} ${Number.isInteger(v)?`+${v}`:`+${Math.round(v*100)}%`}`).join(' · ');
const baseInfo = key => { const b=BASES[key];return `${b.names[0]} · ${b.w}×${b.h} · ${b.weight}kg · ${b.classes?b.classes.map(id=>CLASSES.find(c=>c.id===id).name).join(' / '):'공용'}`; };

export function equipmentCodexHTML(s, tab) {
  const intro='<p class="codex-note">1단 기준 · 획득 수치 변동</p>';
  if(tab==='sets') return intro+`<div class="equipment-codex">${Object.entries(SETS).map(([id,set])=>{
    const found=set.pieces.filter((_,i)=>s.codex.setPieces?.[`${id}:${i}`]).length;
    return `<details class="codex-entry set-entry" data-codex-id="${id}"><summary><strong>${set.name}</strong><span>${found} / ${set.pieces.length}부위 획득</span></summary><div class="codex-content"><p>${CLASSES.find(c=>c.id===set.classId).name} 세트 · 장비 레벨 ${set.ilvl}부터 등장</p><h4>구성 장비</h4><ul>${set.pieces.map((p,i)=>`<li><strong>${set.name}의 ${BASES[p.baseKey].names[0]}</strong><span class="codex-status">${s.codex.setPieces?.[`${id}:${i}`]?'획득':'미획득'}</span><p>${baseInfo(p.baseKey)}</p><p>${stats(p.stats)}</p></li>`).join('')}</ul><h4>동시 착용 효과</h4><ul>${set.bonuses.map((b,i)=>b?`<li><strong>${i}부위</strong><p>${[stats(b.stats),passives(b.passives),b.note].filter(Boolean).join(' · ')}</p></li>`:'').join('')}</ul><p>한 용사가 서로 다른 부위를 착용해야 적용됩니다.</p></div></details>`;
  }).join('')}</div>`;
  const found=UNIQUES.filter(u=>s.codex.uniques[u.id]>0).length;
  return `<p class="codex-note">유니크 ${found} / ${UNIQUES.length}종 획득</p>`+intro+`<div class="equipment-codex">${UNIQUES.map(u=>`<details class="codex-entry unique-entry" data-codex-id="${u.id}"><summary><strong>${u.name}</strong><span>${s.codex.uniques[u.id]>0?'획득':'미획득'}</span></summary><div class="codex-content"><p>${baseInfo(u.baseKey)}</p><p>장비 레벨 ${u.ilvl}부터 등장</p><h4>고유 옵션</h4><p>${stats(u.stats)}</p>${passives(u.passives)?`<p>${passives(u.passives)}</p>`:''}<p>${u.desc}</p></div></details>`).join('')}</div>`;
}
