// Local, bounded Canvas effects: no image loads, random state, or combat changes.
const TAU = Math.PI * 2;
function ring(c,x,y,r,color,width=2){c.beginPath();c.arc(x,y,Math.max(1,r),0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function path(c,points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function drawBossWarning(c,e){
 if(e.spin)return;
 const fire=e.specialCd>=0&&e.specialCd<1.2,spin=e.spinCd>=0&&e.spinCd<1.2;
 if(!fire&&!spin)return;
 c.save();const r=fire?110:230,q=1-(fire?e.specialCd:e.spinCd)/1.2,col=fire?'#ff9c47':'#b68aff';
 c.globalAlpha=.12+q*.12;c.fillStyle=col;c.beginPath();c.arc(e.x,e.y,r,0,TAU);c.fill();
 c.globalAlpha=.8;ring(c,e.x,e.y,r,col,2);ring(c,e.x,e.y,r*(1-q),col,2);
 for(let i=0;i<12;i++){const a=i*TAU/12;path(c,[[e.x+Math.cos(a)*(r-7),e.y+Math.sin(a)*(r-7)],[e.x+Math.cos(a)*r,e.y+Math.sin(a)*r]],'#ffe8cb',3);}
 c.restore();
}
export function drawBossEffect(c,f){
 const t=Math.max(0,Math.min(1,1-f.life/f.max)),fade=Math.min(1,(1-t)*2.5);c.save();c.globalAlpha=fade;c.lineJoin='bevel';
 if(f.kind==='dark'){
  const dx=f.to.x-f.x,dy=f.to.y-f.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);c.save();c.translate(f.x,f.y+30);c.rotate(angle);c.fillStyle='#6827aa44';c.beginPath();c.moveTo(0,0);c.arc(0,0,len,-Math.PI/6,Math.PI/6);c.closePath();c.fill();c.restore();c.translate(f.x,f.y);c.rotate(angle);
  // A fan follows the actual 60-degree attack footprint; the bright core gives weight.

  const end=len*Math.min(1,.4+t*5),width=18*(1-t)+3;
  path(c,[[0,0],[end,0]],'#321345',width+16);path(c,[[0,0],[end,0]],'#9148e8',width+6);path(c,[[0,0],[end,0]],'#ead4ff',Math.max(2,width*.3));
  for(let j=0;j<2;j++){const pts=[];for(let i=0;i<9;i++)pts.push([end*i/8,Math.sin(i*2.7+j*4+t*16)*(7+j*6)*Math.sin(i*Math.PI/8)]);path(c,pts,j?'#f4e9ff':'#ce8cff',j?1:3);}
  for(let i=0;i<16;i++){const x=len*((i*.137+t*.8)%1),y=Math.sin(i*8)*22;c.fillStyle=i%3?'#b47aff':'#f7e4ff';c.fillRect(x,y,3,3);}
 }else if(f.kind==='boss-blast'){
  const r=110*Math.min(1,t*3.5);c.fillStyle='#5a201b66';c.beginPath();c.arc(f.x,f.y,110,0,TAU);c.fill();
  ring(c,f.x,f.y,r,'#a83c24',14*(1-t)+2);ring(c,f.x,f.y,r,'#ffad49',6*(1-t)+1);ring(c,f.x,f.y,r*.86,'#ffe6ae',2);
  for(let i=0;i<16;i++){const a=i*TAU/16,rr=110*(.25+.75*t),x=f.x+Math.cos(a)*rr,y=f.y+Math.sin(a)*rr;
   path(c,[[f.x+Math.cos(a)*20,f.y+Math.sin(a)*20],[f.x+Math.cos(a+.09)*55,f.y+Math.sin(a+.09)*55],[f.x+Math.cos(a)*105,f.y+Math.sin(a)*105]],'#f27d36',2);
   const lift=Math.sin(t*Math.PI)*(12+i%4*7);c.fillStyle=i%2?'#ffbd5c':'#8f5030';c.fillRect(Math.round(x),Math.round(y-lift),4+i%3,6+i%5);}
 }else if(f.kind==='boss-summon'){
  for(let k=0;k<2;k++){const x=f.x+(k?40:-40),y=f.y+20;ring(c,x,y,12+20*Math.sin(t*Math.PI),'#b583ef',4);ring(c,x,y,26,'#e5c9ff',1);
   for(let i=0;i<8;i++){const a=i*TAU/8+t*3,xx=x+Math.cos(a)*24,yy=y+Math.sin(a)*24;path(c,[[xx,yy],[xx,yy-55*Math.sin(t*Math.PI)]],i%2?'#674091':'#c998f5',3);}}
 }
 c.restore();
}
