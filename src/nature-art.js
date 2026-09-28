// Native pixel scenery; deterministic variants keep reloads and town editing stable.
import {canvasOf,rect as r,oval as o,poly as p,stroke as line} from './pixel-art.js';
function make(w,h){const a=canvasOf(w,h);a.native=true;return [a,a.getContext('2d')];}
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function crown(c,x,y,rx,ry,colors,rnd){
 const pts=[];for(let i=0;i<20;i++){const angle=i*Math.PI/10,k=.77+rnd()*.23;pts.push([x+Math.cos(angle)*rx*k,y+Math.sin(angle)*ry*k]);}p(c,pts,colors[0]);p(c,pts.map(([xx,yy])=>[x+(xx-x)*.92,y-2+(yy-y)*.9]),colors[1]);
 // Faceted leaf masses instead of circles, with clustered highlights on the lit side.
 p(c,[[x-rx*.82,y-3],[x-rx*.53,y-ry*.68],[x-3,y-ry*.9],[x+rx*.54,y-ry*.38],[x+rx*.34,y],[x-rx*.18,y+ry*.28]],colors[2]);
 for(let i=0;i<45;i++){const xx=x+(rnd()-.5)*rx*1.55,yy=y+(rnd()-.5)*ry*1.3;if((xx-x)**2/rx**2+(yy-y)**2/ry**2>.6)continue;const lit=yy<y&&xx<x+rx*.3;const col=lit?colors[3]:colors[2];p(c,[[xx-3,yy],[xx,yy-3],[xx+5,yy-2],[xx+7,yy],[xx+3,yy+2]],col);if(lit&&i%3===0)r(c,xx,yy-2,3,1,colors[4]);}
}
export function natureTree(kind='oak',variant=0){const [a,c]=make(88,110),rnd=random(833+variant*731);const jungle=kind==='jungle',dead=kind==='dead';
 o(c,44,102,30,5,'#17272b44');
 const wood=dead?['#262a30','#4c4546','#847061']:['#302e26','#685039','#aa8050'];
 p(c,[[29,103],[36,93],[38,49],[34,27],[42,31],[46,71],[50,47],[56,37],[60,40],[52,64],[49,94],[59,103],[48,100],[42,104],[38,99]],wood[0]);
 p(c,[[36,100],[40,83],[40,48],[43,54],[46,94],[52,100],[44,98],[42,101]],wood[1]);line(c,41,57,41,95,wood[2],2);if(kind!=='palm'){line(c,43,76,60,54,wood[1],4);line(c,41,64,23,47,wood[1],4);}
 if(dead){for(const [x,y,xx,yy]of [[39,60,17,34],[17,34,14,15],[18,36,6,30],[45,49,64,29],[64,29,68,10],[62,32,80,23],[43,39,33,15]]){line(c,x,y,xx,yy,wood[0],5);line(c,x,y,xx,yy,wood[2],1);}for(let i=0;i<6;i++)r(c,41,64+i*5,4,1,wood[0]);return a;}
 if(kind==='palm'){const x=43,y=30;for(const [dx,dy]of [[-39,4],[-30,-17],[-10,-28],[25,-24],[40,-3],[32,25],[-27,27]]){p(c,[[x,y],[x+dx*.5,y+dy*.5-9],[x+dx*.84,y+dy-5],[x+dx,y+dy],[x+dx*.68,y+dy*.68+5],[x+dx*.38,y+dy*.38+5]],'#1e443b');line(c,x,y,x+dx*.84,y+dy,'#57905c',2);for(let t=.3;t<.9;t+=.16)line(c,x+dx*t,y+dy*t,x+dx*t-5,y+dy*t+8,'#326b4b',2);}o(c,40,37,4,4,'#805635');o(c,48,35,3,4,'#af8149');return a;}
 const colors=jungle?['#172f32','#214b41','#347158','#58996c','#8fb880']:variant===2?['#29382d','#405434','#648046','#8eaa5b','#bbc579']:['#21392f','#345239','#527347','#799650','#afba70'];
 for(const [x,y,rx,ry]of [[23,62,22,20],[61,61,24,22],[43,47,30,26],[20,40,19,21],[65,34,20,22],[40,26,26,24]])crown(c,x+(variant-1)*2,y+(variant===1?(x%7)-3:0),rx,ry,colors,rnd);
 if(jungle){line(c,61,57,58,86,'#345b43',2);line(c,58,86,51,91,'#5d8650');line(c,24,64,27,84,'#719050');for(let i=0;i<4;i++){r(c,63+i*2,69+i*3,3,2,'#64a27b');}}
 for(const [x,y]of [[31,101],[51,100]]){r(c,x,y,7,2,'#526b3e');r(c,x+2,y-3,2,4,'#7c9351');}return a;}
