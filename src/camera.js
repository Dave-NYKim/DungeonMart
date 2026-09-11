import { WORLD, MART } from './world.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Camera{
 constructor(){this.width=800;this.height=560;this.x=MART.x;this.y=MART.y-30;this.zoom=1.25;this.maxZoom=4;this.overview=false;}
 get minZoom(){return Math.min(this.width/WORLD.width,this.height/WORLD.height);}
 get view(){return{x:this.x-this.width/(2*this.zoom),y:this.y-this.height/(2*this.zoom),width:this.width/this.zoom,height:this.height/this.zoom};}
 resize(width,height){this.width=Math.max(1,width);this.height=Math.max(1,height);this.zoom=this.overview?this.minZoom:clamp(this.zoom,this.minZoom,this.maxZoom);this.constrain();}
 constrain(){const hx=this.width/(2*this.zoom),hy=this.height/(2*this.zoom);this.x=hx>=WORLD.width/2?WORLD.width/2:clamp(this.x,hx,WORLD.width-hx);this.y=hy>=WORLD.height/2?WORLD.height/2:clamp(this.y,hy,WORLD.height-hy);}
 worldPoint(x,y){const v=this.view;return{x:v.x+x/this.zoom,y:v.y+y/this.zoom};}
 screenPoint(x,y){const v=this.view;return{x:(x-v.x)*this.zoom,y:(y-v.y)*this.zoom};}
 zoomAt(value,x=this.width/2,y=this.height/2){const before=this.worldPoint(x,y);this.zoom=clamp(value,this.minZoom,this.maxZoom);this.overview=Math.abs(this.zoom-this.minZoom)<.001;this.x=before.x-(x-this.width/2)/this.zoom;this.y=before.y-(y-this.height/2)/this.zoom;this.constrain();}
 pan(dx,dy){this.x-=dx/this.zoom;this.y-=dy/this.zoom;this.constrain();}
 focus(x,y,zoom=1){this.x=x;this.y=y;this.zoom=clamp(zoom,this.minZoom,this.maxZoom);this.overview=false;this.constrain();}
 fit(){this.overview=true;this.zoom=this.minZoom;this.x=WORLD.width/2;this.y=WORLD.height/2;this.constrain();}
}
