// Hand-drawn, layered pixel art. Every primitive lands on an integer pixel.
// Hero frame: 24 × 32, foot anchor (12, 29). Equipment and costume share this rig.
export const HERO_FRAME = { width: 24, height: 32, anchorX: 12, anchorY: 29 };
export const INK = '#202329';
export function canvasOf(w, h) { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; }
export function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => Math.max(0, Math.min(255, v + amount)).toString(16).padStart(2, '0')).join('');
}
export function stroke(c, x0, y0, x1, y1, color, width = 1) {
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
  for(;;){rect(c,x0,y0,width,width,color);if(x0===x1&&y0===y1)break;const e2=2*error;if(e2>=dy){error+=dy;x0+=sx;}if(e2<=dx){error+=dx;y0+=sy;}}
}
export function oval(c,x,y,rx,ry,color) {
  for(let dy=-Math.floor(ry);dy<=ry;dy++){const w=Math.floor(rx*Math.sqrt(Math.max(0,1-dy*dy/(ry*ry))));rect(c,x-w,y+dy,w*2+1,1,color);}
}
export function poly(c,points,color) {
  const top=Math.ceil(Math.min(...points.map(p=>p[1]))),bottom=Math.floor(Math.max(...points.map(p=>p[1])));
  for(let y=top;y<=bottom;y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)rect(c,Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,color);}
}
// Scale2x (EPX) upscale: doubles sprite resolution while smoothing stair-steps, so
// world props keep their footprint on the finer 1:1 pixel grid without hand-redrawing.
export function scale2x(src){
 const w=src.width,h=src.height,s=new Uint32Array(src.getContext('2d').getImageData(0,0,w,h).data.buffer),out=canvasOf(w*2,h*2),oc=out.getContext('2d'),img=oc.createImageData(w*2,h*2),o=new Uint32Array(img.data.buffer);
 const at=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return 0;const v=s[y*w+x];return (v>>>24)?v:0;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const P=at(x,y),A=at(x,y-1),B=at(x+1,y),C=at(x-1,y),D=at(x,y+1);let e0=P,e1=P,e2=P,e3=P;
  if(C===A&&C!==D&&A!==B)e0=A;if(A===B&&A!==C&&B!==D)e1=B;if(D===C&&D!==B&&C!==A)e2=C;if(B===D&&B!==A&&D!==C)e3=D;
  const i=(y*2)*(w*2)+x*2;o[i]=e0;o[i+1]=e1;o[i+w*2]=e2;o[i+w*2+1]=e3;}
 oc.putImageData(img,0,0);return out;
}
export function panel(c,x,y,w,h,color,edge=INK){rect(c,x+1,y,w-2,h,edge);rect(c,x,y+1,w,h-2,edge);rect(c,x+1,y+1,w-2,h-2,color);}
const GLYPHS={
 A:['01110','11011','11011','11111','11011','11011','11011'],B:['11110','11011','11011','11110','11011','11011','11110'],C:['01111','11000','11000','11000','11000','11000','01111'],D:['11110','11011','11011','11011','11011','11011','11110'],E:['11111','11000','11000','11110','11000','11000','11111'],F:['11111','11000','11000','11110','11000','11000','11000'],G:['01111','11000','11000','11011','11011','11011','01110'],H:['11011','11011','11011','11111','11011','11011','11011'],I:['111','010','010','010','010','010','111'],J:['00111','00011','00011','00011','11011','11011','01110'],K:['11011','11011','11110','11100','11110','11011','11011'],L:['11000','11000','11000','11000','11000','11000','11111'],M:['11011','11111','11111','10101','11011','11011','11011'],N:['11011','11111','11111','11011','11011','11011','11011'],O:['01110','11011','11011','11011','11011','11011','01110'],P:['11110','11011','11011','11110','11000','11000','11000'],Q:['01110','11011','11011','11011','11111','01110','00011'],R:['11110','11011','11011','11110','11100','11010','11011'],S:['01111','11000','11000','01110','00011','00011','11110'],T:['11111','01110','00100','00100','00100','00100','00100'],U:['11011','11011','11011','11011','11011','11011','01110'],V:['11011','11011','11011','11011','11011','01110','00100'],W:['11011','11011','11011','10101','11111','11111','01010'],X:['11011','11011','01110','00100','01110','11011','11011'],Y:['11011','11011','01110','00100','00100','00100','00100'],Z:['11111','00011','00110','01100','11000','11000','11111'],
 '0':['01110','11011','11011','11011','11011','11011','01110'],'1':['010','110','010','010','010','010','111'],'2':['01110','11011','00011','00110','01100','11000','11111'],'3':['11110','00011','00011','01110','00011','00011','11110'],'4':['11011','11011','11011','11111','00011','00011','00011'],'5':['11111','11000','11000','11110','00011','00011','11110'],'6':['01110','11000','11000','11110','11011','11011','01110'],'7':['11111','00011','00110','00110','01100','01100','01100'],'8':['01110','11011','11011','01110','11011','11011','01110'],'9':['01110','11011','11011','01111','00011','00011','01110'], '/':['00001','00011','00110','00110','01100','11000','10000'],'.':['0','0','0','0','0','1','1'],'-':['000','000','000','111','000','000','000']
};
export function pixelText(c,text,x,y,color,scale=1,center=false){
 const chars=[...text.toUpperCase()],width=chars.reduce((sum,ch)=>sum+(GLYPHS[ch]?.[0].length||3)+1,0)*scale;
 if(center)x-=Math.floor(width/2);for(const ch of chars){const rows=GLYPHS[ch];if(rows){for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<rows[yy].length;xx++)if(rows[yy][xx]==='1')rect(c,x+xx*scale,y+yy*scale,scale,scale,color);}x+=((rows?.[0].length||3)+1)*scale;}
}
const heroCache=new Map();
export function heroSprite(a,frame=0,attack=false){
 const key=JSON.stringify([a,frame,attack]);if(heroCache.has(key))return heroCache.get(key);
 const canvas=canvasOf(24,32),c=canvas.getContext('2d'),r=(x,y,w,h,col)=>rect(c,x,y,w,h,col);
 const cloth=a.color,light=shade(cloth,38),dark=shade(cloth,-47),skin=a.body==='necromancer'?'#d7c8ac':'#e6b785',skinLight=shade(skin,22),skinShade=shade(skin,-35);
 const caster=['necromancer','sorceress'].includes(a.body),bob=frame===1?1:0,step=frame===1?1:frame===2?-1:0;
 c.translate(0,bob);
 // Back: independently replaceable cape / hair.
 if(caster||a.armor>=1){poly(c,[[7,15],[16,15],[18,27],[14,26],[12,28],[9,26],[5,27]],INK);poly(c,[[8,16],[15,16],[16,25],[13,24],[11,26],[7,25]],dark);r(8,18,2,6,cloth);}
 if(a.body==='amazon'){r(15,6,4,15,'#664b2d');r(16,7,2,12,'#d9ab55');r(17,8,1,10,'#f1cf77');}
 // Boots and trousers. Palette changes remain visible with starter equipment.
 r(7,23,5,7+step,INK);r(13,23,5,7-step,INK);r(8,23,3,3+step,dark);r(14,23,3,3-step,cloth);r(7,27+step,5,2,'#604a3b');r(13,27-step,5,2,'#715642');r(8,27+step,2,1,'#a8845a');r(14,27-step,2,1,'#b7986b');
 // Torso: chest + shoulder armor are distinct from the body.
 r(6,15,12,10,INK);r(7,16,10,7,a.armor<0&&a.body==='barbarian'?skinShade:dark);r(8,16,7,6,a.armor<0&&a.body==='barbarian'?skin:cloth);r(8,16,2,4,a.armor<0&&a.body==='barbarian'?skinLight:light);
 if(a.body==='barbarian'&&a.armor<0){r(7,16,2,3,'#675044');r(9,19,5,1,skinShade);r(10,20,1,2,skinShade);r(14,16,2,6,dark);}
 if(a.armor>=0){r(11,17,1,5,light);r(8,20,7,1,dark);r(7,16,2,2,light);}
 r(4,17,3,6,INK);r(5,18,2,4,skin);r(17,17,3,6,INK);r(17,18,2,4,skinShade);r(5,21,2,2,dark);r(17,21,2,2,dark);
 if(a.armor>=1){panel(c,3,15,6,5,dark);r(4,16,4,2,light);panel(c,15,15,6,5,cloth);r(16,16,4,1,light);}
 if(a.armor>=2){r(3,14,2,2,light);r(19,14,2,2,light);r(7,22,3,3,dark);r(14,22,3,3,cloth);}
 r(7,23,10,2,'#473629');r(11,23,3,2,'#d2b36a');r(12,23,1,1,'#ffe5a0');
 // Head: 12 px wide, large enough to read at world scale.
 r(7,4,9,1,INK);r(5,5,13,9,INK);r(6,6,11,8,skinShade);r(7,6,8,7,skin);r(7,7,7,3,skinLight);r(7,13,9,2,INK);r(9,13,5,2,skinShade);
 r(8,10,2,2,INK);r(13,10,2,2,INK);r(8,10,1,1,'#f8eed7');r(13,10,1,1,'#f8eed7');r(11,12,2,1,skinShade);
 if(a.body==='barbarian'){r(6,5,11,3,'#62412e');r(7,4,9,2,'#8d6038');r(8,4,6,1,'#bd874e');r(6,8,2,2,'#62412e');r(15,8,2,2,'#62412e');r(9,13,6,2,'#8d6038');r(10,14,4,1,'#62412e');}
 if(a.body==='amazon'){r(6,5,11,3,'#bc8c45');r(7,4,9,2,'#ebc571');r(7,5,3,3,'#f7d987');r(6,7,2,3,'#bc8c45');r(8,8,7,1,'#6c9271');}
 if(a.body==='necromancer'){r(6,4,11,3,'#777c84');r(7,3,9,2,'#bdc2c0');r(8,3,6,1,'#e6e7d5');r(6,6,2,4,'#e6e7d5');r(15,5,2,5,'#a3ada9');r(8,10,2,1,'#bd677f');r(13,10,2,1,'#bd677f');}
 if(a.body==='sorceress'){poly(c,[[5,8],[8,3],[9,1],[13,1],[14,4],[17,7],[19,8],[19,10],[4,10],[4,8]],INK);poly(c,[[6,8],[9,3],[10,2],[12,2],[14,6],[17,8]],dark);r(9,3,3,3,cloth);r(9,3,1,2,light);r(6,8,12,1,cloth);r(10,7,5,1,'#c6a96b');}
 if(a.body==='paladin'||a.armor>=2){r(6,4,11,6,INK);r(7,5,9,4,cloth);r(8,5,3,3,light);r(7,9,9,1,dark);r(6,9,2,4,cloth);r(15,9,2,4,dark);r(11,5,1,5,'#e9d69b');if(a.armor===3){r(5,2,2,5,'#c8a55d');r(16,2,2,5,'#f4d990');}}
 // Front: a separate weapon layer, swapping without repainting body data.
 const wc=a.weaponTier<0?'#bcc5c6':['#bec6c1','#88bce0','#e9c96e','#efa15f'][a.weaponTier],wl=shade(wc,34),wd=shade(wc,-58),wx=attack?-1:0,wy=attack?-3:0;
 c.save();c.translate(wx,wy);
 if(a.weapon==='axe'){r(20,9,2,20,INK);r(20,10,1,18,'#b08a58');r(18,7,6,9,INK);r(19,8,5,6,wd);r(20,8,4,4,wc);r(22,8,2,4,wl);r(19,14,3,1,wc);if(a.weaponTier>=1){r(16,8,3,6,INK);r(17,9,3,4,wc);r(16,9,1,3,wl);}}
 else if(a.weapon==='bow'){stroke(c,19,7,22,11,INK,2);r(22,11,2,10,INK);stroke(c,22,21,19,26,INK,2);stroke(c,19,8,22,12,wc);r(22,12,1,9,wc);stroke(c,22,21,19,25,wc);r(19,9,1,16,'#ebd8a3');r(17,17,7,1,'#e2c48d');}
 else if(a.weapon==='spear'){r(20,4,2,25,INK);r(20,6,1,22,'#c5a16d');poly(c,[[21,0],[18,7],[23,7]],INK);poly(c,[[21,1],[20,6],[22,6]],wl);r(19,8,4,2,dark);}
 else if(a.weapon==='shield'){r(20,12,2,16,INK);r(20,13,1,14,'#c7a16c');panel(c,17,9,7,6,wd);r(18,10,5,2,wc);r(18,10,2,1,wl);panel(c,1,18,7,8,dark);r(2,19,5,4,cloth);r(4,19,1,6,'#e6ce89');r(2,21,5,1,'#e6ce89');r(3,26,3,1,INK);}
 else {r(20,9,2,19,INK);r(20,10,1,17,'#bfa174');panel(c,18,5,6,7,wd);r(19,6,4,4,wc);r(19,6,2,2,wl);if(a.weapon==='skull'){r(19,7,1,1,INK);r(22,7,1,1,INK);r(20,10,2,2,'#ded8b8');}}
 if(a.weaponTier>=2){r(19,4,1,1,wl);r(23,16,1,1,wc);}
 c.restore();
 if(a.glow>=0){r(11,18,2,2,['#d4c493','#88bce0','#edce7b','#f3aa65'][a.glow]);r(11,18,1,1,'#fff4c4');}
 if(a.variant===1){r(7,11,2,1,'#966149');r(15,7,2,2,a.accent||light);}if(a.variant===2){r(7,7,9,1,a.accent||light);r(6,8,2,4,dark);}
 if(a.tier>0){r(5,15,2,5,a.accent||light);r(17,15,2,5,a.accent||light);}
 if(a.tier===2){r(10,1,3,1,'#ecd586');r(11,0,1,3,'#ffe8a3');}
 if(heroCache.size>800)heroCache.clear();heroCache.set(key,canvas);return canvas;
}
// Boss: an original "cinder lord" — ash-black hide split by ember cracks, bone horns, tattered wings. 64×72, feet at (32,68).
const bossCache=new Map();
export function bossSprite(frame=0){
 if(bossCache.has(frame))return bossCache.get(frame);
 const canvas=canvasOf(64,72),c=canvas.getContext('2d'),r=(x,y,w,h,col)=>rect(c,x,y,w,h,col);
 const ash='#2b2428',ashL='#4a3d42',ashD='#17131a',ember='#ff8f3a',emberL='#ffd27a',bone='#dccbaa',boneD='#9d8a67',wing='#4b2233',wingL='#7a3449',eye='#ffc14d',f=frame?1:0;
 poly(c,[[24,26],[6,12-f*3],[2,30],[8,44],[20,40]],ashD);poly(c,[[24,27],[9,15-f*3],[5,30],[10,42],[20,39]],wing);
 poly(c,[[40,26],[58,12-f*3],[62,30],[56,44],[44,40]],ashD);poly(c,[[40,27],[55,15-f*3],[59,30],[54,42],[44,39]],wing);
 for(const [x0,y0,x1,y1] of [[24,27,9,15-f*3],[24,28,5,30],[24,29,10,42],[40,27,55,15-f*3],[40,28,59,30],[40,29,54,42]])stroke(c,x0,y0,x1,y1,wingL);
 stroke(c,42,52,52,58,ashD,3);stroke(c,52,58,58,54,ashD,3);poly(c,[[56,50],[62,54],[57,58]],ashD);stroke(c,43,52,52,57,ashL);
 r(22,50,8,14,ashD);r(34,50,8,14,ashD);r(23,51,5,11,ash);r(36,51,5,11,ash);r(20,63,10,5,ashD);r(34,63,10,5,ashD);r(21,64,3,2,ashL);r(35,64,3,2,ashL);
 panel(c,18,24,28,28,ash,ashD);r(20,26,24,10,ashL);r(22,36,20,12,ash);
 for(let i=0;i<3;i++){r(20,38+i*4,9,1,ashD);r(35,38+i*4,9,1,ashD);}
 stroke(c,31,28,29,44,ember);stroke(c,32,30,34,40,ember);r(30,34,3,1,emberL);r(32,38,2,1,emberL);stroke(c,24,30,22,36,ember);stroke(c,40,31,42,37,ember);
 oval(c,16,28,7,5,ashD);oval(c,16,27,5,3,ashL);oval(c,48,28,7,5,ashD);oval(c,48,27,5,3,ashL);
 r(9,30,8,18,ashD);r(10,31,6,15,ash);r(47,30,8,18,ashD);r(48,31,6,15,ash);
 stroke(c,12,33,12,44,ember);stroke(c,51,33,51,44,ember);
 r(7,47,11,6,ashD);r(46,47,11,6,ashD);for(const x of [8,11,14])r(x,53,2,4-f,bone);for(const x of [47,50,53])r(x,53,2,4-f,bone);
 r(28,20,8,5,ashD);panel(c,22,8,20,16,ash,ashD);r(24,10,16,6,ashL);c.clearRect(22,8,2,2);c.clearRect(40,8,2,2);r(23,17,3,4,ashD);r(38,17,3,4,ashD);
 r(24,13,16,2,ashD);r(26,15,4,3,eye);r(34,15,4,3,eye);r(27,15,1,1,'#fff6d0');r(35,15,1,1,'#fff6d0');r(26,18,12,1,ashD);
 r(25,19,14,4,ashD);r(27,20,10,2,'#5a1f24');for(const x of [27,31,35])r(x,19,1,2,bone);
 stroke(c,25,9,20,3,bone,2);stroke(c,20,3,17,0,bone,2);stroke(c,25,9,21,4,boneD);
 stroke(c,39,9,44,3,bone,2);stroke(c,44,3,47,0,bone,2);stroke(c,39,9,43,4,boneD);
 for(const [x,y] of [[28,6],[32,4],[36,6]])r(x,y,2,3,ember);r(32,3,2,1,emberL);
 for(let x=23;x<41;x+=3)r(x,24,2,1,boneD);
 bossCache.set(frame,canvas);return canvas;
}
const monsterCache=new Map();
export function monsterSprite(m,frame=0,cursed=false){
 const key=JSON.stringify([m.shape,m.color,frame,cursed]);if(monsterCache.has(key))return monsterCache.get(key);
 const canvas=canvasOf(32,36),c=canvas.getContext('2d'),r=(x,y,w,h,col)=>rect(c,x,y,w,h,col),col=cursed?'#b47cbb':m.color,light=shade(col,43),dark=shade(col,-42),step=frame?1:0;
 const humanoid=()=>{r(9,26,5,7-step,INK);r(19,26,5,7+step,INK);r(10,27,3,5-step,dark);r(20,27,3,5+step,col);panel(c,8,16,17,13,dark);r(10,17,12,8,col);r(10,17,4,6,light);r(6,18,3,9,INK);r(7,19,2,7,col);r(24,18,3,9,INK);r(24,19,2,7,dark);panel(c,9,5,15,13,col);r(10,6,10,6,light);r(12,11,3,2,'#302b2b');r(19,11,3,2,'#302b2b');r(12,11,1,1,'#f1d27b');r(19,11,1,1,'#f1d27b');r(15,15,5,1,dark);};
 if(m.shape==='beetle'){for(let i=0;i<3;i++){stroke(c,10,15+i*5,3,12+i*8,col,2);stroke(c,23,15+i*5,29,12+i*8,col,2);}oval(c,16,20,9,12,INK);oval(c,16,20,7,10,col);oval(c,14,18,4,7,light);r(16,10,1,21,dark);panel(c,11,7,11,6,dark);r(12,9,2,1,'#eee4a0');r(19,9,2,1,'#eee4a0');}
 else if(['snake','worm'].includes(m.shape)){for(let i=0;i<5;i++){oval(c,19+Math.round(Math.sin(i+step)*4),29-i*3,8-i,4,INK);oval(c,19+Math.round(Math.sin(i+step)*4),28-i*3,6-i,3,i%2?col:light);}panel(c,8,8,14,11,col);r(9,9,9,3,light);r(10,13,3,2,INK);r(18,13,2,2,INK);r(13,18,4,1,'#e9b081');if(m.shape==='snake'){r(8,6,3,4,dark);r(19,6,3,4,dark);}}
 else if(m.shape==='ghost'){poly(c,[[13,4],[22,7],[24,15],[22,26],[26,32],[21,30],[17,34],[13,30],[8,32],[11,25],[9,15]],INK);poly(c,[[14,6],[20,8],[22,16],[19,24],[21,30],[17,29],[14,30],[13,24],[11,15]],col);r(13,10,7,7,dark);r(13,12,2,2,'#bddceb');r(18,12,2,2,'#bddceb');stroke(c,10,19,5,25,col,2);stroke(c,23,18,28,23,col,2);}
 else {humanoid();
  if(m.shape==='imp'||m.shape==='demon'){poly(c,[[10,10],[5,2],[5,10],[9,15]],dark);poly(c,[[23,10],[28,2],[27,12],[23,15]],light);r(12,11,2,2,'#f4d077');r(20,11,2,2,'#f4d077');r(14,16,2,2,'#edd9ae');r(19,16,2,2,'#edd9ae');r(9,24,15,4,'#6e453b');r(15,24,3,3,'#ae8a50');if(m.shape==='demon'){poly(c,[[8,17],[1,10],[2,25],[8,23]],dark);poly(c,[[24,17],[31,10],[30,25],[24,23]],dark);}}
  if(m.shape==='skeleton'){r(10,18,12,8,INK);for(let i=0;i<3;i++){r(11,18+i*3,10,1,light);}r(16,17,1,11,col);r(12,10,3,4,INK);r(19,10,3,4,INK);r(16,14,2,2,dark);for(let i=0;i<3;i++)r(13+i*3,16,1,2,INK);r(28,13,1,17,'#c4c2a7');r(27,11,3,7,'#d6d5b9');}
  if(m.shape==='mummy'){for(let i=0;i<7;i++){stroke(c,10,7+i*3,22,9+i*3,i%2?dark:light);}r(11,11,11,2,dark);r(12,11,2,1,'#d5b474');r(19,11,2,1,'#d5b474');}
  if(m.shape==='zombie'){r(9,6,14,4,'#4d5449');r(15,13,3,3,dark);r(9,20,5,5,'#646850');r(20,24,3,5,light);r(7,20,3,2,'#b28b77');}
  if(m.shape==='hulk'){r(5,15,5,12,dark);r(24,15,5,12,col);r(4,14,3,4,light);r(26,14,3,4,light);r(10,19,11,2,dark);r(11,22,2,5,light);r(15,7,3,5,dark);}
  if(['mage','shaman'].includes(m.shape)){poly(c,[[7,10],[10,3],[17,0],[22,4],[26,10]],INK);poly(c,[[9,9],[12,4],[17,2],[21,5],[23,9]],dark);r(10,8,12,2,light);r(28,5,2,27,'#c6a672');panel(c,25,3,7,6,col);r(27,4,3,3,'#f1d483');r(12,18,10,9,dark);r(16,19,2,10,light);}
  if(m.shape==='knight'){panel(c,8,4,17,9,dark);r(10,5,12,4,light);r(10,11,13,3,INK);r(12,12,3,1,'#da7469');r(20,12,3,1,'#da7469');r(16,5,2,12,col);panel(c,5,16,8,6,dark);panel(c,22,16,8,6,col);r(30,9,1,22,'#b5c0c4');r(29,8,3,12,'#d5d6c1');}
 }
 monsterCache.set(key,canvas);return canvas;
}
export function treeSprite(kind='oak',variant=0){
 const canvas=canvasOf(44,55),c=canvas.getContext('2d');
 const colors=kind==='palm'?['#183e38','#265b49','#42815e','#64a674']:['#233e32','#385b3c','#577c47','#83a058'];
 if(kind==='dead'){stroke(c,23,52,21,10,'#302f2e',5);stroke(c,23,29,10,16,'#302f2e',3);stroke(c,22,22,35,11,'#302f2e',3);stroke(c,11,17,9,7,'#514638',2);stroke(c,24,34,34,24,'#514638',2);rect(c,23,12,2,38,'#706044');return canvas;}
 rect(c,19,32,8,21,INK);rect(c,20,31,5,20,'#705338');rect(c,20,32,2,18,'#ac8650');rect(c,15,50,17,3,INK);rect(c,17,49,13,2,'#745438');
 if(kind==='palm'){
  for(const pts of [[[21,14],[6,9],[0,14],[3,20],[9,15],[20,17]],[[21,13],[12,2],[5,2],[12,8],[19,17]],[[22,14],[30,2],[40,4],[32,8],[25,16]],[[22,15],[40,12],[44,22],[38,18],[24,18]],[[21,16],[30,22],[29,31],[25,25],[20,17]],[[20,16],[9,22],[5,30],[6,19],[16,13]]]){poly(c,pts,colors[0]);const inset=pts.map(([x,y])=>[x,y-1]);poly(c,inset,colors[1]);}stroke(c,10,12,22,15,colors[3]);stroke(c,24,14,36,5,colors[2]);stroke(c,25,17,39,15,colors[2]);return canvas;
 }
 for(const [x,y,rx,ry] of [[12,29,11,10],[30,28,12,11],[21,15,15,14],[9,19,8,9],[35,18,8,10]]){oval(c,x,y,rx,ry,INK);oval(c,x,y-1,rx-1,ry-1,colors[0]);oval(c,x-2,y-3,rx-3,ry-3,colors[1]);}
 for(const [x,y,w,h] of [[11,10,8,3],[16,6,10,3],[9,14,12,4],[24,9,8,3],[26,15,9,4],[5,20,8,3],[15,20,9,5],[26,25,8,3],[9,29,8,3]]){rect(c,x,y,w,h,colors[2]);rect(c,x,y,w-3,1,colors[3]);}
 for(let i=0;i<7;i++)rect(c,9+(i*7+variant*3)%26,12+(i*11)%18,2,2,colors[0]);
 return canvas;
}
export function stoneSprite(kind='rock',desert=false){
 const canvas=canvasOf(26,34),c=canvas.getContext('2d'),base=desert?'#b4a17a':'#84938a',light=shade(base,30),dark=shade(base,-40);
 if(kind==='grave'){panel(c,6,10,15,21,dark);rect(c,8,8,11,21,base);rect(c,10,7,7,2,light);rect(c,8,10,2,17,light);rect(c,5,29,18,3,INK);rect(c,6,29,16,1,dark);rect(c,13,14,2,9,dark);rect(c,10,17,8,2,dark);rect(c,9,27,9,1,dark);}
 else if(kind==='pillar'){panel(c,8,5,11,25,dark);rect(c,10,7,7,20,base);rect(c,11,7,2,19,light);panel(c,5,3,17,6,base);rect(c,6,4,15,1,light);panel(c,5,28,17,5,base);rect(c,6,29,15,1,light);}
 else{poly(c,[[2,24],[5,16],[11,12],[20,14],[24,23],[22,29],[5,29]],INK);poly(c,[[3,24],[6,17],[12,13],[19,15],[22,23],[20,27],[6,27]],dark);poly(c,[[6,17],[12,14],[19,16],[17,22],[4,23]],base);stroke(c,7,17,12,15,light);stroke(c,12,15,18,16,light);}
 return canvas;
}
export function martSprite(){
 const canvas=canvasOf(112,102),c=canvas.getContext('2d'),r=(x,y,w,h,col)=>rect(c,x,y,w,h,col);
 // Stone plinth, warm plaster and dark timber.
 panel(c,8,86,95,10,'#706e64');r(10,87,91,2,'#d0c9a3');panel(c,12,42,86,45,'#b8b897');r(15,44,80,38,'#ded7b5');r(15,76,80,7,'#aaa482');
 for(let x=16;x<95;x+=13){r(x,79,11,1,'#817f6a');r(x+4,82,1,3,'#817f6a');}
 r(13,43,4,43,'#545b4e');r(92,43,4,43,'#545b4e');r(17,43,75,3,'#f3e4be');
 // Pixel roof shingles. Each row is stepped; no anti-aliased diagonal edges.
 poly(c,[[9,13],[88,13],[106,40],[3,40]],INK);poly(c,[[12,14],[87,14],[101,37],[6,37]],'#405b58');
 for(let row=0;row<5;row++){const y=15+row*4,left=12-row,right=87+row*2;for(let x=left;x<right;x+=9){r(x,y,8,3,row%2?'#587f70':'#527567');r(x,y,7,1,'#82a184');r(x+7,y+1,1,3,'#314e4b');}}
 r(6,37,96,3,'#28423e');r(4,40,100,3,'#a7b28b');
 panel(c,73,3,14,19,'#6c7167');r(74,4,12,3,'#a8ad92');r(75,8,10,11,'#878c78');r(75,11,10,1,'#575f57');r(80,8,1,4,'#575f57');
 // Sign and striped awning.
 panel(c,14,39,82,14,'#354d46');r(16,40,78,1,'#8caa84');pixelText(c,'DUNGEON MART',55,43,'#ffe9aa',1,true);
 for(let x=12,i=0;x<98;x+=7,i++){r(x,54,7,8,i%2?'#efe5be':'#b96650');r(x,54,7,2,i%2?'#fff3d2':'#dc8b68');r(x,62,7,3,i%2?'#c7c1a0':'#804b40');r(x+1,65,5,1,INK);}
 // Windows with tiny shelves and colorful potions.
 for(const x of [21,70]){panel(c,x,67,20,15,'#385354');r(x+2,68,16,2,'#b5d3b4');r(x+2,72,16,1,'#839a7c');r(x+2,77,16,1,'#839a7c');for(let i=0;i<4;i++){r(x+3+i*4,70,2,2,['#c39c5d','#c78069','#8eab85','#94b8bd'][i]);r(x+3+i*4,75,2,2,['#9caec6','#b5bc75','#d4a479','#b2889f'][i]);}r(x+9,68,2,13,'#aaa988');}
 panel(c,47,65,17,22,'#434d42');r(49,67,13,18,'#779583');r(50,68,10,8,'#b3ccb0');r(50,69,2,6,'#d9e3bc');r(60,78,1,3,'#f3d994');
 r(43,87,25,3,'#d3c6a0');r(40,90,31,3,'#958d77');r(38,93,35,2,'#646b5f');
 // Crates, vending machine and flower beds are part of the store sprite.
 panel(c,0,76,10,14,'#8e6b43');r(1,77,8,1,'#c09962');stroke(c,1,80,8,86,'#5a4735');panel(c,101,67,10,21,'#b86a51');r(102,68,8,2,'#d6ad7b');r(102,72,6,9,'#507779');r(103,73,2,2,'#c0d6b7');r(106,77,1,1,'#d5b269');r(103,84,5,2,'#3b4541');
 return canvas;
}
