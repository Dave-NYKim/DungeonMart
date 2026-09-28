import { terrainColor, paintRoads, escarpment, ruinFragment, undergrowth, paintTownGround } from './landscape-art.js';
import { natureTree, natureStone, groundTone, groundDetail, naturalPond } from './nature-art.js';
import { facilitySprite, townDecorationSprite } from './facility-art.js';
import {buildingSprite,campaignArtRevision} from './campaign-art.js';
import { paintHarborGround, harborClear, guildHall, ship, lighthouse, crane, lanternPost, bollard, cargo, barrels, harborSign } from './harbor-art.js';
import { WORLD, HUB, REGIONS, ROADS, POIS, contains, regionAt, roadAt, segmentDistance, solidAt, HARBOR, RESERVE, coastX, riverX, terrainBlocked } from './world.js';
import { canvasOf, rect, oval, poly, stroke, panel, pixelText, treeSprite, stoneSprite, martSprite, scale2x } from './pixel-art.js';
const tiles={coast:['#889875','#92a282','#a1ab88','#889c82'],reserve:['#68766b','#728071','#7a8678','#627369'],hub:['#607148','#667950','#718158','#5d7049'],grass:['#607547','#657c4b','#6c8050','#718754'],sand:['#b59b69','#bda575','#c2aa7a','#c6ad7f'],jungle:['#355d48','#3b684d','#446e53','#4b7456'],hell:['#4d3f40','#513f40','#554341','#574643']};
export function poiSprite(p){
 const generated=buildingSprite(p);if(generated)return generated;
 if(p.type==='mart')return martSprite();
 if(p.type==='reception')return guildHall();
 const facility=facilitySprite(p.type);if(facility)return facility;
 const w=Math.ceil(p.width/2),h=Math.ceil(p.height/2)+8,canvas=canvasOf(w,h),c=canvas.getContext('2d'),r=(x,y,ww,hh,col)=>rect(c,x,y,ww,hh,col);
 if(p.type==='plot'){
  for(let y=8;y<h-5;y+=4)for(let x=5;x<w-5;x+=4)r(x,y,4,4,(x+y)%3?'#8b8562':'#99906b');
  for(const[x,y]of[[3,9],[w-6,9],[3,h-7],[w-6,h-7]]){r(x,y,3,6,'#4d4c38');r(x,y,3,1,'#dbcca0');}
  stroke(c,6,12,w-6,12,'#cfba85');stroke(c,6,h-4,w-6,h-4,'#cfba85');stroke(c,6,12,6,h-5,'#baaa79');stroke(c,w-5,12,w-5,h-5,'#baaa79');
  panel(c,w/2-12,h/2-7,25,17,'#706444');r(w/2-1,h/2+9,2,8,'#63553b');pixelText(c,'SITE',w/2,h/2-2,'#efdaab',1,true);return canvas;
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
export const boatSprite=ship;
export function decorationSprite(type){
 const updated=townDecorationSprite(type);if(updated)return updated;
 if(type==='tree')return natureTree('oak');if(type==='bench')return bench();
 const a=canvasOf(24,28),c=a.getContext('2d');
 if(type==='lamp'){rect(c,11,6,3,22,'#4d5c52');panel(c,7,3,11,10,'#d8bd77');rect(c,9,5,7,6,'#fff0ae');rect(c,6,1,13,3,'#6c7862');}
 if(type==='flowers'){rect(c,3,17,18,9,'#7c6748');for(let i=0;i<6;i++){rect(c,4+i*3,14,2,8,'#58824e');rect(c,3+i*3,12+(i%2)*3,4,3,i%2?'#e5bd76':'#c887a6');}}
 return a;
}
// The world buffer is now 1 pixel per world unit (was 1 per 2 units). Hand-drawn sprites keep
// their old footprint through Scale2x; terrain is regenerated on the finer grid with more specks.
const hiCache=new Map();
const hi=(key,make)=>{if(!hiCache.has(key)){const s=make();hiCache.set(key,s.native?s:scale2x(s));};return hiCache.get(key);};
let terrain=null;
function pathTile(){const a=canvasOf(16,16),c=a.getContext('2d');rect(c,0,0,16,16,'#b2ad89');rect(c,0,0,15,1,'#e0cf9d');rect(c,7,1,1,14,'#878974');rect(c,2,9,5,1,'#9d9878');rect(c,10,5,4,1,'#9d9878');rect(c,15,1,1,15,'#8f8a6c');return a;}
function buildTerrain(){
 const background=canvasOf(WORLD.width,WORLD.height),c=background.getContext('2d'),statics=[];let seed=87231;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 rect(c,0,0,background.width,background.height,'#28454c');
 for(let y=0;y<background.height;y+=8)for(let x=0;x<background.width;x+=8){
  const wx=x+4,wy=y+4,region=regionAt(wx,wy),road=roadAt(wx,wy);
  if(!region){const shore=x>coastX(wy)-45&&x<coastX(wy);rect(c,x,y,8,8,shore?'#437d7b':groundTone(wx,wy)>.15?'#2c535f':'#294b58');if(rnd()<.025)rect(c,x,y+3,7+rnd()*7,1,shore?'#93bfb0':'#507984');continue;}
  rect(c,x,y,8,8,terrainColor(wx,wy,region,groundTone(wx,wy)));
  if(wx<coastX(wy)+12){rect(c,x,y,8,8,'#7eada0');if(rnd()<.35)rect(c,x,y+3,6,1,'#d2d7ad');}
  else if(wx<coastX(wy)+38){rect(c,x,y,8,8,'#b7b591');if(rnd()<.5)rect(c,x+rnd()*4,y+6,4,1,'#d3c9a1');}

  else groundDetail(c,x+4,y+4,region.biome,rnd);
  if(wy>1710&&Math.abs(wx-riverX(wy))<22&&!road){rect(c,x,y,8,8,'#285d59');if(rnd()<.6)rect(c,x+rnd()*3,y+rnd()*7,5,1,'#75a293');}
 }
 paintRoads(c);
 const add=(sprite,x,y,kind='decoration')=>statics.push({sprite,x,y,kind});
 const trees=Object.fromEntries(['oak','jungle','palm','dead'].map(k=>[k,[0,1,2].map(v=>hi(`nature:${k}:${v}`,()=>natureTree(k,v)))]));
 const tree=k=>trees[k][Math.floor(rnd()*3)];
 const elder=hi('nature:elder',()=>{const src=natureTree('jungle',2),a=canvasOf(112,140);a.native=true;const ctx=a.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(src,0,0,112,140);return a;});
 const stones=Object.fromEntries(['rock','sand','grave','pillar','basalt'].map(k=>[k,hi(`nature:stone:${k}`,()=>natureStone(k==='sand'?'rock':k,['sand','pillar'].includes(k)))]));
 // Loose groves, broken escarpments, dunes and ruins vary in density across the continent.
 for(let i=0;i<2200;i++){
  const x=200+rnd()*3350,y=100+rnd()*2600,r=regionAt(x,y);if(!r||roadAt(x,y))continue;
  if(r===HUB){if(x>1250&&x<2350&&y>790&&y<1630)continue;if(rnd()<.55)continue;}
  if(harborClear(x,y))continue;
  if(r===HARBOR&&rnd()<.8)continue;
  const grove=Math.sin(x/113)+Math.cos(y/137)+Math.sin((x+y)/193);
  // Trees gather in groves with open ground between them: about half the old ACT I and III count.
  if(r.biome==='grass'&&(grove<.55||rnd()<.3)){if(rnd()<.07)add(rnd()<.7?tree('oak'):stones.rock,x,y);continue;}
  if(r.biome==='jungle'&&(grove<-.15||rnd()<.43))continue;
  if(r.biome==='sand'){
   if(i%3===0){const w=44+rnd()*90;for(let t=-w;t<w;t+=3){const bend=Math.sin(t/w*1.7)*9;rect(c,x+t,y-bend,3,2,'#d9bd85');if(Math.abs(t)<w*.7)rect(c,x+t+8,y-bend+6,3,1,'#a48c5c');}}
   if(i%11===0)add(stones.sand,x,y);continue;
  }
  if(r===RESERVE){if(Math.hypot(x-1808,y-416)<300)continue;add(stones.rock,x,y);if(i%3===0)add(tree('oak'),x+16,y+22);continue;}
  if(r.biome==='hell'){
   // Sparse, no random lava streaks: the volcanic floor stays readable around the sealed gate.
   if(rnd()<.62)continue;if(i%4===0)add(tree('dead'),x,y);else if(i%3===0)add(stones.basalt,x,y);continue;
  }
  add(rnd()<.85?(r.biome==='jungle'&&i%9===0?elder:tree(r.biome==='jungle'?(rnd()<.25?'palm':'jungle'):'oak')):stones.rock,x,y);
  if(r.zone===0&&i%13===0)add(stones.grave,x+30,y+15);
 }
 // Layered outcrops frame the arena without crossing its approach road.
 const cliffs={slate:[0,1,2].map(v=>hi(`cliff:slate:${v}`,()=>escarpment('slate',v))),sand:[0,1].map(v=>hi(`cliff:sand:${v}`,()=>escarpment('sand',v))),basalt:[0,1].map(v=>hi(`cliff:basalt:${v}`,()=>escarpment('basalt',v)))};
 const landmark=(sprite,x,y)=>{if(roadAt(x,y)||roadAt(x-90,y)||roadAt(x+90,y)||POIS.some(p=>Math.hypot(x-p.x,y-p.y)<240))return;add(sprite,x,y,'landscape');};
 for(const [i,x]of [1400,1510,1610,2010,2130,2250].entries())landmark(cliffs.slate[i%3],x,565+Math.sin(i*1.7)*42);
 // A few ruined compounds replace uniformly scattered desert columns.
 for(const [cx,cy]of [[1490,2130],[1980,2530],[2250,2090]]){for(let i=0;i<4;i++){const x=cx+(i-1.5)*45,y=cy+Math.sin(i*2)*35;if(!roadAt(x,y)&&!solidAt(x,y,40))add(i%2?hi(`ruin:${i%2}`,()=>ruinFragment(i)):stones.pillar,x,y);}landmark(cliffs.sand[0],cx-55,cy+115);}
 for(const [i,x,y]of [[0,2780,860],[1,3230,1340],[0,2970,1510],[1,3260,720]])landmark(cliffs.basalt[i],x,y);
 for(let i=0;i<26;i++){const x=2700+rnd()*650,y=1790+rnd()*780;if(regionAt(x,y)?.biome!=='jungle'||roadAt(x,y)||solidAt(x,y,70))continue;add(hi(`brush:${i%4===0?'log':'fern'}`,()=>undergrowth(i%4===0?'log':'fern')),x,y);}
 // Readable biome landmarks beyond palette changes.
 for(let i=0;i<11;i++){const x=2860+Math.sin(i*.73)*190,y=1800+i*65;if(roadAt(x,y))continue;naturalPond(c,x,y,44+i%4*10,700+i);}
 // Harbor quay and jetty are painted into the ground layer at full resolution.
 paintHarborGround(c);
 return {background,statics};
}
export function buildScene(town={decorations:[]}){
 terrain||=buildTerrain();
 const props=terrain.statics.filter(p=>!POIS.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<130)),flats=[];
 const add=(sprite,x,y,kind='decoration')=>props.push({sprite,x,y,kind});
 add(hi('boat',boatSprite),150,1300,'boat');
 // Dawn Harbor dressing: upright pieces stay off the landing line (y≈1136) heroes walk along.
 const harbor=[['lighthouse',lighthouse,244,1034],['crane',crane,420,1090],['lantern',lanternPost,330,1092],['lantern',lanternPost,560,1092],['lantern',lanternPost,700,1092],['lantern',lanternPost,261,1322],['cargo',cargo,500,1094],['barrels',barrels,630,1096],['cargo',cargo,760,1100],['sign',harborSign,742,1178],['bollard',bollard,330,1176],['bollard',bollard,470,1176],['bollard',bollard,610,1176],['bollard',bollard,288,1240],['barrels',barrels,660,1186]];
 for(const[key,make,x,y]of harbor)add(hi(`harbor:${key}`,make),x,y,'harbor');
 for(const p of POIS){if(p.type==='arrival')continue;const sprite=hi(`poi:${campaignArtRevision}:${p.type}:${p.width}x${p.height}`,()=>poiSprite(p));if(p.type==='final-seal')flats.push({sprite,x:p.x,y:p.y,arena:true});else add(sprite,p.x,p.y,'poi');}
 // Facility dressing follows saved building positions, and keeps entrances clear.
 for(const p of POIS){const plan=p.type==='warehouse'?[['cargo',cargo,-1],['barrels',barrels,1]]:p.type==='forge'?[['barrels',barrels,-1]]:p.type==='fountain'?[['flowers',()=>decorationSprite('flowers'),-1],['bench',()=>decorationSprite('bench'),1]]:p.type==='mart'?[['flowers',()=>decorationSprite('flowers'),-1],['lamp',lanternPost,1]]:p.type==='training'?[['lamp',lanternPost,-1]]:[];
  for(const [key,make,side]of plan){const x=p.x+side*(p.width/2+29),y=p.y-4;if(roadAt(x,y)||POIS.some(o=>o!==p&&x>o.x-o.width/2-32&&x<o.x+o.width/2+32&&y>o.y-o.height-24&&y<o.y+24)||town.decorations?.some(d=>Math.hypot(d.x-x,d.y-y)<55))continue;add(hi(`dressing:${key}`,make),x,y,'dressing');}
 }
 const path=hi('path',pathTile);
 for(const d of town.decorations){if(d.type==='path')flats.push({sprite:path,x:d.x,y:d.y});else add(hi(`deco:${d.type}`,()=>decorationSprite(d.type)),d.x,d.y);}
 const background=canvasOf(WORLD.width,WORLD.height),ground=background.getContext('2d');ground.drawImage(terrain.background,0,0);paintTownGround(ground);
 return {background,props,flats};
}
