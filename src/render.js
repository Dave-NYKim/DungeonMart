import { HERO_GRADES } from './data.js';
import { ZONES, MONSTERS, MART, classOf } from './data.js';
import { statsOf, availableZone, gearSummary } from './engine.js';
import { GRADES, itemBase, gradeColor, displayName } from './items.js';
import { canvasOf, rect, oval, poly, stroke, panel, pixelText, heroSprite, monsterSprite, treeSprite, stoneSprite, martSprite, shade, scale2x } from './pixel-art.js';

import { WORLD, HUB, REGIONS, POIS, ARRIVAL, regionAt, layoutRevision, TOWN_BOUNDS, MOVABLE_IDS, snapTown, placementError } from './world.js';
import { Camera } from './camera.js';
import { skillById, drawSkillEffect, heroIdentity } from './skill-visuals.js';
import { buildScene, boatSprite } from './world-art.js';
export { WORLD } from './world.js';
const palette = { equipment: null, ash: '#a6b4bd', crimson: '#bd6e71', forest: '#7aa774', midnight: '#879cc7' };
export function appearanceOf(h, s) {
  const g=gearSummary(h,s),cls=classOf(h);
  const armor=g.body?Math.min(3,(itemBase(g.body).armorLevel??0)+(['set','unique'].includes(g.body.grade)||g.body.mantra?1:0)):-1;
  const weapon=g.weapon?(itemBase(g.weapon).glyph||cls.glyph):h.path[0]==='javelin'?'spear':cls.glyph;
  return { body:cls.id,color:palette[h.costume.palette]||(g.body?gradeColor(g.body):heroIdentity(h).accent),armor,weapon,weaponTier:g.weapon?GRADES[g.weapon.grade].sprite:-1,glow:g.accessory?GRADES[g.accessory.grade].sprite:-1,glowColor:g.accessory?gradeColor(g.accessory):null,tier:h.path.length,variant:Number(h.id.slice(1))%3,accent:heroIdentity(h).accent };
}
export function drawHero(c,h,s,x,y,scale=1,time=0,selected=false,pose={}) {
  const a=appearanceOf(h,s),moving=pose.moving??['depart','return'].includes(h.state),frame=moving?Math.floor(time*7+Number(h.id.slice(1)))%3:0;
  const sprite=heroSprite(a,frame,pose.attack||false),size=2*scale;
  c.save();c.imageSmoothingEnabled=false;
  if(h.state==='dead')c.globalAlpha=.4;
  oval(c,Math.round(x),Math.round(y+3*scale),11*scale,3*scale,'#15251b88');
  if(selected){stroke(c,x-17*scale,y-3*scale,x-17*scale,y+4*scale,'#ffe3a0',scale);stroke(c,x+17*scale,y-3*scale,x+17*scale,y+4*scale,'#ffe3a0',scale);stroke(c,x-17*scale,y+4*scale,x-12*scale,y+4*scale,'#ffe3a0',scale);stroke(c,x+12*scale,y+4*scale,x+17*scale,y+4*scale,'#ffe3a0',scale);}
  if(a.glow>=1){const col=a.glowColor;for(let i=0;i<5;i++){const phase=time*1.5+i*1.26;rect(c,x+Math.round(Math.cos(phase)*15*scale),y-4*scale+Math.round(Math.sin(phase)*4*scale),Math.max(1,scale),Math.max(1,scale),col);}}
  if(pose.flip){c.translate(Math.round(x),0);c.scale(-1,1);c.drawImage(sprite,-Math.round(12*size),Math.round(y-29*size),Math.round(24*size),Math.round(32*size));}
  else c.drawImage(sprite,Math.round(x-12*size),Math.round(y-29*size),Math.round(24*size),Math.round(32*size));
  c.restore();
}
function drawMonster(c,e,time){const m=MONSTERS[e.type],sprite=monsterSprite(m,Math.floor(time*5+e.x)%2,e.curse>0),size=e.elite?1.25:.85,x=Math.round(e.x),y=Math.round(e.y);oval(c,x,y+1,8*size,2*size,'#18241d88');c.imageSmoothingEnabled=false;c.drawImage(sprite,Math.round(x-16*size),Math.round(y-32*size),Math.round(32*size),Math.round(36*size));if(e.elite||e.hp<e.maxHp){panel(c,x-10,y-32*size-4,21,4,'#382f31');rect(c,x-9,y-32*size-3,Math.round(19*Math.max(0,e.hp/e.maxHp)),2,e.elite?'#e4b875':'#c57e72');}}
export class WorldRenderer {
 constructor(canvas,minimap){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.surface=canvasOf(1,1);this.low=this.surface.getContext('2d');const scene=buildScene();this.bg=scene.background;this.props=scene.props;this.sceneRevision=-1;this.editing=false;this.editGhost=null;this.boat=scale2x(boatSprite());this.flats=[];this.camera=new Camera();this.previous=new Map();this.minimap=minimap;this.followId=null;this.hovered=null;this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect();if(r.width&&r.height)this.camera.resize(r.width,r.height);}
 point(event){const r=this.canvas.getBoundingClientRect();return this.camera.worldPoint(event.clientX-r.left,event.clientY-r.top);}
 focus(x,y,zoom=1){this.followId=null;this.resize();this.camera.focus(x,y,zoom);}
 home(){this.focus(MART.x,MART.y-12,1.25);}
 overview(){this.followId=null;this.resize();this.camera.fit();}
 focusHero(h,follow=false){this.focus(h.x,h.y-14,1.5);this.followId=follow?h.id:null;}
 zoom(value,x,y){this.followId=null;this.resize();this.camera.zoomAt(value,x,y);}
 pan(dx,dy){this.followId=null;this.camera.pan(dx,dy);}
 get location(){if(this.camera.overview)return'전체 월드';if(this.followId)return'헌터 따라가기';if(Math.hypot(this.camera.x-ARRIVAL.x,this.camera.y-ARRIVAL.y)<240)return'헌터 도착장';return regionAt(this.camera.x,this.camera.y)?.name||'액트 연결로';}
 drawMinimap(s){if(!this.minimap)return;const c=this.minimap.getContext('2d'),w=this.minimap.width,h=this.minimap.height,scale=Math.min(w/WORLD.width,h/WORLD.height),ox=(w-WORLD.width*scale)/2,oy=(h-WORLD.height*scale)/2;c.clearRect(0,0,w,h);rect(c,0,0,w,h,'#17272d');c.imageSmoothingEnabled=true;c.drawImage(this.bg,ox,oy,WORLD.width*scale,WORLD.height*scale);c.imageSmoothingEnabled=false;for(const z of REGIONS){rect(c,ox+z.x*scale-2,oy+z.y*scale-2,4,4,z.color);}for(const hero of s.heroes){rect(c,ox+hero.x*scale-1,oy+hero.y*scale-1,2,2,'#fbebac');}for(const d of s.fieldDrops){const item=s.items[d.id];if(!item)continue;if(Math.floor(s.time*3)%2===0)rect(c,ox+d.x*scale-2,oy+d.y*scale-2,5,5,item.grade==='set'?'#8ff58a':'#ffb455');}rect(c,ox+MART.x*scale-3,oy+MART.y*scale-3,6,6,'#f7d599');const v=this.camera.view;c.strokeStyle='#ffebbc';c.lineWidth=1;c.strokeRect(Math.max(ox,ox+v.x*scale),Math.max(oy,oy+v.y*scale),Math.min(WORLD.width,v.width)*scale,Math.min(WORLD.height,v.height)*scale);}
 miniPoint(event){const r=this.minimap.getBoundingClientRect(),w=this.minimap.width,h=this.minimap.height,scale=Math.min(w/WORLD.width,h/WORLD.height),ox=(w-WORLD.width*scale)/2,oy=(h-WORLD.height*scale)/2;return{x:((event.clientX-r.left)*w/r.width-ox)/scale,y:((event.clientY-r.top)*h/r.height-oy)/scale};}
 rebuild(s){const scene=buildScene(s.town);this.bg=scene.background;this.props=scene.props;this.flats=scene.flats;this.sceneRevision=layoutRevision;}
 draw(s,selected,selectedZone){
  if(this.sceneRevision!==layoutRevision)this.rebuild(s);
  const {canvas,ctx:c,low:l}=this,r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(!r.width||!r.height)return;this.camera.resize(r.width,r.height);
  if(this.followId){const h=s.heroes.find(h=>h.id===this.followId);if(h){this.camera.x=h.x;this.camera.y=h.y-14;this.camera.constrain();}else this.followId=null;}
  const v=this.camera.view,zoom=this.camera.zoom,ox=Math.floor(v.x),oy=Math.floor(v.y),cw=Math.ceil(v.width)+2,ch=Math.ceil(v.height)+2;
  if(this.surface.width!==cw||this.surface.height!==ch){this.surface.width=cw;this.surface.height=ch;}
  l.setTransform(1,0,0,1,0,0);rect(l,0,0,cw,ch,'#1e2e32');l.imageSmoothingEnabled=false;l.translate(-ox,-oy);l.drawImage(this.bg,0,0);
  const visible=(x,y,pad=140)=>x>v.x-pad&&x<v.x+v.width+pad&&y>v.y-pad&&y<v.y+v.height+pad;
  for(const f of this.flats)if(visible(f.x,f.y,40))l.drawImage(f.sprite,f.x-16,f.y-16);
  for(const corpse of s.corpses)if(visible(corpse.x,corpse.y)){l.globalAlpha=Math.min(.6,corpse.life/12);stroke(l,corpse.x-4,corpse.y-3,corpse.x+4,corpse.y+3,'#e4d4ad');stroke(l,corpse.x+4,corpse.y-3,corpse.x-4,corpse.y+3,'#e4d4ad');}l.globalAlpha=1;
  const entities=this.props.filter(p=>visible(p.x,p.y)).map(p=>({y:p.y,draw:()=>{oval(l,p.x,p.y,Math.floor(p.sprite.width*.32),5,'#182a2270');l.drawImage(p.sprite,Math.round(p.x-p.sprite.width/2),Math.round(p.y-p.sprite.height+8));}}));
  for(const e of s.enemies)if(visible(e.x,e.y))entities.push({y:e.y,draw:()=>drawMonster(l,e,s.time)});
  for(const h of s.heroes){const prev=this.previous.get(h.id),moved=prev?Math.hypot(h.x-prev.x,h.y-prev.y)>.03:false,movingUntil=moved?s.time+.2:prev?.movingUntil||0,target=s.enemies.find(e=>e.id===h.target),flip=target?target.x<h.x:moved&&prev&&Math.abs(h.x-prev.x)>.01?h.x<prev.x:prev?.flip||false;this.previous.set(h.id,{x:h.x,y:h.y,flip,movingUntil});if(!visible(h.x,h.y))continue;
   entities.push({y:h.y,draw:()=>{if(h.state==='arrive'&&h.arrivalStage===-1)l.drawImage(this.boat,h.x-82,h.y-90);for(const p of h.pets){l.globalAlpha=.7;drawMonster(l,{...p,type:p.kind==='golem'?'hulk':'skeleton',hp:1,maxHp:1},s.time);l.globalAlpha=1;}drawHero(l,h,s,Math.round(h.x),Math.round(h.y),.5,s.time,h.id===selected,{moving:s.time<movingUntil,flip,attack:h.state==='hunt'&&h.attackCd>.85});if(h.id===selected||h.hp<statsOf(h,s).hp*.8){const x=Math.round(h.x),y=Math.round(h.y-38);panel(l,x-10,y,21,4,'#2c3732');rect(l,x-9,y+1,Math.max(0,Math.round(19*h.hp/statsOf(h,s).hp)),2,h.hp<statsOf(h,s).hp*.3?'#d77c73':'#b6d185');}}});
  }
  for(const d of s.fieldDrops){if(!visible(d.x,d.y))continue;const item=s.items[d.id];if(!item)continue;const col=item.grade==='set'?'#7fdc7a':'#f0a24a',pulse=.55+Math.sin(s.time*4+d.x)*.2;
   entities.push({y:d.y,draw:()=>{l.globalAlpha=.28*pulse;rect(l,d.x-5,d.y-120,10,120,col);l.globalAlpha=.6*pulse;rect(l,d.x-2,d.y-120,4,120,'#ffffff');l.globalAlpha=.5;oval(l,d.x,d.y,12,4,col);l.globalAlpha=1;for(let i=0;i<4;i++){const ph=(s.time*.6+i*.25+d.x*.01)%1;rect(l,d.x-6+Math.round(Math.sin((ph+i)*6.28)*4)+i*3,d.y-Math.round(ph*100),2,2,i%2?'#fff5c8':col);}rect(l,d.x-3,d.y-6,6,5,'#3a3324');rect(l,d.x-2,d.y-5,4,3,col);}});}
  entities.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
  for(const f of s.effects)if(visible(f.x,f.y)){const a=f.life/f.max;l.globalAlpha=a;if(f.kind==='skill'){const sk=skillById(f.skillId);if(sk)drawSkillEffect(l,sk,f.from,f.to,1-a,f.targets.length?f.targets:[f.to]);}else if(f.kind==='line'){stroke(l,f.x,f.y,f.to.x,f.to.y,f.color);rect(l,f.to.x-1,f.to.y-1,3,3,'#ffebbc');}else if(f.kind!=='text'){const radius=5+(1-a)*24;for(let i=0;i<8;i++){const angle=i*Math.PI/4;rect(l,f.x+Math.cos(angle)*radius,f.y+Math.sin(angle)*radius*.55,2,2,f.color);}}}l.globalAlpha=1;
  if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);rect(c,0,0,r.width,r.height,'#1e2e32');c.imageSmoothingEnabled=zoom*dpr<1;c.drawImage(this.surface,(ox-v.x)*zoom,(oy-v.y)*zoom,cw*zoom,ch*zoom);c.imageSmoothingEnabled=false;
  const label=(text,x,y,color='#f0e3bd',size=11,badge=false)=>{if(!visible(x,y,0))return;const p=this.camera.screenPoint(x,y);c.font=`600 ${size}px monospace`;c.textAlign='center';if(badge){const w=c.measureText(text).width+16;rect(c,p.x-w/2,p.y-13,w,21,'#253b2ce8');}c.lineWidth=3;c.strokeStyle='#25382e';c.fillStyle=color;c.strokeText(text,p.x,p.y);c.fillText(text,p.x,p.y);};
  if(zoom<.5){for(const z of ZONES)label(`ACT ${z.act} · ${z.name}`,z.x,z.y-200,z.color,11,true);label('DUNGEON MART',MART.x,MART.y-150,'#f5d493',11,true);label('여명 항구',ARRIVAL.x,ARRIVAL.y+75,'#d6d4b3',10,true);}
  else{for(const p of POIS)if(visible(p.x,p.y))label(p.name+(p.status==='reserved'?' · 확장 예정':''),p.x,p.y+30,p.status==='reserved'?'#c4c6a4':'#ead29b',10,true);const nameLabels=[];for(const h of [...s.heroes].sort((a,b)=>(b.id===selected)-(a.id===selected))){if(h.id!==selected&&zoom<.85)continue;const pos=this.camera.screenPoint(h.x,h.y-44);if(h.id!==selected&&nameLabels.some(p=>Math.abs(p.x-pos.x)<58&&Math.abs(p.y-pos.y)<18))continue;nameLabels.push(pos);label(h.name+(h.state==='arrive'?' · 입장 중':''),h.x,h.y-44,HERO_GRADES[h.grade ?? 0].color,11);}}
  for(const d of s.fieldDrops){const item=s.items[d.id];if(!item||!visible(d.x,d.y))continue;const left=Math.max(0,d.expires-s.time);label(`${displayName(item)} · ${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`,d.x,d.y-(zoom>=.5?126:40),item.grade==='set'?'#b9f0b3':'#ffd39a',10,true);}
  if(this.editing){const b=TOWN_BOUNDS,a=this.camera.screenPoint(b.left,b.top),z=this.camera.screenPoint(b.right,b.bottom);c.strokeStyle='#c8dfaf77';c.lineWidth=1;for(let x=b.left;x<=b.right;x+=32){const p=this.camera.screenPoint(x,b.top);stroke(c,p.x,a.y,p.x,z.y,'#c8dfaf33');}for(let y=b.top;y<=b.bottom;y+=32){const p=this.camera.screenPoint(b.left,y);stroke(c,a.x,p.y,z.x,p.y,'#c8dfaf33');}c.strokeStyle='#e8d99f';c.strokeRect(a.x,a.y,z.x-a.x,z.y-a.y);for(const p of POIS.filter(p=>MOVABLE_IDS.includes(p.id))){const v=this.camera.screenPoint(p.x-p.width/2,p.y-p.height);c.strokeStyle='#adddba';c.strokeRect(v.x,v.y,p.width*zoom,p.height*zoom);}if(this.editGhost){const g=this.editGhost,p=this.camera.screenPoint(g.x-g.width/2,g.y-g.height);c.fillStyle=g.valid?'#b8ef8966':'#f0787866';c.fillRect(p.x,p.y,g.width*zoom,g.height*zoom);}}
  if(this.hovered&&zoom>=.5){const p=this.hovered,screen=this.camera.screenPoint(p.x-p.width/2,p.y-p.height);c.strokeStyle='#f0d195';c.lineWidth=2;c.strokeRect(screen.x,screen.y,p.width*zoom,p.height*zoom);}
  for(const f of s.effects)if(f.kind==='text'&&zoom>=.5){c.globalAlpha=f.life/f.max;label(f.text,f.x,f.y-(1-f.life/f.max)*25-40,f.color,f.text.length>5?11:13);}c.globalAlpha=1;this.drawMinimap(s);
 }
}
export function portrait(canvas,h,s){
 const c=canvas.getContext('2d'),w=canvas.width,he=canvas.height;c.clearRect(0,0,w,he);c.imageSmoothingEnabled=false;
 const a=appearanceOf(h,s),sprite=heroSprite(a,0,false),size=Math.max(1,Math.floor(Math.min(w/30,he/37))),x=Math.floor(w/2),y=Math.floor(he*.89);
 oval(c,x,y,Math.round(size*9),Math.max(1,size*2),'#15221c88');c.drawImage(sprite,x-12*size,y-29*size,24*size,32*size);
}
export function monsterPortrait(canvas,id){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;const sprite=monsterSprite(MONSTERS[id]),scale=Math.max(1,Math.floor(Math.min(canvas.width/32,canvas.height/36)));c.drawImage(sprite,Math.floor((canvas.width-32*scale)/2),Math.floor((canvas.height-36*scale)/2),32*scale,36*scale);}
