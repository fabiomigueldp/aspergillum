export {ornateGeometry,ornateGeometryName} from './colonnade-model.mjs';
import {colonnadeTextileProfile as textile} from './colonnade-textile.mjs';
const wrap=(x,p)=>(x%p+p)%p;
const stroke=(d,w)=>Math.max(0,1-Math.abs(d)/w);
const line=(x,y,a,b,c,d)=>{const dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a-t*dx,y-b-t*dy);};
const finish=(rgb,metal=0,rough=225,height=0,alpha=255)=>({rgb:rgb.map(v=>Math.max(0,Math.min(255,Math.round(v)))),metal,rough,height,alpha});
export function giltPaint(x,y){
 x=wrap(x,128);y=wrap(y,128);
 const p=Math.PI*2/128,n=Math.sin(x*p*11+y*p*5)+.6*Math.cos(x*p*7-y*p*9),s=5*Math.cos(y*p)+3*Math.sin(x*p);
 return finish([207+s+n,161+s*.85+n,75+s*.45+n],210,142,.045+n*.003);
}
export function columnPaint(x,y){
 x=wrap(x,128);
 // Stopped flutes leave a smooth margin against the foot and astragal.
 // The octagonal shell supplies the silhouette; this is fine stone carving.
 const t=Math.max(0,Math.min(1,Math.min(y,128-y)/12)),stop=t*t*(3-2*t);
 const p=Math.PI*2*x/128,groove=(.5+.5*Math.cos(p*2))*stop,bead=Math.sin(p*4)*1.1*stop;
 return finish([235-12*groove+bead,232-12*groove+bead,222-13*groove+bead],0,218,-.07*groove);
}
export function ornatePanelPaint(x,y){
 const vein=Math.sin(x*.052+y*.071+2*Math.sin(y*.035));
 // The field is unframed stone. Its mouldings now live in the geometry.
 return finish([227+vein*2,223+vein*2,212+vein*3],0,222,.012*vein);
}
export function mouldingPaint(x,y){
 const t=Math.max(0,Math.min(1,y/128));
 const bead=Math.sin(Math.PI*t),arris=Math.exp(-(((t-.14)/.08)**2));
 const s=8*bead+5*arris-9*Math.exp(-(((t-.9)/.1)**2));
 return finish([234+s,230+s,218+s],0,211,.055*bead+.018*arris);
}
export function laceLimit(x){
 const t=wrap(x,textile.repeat)/textile.repeat;
 return textile.hemAtSeam+textile.hemAmplitude*Math.sin(Math.PI*t);
}
// Fine bobbin net supports heavier guipure flowers, leaves and scalloped cords.
// All motifs use physical coordinates: circles remain round on a 4.5-unit fall.
export function lacePaint(x,y){
 x=wrap(x,128);const limit=laceLimit(x),a=wrap(x,32)-16,aspect=textile.drop/16;
 if(y>limit||y<0)return finish([239,237,230],0,237,0,0);
 const Y=y*aspect;
 const net=Math.min(Math.abs(wrap(x+Y,4)-2),Math.abs(wrap(x-Y,4)-2));
 let ground=y<12?1:stroke(net,.42)*.68;
 const topCord=Math.max(stroke(y-13,.85),stroke(y-18,.65));
 let embroidery=topCord;
 const cx=a,cy=(y-56)*aspect,r=Math.hypot(cx,cy),angle=Math.atan2(cy,cx);
 // Eight openwork petals, a pierced centre and fine radial stitching.
 for(let i=0;i<8;i++){
  const t=i*Math.PI/4,px=cx*Math.cos(t)+cy*Math.sin(t),py=-cx*Math.sin(t)+cy*Math.cos(t);
  const oval=Math.hypot((px-4.7)/2.35,py/1.05);
  const petal=stroke(oval-1,.35);
  embroidery=Math.max(embroidery,petal,px>2.4&&px<6.6?stroke(py,.32)*.78:0);
 }
 const centre=stroke(r-1.8,.65);embroidery=Math.max(embroidery,centre);
 if(r<1.1)ground=0;
 // Paired stems and almond leaves connect the rosette to the scalloped hem.
 for(const sign of [-1,1]){
  embroidery=Math.max(embroidery,stroke(line(a,Y,sign*5,19,sign*11,27),.38));
  for(const [lx,ly,t] of [[8,22,-.55],[10,25,.55]]){
   const dx=a-sign*lx,dy=Y-ly,u=dx*Math.cos(t)+dy*Math.sin(t),v=-dx*Math.sin(t)+dy*Math.cos(t);
   const leaf=Math.hypot(u/2.5,v/.9);
   embroidery=Math.max(embroidery,stroke(leaf-1,.3),leaf<.85?.52:0);
  }
 }
 const vine=24.5+2*Math.cos(a*Math.PI/16);embroidery=Math.max(embroidery,stroke(Y-vine,.38));
 const hem=(limit-y)*aspect;
 const cord=Math.max(stroke(hem-.42,.42),stroke(hem-1.25,.24));
 embroidery=Math.max(embroidery,cord);
 // Picot loops stay inside the alpha outline, repeating without clipped ends.
 const picot=Math.hypot(wrap(x,4)-2,hem-.48);
 embroidery=Math.max(embroidery,stroke(picot-.6,.22));
 const thread=Math.max(ground,embroidery),visible=thread>.23;
 const stitch=1.5*Math.cos((x+y*aspect)*Math.PI*2);
 const shade=embroidery>.3?1:.96;
 return finish([236+12*thread+stitch,234+12*thread+stitch,225+15*thread+stitch].map(c=>c*shade),0,237,embroidery>.3?.065:ground*.016,visible?255:0);
}
export const ornateDefinitions=()=>[
 {id:'ornate_panel',size:128,paint:ornatePanelPaint},
 {id:'ornate_gilt',size:32,paint:giltPaint},
 {id:'ornate_lace',size:256,alpha:true,sampleOffset:0,extendNormals:true,paint:lacePaint},
 {id:'ornate_column',size:64,paint:columnPaint},
 {id:'ornate_moulding',size:64,paint:mouldingPaint},
];
