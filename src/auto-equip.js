import {statsOf, gearBonus, warehouseCapacity, warehouseUsed} from './engine.js';
import {itemBase, levelReq, effectiveGrid, dims, activation, weightOf} from './items.js';

// Compare the full loadout: active slots, set bonuses and load penalties count.
export function equipmentScore(h,s){
 const st=statsOf(h,s),res=(st.resFire+st.resCold+st.resLightning+st.resPoison)/4;
 const damage=(st.atk*(1+st.crit*(.5+st.critDmg))+st.fire+st.cold+st.lightning+st.poison)*(1+st.haste);
 return damage*4*(1+st.spell*.5+st.petdamage*(h.classId==='necromancer'?.5:.1))*(1+st.cooldown*.5)
  +(st.def*2+st.hp*.12)*(1+res)/(1-st.dr)+st.regen*4+st.atk*st.leech*3+st.skills*8+st.move*20;
}
function upgradePlan(s,h,item){
 const b=itemBase(item);if(b.classes&&!b.classes.includes(h.classId)||h.level<levelReq(item))return null;
 const grid=effectiveGrid(h)[b.zone],current=equipmentScore(h,s),same=h.placed.filter(p=>p.zone===b.zone);
 let best=null;const seen=new Set();
 // Try empty space, replacing each competing slot, and freeing a whole region.
 const seeds=[[],...same.map(p=>[p.id]),same.map(p=>p.id)];
 for(const rotated of item.w===item.h?[false]:[false,true]){
  const size=dims({...item,rotated});
  for(let y=0;y<=grid.h-size.h;y++)for(let x=0;x<=grid.w-size.w;x++)for(const seed of seeds){
   const remove=new Set(seed);
   for(const p of same){const d=dims({...s.items[p.id],rotated:p.rotated});if(x<p.x+d.w&&x+size.w>p.x&&y<p.y+d.h&&y+size.h>p.y)remove.add(p.id);}
   const placement={id:item.id,zone:b.zone,x,y,rotated};
   let placed=[placement,...h.placed.filter(p=>!remove.has(p.id))];
   const act=activation({...h,placed},s.items);
   if(!act.get(item.id)?.active)continue;
   for(const p of same)if(!remove.has(p.id)&&!act.get(p.id)?.active)remove.add(p.id);
   placed=placed.filter(p=>!remove.has(p.id));
   // Positions affect only corner bonuses; don't repeat equivalent evaluations.
   const key=[...remove].sort().join(',')+'|'+(x===0||x+size.w===grid.w)+'|'+(y===0||y+size.h===grid.h);
   if(seen.has(key))continue;seen.add(key);
   if(warehouseUsed(s)-1+remove.size>warehouseCapacity(s))continue;
   const remaining={...h,placed:h.placed.filter(p=>!remove.has(p.id))},before=statsOf(remaining,s);
   const price=item.purchased?0:Math.round(item.price*(1+before.price));
   if(price>h.gold||(before.weight+weightOf(item))/before.capacity>1.5)continue;
   const probe={...h,placed},st=statsOf(probe,s);if(st.load>1.5)continue;
   const score=equipmentScore(probe,s);
   if(score>current+1e-6&&(!best||score>best.score+1e-6))best={placed,remove:[...remove],price,score};
  }
 }
 return best;
}
export function autoEquip(s,h){
 if(!h||!s.heroes.includes(h))return {ok:false,message:'출전 용사를 선택하세요.'};
 const before=equipmentScore(h,s);let changed=0,spent=0;
 // Each initial warehouse item is considered once; displaced gear is preserved.
 const candidates=s.warehouse.map(id=>s.items[id]).filter(Boolean).sort((a,b)=>b.ilvl-a.ilvl||b.price-a.price);
 for(const item of candidates){
  if(!s.warehouse.includes(item.id))continue;
  const plan=upgradePlan(s,h,item);if(!plan)continue;
  s.warehouse=s.warehouse.filter(id=>id!==item.id);s.warehouse.push(...plan.remove);
  h.placed=plan.placed;h.gold-=plan.price;s.treasury+=plan.price;s.sales+=plan.price;spent+=plan.price;item.purchased=true;s.itemRev++;changed++;
  for(const [id,n]of Object.entries(gearBonus(h,s).sets))s.codex.sets[id]=Math.max(s.codex.sets[id]||0,n);
 }
 h.hp=Math.min(h.hp,statsOf(h,s).hp);
 return {ok:true,changed,spent,before,after:equipmentScore(h,s),message:changed?`${h.name} 장비 ${changed}개 자동 장착 · ${spent} G 사용`:'현재 조건에서 더 좋은 장비가 없습니다. 직업·레벨·골드·창고 여유를 확인하세요.'};
}
