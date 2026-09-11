import { WORLD, isWalkable, layoutRevision } from './world.js';
const CELL=32,COLS=Math.ceil(WORLD.width/CELL),ROWS=Math.ceil(WORLD.height/CELL);
let grid,cache=new WeakMap(),revision=-1;
const center=id=>({x:(id%COLS+.5)*CELL,y:(Math.floor(id/COLS)+.5)*CELL});
const cellOf=p=>Math.max(0,Math.min(ROWS-1,Math.floor(p.y/CELL)))*COLS+Math.max(0,Math.min(COLS-1,Math.floor(p.x/CELL)));
function init(){if(revision!==layoutRevision){rebuildNavigation();revision=layoutRevision;}if(grid)return;grid=new Uint8Array(COLS*ROWS);for(let i=0;i<grid.length;i++){const p=center(i);grid[i]=[[0,0],[-5,0],[5,0],[0,-5],[0,5]].every(([dx,dy])=>isWalkable(p.x+dx,p.y+dy))?1:0;}}
export function rebuildNavigation(){grid=null;cache=new WeakMap();}
export function nearestWalkable(p){init();if(isWalkable(p.x,p.y))return{x:p.x,y:p.y};const origin=cellOf(p);if(grid[origin])return center(origin);let best=-1,d=Infinity;for(let i=0;i<grid.length;i++)if(grid[i]){const c=center(i),n=(c.x-p.x)**2+(c.y-p.y)**2;if(n<d){d=n;best=i;}}return best<0?null:center(best);}
export function lineOpen(a,b){const d=Math.hypot(a.x-b.x,a.y-b.y),steps=Math.max(1,Math.ceil(d/2));for(let i=0;i<=steps;i++){const t=i/steps;if(!isWalkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
class Heap{constructor(){this.a=[];}push(id,score){const a=this.a;let i=a.length;a.push({id,score});while(i){const p=(i-1)>>1;if(a[p].score<=score)break;a[i]=a[p];i=p;}a[i]={id,score};}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(a[child].score>=last.score)break;a[i]=a[child];i=child;}a[i]=last;}return first;}}
export function findPath(start,end){
 init();const a=nearestWalkable(start),b=nearestWalkable(end);if(!a||!b)return[];if(lineOpen(a,b))return[b];
 let from=cellOf(a),to=cellOf(b);
 const snap=id=>{if(grid[id])return id;const p=center(id);let best=-1,d=Infinity;for(let i=0;i<grid.length;i++)if(grid[i]){const q=center(i),n=(q.x-p.x)**2+(q.y-p.y)**2;if(n<d){d=n;best=i;}}return best;};from=snap(from);to=snap(to);if(from<0||to<0)return[];
 const g=new Float64Array(grid.length);g.fill(Infinity);const parent=new Int32Array(grid.length);parent.fill(-1);const closed=new Uint8Array(grid.length),open=new Heap(),tx=to%COLS,ty=Math.floor(to/COLS);
 const heuristic=id=>Math.hypot(id%COLS-tx,Math.floor(id/COLS)-ty);g[from]=0;open.push(from,heuristic(from));
 while(open.a.length){const{id}=open.pop();if(closed[id])continue;if(id===to){const points=[b];let at=to;while(at!==from&&at>=0){points.push(center(at));at=parent[at];}points.push(center(from));points.reverse();const smooth=[];let current=a;for(let i=0;i<points.length;){let far=i;while(far+1<points.length&&lineOpen(current,points[far+1]))far++;smooth.push(points[far]);current=points[far];i=far+1;}return smooth;}
 closed[id]=1;const x=id%COLS,y=Math.floor(id/COLS);
 for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;const next=ny*COLS+nx;if(!grid[next]||closed[next])continue;if(dx&&dy&&(!grid[y*COLS+nx]||!grid[ny*COLS+x]))continue;if(!lineOpen(center(id),center(next)))continue;const score=g[id]+(dx&&dy?Math.SQRT2:1);if(score>=g[next])continue;parent[next]=id;g[next]=score;open.push(next,score+heuristic(next));}
 }
 return[];
}
export function moveEntity(entity,target,speed,dt){
 init();
 if(!isWalkable(entity.x,entity.y)){const safe=nearestWalkable(entity);if(!safe)return false;entity.x=safe.x;entity.y=safe.y;cache.delete(entity);}
 let nav=cache.get(entity);
 if(!nav||Math.hypot(nav.target.x-target.x,nav.target.y-target.y)>20){const goal=nearestWalkable(target);if(!goal)return false;nav={target:{...target},goal,path:findPath(entity,goal),index:0};cache.set(entity,nav);}
 if(!nav.path.length)return Math.hypot(entity.x-nav.goal.x,entity.y-nav.goal.y)<6;
 let distance=speed*dt;
 while(nav.index<nav.path.length){const p=nav.path[nav.index],d=Math.hypot(p.x-entity.x,p.y-entity.y);if(d<=distance+.001){if(!lineOpen(entity,p)){cache.delete(entity);return false;}entity.x=p.x;entity.y=p.y;distance-=d;nav.index++;}else{const next={x:entity.x+(p.x-entity.x)/d*distance,y:entity.y+(p.y-entity.y)/d*distance};if(!lineOpen(entity,next)){cache.delete(entity);return false;}entity.x=next.x;entity.y=next.y;return false;}}
 // A completed path is rebuilt if the moving goal has changed inside its original grid cell.
 const reached=Math.hypot(entity.x-target.x,entity.y-target.y)<6;
 cache.delete(entity);return reached||!isWalkable(target.x,target.y);
}
export function displaceEntity(entity,x,y){const next=nearestWalkable({x,y});if(next){entity.x=next.x;entity.y=next.y;cache.delete(entity);}}
