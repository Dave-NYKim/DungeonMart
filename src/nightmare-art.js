// Original 4×4 creature atlas. Each species has one pose, not generated animation.
const ids=['fallen','shaman','zombie','skeleton','scarab','mummy','viper','maggot','fetish','hulk','zealot','council','finger','megademon','knight','mother'];
let sheet,motionSheet;const cache=new Map();
export function nightmareArtStatus(){return {ready:Boolean(sheet),species:ids.length,motionReady:Boolean(motionSheet)};}
if(typeof Image!=='undefined'){
 const img=new Image();img.onload=()=>{sheet=img;window.dispatchEvent(new Event('hero-art-ready'));};
 img.src=new URL('../assets/monsters/sprites.png',import.meta.url);
 const motion=new Image();motion.onload=()=>{motionSheet=motion;cache.clear();};motion.src=new URL('../assets/monsters/motion.png',import.meta.url);
}
export function nightmareSprite(id,cursed=false,tier=0,pose=0){
 const index=ids.indexOf(id);if(!sheet||index<0)return null;
 const key=`${id}:${tier}:${cursed}:${pose}`;if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const source=pose&&motionSheet?motionSheet:sheet;
 const w=source.naturalWidth/4,h=source.naturalHeight/4;
 ctx.drawImage(source,index%4*w,Math.floor(index/4)*h,w,h,0,0,64,64);
 // Palette remapping keeps the same silhouette, alpha and readable luminance.
 if(tier>0){const pixels=ctx.getImageData(0,0,64,64),d=pixels.data;
  const stops=tier===1?[[17,20,42],[105,80,168],[164,224,237]]:[[34,12,18],[179,57,38],[255,205,117]];
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const light=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255,t=Math.min(1,light)*2,k=t<1?0:1,f=t-k;
   for(let ch=0;ch<3;ch++)d[i+ch]=Math.round(d[i+ch]*.18+(stops[k][ch]*(1-f)+stops[k+1][ch]*f)*.82);
  }ctx.putImageData(pixels,0,0);
 }
 if(cursed){ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.25;ctx.fillStyle='#b47cbb';ctx.fillRect(0,0,64,64);}
 cache.set(key,c);return c;
}
