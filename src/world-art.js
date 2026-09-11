import { WORLD, HUB, REGIONS, ROADS, POIS, contains, regionAt, roadAt, segmentDistance, solidAt, HARBOR, RESERVE, coastX, riverX, terrainBlocked } from './world.js';
import { canvasOf, rect, oval, poly, stroke, panel, pixelText, treeSprite, stoneSprite, martSprite, scale2x } from './pixel-art.js';
const tiles={coast:['#889875','#92a282','#a1ab88','#889c82'],reserve:['#68766b','#728071','#7a8678','#627369'],hub:['#607148','#667950','#718158','#5d7049'],grass:['#607547','#657c4b','#6c8050','#718754'],sand:['#b59b69','#bda575','#c2aa7a','#c6ad7f'],jungle:['#355d48','#3b684d','#446e53','#4b7456'],hell:['#4d3f40','#513f40','#554341','#574643']};
export function poiSprite(p){
 if(p.type==='mart')return martSprite();
 const w=Math.ceil(p.width/2),h=Math.ceil(p.height/2)+8,canvas=canvasOf(w,h),c=canvas.getContext('2d'),r=(x,y,ww,hh,col)=>rect(c,x,y,ww,hh,col);
 if(p.type==='plot'){
  for(let y=8;y<h-5;y+=4)for(let x=5;x<w-5;x+=4)r(x,y,4,4,(x+y)%3?'#8b8562':'#99906b');
  for(const[x,y]of[[3,9],[w-6,9],[3,h-7],[w-6,h-7]]){r(x,y,3,6,'#4d4c38');r(x,y,3,1,'#dbcca0');}
  stroke(c,6,12,w-6,12,'#cfba85');stroke(c,6,h-4,w-6,h-4,'#cfba85');stroke(c,6,12,6,h-5,'#baaa79');stroke(c,w-5,12,w-5,h-5,'#baaa79');
  panel(c,w/2-12,h/2-7,25,17,'#706444');r(w/2-1,h/2+9,2,8,'#63553b');pixelText(c,'SITE',w/2,h/2-2,'#efdaab',1,true);return canvas;
 }
 if(p.type==='arrival'){
  for(let y=16;y<h-2;y+=5){r(0,y,w,4,'#95784e');r(0,y,w,1,'#d5b67b');}
  for(let x=3;x<w;x+=23){r(x,12,4,h-10,'#64533e');r(x,12,4,3,'#dec596');}
  panel(c,w-42,20,28,19,'#756445');pixelText(c,'PORT',w-28,26,'#eed8a4',1,true);return canvas;
 }
 if(['forge','warehouse'].includes(p.type)){
  const forge=p.type==='forge';panel(c,8,25,w-16,h-28,forge?'#7b7771':'#a18f68');
  poly(c,[[3,27],[13,6],[w-13,6],[w-3,27]],forge?'#535f62':'#52756b');
  for(let y=9;y<26;y+=5)r(12,y,w-24,2,forge?'#889795':'#83a28a');
  panel(c,w/2-12,38,24,h-42,'#293932');r(w/2-9,41,18,h-45,forge?'#b4663c':'#705337');
  if(forge){r(13,0,10,26,'#6e6e67');r(12,0,12,4,'#b4b09c');r(w/2-6,h-18,12,10,'#f5c765');panel(c,4,h-15,17,6,'#8e9da0');r(10,h-9,5,7,'#4b5654');}
  else for(const x of[4,w-22]){panel(c,x,h-20,18,17,'#9c754d');stroke(c,x+2,h-18,x+15,h-5,'#dec393',2);}
  return canvas;
 }
 if(p.type==='training'){
  oval(c,w/2,h-10,w/2-2,8,'#a09770');for(const x of[16,w-16]){r(x-2,16,4,h-17,'#766147');r(x-12,25,24,4,'#bea16e');oval(c,x,18,7,7,'#b49764');r(x-3,16,6,5,'#e5d6a4');}return canvas;
 }
 if(p.type==='reception'){
  panel(c,7,23,w-14,h-29,'#b7ad83');r(10,26,w-20,h-35,'#d2c39c');poly(c,[[4,25],[10,5],[w-11,5],[w-4,25]],'#294a46');for(let y=7;y<24;y+=4)r(9,y,w-20,2,'#658778');
  panel(c,11,27,w-22,11,'#435742');pixelText(c,'GUILD',w/2,29,'#e5d6a4',1,true);panel(c,20,40,16,15,'#746e53');r(22,42,12,13,'#525d4b');r(22,43,2,8,'#bbc5a3');return canvas;
 }
 if(p.type==='board'){
  r(6,15,3,h-15,'#66513a');r(w-9,15,3,h-15,'#66513a');panel(c,1,8,w-2,23,'#9b7d51');r(3,10,w-6,18,'#d1c49b');r(5,12,7,10,'#eeebc6');r(15,12,9,3,'#706b4e');r(15,17,7,1,'#706b4e');r(15,20,6,1,'#706b4e');poly(c,[[0,9],[5,4],[w-6,4],[w-1,9]],'#685842');return canvas;
 }
 if(p.type==='fountain'||p.type==='oasis'){
  oval(c,w/2,h-13,w/2-2,11,'#263e3c');oval(c,w/2,h-16,w/2-3,10,p.type==='oasis'?'#7d9770':'#a1ad91');oval(c,w/2,h-18,w/2-6,7,'#417e79');oval(c,w/2,h-19,w/2-8,4,'#77b2a1');
  if(p.type==='fountain'){r(w/2-3,9,6,h-23,'#799489');r(w/2-2,9,2,h-24,'#bac9a8');panel(c,w/2-7,7,14,5,'#acc0a1');r(w/2-1,3,2,6,'#c5e4c0');}
  else{for(let i=0;i<6;i++){const x=8+i*10;r(x,h-13,1,7,'#58794c');r(x-1,h-13,3,1,'#a2b06b');}}
  return canvas;
 }
 const hell=p.type==='fortress',jungle=p.type==='temple',base=hell?'#646169':jungle?'#788466':'#a79570',light=hell?'#97908a':jungle?'#a3aa7b':'#d5c094',dark=hell?'#393940':jungle?'#455844':'#72644b';
 // Layered masonry with a clear dark entrance, carvings, and a readable silhouette.
 for(let i=0;i<4;i++){panel(c,5+i*4,h-13-i*5,w-10-i*8,6,dark);r(6+i*4,h-12-i*5,w-12-i*8,1,light);}
 panel(c,12,19,w-24,h-34,base);r(13,20,w-26,3,light);
 for(let y=26;y<h-24;y+=8){r(13,y,w-26,1,dark);for(let x=15+(y%16?5:0);x<w-15;x+=12)r(x,y,1,7,dark);}
 panel(c,w/2-11,h-47,22,25,dark);r(w/2-9,h-45,18,23,hell?'#783c35':'#252f2b');r(w/2-7,h-43,3,20,hell?'#c56d3c':'#405043');
 if(jungle){for(let i=0;i<4;i++){r(6+i*6,18-i*4,w-12-i*12,5,base);r(7+i*6,18-i*4,w-14-i*12,1,light);}r(15,24,3,22,'#3e6747');r(17,34,7,2,'#609154');}
 else if(hell){for(const x of[7,w-24]){panel(c,x,10,17,h-20,base);r(x+2,11,3,h-22,light);for(let i=0;i<3;i++)r(x+i*6,5,4,9,dark);}r(w/2-2,h-37,4,11,'#e0a24f');}
 else{poly(c,[[9,19],[w/2,3],[w-9,19]],dark);poly(c,[[14,17],[w/2,6],[w-14,17]],base);stroke(c,14,17,w/2,6,light);r(w/2-2,10,4,4,light);}
 return canvas;
}
function bench(){const a=canvasOf(28,16),c=a.getContext('2d');rect(c,3,4,23,4,'#a48b5d');rect(c,3,4,23,1,'#d2bb7f');rect(c,2,10,25,3,'#816842');rect(c,4,12,3,4,'#3b4434');rect(c,22,12,3,4,'#3b4434');return a;}
export function boatSprite(){
 const a=canvasOf(82,62),c=a.getContext('2d');
 poly(c,[[2,43],[73,43],[80,35],[70,57],[17,57]],'#463f32');poly(c,[[5,43],[73,43],[67,52],[18,52]],'#a27a4a');
 stroke(c,8,43,72,43,'#e2bb7d',2);rect(c,39,1,3,43,'#755538');
 poly(c,[[43,4],[43,35],[72,35],[65,16]],'#e7dcb4');poly(c,[[37,8],[15,34],[37,34]],'#babd9d');stroke(c,44,6,65,32,'#b1a582');
 rect(c,43,0,15,5,'#658f85');return a;
}
export function decorationSprite(type){
 if(type==='tree')return treeSprite('oak');if(type==='bench')return bench();
 const a=canvasOf(24,28),c=a.getContext('2d');
 if(type==='lamp'){rect(c,11,6,3,22,'#4d5c52');panel(c,7,3,11,10,'#d8bd77');rect(c,9,5,7,6,'#fff0ae');rect(c,6,1,13,3,'#6c7862');}
 if(type==='flowers'){rect(c,3,17,18,9,'#7c6748');for(let i=0;i<6;i++){rect(c,4+i*3,14,2,8,'#58824e');rect(c,3+i*3,12+(i%2)*3,4,3,i%2?'#e5bd76':'#c887a6');}}
 return a;
}
// The world buffer is now 1 pixel per world unit (was 1 per 2 units). Hand-drawn sprites keep
// their old footprint through Scale2x; terrain is regenerated on the finer grid with more specks.
const hiCache=new Map();
const hi=(key,make)=>{if(!hiCache.has(key))hiCache.set(key,scale2x(make()));return hiCache.get(key);};
let terrain=null;
function pathTile(){const a=canvasOf(16,16),c=a.getContext('2d');rect(c,0,0,16,16,'#b2ad89');rect(c,0,0,15,1,'#e0cf9d');rect(c,7,1,1,14,'#878974');rect(c,2,9,5,1,'#9d9878');rect(c,10,5,4,1,'#9d9878');rect(c,15,1,1,15,'#8f8a6c');return a;}
function buildTerrain(){
 const background=canvasOf(WORLD.width,WORLD.height),c=background.getContext('2d'),statics=[];let seed=87231;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 rect(c,0,0,background.width,background.height,'#28454c');
 for(let y=0;y<background.height;y+=8)for(let x=0;x<background.width;x+=8){
  const wx=x+4,wy=y+4,region=regionAt(wx,wy),road=roadAt(wx,wy);
  if(!region){rect(c,x,y,8,8,rnd()<.5?'#2c4c52':'#304f55');if(rnd()<.12)rect(c,x+rnd()*3,y+2+rnd()*5,4+rnd()*3,1,'#58716e');continue;}
  // Dithered transitions weave adjacent biomes together without hard tile borders.
  const jitter=region.biome==='hell'?56:110,mixed=regionAt(wx+(rnd()-.5)*jitter,wy+(rnd()-.5)*jitter)||region,colors=tiles[mixed.biome];
  rect(c,x,y,8,8,colors[Math.floor(rnd()*4)]);
  if(wx<coastX(wy)+38){rect(c,x,y,8,8,'#b7b591');if(rnd()<.5)rect(c,x+rnd()*4,y+6,4,1,'#d3c9a1');}
  else if(road){const paved=region===HUB||region===HARBOR;rect(c,x,y,8,8,paved?['#a9a27d','#b7ac85','#bfb58e'][Math.floor(rnd()*3)]:region.biome==='sand'?'#c5b181':'#9b9570');if(paved){rect(c,x,y,7,1,'#d4c397');rect(c,x+7,y+2,1,6,'#858162');}else if(rnd()<.35)rect(c,x+rnd()*6,y+rnd()*7,2,1,region.biome==='sand'?'#b8a578':'#8a8563');}
  else{const n=1+Math.floor(rnd()*2);for(let i=0;i<n;i++){const px=x+rnd()*7,py=y+rnd()*7;rect(c,px,py,2,1,colors[3]);if(['grass','jungle','hub'].includes(region.biome)&&rnd()<.7)rect(c,px,py-2,1,2,colors[1]);}if(rnd()<.06)rect(c,x+rnd()*6,y+rnd()*6,1,1,colors[0]);}
  if(wy>1710&&Math.abs(wx-riverX(wy))<22&&!road){rect(c,x,y,8,8,'#285d59');if(rnd()<.6)rect(c,x+rnd()*3,y+rnd()*7,5,1,'#75a293');}
 }
 const add=(sprite,x,y,kind='decoration')=>statics.push({sprite,x,y,kind});
 const trees={oak:hi('tree:oak',()=>treeSprite('oak')),palm:hi('tree:palm',()=>treeSprite('palm')),dead:hi('tree:dead',()=>treeSprite('dead'))},stones={rock:hi('stone:rock',()=>stoneSprite('rock')),sand:hi('stone:sand',()=>stoneSprite('rock',true)),grave:hi('stone:grave',()=>stoneSprite('grave')),pillar:hi('stone:pillar',()=>stoneSprite('pillar',true))};
 // Loose groves, broken escarpments, dunes and ruins vary in density across the continent.
 for(let i=0;i<2200;i++){
  const x=200+rnd()*3350,y=100+rnd()*2600,r=regionAt(x,y);if(!r||roadAt(x,y))continue;
  if(r===HUB){if(x>1250&&x<2350&&y>790&&y<1630)continue;if(rnd()<.55)continue;}
  if(r===HARBOR&&rnd()<.8)continue;
  const grove=Math.sin(x/113)+Math.cos(y/137)+Math.sin((x+y)/193);
  if(r.biome==='grass'&&grove<.2&&rnd()<.8)continue;
  if(r.biome==='sand'){
   if(i%3===0){const w=44+rnd()*90;stroke(c,x-w,y,x+w,y-16,'#d9bd85',3);stroke(c,x-w+14,y+8,x+w,y-8,'#a48c5c',2);}
   if(i%9===0)add(stones.pillar,x,y);else if(i%7===0)add(stones.sand,x,y);continue;
  }
  if(r===RESERVE){add(stones.rock,x,y);if(i%3===0)add(trees.oak,x+16,y+22);continue;}
  if(r.biome==='hell'){
   // Sparse, no random lava streaks: the volcanic floor stays readable around the sealed gate.
   if(rnd()<.62)continue;if(i%4===0)add(trees.dead,x,y);else if(i%3===0)add(stones.rock,x,y);continue;
  }
  add(rnd()<.85?trees[r.biome==='jungle'?'palm':'oak']:stones.rock,x,y);
  if(r.zone===0&&i%13===0)add(stones.grave,x+30,y+15);
 }
 // Northern ridgeline is scenery, not a blank reserved row.
 for(let i=0;i<44;i++){const x=1320+i*24,y=510+Math.sin(i*.23)*140;const h=50+rnd()*60;
  poly(c,[[x-42,y],[x-14,y-h],[x+12,y-h+18],[x+56,y]],'#495c59');poly(c,[[x-14,y-h],[x-8,y-16],[x+56,y]],'#84928a');poly(c,[[x-14,y-h],[x-26,y-h+28],[x+12,y-h+18]],'#bdc1a7');
  for(let k=0;k<6;k++)rect(c,x-30+rnd()*70,y-rnd()*h*.6,2,1,'#5d6f6a');
 }
 // Readable biome landmarks beyond palette changes.
 for(let i=0;i<18;i++){const x=2860+Math.sin(i*.73)*190,y=1750+i*43;if(roadAt(x,y))continue;oval(c,x,y,44+i%4*10,20,'#294f47');oval(c,x,y-4,36,14,'#397b68');oval(c,x-6,y-8,14,4,'#4d9a82');}
 for(let i=0;i<13;i++){const x=2770+i*3+Math.sin(i*.7)*5,y=895+i*17;stroke(c,x,y,x+14,y+24,'#231f2b',34);stroke(c,x,y,x+14,y+24,'#9e4838',18);stroke(c,x,y,x+14,y+24,'#ffc36c',6);}
 // Harbor dock meets a continuous coastal road.
 for(let x=220;x<650;x+=12){rect(c,x,1072,10,80,'#9a8056');rect(c,x,1072,2,80,'#d0b686');if(x%36===4)rect(c,x+3,1072+(x*7)%70,4,1,'#6f5a3c');}
 return {background,statics};
}
export function buildScene(town={decorations:[]}){
 terrain||=buildTerrain();
 const props=terrain.statics.filter(p=>!POIS.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<130)),flats=[];
 const add=(sprite,x,y,kind='decoration')=>props.push({sprite,x,y,kind});
 add(hi('boat',boatSprite),160,1264,'boat');
 for(const p of POIS)add(hi(`poi:${p.type}:${p.width}x${p.height}`,()=>poiSprite(p)),p.x,p.y,'poi');
 const path=hi('path',pathTile);
 for(const d of town.decorations){if(d.type==='path')flats.push({sprite:path,x:d.x,y:d.y});else add(hi(`deco:${d.type}`,()=>decorationSprite(d.type)),d.x,d.y);}
 return {background:terrain.background,props,flats};
}
