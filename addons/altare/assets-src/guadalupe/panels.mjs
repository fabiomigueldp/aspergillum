import fs from 'node:fs';
import {PNG} from 'pngjs';
// Original imagegen output is immutable. This compiler samples production plates,
// assembles semantic roles, and derives bounded presentation maps deterministically.
const atlas=PNG.sync.read(fs.readFileSync(new URL('./reference-plates-v1.png',import.meta.url)));
const cell=atlas.width/3;
if(cell!==atlas.height/2)throw Error('Guadalupe production atlas must have six square plates');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const wrap=(v,p)=>(v%p+p)%p;
function plate(col,row,u,v){
 // Discard only the grid/registration lines. No manual editing of generated PNGs.
 const pad=10,x=col*cell+pad+clamp(u)*(cell-2*pad-1),y=row*cell+pad+clamp(v)*(cell-2*pad-1);
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const pixel=(dx,dy)=>{const i=((iy+dy)*atlas.width+ix+dx)*4;return [atlas.data[i],atlas.data[i+1],atlas.data[i+2]];};
 return mix(mix(pixel(0,0),pixel(1,0),fx),mix(pixel(0,1),pixel(1,1),fx),fy);
}
function ground(x,y){
 const u=wrap(x,128)/128,v=clamp(y/84);
 // Preserve the main vine drawing; crossfade only the 7.5% seam margins.
 // Both ends meet at the same average, with a continuous first derivative.
 const blend=.5*(1-smooth(0,.075,Math.min(u,1-u)));
 const rgb=mix(plate(1,1,u,v),plate(1,1,1-u,v),blend);
 // Keep the continuous background quieter than the three main medallions.
 return mix(rgb,[126,121,111],.22);
}
function motif(rgb,x,y,col,row,cx=64,cy=42,size=78,pair=false){
 const u=(x-cx)/size+.5,v=(y-cy)/size+.5;
 if(u<0||u>1||v<0||v>1)return rgb;
 let distance;
 if(pair){
  const ellipse=vy=>Math.hypot((u-.5)/.47,(v-vy)/.235);
  distance=Math.min(ellipse(.25),ellipse(.75));
 }else distance=Math.hypot(u-.5,v-.5)/.495;
 const alpha=1-smooth(.94,1,distance);
 return alpha?mix(rgb,plate(col,row,u,v),alpha):rgb;
}
export function panelColor(x,y,role){
 let rgb=ground(x,y);
 if(role>=2&&role<=4)rgb=motif(rgb,x,y,1,0,role===3?0:role===4?128:64);
 if(role===6)rgb=motif(rgb,x,y,0,0);
 if(role===7)rgb=motif(rgb,x,y,2,0);
 if(role===8)rgb=motif(rgb,x,y,0,1,64,42,78,true);
 if(role===9)rgb=motif(rgb,x,y,2,1,64,42,78,true);
 if(role===10){rgb=motif(rgb,x,y,0,0,32,42,62);rgb=motif(rgb,x,y,0,1,96,42,62,true);}
 if(role===11){rgb=motif(rgb,x,y,2,1,32,42,62,true);rgb=motif(rgb,x,y,2,0,96,42,62);}
 // Fine continuous inner lines sit under the independent raised perimeter moulding.
 if(y<1||y>83)rgb=[173,139,69];
 return rgb;
}
export function panelPaint(x,y,role){
 const rgb=panelColor(x,y,role),[r,g,b]=rgb;
 const enamel=r>g*1.48&&r>b*1.25;
 const gold=!enamel&&r>b*1.25&&g>b*1.08;
 const silver=!enamel&&!gold&&b>r*.99&&b>g*.99;
 // Material masks are an authored approximation, not measured scan data.
 const luminance=(r*.2126+g*.7152+b*.0722)/255;
 return {rgb:rgb.map(v=>Math.round(clamp(v,0,255))),rough:enamel?151:gold?155:silver?172:229,metal:gold?210:silver?175:0,height:(gold?.10:silver?.06:0)+luminance*.055};
}
export function framePaint(x,y){
 const u=wrap(x,8),v=wrap(y,8);
 const ribbon=Math.abs(v-2)<1.5||Math.abs(u-2)<1.5;
 const knot=Math.abs(Math.sin((x+y)*Math.PI/4))<.4;
 const n=ribbon?(knot?13:0):-25;
 return {rgb:[182+n,144+n,66+n*.5].map(Math.round),rough:153,metal:210,height:ribbon?(knot?.22:.16):.03};
}
