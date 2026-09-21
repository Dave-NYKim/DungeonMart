import { CLASSES } from './data.js';
// Skill art and combat VFX share the same effect families in previews and live combat.
export const SKILL_CATALOG=CLASSES.flatMap(c=>[c,...c.branches.flatMap(b=>[b,...b.children])].flatMap(n=>n.skills.map((s,i)=>({...s,id:`${n.id}-${i}`,classId:c.id,nodeId:n.id,nodeName:n.name,rank:1}))));
export const skillById=id=>SKILL_CATALOG.find(s=>s.id===id);
const groups={fire:['fire','meteor'],ice:['slow','freeze','shatter'],lightning:['chain','charge','storm'],blood:['bleed','rend','blood','leech','drain'],poison:['poison','plague','dot','spread'],summon:['summon','army','golem','command','capacity','petdamage','concentrate','bond','ascend'],holy:['heal','cleanse','groupheal','aura','devotion','overheal','judgment'],shield:['shield','guard','fortify','taunt','thorns','defense'],arcane:['gravity','teleport','cooldown','resonance','spell','soul'],arrow:['multi','pierce','crit','boss','double','evade'],slash:['hit','aoe','stun','rage','frenzy','haste','damage','expose','onkill','knock','curse']};
const colors={quake:'#ddb583',whirl:'#ecd4a3',shout:'#efb779',curse:'#cd8bdb',death:'#b2d293',fire:'#ff9d4f',ice:'#91e1f5',lightning:'#cbb6ff',blood:'#f28288',poison:'#a8d76d',summon:'#97c5ab',holy:'#ffe19a',shield:'#a4c9ed',arcane:'#d199f1',arrow:'#dceba0',slash:'#e7b081'};
export function skillFamily(sk){
 if(sk.effect==='stun'||sk.effect==='knock'||sk.effect==='slow'&&sk.classId==='barbarian')return 'quake';
 if(sk.effect==='aoe'||sk.effect==='frenzy')return 'whirl';
 if(sk.effect==='rage'||sk.effect==='onkill')return 'shout';
 if(sk.effect==='curse'||sk.effect==='expose')return 'curse';
 if(sk.effect==='corpse')return 'death';
 if(sk.effect==='dot'&&sk.nodeId==='firelord')return 'fire';
 if(sk.classId==='amazon'&&sk.effect==='storm'&&sk.nodeId==='arrows')return 'arrow';
 if(sk.effect==='hit'){return {sorceress:'arcane',necromancer:'summon',amazon:'arrow',paladin:'holy'}[sk.classId]||'slash';}
 if(sk.effect==='slow'&&sk.classId==='barbarian')return 'slash';
 return Object.keys(groups).find(k=>groups[k].includes(sk.effect))||'arcane';
}
const motifs={
 quake:'M3 26H11L14 19L19 28H29M16 3V16M11 11L16 16L21 11M4 13L8 19M28 13L24 19',
 whirl:'M27 12C20 0 4 5 5 18C6 29 23 30 26 20C28 12 15 8 12 16C10 22 20 24 21 18M23 4L27 12L18 11',
 shout:'M5 18L14 13L20 5L25 25L14 21L7 24ZM25 10L30 7M27 17H32M25 24L30 28',
 curse:'M4 14L10 8H22L28 14L22 21H10ZM16 9V21M8 3L10 7M24 3L22 7M16 24V30M5 25L9 22M27 25L23 22',
 death:'M9 8H23V20H19V25H13V20H9ZM12 13H14M18 13H20M3 3L7 7M29 3L25 7M3 27L7 23M29 27L25 23',
 fire:'M16 3L19 12L24 8L27 19L24 27L8 27L5 19L12 9L12 18Z',
 ice:'M16 3V29M3 16H29M6 6L26 26M26 6L6 26M12 5L16 9L20 5M12 27L16 23L20 27',
 lightning:'M18 2L6 18H14L11 30L27 12H18Z',
 blood:'M16 3L26 18L24 26L16 29L8 26L6 18Z',
 poison:'M9 4H23M12 4V13L5 24L8 28H24L27 24L20 13V4M9 21H23M12 17H20',
 summon:'M8 6H24L28 12V21H22V28H10V21H4V12ZM10 13V17M22 13V17M14 23V28M18 23V28',
 holy:'M13 3H19V12H28V18H19V29H13V18H4V12H13Z',
 shield:'M16 3L28 8L25 22L16 29L7 22L4 8ZM16 8V24M10 14H22',
 arcane:'M16 3L27 10V23L16 29L5 23V10ZM16 8L22 17L16 24L10 17ZM3 3L7 7M25 25L29 29',
 arrow:'M5 27L26 6M15 6H26V17M6 18L14 26M3 22L10 29',
 slash:'M5 27L23 5L28 3L27 9L9 28ZM7 20L15 27M5 26L3 29'
};
export function skillIcon(sk){const family=skillFamily(sk),color=colors[family];return `<svg class="skill-art" viewBox="0 0 36 36" aria-hidden="true"><rect x="1" y="1" width="34" height="34" rx="5" fill="#17221f" stroke="#536054"/><path d="${motifs[family]}" transform="translate(2 2)" fill="${['fire','blood','holy','shield','summon','death','poison','arcane','lightning'].includes(family)?color+'77':'none'}" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>${sk.passive?'<circle cx="29" cy="29" r="4" fill="#e7d5a1" stroke="#17221f" stroke-width="2"/>':''}</svg>`;}
export function heroIdentity(h){const i=Number(h.id.slice(1)),c=CLASSES.find(c=>c.id===h.classId);const epithets={barbarian:['흉터의 선봉','강철 주먹','황야의 맹세'],necromancer:['묘지의 속삭임','잿빛 계약자','망령의 벗'],amazon:['바람의 사수','별빛 추적자','숲의 파수꾼'],sorceress:['별을 읽는 자','서리의 불꽃','폭풍의 눈'],paladin:['새벽의 방패','빛의 순례자','불굴의 맹세']};return {epithet:epithets[c.id][i%3],origin:['북부 산악 출신','바다 건너온 모험가','옛 왕국의 방랑자','변경의 생존자'][i%4],accent:h.path.length?colors[skillFamily(SKILL_CATALOG.find(s=>s.nodeId===h.path.at(-1)&&!s.passive)||SKILL_CATALOG.find(s=>s.classId===h.classId))]:c.color};}
export function drawSkillEffect(c,sk,from,to,p,targets=[to]){
 const family=skillFamily(sk),color=colors[family],t=Math.max(0,Math.min(1,p));c.save();c.lineCap='round';c.lineJoin='round';
 const line=(points,col=color,width=3)=>{c.beginPath();points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.strokeStyle=col;c.lineWidth=width;c.stroke();};
 const ring=(x,y,r,col=color,width=3)=>{c.beginPath();c.ellipse(x,y,Math.max(1,r),Math.max(1,r*.48),0,0,Math.PI*2);c.strokeStyle=col;c.lineWidth=width;c.stroke();};
 const spark=(x,y,count=12,r=38)=>{for(let i=0;i<count;i++){const a=i*2.399+sk.power,rr=r*(.3+t);c.fillStyle=i%3?'#fff0c1':color;c.fillRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.65-10,2+i%3,2+i%3);}};
 const impact=Math.max(0,(t-.22)/.78),fade=Math.min(1,(1-t)*3);c.globalAlpha=fade;
 if(sk.passive){ring(from.x,from.y,20+Math.sin(t*Math.PI)*18);ring(from.x,from.y,32,'#f7e8b3',1);spark(from.x,from.y-20,8,15);c.restore();return;}
 if(['fire','arcane','arrow','summon'].includes(family)&&!['gravity','teleport','army','golem','summon','meteor'].includes(sk.effect)){
  const travel=Math.min(1,t*3),x=from.x+(to.x-from.x)*travel,y=from.y-20+(to.y-from.y)*travel;
  line([{x:x-(to.x-from.x)*.14,y:y-2},{x,y}],color,family==='arrow'?2:7);ring(x,y,4,'#fff6dc',2);
 }
 if(family==='quake'){
  if(t>.15){ring(to.x,to.y,12+impact*75,color,4);for(let i=0;i<7;i++){const a=i*.9,dx=Math.cos(a),dy=Math.sin(a)*.5;line([{x:to.x,y:to.y},{x:to.x+dx*20,y:to.y+dy*20},{x:to.x+dx*35+8,y:to.y+dy*35},{x:to.x+dx*75*impact,y:to.y+dy*75*impact}],color,3);c.fillStyle='#d5c49a';c.fillRect(to.x+dx*40,to.y+dy*40-Math.sin(t*Math.PI)*25,7,7);}}
 }else if(family==='whirl'){
  for(let i=0;i<3;i++){c.strokeStyle=i%2?'#fff4cd':color;c.lineWidth=6-i;c.beginPath();c.ellipse(to.x,to.y-12,20+impact*45,12+impact*25,0,t*12+i*2,t*12+i*2+1.4);c.stroke();}spark(to.x,to.y-10,10,35);
 }else if(family==='shout'){
  for(let i=0;i<3;i++)ring(from.x,from.y-15,10+((t+i*.25)%1)*65,color,3);spark(from.x,from.y-25,8,20);
 }else if(family==='curse'){
  for(const b of targets){ring(b.x,b.y,22);line([{x:b.x-12,y:b.y-45},{x:b.x,y:b.y-55},{x:b.x+12,y:b.y-45},{x:b.x,y:b.y-35},{x:b.x-12,y:b.y-45}],color,3);line([{x:b.x,y:b.y-52},{x:b.x,y:b.y-38}],'#ffdfb3',3);}
 }else if(family==='death'){
  ring(to.x,to.y,impact*85,color,6);spark(to.x,to.y-20,24,55);
 }else if(family==='lightning'){
  if(t>.12){let a={x:from.x,y:from.y-20};for(const [i,b] of targets.entries()){const pts=[a];for(let j=1;j<5;j++)pts.push({x:a.x+(b.x-a.x)*j/5+(j%2?8:-8),y:a.y+(b.y-a.y)*j/5-14+Math.sin(t*60+j)*5});pts.push({x:b.x,y:b.y-12});line(pts,color,6);line(pts,'#fff5da',2);spark(b.x,b.y-10,7,16);a=b;}}
 }else if(family==='fire'){
  if(sk.effect==='meteor'&&t<.4){const q=t/.4,x=to.x-90*(1-q),y=to.y-170*(1-q);line([{x:x-30,y:y-60},{x,y}],color,15);ring(x,y,12,'#fff1ab',7);}
  if(t>.23){ring(to.x,to.y,12+impact*70,color,8*(1-impact)+1);for(let i=0;i<9;i++){const a=i*.7;c.fillStyle=i%2?color:'#ffdf89';c.fillRect(to.x+Math.cos(a)*impact*58,to.y+Math.sin(a)*impact*24-16-impact*15,5,10+Math.sin(t*20+i)*6);}spark(to.x,to.y,18,50);}
 }else if(family==='ice'){
  for(let i=0;i<10;i++){const a=i*2.4,r=18+i*5,x=to.x+Math.cos(a)*r,y=to.y+Math.sin(a)*r*.5;line([{x:x-4,y},{x,y:y-12-20*impact},{x:x+4,y}],i%2?color:'#e1fbff',3);}ring(to.x,to.y,impact*75);spark(to.x,to.y-18,16,42);
 }else if(family==='summon'&&['summon','army','golem','command','ascend'].includes(sk.effect)){
  const count=sk.effect==='army'?5:sk.effect==='command'?3:1;for(let i=0;i<count;i++){const x=from.x+35+i*23,y=from.y+(i%2)*15;ring(x,y,15+impact*10);c.fillStyle='#d6e4be';c.fillRect(x-5,y-26*Math.min(1,t*3),10,10);c.fillRect(x-3,y-16*Math.min(1,t*3),6,13);c.fillStyle='#253b32';c.fillRect(x-3,y-23*Math.min(1,t*3),2,3);c.fillRect(x+2,y-23*Math.min(1,t*3),2,3);}
 }else if(family==='shield'||family==='holy'){
  const x=from.x,y=from.y;c.fillStyle=color+'33';c.beginPath();c.ellipse(x,y-20,24+impact*9,40,0,0,Math.PI*2);c.fill();ring(x,y,25+impact*35);for(let i=0;i<5;i++){const xx=x-36+i*18,yy=y-10-t*65+(i%2)*15;line([{x:xx-4,y:yy},{x:xx+4,y:yy}],color,3);line([{x:xx,y:yy-4},{x:xx,y:yy+4}],color,3);}
 }else if(sk.effect==='gravity'||sk.effect==='teleport'){
  for(let i=0;i<4;i++)ring(to.x,to.y,8+((1-t+i*.2)%1)*65,i%2?color:'#684895',3);spark(to.x,to.y,20,35);
 }else if(family==='poison'){
  for(let i=0;i<9;i++){c.fillStyle=i%2?'#95c45b66':'#56793788';c.beginPath();c.ellipse(to.x+Math.sin(i*3)*35,to.y-10-Math.cos(i)*15,20+impact*12,15,0,0,Math.PI*2);c.fill();}spark(to.x,to.y-15,10,30);
 }else if(family==='arrow'){
  for(const [i,b] of targets.entries()){if(sk.effect==='storm'){line([{x:b.x-25,y:b.y-90*(1-t)},{x:b.x,y:b.y-10}],color,2);}else if(t>.2){line([{x:from.x,y:from.y-20},{x:b.x,y:b.y-12}],color,2);spark(b.x,b.y,6,15);}}
 }else if(family==='slash'||family==='blood'){
  c.strokeStyle=color;c.lineWidth=7;c.beginPath();c.ellipse(to.x,to.y-12,18+t*30,12+t*15,-.6,t*3,t*3+Math.PI*1.3);c.stroke();if(t>.2){line([{x:to.x-20,y:to.y+8},{x:to.x+18,y:to.y-36}],'#fff0c6',3);spark(to.x,to.y-15,12,28);}
 }else if(t>.25){ring(to.x,to.y,impact*55);spark(to.x,to.y-12,14,30);}
 c.restore();
}
