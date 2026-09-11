// Shared geometry for simulation, rendering, town editing and navigation.
export const WORLD = { width: 3600, height: 2800, revision: 3, tile: 32 };
export const MART = { x: 1808, y: 1200 };
export const ARRIVAL = { x: 528, y: 1136, berth: {x:208,y:1136}, reception: { x: 896, y: 1200 } };
export const HUB = { id:'hub', x:1808,y:1200,rx:600,ry:420,name:'던전 마트 마을',biome:'hub',color:'#859d6c' };
export const HARBOR = {id:'harbor',x:640,y:1120,rx:480,ry:360,name:'여명 항구',biome:'coast',color:'#87a698'};
export const RESERVE = {id:'reserve',x:1800,y:320,name:'북부 미개척지',biome:'reserve',color:'#687e73'};
export const REGIONS = [
 {id:'act-1',zone:0,x:752,y:1936,rx:660,ry:920,gate:{x:1104,y:1664},name:'잿빛 황야',biome:'grass',color:'#91ab68'},
 {id:'act-2',zone:1,x:1744,y:2240,rx:610,ry:410,gate:{x:1808,y:1648},name:'태양의 무덤',biome:'sand',color:'#ddbb76'},
 {id:'act-3',zone:2,x:2944,y:2208,rx:600,ry:620,gate:{x:2512,y:1856},name:'몰락한 밀림',biome:'jungle',color:'#60ab8d'},
 {id:'act-4',zone:3,x:2960,y:1104,rx:490,ry:720,gate:{x:2416,y:1312},name:'불타는 지옥',biome:'hell',color:'#db8260'}
];
export const ROADS = [
 {id:'harbor-road',width:96,points:[{x:528,y:1136},{x:736,y:1264},{x:1104,y:1312},{x:1808,y:1312}]},
 {id:'town-main',width:96,points:[{x:1808,y:1264},{x:1808,y:1568}]},
 {id:'west-trail',zone:0,width:80,points:[{x:1808,y:1472},{x:1392,y:1584},{x:1104,y:1776},{x:784,y:2048}]},
 {id:'dune-trail',zone:1,width:80,points:[{x:1808,y:1536},{x:1904,y:1776},{x:1648,y:1936},{x:1776,y:2160}]},
 {id:'jungle-trail',zone:2,width:80,points:[{x:1808,y:1472},{x:2288,y:1712},{x:2608,y:2112},{x:2912,y:2160}]},
 {id:'ash-trail',zone:3,width:80,points:[{x:1808,y:1312},{x:2224,y:1312},{x:2512,y:1408},{x:2720,y:1280},{x:2944,y:1152}]},
 {id:'southern-trail',width:64,points:[{x:784,y:2304},{x:1472,y:2400},{x:2064,y:2368},{x:2608,y:2352},{x:3136,y:2432}]}
];
const poi=(id,type,name,x,y,width,height,interaction='info',status='active',solid=true,zone)=>({id,type,name,x,y,width,height,interaction,status,solid,zone,description:status==='reserved'?'향후 탐험과 이벤트를 추가할 공간입니다.':'마을에서 이용하는 시설입니다.'});
export const DEFAULT_POIS = [
 poi('mart','mart','던전 마트',1808,1200,224,182,'shop'),
 poi('arrival','arrival','여명 항구 · 헌터 선착장',528,1136,320,128,'recruit','active',false),
 poi('reception','reception','항구 등록소',896,1152,112,104,'recruit'),
 poi('spring','fountain','회복의 샘',2064,1216,80,64),
 poi('notice','board','모험 게시판',1520,1248,64,72,'bestiary'),
 poi('forge-site','forge','대장간',1456,1024,160,144,'shop'),
 poi('warehouse-site','warehouse','창고',2192,1536,160,144,'shop'),
 poi('training-site','training','훈련장',2176,992,160,112,'training','active',false),
 poi('crypt','crypt','버려진 지하묘지',640,1872,160,128,'info','reserved',true,0),
 poi('oasis','oasis','침묵의 오아시스',2064,2352,144,96,'info','reserved',true,1),
 poi('tomb','tomb','봉인된 왕릉',1808,1920,184,152,'info','reserved',true,1),
 poi('temple','temple','덩굴 사원',3168,1984,184,144,'info','reserved',true,2),
 poi('rift','fortress','혼돈의 봉인문',3104,992,208,168,'info','reserved',true,3)
];
export const POIS=DEFAULT_POIS.map(p=>({...p}));
export const TOWN_BOUNDS={left:1280,right:2336,top:800,bottom:1600};
export const MOVABLE_IDS=['mart','spring','notice','forge-site','warehouse-site','training-site'];
export const DECORATIONS={path:{name:'돌길',width:32,height:32},tree:{name:'가로수',width:48,height:64},flowers:{name:'화단',width:32,height:32},bench:{name:'벤치',width:48,height:32},lamp:{name:'가로등',width:24,height:48}};
export function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
export function roadAt(x,y){return ROADS.find(r=>r.points.slice(1).some((p,i)=>segmentDistance(x,y,r.points[i],p)<=r.width/2));}
export const coastX=y=>270+Math.sin(y/180)*55+Math.sin(y/71)*18;
export const riverX=y=>2560+Math.sin(y/135)*85;
export function regionAt(x,y){
 if(x<0||x>WORLD.width||y<0||y>WORLD.height)return null;
 if(x<coastX(y)||x>3460+Math.sin(y/190)*75||y>2690+Math.sin(x/210)*65||y<105+Math.sin(x/260)*65)return null;
 // An irregular northern ridge leaves only a small future expansion pocket.
 if(x>1370+Math.sin(y/120)*120&&x<2280+Math.sin(y/90)*95&&y<610+Math.sin(x/170)*115)return RESERVE;
 if(x>2450+Math.sin(y/195)*155&&y<1600+Math.sin(x/170)*120)return REGIONS[3];
 if(x>1190+Math.sin(y/155)*50&&x<2440+Math.sin(y/230)*80&&y>730+Math.sin(x/170)*55&&y<1640+Math.sin(x/230)*75)return HUB;
 if(x<1110+Math.sin(y/100)*50&&y>885+Math.sin(x/140)*65&&y<1430+Math.sin(x/150)*75)return HARBOR;
 if(x<1260+Math.sin(y/180)*110||y<900)return REGIONS[0];
 if(x<2390+Math.sin(y/170)*120&&y>1540)return REGIONS[1];
 return REGIONS[2];
}
export const contains=(r,x,y,margin=0)=>regionAt(x,y)?.id===r.id&&(!margin||Math.abs(x-r.x)<r.rx-margin&&Math.abs(y-r.y)<r.ry-margin);
export function terrainBlocked(x,y){
 if(x>=220&&x<=640&&y>=1072&&y<=1152)return false; // pier over the western sea
 const r=regionAt(x,y);if(!r||r===RESERVE)return true;
 if(roadAt(x,y))return false;
 if(y>1710&&Math.abs(x-riverX(y))<20)return true;
 // Volcanic fissure leaves broad northern and southern routes around it.
 return r.zone===3&&x>2770&&x<2810&&y>900&&y<1100;
}
export function solidAt(x,y,padding=10){return POIS.find(p=>p.solid&&x>=p.x-p.width/2-padding&&x<=p.x+p.width/2+padding&&y>=p.y-p.height-padding&&y<=p.y+padding);}
export function isWalkable(x,y){return !terrainBlocked(x,y)&&!solidAt(x,y);}
export function poiAt(x,y){return [...POIS].reverse().find(p=>x>=p.x-p.width/2-10&&x<=p.x+p.width/2+10&&y>=p.y-p.height-10&&y<=p.y+16);}
export let layoutRevision=0;
let layoutSignature='', activeTown={buildings:{},decorations:[]};
export const currentTownLayout=()=>structuredClone(activeTown);
export function applyTownLayout(town={buildings:{},decorations:[]}){
 const signature=JSON.stringify(town);if(signature===layoutSignature)return false;
 layoutSignature=signature;activeTown=structuredClone(town);POIS.splice(0,POIS.length,...DEFAULT_POIS.map(p=>({...p,...town.buildings[p.id]})));
 const mart=POIS.find(p=>p.id==='mart');MART.x=mart.x;MART.y=mart.y;layoutRevision++;return true;
}
export const freshTown=()=>({buildings:{},decorations:[]});
export const snapTown=(x,y)=>({x:Math.round((x-16)/32)*32+16,y:Math.round((y-16)/32)*32+16});
const rectOf=p=>({left:p.x-p.width/2,right:p.x+p.width/2,top:p.y-p.height,bottom:p.y});
const overlap=(a,b,gap=24)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
export function placementError(town,id,x,y){
 const def=DEFAULT_POIS.find(p=>p.id===id);if(!def||!MOVABLE_IDS.includes(id))return '옮길 수 없는 시설입니다.';
 if(!Number.isFinite(x)||!Number.isFinite(y))return '위치를 확인하세요.';
 const candidate={...def,x,y},r=rectOf(candidate),b=TOWN_BOUNDS;
 if(r.left<b.left||r.right>b.right||r.top<b.top||r.bottom>b.bottom-32)return '마을 편집 경계 안에 배치하세요.';
 for(const p of DEFAULT_POIS){if(p.id!==id&&overlap(r,rectOf({...p,...town.buildings[p.id]}),32))return '다른 시설과 출입구에 공간을 남겨 주세요.';}
 for(let yy=r.top-16;yy<=r.bottom+16;yy+=16)for(let xx=r.left-16;xx<=r.right+16;xx+=16)if(roadAt(xx,yy))return '주요 도로는 비워 두세요.';
 return '';
}
export function validateTown(town){
 if(!town||typeof town!=='object'||!town.buildings||Array.isArray(town.buildings)||!Array.isArray(town.decorations)||town.decorations.length>300)return false;
 for(const [id,p] of Object.entries(town.buildings)){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||placementError(town,id,p.x,p.y))return false;}
 return town.decorations.every(d=>d&&Object.hasOwn(DECORATIONS,d.type)&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&d.x>=TOWN_BOUNDS.left&&d.x<=TOWN_BOUNDS.right&&d.y>=TOWN_BOUNDS.top&&d.y<=TOWN_BOUNDS.bottom);
}
// Spawn camps cover each act instead of three tight spots near the centre, so packs roam the whole region.
export const CAMPS=REGIONS.flatMap(r=>{const out=[],spots=[[0,0],[-.55,-.32],[.55,-.32],[-.62,.28],[.62,.28],[0,-.62],[0,.62],[-.32,.62],[.32,-.62],[.36,.6],[-.36,-.6],[-.7,0],[.7,0]];
 for(const [fx,fy] of spots){const x=Math.round(r.x+fx*r.rx),y=Math.round(r.y+fy*r.ry);if(regionAt(x,y)!==r||roadAt(x,y)||terrainBlocked(x,y)||POIS.some(p=>Math.hypot(p.x-x,p.y-y)<170))continue;out.push({id:`${r.id}-camp-${out.length}`,zone:r.zone,x,y,radius:120});}
 return out;});
export const BOSS_LAIR={x:3104,y:1120};