export function natureStone(kind='rock',desert=false,variant=0){const [a,c]=make(52,68),rnd=random(43+variant*139);const pal=desert?['#514638','#8d7353','#b3976b','#dac18c','#f0dba9']:kind==='basalt'?['#232730','#3e3e4b','#605661','#8a7278','#aa9287']:['#283a3d','#4c6160','#788c81','#a5b3a0','#d0d2af'];
 o(c,26,61,24,4,'#18252844');
 if(kind==='grave'||kind==='pillar'){const col=kind==='pillar',x=col?15:12,w=col?22:29;r(c,x,17,w,43,pal[0]);r(c,x+2,18,w-4,39,pal[2]);r(c,x+3,19,4,37,pal[3]);r(c,x+w-6,19,4,39,pal[1]);p(c,[[x,17],[x+3,9],[x+w-9,7],[x+w,17]],pal[2]);line(c,x+3,10,x+w-10,8,pal[4],2);r(c,x-5,58,w+10,5,pal[0]);r(c,x-4,58,w+8,2,pal[3]);if(col){r(c,x-4,15,w+8,6,pal[1]);r(c,x-3,15,w+6,2,pal[4]);for(const xx of [x+8,x+14])r(c,xx,24,2,28,pal[1]);}else{r(c,25,24,3,21,pal[1]);r(c,18,29,17,3,pal[1]);line(c,34,15,29,22,pal[0]);line(c,29,22,34,28,pal[0]);}r(c,11,59,17,2,desert?pal[1]:'#5d7d4d');return a;}
 const shift=variant*2;p(c,[[3,48],[9,30+shift],[22,21],[39,27],[49,44],[45,59],[15,63],[4,57]],pal[0]);p(c,[[5,47],[11,31+shift],[23,23],[38,29],[46,44],[43,57],[16,60],[6,55]],pal[1]);p(c,[[11,32+shift],[23,23],[38,29],[30,40],[6,47]],pal[2]);p(c,[[23,24],[37,30],[30,37],[18,37]],pal[3]);p(c,[[30,41],[46,45],[42,56],[30,58]],pal[2]);line(c,12,32+shift,23,24,pal[4]);line(c,23,24,36,29,pal[4]);line(c,29,40,25,47,pal[0]);line(c,25,47,27,56,pal[0]);line(c,25,47,17,49,pal[0]);for(let i=0;i<13;i++)r(c,12+rnd()*26,36+rnd()*18,2,1,i%3?pal[1]:pal[3]);if(!desert&&kind!=='basalt'){p(c,[[7,48],[15,45],[19,49],[14,54],[8,54]],'#52704d');r(c,10,47,7,2,'#889763');r(c,33,57,9,2,'#607d52');}if(kind==='basalt'){line(c,34,31,30,39,'#be674d');r(c,30,39,2,3,'#eeaa6a');}return a;}
// Low frequency color fields remove the old noisy 8px checkerboard.
export function groundTone(x,y){return Math.sin(x/119+Math.sin(y/137))*.42+Math.cos(y/91+x/237)*.3+Math.sin((x+y)/53)*.16;}
export function groundDetail(c,x,y,biome,rnd){
 if(biome==='sand'){if(rnd()<.07){line(c,x,y,x+9,y-2,'#cdb17b');line(c,x+2,y+2,x+8,y+1,'#ae8f61');}return;}
 if(biome==='hell'){if(rnd()<.028){line(c,x,y,x+5,y+4,'#302f37');line(c,x+5,y+4,x+10,y+3,'#302f37');if(rnd()<.12)r(c,x+4,y+3,2,1,'#a35a49');}return;}
 if(rnd()<.07){const dark=biome==='jungle'?'#294d41':'#455f39',light=biome==='jungle'?'#5f8760':'#87965c';line(c,x,y+3,x-2,y-1,dark);line(c,x+1,y+3,x+2,y-3,light);r(c,x+4,y,1,3,dark);if(rnd()<.08)r(c,x+2,y-4,2,2,'#c5b878');}
}

export function naturalPond(c,x,y,rx,seed){const rnd=random(seed),ry=20,edge=[];for(let i=0;i<28;i++){const t=i*Math.PI/14,k=.82+rnd()*.18;edge.push([x+Math.cos(t)*rx*k,y+Math.sin(t)*ry*k]);}p(c,edge,'#2b4d40');p(c,edge.map(([xx,yy])=>[x+(xx-x)*.92,y-2+(yy-y)*.83]),'#32695d');p(c,edge.map(([xx,yy])=>[x+(xx-x)*.75,y-3+(yy-y)*.62]),'#407f6c');for(let i=0;i<12;i++){const xx=x+(rnd()-.5)*rx*1.3,yy=y+(rnd()-.5)*ry; r(c,xx,yy,3+rnd()*10,1,i%3?'#518e76':'#74ac8d');}for(let i=0;i<7;i++){const t=rnd()*Math.PI*2,xx=x+Math.cos(t)*rx*.9,yy=y+Math.sin(t)*ry*.9;line(c,xx,yy,xx-2,yy-6,'#718c51');line(c,xx+2,yy,xx+4,yy-9,'#486d46');if(i%3===0){o(c,xx+3,yy+2,4,2,'#75866a');r(c,xx+1,yy,4,1,'#a0ac7d');}}}
