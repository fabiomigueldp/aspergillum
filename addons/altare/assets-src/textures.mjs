// Deterministic production sources, in 128 logical UV units.
import {panelPaint,framePaint} from './guadalupe/panels.mjs';
const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
const mod=(v,p)=>((v%p)+p)%p;
const hash=(x,y)=>{let n=Math.imul(x+701,y+983)^Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const sample=(rgb,rough=210,metal=0,height=0)=>({rgb:rgb.map(clamp),rough:clamp(rough),metal:clamp(metal),height});
const smooth=t=>t*t*(3-2*t);
// Periodic value noise: boundary height/color/normal can continue across modules.
function noise(x,y,cells=8){
 const u=mod(x,128)/128*cells,v=mod(y,128)/128*cells,ix=Math.floor(u),iy=Math.floor(v);
 const a=smooth(u-ix),b=smooth(v-iy),n=(i,j)=>hash(mod(i,cells),mod(j,cells));
 return (n(ix,iy)*(1-a)+n(ix+1,iy)*a)*(1-b)+(n(ix,iy+1)*(1-a)+n(ix+1,iy+1)*a)*b;
}
const fiber=(x,y)=>(hash(Math.floor(mod(x,128)*2),Math.floor(mod(y,128)*2))-.5);
function linen(x,y){
 const warp=Math.cos(x*Math.PI),weft=Math.cos(y*Math.PI);
 const crossing=Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2);
 const thread=.55*warp+.35*weft+.28*crossing;
 const slub=(noise(x,0,32)-.5)*1.1+(noise(0,y,16)-.5)*.7;
 const n=thread+slub+fiber(x,y)*.85;
 return sample([240+n,237+n,229+n],236,0,thread*.035);
}
function gold(x,y,raised=.26){
 const stitch=Math.cos((x+y*.65)*TAU)*2.2+fiber(x,y)*3;
 return sample([196+stitch,157+stitch*.8,74+stitch*.45],142+fiber(x,y)*9,178,raised);
}
const lineDistance=(x,y,ax,ay,bx,by)=>{
 const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
 return Math.hypot(x-ax-t*(bx-ax),y-ay-t*(by-ay));
};
function stone(x,y,kind){
 const broad=noise(x,y,4)-.5,fine=noise(x+17,y-9,32)-.5,grain=fiber(x,y);
 if(kind===0){
  const wx=x+26*(noise(x,y,4)-.5),wy=y+22*(noise(x+32,y+12,4)-.5);
  const field=noise(wx,wy,6),vein=Math.exp(-(((field-.50)/.025)**2));
  const secondary=Math.exp(-(((noise(wx+38,wy-16,8)-.57)/.018)**2))*.35;
  const tone=broad*8+fine*2+grain*1.3-vein*10-secondary*5;
  return sample([215+tone,210+tone*.95,200+tone*.8],174+broad*10+vein*8,0,-vein*.045+grain*.008);
 }
 if(kind===1){
  const pore=Math.max(0,(grain-.40)*8),tone=broad*7+fine*3+grain*2-pore*4;
  return sample([201+tone,188+tone,166+tone*.9],218+fine*9,0,grain*.026-pore*.045);
 }
 const mineral=Math.max(0,noise(x+18,y,64)-.64)*12,tone=broad*5+fine*5+grain*3+mineral;
 return sample([62+tone,68+tone,69+tone],207+fine*10,0,grain*.028);
}
function hem(x,y,long,embroidered){
 let s=linen(x,y);
 const height=long?86:28,band=height-8,dy=y-band;
 // Soft fold shading complements the six geometric facets without drawing stripes.
 const fold=-1.7*(.5+.5*Math.cos(x/128*TAU*3))**6;
 s={...s,rgb:s.rgb.map(c=>clamp(c+fold)),height:s.height+fold*.015};
 if(dy<0||dy>7.5)return s;
 const stitch=mod(x,3.2)<1.6;
 if(!embroidered){
  if(Math.abs(dy-1)<.35||Math.abs(dy-6)<.35)s=sample([226,220,207],236,0,.10);
  if(stitch&&(Math.abs(dy-1.6)<.22||Math.abs(dy-5.4)<.22))s=sample([246,243,234],231,0,.14);
  return s;
 }
 // A continuous couched vine, paired leaves and fine selvedges; no checker holes.
 const u=mod(x,16),vine=3.65+.8*Math.sin(u/16*TAU);
 const leaf=(cx,cy,sign)=>{const a=(u-cx)*.88+(dy-cy)*sign*.48,b=-(u-cx)*sign*.48+(dy-cy)*.88;return (a/2.25)**2+(b/.78)**2<1;};
 if(Math.abs(dy-.8)<.32||Math.abs(dy-6.7)<.32||Math.abs(dy-vine)<.34||leaf(4,2.4,-1)||leaf(11,4.9,-1))s=gold(x,y);
 if(stitch&&(Math.abs(dy-.2)<.15||Math.abs(dy-7.3)<.15))s=sample([225,207,156],192,80,.13);
 return s;
}
function brocade(x,y){
 const grain=fiber(x,y),weave=Math.sin((x+y)*Math.PI)*.65;
 const n=(noise(x,y,16)-.5)*3+grain*2+weave;
 let s=sample([169+n,143+n,85+n],219,8,.025);
 const local=mod(x,64),stemY=(y-7)/70*TAU,stemX=32+13*Math.sin(stemY);
 const stem=Math.abs(local-stemX);
 if(stem<1.1)s=sample([140+n,111+n,53+n],203,25,.06);
 if(stem<.52)s=sample([198+n,166+n,91+n],173,100,.20);
 for(const [cy,sign] of [[17,1],[32,-1],[51,1],[66,-1]]){
  const cx=32+13*Math.sin((cy-7)/70*TAU)+sign*6.5;
  const lx=(local-cx)*.82+(y-cy)*sign*.57,ly=-(local-cx)*sign*.57+(y-cy)*.82;
  const leaf=(lx/10.5)**2+(ly/3.8)**2;
  if(leaf<1.14)s=sample([140+n,111+n,53+n],208,25,.04);
  if(leaf<1)s=sample([192+n+ly,160+n+ly,83+n],184,90,.18);
  if(leaf<.86&&Math.abs(ly)<.33)s=sample([220+n,188+n,110+n],161,125,.28);
  if(leaf<.8&&Math.abs(ly-.42*Math.sin(lx*1.9))<.18)s=sample([157+n,127+n,61+n],204,35,.12);
 }
 // Small scroll terminals sit between the leaves rather than competing with emblems.
 for(const [cx,cy] of [[12,42],[52,42]]){
  const dx=local-cx,dy=y-cy,r=Math.hypot(dx,dy),theta=Math.atan2(dy,dx);
  if(Math.abs(r-(3.8+theta*.6))<.45)s=sample([195+n,162+n,84+n],178,105,.20);
 }
 return s;
}
function ring(s,x,y,r){
 if(Math.abs(r-34)<1.4||Math.abs(r-28.9)<.48)s=gold(x,y,.32);
 if(Math.abs(r-32)<.45)s=sample([128,99,45],194,65,.10);
 return s;
}
function frontal(x,y,role){
 let s=brocade(x,y);
 const n=fiber(x,y)*2.5;
 if(y<2.7||y>80.3)s=gold(x,y,.23);
 if(Math.abs(y-4.7)<.4||Math.abs(y-78.3)<.4)s=sample([116,90,42],198,60,.08);
 if((Math.abs(y-3.6)<.4||Math.abs(y-79.4)<.4)&&mod(x,3.2)<1.5)s=sample([224,195,122],168,155,.25);
 // North face U runs opposite world X. Public role 3 = first half, role 4 = second.
 const center=role===3?0:role===4?128:64,dx=x-center,dy=y-42,r=Math.hypot(dx,dy);
 if(role>=2&&role<=4){
  if(r<35.5)s=sample([218+n,196+n,135+n],193,46,.12);
  s=ring(s,x,y,r);
  const theta=Math.atan2(dy,dx),beadR=31.1;
  const angle=mod(theta+Math.PI/48,TAU/48)-Math.PI/48;
  if(Math.hypot((r-beadR),angle*beadR)<.59)s=sample([235+n,208+n,141+n],156,145,.33);
  const bars=Math.min(lineDistance(dx,dy,0,-23.5,0,23.5),lineDistance(dx,dy,-16.5,-18,16.5,19),lineDistance(dx,dy,-16.5,19,16.5,-18));
  const rho=dx>=0&&dy<-3?Math.abs(Math.hypot((dx-2.8)/.9,dy+15)-8):100;
  const serifs=Math.min(lineDistance(dx,dy,-3,-23.5,3,-23.5),lineDistance(dx,dy,-3,23.5,3,23.5));
  const motif=Math.min(bars-1.5,rho-1.25,serifs-.65);
  if(r<28&&motif<.6)s=sample([176,129,67],184,75,.20);
  if(r<28&&motif<0){const thread=Math.sin((dx+dy)*TAU)*1.5;s=sample([133+n+thread,34+n*.25,37+n*.25],211,0,.32);}
 }
 if(role===5){
  const dx=(x-64)*.85,dy=y-42,q=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  if(q<35.5)s=sample([98+n,123+n,132+n],210,5,.08);
  s=ring(s,x,y,q);
  if(q<27&&q>23.5&&Math.cos(a*24)>.72)s=sample([196+n,180+n,134+n],187,80,.23);
  const petal=16+5.5*Math.cos(a*8);
  if(q<petal+.65&&q>5)s=gold(x,y,.24);
  if(q<petal&&q>5){const shade=Math.cos(a*8)*6;s=sample([231+n+shade,226+n+shade,202+n],213,8,.24);}
  if(q<18&&q>7&&Math.abs(Math.sin(a*8))<.10)s=sample([199,182,137],210,35,.18);
  if(q<5.7)s=gold(x,y,.34);
  if(q<2.8)s=sample([224,197,117],171,130,.40);
 }
 return s;
}
export function definitions(){
 const defs=[0,1,2].map(kind=>({id:`stone_${kind}`,size:128,paint:(x,y)=>stone(x,y,kind)}));
 defs.push({id:'linen',size:128,paint:linen});
 for(const long of [false,true])for(const embroidered of [false,true])defs.push({id:`hem_${long?'long':'short'}_${embroidered?'gold':'plain'}`,size:256,paint:(x,y)=>hem(x,y,long,embroidered)});
 for(let role=1;role<=11;role++){
  // Ground and figurative roles share sampling density: otherwise normal/MER
  // filtering changes at a module seam even when the analytic ground is identical.
  const size=256;
  defs.push({id:`frontal_${role}`,size,height:role===5?128:256,logicalHeight:84,sampleOffset:0,extendNormals:true,paint:(x,y)=>role===5?frontal(x,y,role):panelPaint(x,y,role)});
 }
 defs.push({id:'frontal_frame',size:128,paint:framePaint});
 return defs;
}
