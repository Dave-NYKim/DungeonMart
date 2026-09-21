// Two summon species × two generated poses, preserved as a local source atlas.
let sheet;const cache=new Map();
export const summonArtStatus=()=>({ready:Boolean(sheet),species:2,poses:2});
if(typeof Image!=='undefined'){const img=new Image();img.onload=()=>{sheet=img;};img.src=new URL('../assets/summons/sprites.png',import.meta.url);}
export function summonSprite(kind,pose=0){
 if(!sheet)return null;const col=kind==='golem'?1:0,row=pose%2,key=`${col}:${row}`;if(cache.has(key))return cache.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const w=sheet.naturalWidth/2,h=sheet.naturalHeight/2;c.drawImage(sheet,col*w,row*h,w,h,0,0,64,64);cache.set(key,canvas);return canvas;
}
export function drawSummon(c,p,time){
 const sprite=summonSprite(p.kind,Math.floor(time*3+p.x)%2);if(!sprite)return false;
 const size=p.kind==='golem'?64:48,x=Math.round(p.x),y=Math.round(p.y);c.save();c.imageSmoothingEnabled=false;
 // A short fade only when the summon is about to expire; otherwise keep detail opaque.
 c.globalAlpha=Math.min(1,Math.max(.25,p.life/2));c.fillStyle='#101d1880';c.beginPath();c.ellipse(x,y+1,size*.23,size*.065,0,0,Math.PI*2);c.fill();
 c.drawImage(sprite,Math.round(x-size/2),Math.round(y-size*.93),size,size);c.restore();return true;
}
