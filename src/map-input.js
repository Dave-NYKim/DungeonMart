// Pointer capture makes dragging independent of picking; touch uses the same camera transform.
export function installMapInput(canvas,renderer,{pick,hover,change}){
 const pointers=new Map();let dragging=false,gesture=false,pinch=null;
 const local=p=>{const r=canvas.getBoundingClientRect();return{x:p.x-r.left,y:p.y-r.top};};
 const pair=()=>{const[a,b]=[...pointers.values()];return{distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});if(pointers.size===2){pinch=pair();gesture=true;}hover?.(null);});
 canvas.addEventListener('pointermove',e=>{const previous=pointers.get(e.pointerId);if(!previous){hover?.(e);return;}const next={...previous,x:e.clientX,y:e.clientY};pointers.set(e.pointerId,next);
  if(pointers.size>=2){const current=pair(),p=local(current);if(pinch&&pinch.distance>0){renderer.zoom(renderer.camera.zoom*current.distance/pinch.distance,p.x,p.y);renderer.pan(current.x-pinch.x,current.y-pinch.y);}pinch=current;gesture=true;change?.();return;}
  if(Math.hypot(next.x-next.startX,next.y-next.startY)>5)dragging=true;
  if(dragging){renderer.pan(next.x-previous.x,next.y-previous.y);canvas.classList.add('dragging');change?.();}
 });
 const end=(e,cancel=false)=>{const p=pointers.get(e.pointerId);if(!p)return;const shouldPick=!cancel&&!dragging&&!gesture&&pointers.size===1;pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!pointers.size){dragging=false;gesture=false;pinch=null;canvas.classList.remove('dragging');}else{pinch=null;dragging=true;}if(shouldPick)pick(e);};
 canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))end(e,true);});
 canvas.addEventListener('pointerleave',()=>hover?.(null));
 canvas.addEventListener('wheel',e=>{e.preventDefault();hover?.(null);const p=local({x:e.clientX,y:e.clientY}),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?300:1);renderer.zoom(renderer.camera.zoom*Math.exp(-Math.max(-300,Math.min(300,delta))*.0025),p.x,p.y);change?.();},{passive:false});
}
