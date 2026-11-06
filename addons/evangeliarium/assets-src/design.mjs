/** Original cuboid construction and texel artwork. One source for held, open and closed book. */
export const ATLAS=256;
export const tiles={front:[2,2,64,96],back:[70,2,64,96],leftPage:[138,2,52,88],rightPage:[194,2,52,88],spine:[2,104,16,96],edge:[22,104,64,12],leather:[22,122,16,16],gold:[42,122,16,16],paper:[62,122,16,16],ribbon:[82,122,8,48],lining:[94,104,52,88],edgeTall:[234,104,12,96],hinge:[214,118,16,16]};
const glyphs=[
 ['0000011110000000','0000111111000000','1000011110000001','1100001100000011','1110011110000111','0111111111111110','0011111111111100','0000111111000000','0000111111000000','0001111111100000','0011101101110000','0111001100111000','0110001100011000','0000110011000000','0001100001100000','0011000000110000'],
 ['0000000111100000','0000001111110000','0000011101111000','0000011111111000','0111111111100000','1101111111000000','1001111111111100','1001111111111110','1101111111110110','0111111111110011','0011100001110011','0011000000110000','0011000000110000','0111000001110000','1111000011110000','0000000000000000'],
 ['0001000000001000','0011000000001100','0111000000001110','0011110000111100','0001111111111000','0000111111110000','0001110110111000','0011111111111100','0011111111111100','0111111111111110','0111001111001110','0011000110001100','0011100000011100','0011000000001100','0111000000001110','0000000000000000'],
 ['0000000111100000','0000001111110000','1000000111000001','1100000110000011','1110001111000111','1111011111101111','0111111111111110','0011111111111100','0001111111111000','0000111111110000','0000011111100000','0000011111100000','0000110110110000','0001100110011000','0011000110001100','0000000000000000']
];
const noise=(x,y)=>((x*73+y*179+(x*y*19))%17)-8;
const rgba=(rgb,metal=0,rough=185,height=0)=>({rgb,metal,rough,height});
export function paint(id,x,y,w,h){
 const n=noise(x,y);
 const leather=rgba([65+n/2,18+n/4,29+n/3],0,205,n/140);
 const gold=rgba([181+n,132+n,54+n/2],240,110,0);
 if(id==='gold')return gold;
 if(id==='hinge')return rgba([36+n/4,27+n/4,25+n/4],0,235,0);
 if(id==='paper'||id==='edge'||id==='edgeTall'){
  const line=(id==='edgeTall'?x:y)%3===0&&id!=='paper';
  return rgba([224+n/3,213+n/3,183+n/3].map(v=>Math.round(v-(line?12:0))),0,225,0);
 }
 if(id==='ribbon')return rgba(x===1||x===w-2?[204,160,69]:[108+n,23,34],x===1?100:0,150,0.2);
 if(id==='leather')return leather;
 if(id==='front'||id==='back'){
  const frame=(x===3||x===w-4)&&y>=4&&y<h-4||(y===4||y===h-5)&&x>=3&&x<w-3;
  const inner=(x===6||x===w-7)&&y>=7&&y<h-7||(y===7||y===h-8)&&x>=6&&x<w-6;
  if(frame||inner)return gold;
  if(id==='front'){
   for(let i=0;i<4;i++){
    const xx=x-(i%2?40:8), yy=y-(i<2?13:65);
    if(xx>=0&&xx<16&&yy>=0&&yy<16&&glyphs[i][yy][xx]==='1')return gold;
   }
   const dx=Math.abs(x-31.5),dy=Math.abs(y-47.5);
   if(dx+dy>16&&dx+dy<18)return gold;
  }else if((Math.abs(x-32)<2&&Math.abs(y-47)<14)||(Math.abs(y-42)<2&&Math.abs(x-32)<9))return gold;
  return leather;
 }
 if(id==='spine'){
  if([8,10,27,29,66,68,85,87].includes(y)&&x>1&&x<w-2)return gold;
  if((x===2||x===w-3)&&y>5&&y<h-5)return gold;
  return leather;
 }
 if(id==='lining')return rgba([98+n/2,38+n/3,43+n/3],0,220,0);
 if(id==='leftPage'||id==='rightPage'){
  const gutter=id==='leftPage'?w-1-x:x;
  let c=[235,226,202].map(v=>v+n/5-Math.max(0,6-gutter)*2.5);
  const line=(y-15)%4;
  if(y>=15&&y<h-12&&x>=7&&x<w-7&&line===0){
   const cutoff=7+((Math.floor(y/4)*13)%12);
   if(x<w-cutoff&&((x+Math.floor(y/4)*5)%13!==0))c=y<20?[134,42,44]:[88,73,54];
  }
  if(y===9&&x>=16&&x<=36)c=[137,44,45];
  if(x>=7&&x<=12&&y>=15&&y<=23&&(x===7||y===15||y===19))c=[137,44,45];
  if(y===h-7&&(x===w/2||x===w/2+1))c=[100,81,59];
  return rgba(c,0,220,0);
 }
 throw Error(id);
}
export function authorBook(){
 const bones=[{name:'spine',parent:'book_action',pivot:[0,0,0],cubes:[]},
  {name:'binding_shell',parent:'spine',pivot:[.05,0,.37],cubes:[]},
  {name:'back_cover',parent:'spine',pivot:[0,0,0],cubes:[]},
  {name:'front_cover',parent:'spine',pivot:[0,0,0],cubes:[]},
  {name:'right_pages',parent:'back_cover',pivot:[0,0,0],cubes:[]},
  {name:'left_pages',parent:'front_cover',pivot:[0,0,0],cubes:[]},
  {name:'ribbons',parent:'right_pages',pivot:[0,6.8,0],cubes:[]},
  {name:'ribbon_tips',parent:'ribbons',pivot:[0,.18,-.012],cubes:[]}];
 for(const color of ['red','green','gold','blue','violet'])bones.push({name:`ribbon_tip_${color}`,parent:'ribbon_tips',pivot:[0,.18,color==='red'?.12:color==='gold'?.24:.20],cubes:[]});
 const add=(bone,origin,size,surface,face)=>bones.find(b=>b.name===bone).cubes.push({origin,size,surface,...(face?{face}: {})});
 // Leather turns over the short end caps; do not squash the full spine art here.
 add('binding_shell',[-.16,-.02,-.49],[.24,7.04,.98],'spine',{up:'leather',down:'leather'});
 add('back_cover',[0,0,.37],[5,7,.18],'leather',{south:'back',north:'lining'});
 add('front_cover',[0,0,-.55],[5,7,.18],'leather',{north:'front',south:'lining'});
 for(const bone of ['front_cover','back_cover']){
  const front=bone==='front_cover';const z=front?-.62:.55;
  for(const x of [.08,4.37])for(const y of [.08,6.37]){
    add(bone,[x,y+(y>1?.4:0),z],[.55,.15,.07],'gold');
    // Butt-jointed L: never overlap outward faces at the corner.
    add(bone,[x+(x>1?.4:0),y+(y>1?0:.15),z],[.15,.40,.07],'gold');
  }
 }
 // Central gold cross is actual low relief. Four symbols live in the stamped cover texture.
 add('front_cover',[2.36,2.12,-.65],[.28,2.9,.1],'gold');
 add('front_cover',[1.55,3.98,-.65],[.81,.26,.1],'gold');
 add('front_cover',[2.64,3.98,-.65],[.81,.26,.1],'gold');
 for(const y of [.7,2.0,4.8,6.1])add('binding_shell',[-.22,y,-.49],[.06,.16,.98],'gold');
 add('right_pages',[.16,.17,.035],[4.64,6.66,.30],'edge',{north:'rightPage',east:'edgeTall',west:'edgeTall'});
 add('left_pages',[.16,.17,-.335],[4.64,6.66,.30],'edge',{south:'leftPage',east:'edgeTall',west:'edgeTall'});
 // Small graduated leaves retain depth at the fold without coincident faces.
 for(let j=0;j<3;j++){
  const top=.055-j*.01;
  add('right_pages',[.07+j*.03,.2,top],[.03,6.6,.335-top],'paper');
  add('left_pages',[.07+j*.03,.2,-.335],[.03,6.6,.335-top],'paper');
 }
 add('spine',[-.05,.2,.055],[.10,6.6,.075],'hinge');
 for(const [color,x,bottom,depth] of [['red',1.05,-.12,.12],['gold',2.83,-.20,.24]]){
  add('ribbons',[x,.18,depth],[.10,6.59,.020],'ribbon');
  add(`ribbon_tip_${color}`,[x,bottom,depth],[.10,.18-bottom,.020],'ribbon');
 }
 return bones;
}
export function geometry(kind){
 const held=kind==='held';const offset=held?[-6,24,1]:[0,0,0];
 const shift=v=>v.map((n,i)=>n+offset[i]);
 const source=authorBook();
 if(kind==='open')for(const c of source.find(b=>b.name==='binding_shell').cubes){c.origin[0]= .05+(c.origin[0]-.05)*.3;c.size[0]*=.3;}
 const bones=source.map(b=>({...b,pivot:shift(b.pivot),cubes:b.cubes.map(c=>{
  const uv=Object.fromEntries(['north','south','east','west','up','down'].map(f=>{const t=tiles[c.face?.[f]??c.surface];return[f,{uv:t.slice(0,2),uv_size:t.slice(2)}];}));
  return{origin:shift(c.origin),size:c.size,uv};
 })}));
 if(held)bones.unshift({name:'evangeliarium_bound',pivot:[0,0,0],binding:'q.item_slot_to_bone_name(context.item_slot)'},{name:'book_presentation',parent:'evangeliarium_bound',pivot:offset},{name:'book_action',parent:'book_presentation',pivot:offset});
 else{
  bones.unshift({name:'book_presentation',pivot:[0,0,0],rotation:[-90,0,0]}, {name:'book_action',parent:'book_presentation',pivot:[0,0,0]});
  // Bedrock's authored pitch sign differs from Three.js; pages face upward.
  bones[0].pivot=[0,.68,-3.5];
  for(const b of bones.slice(1)){b.pivot[1]+=.68;b.pivot[2]-=3.5;for(const c of b.cubes??[]){c.origin[1]+=.68;c.origin[2]-=3.5;}}
  if(kind==='open')for(const [name,rotation] of [['front_cover',[0,177,0]],['binding_shell',[0,90,0]],['ribbon_tips',[0,0,0]]])bones.find(b=>b.name===name).rotation=rotation;
  if(kind==='open')for(const b of bones)if(b.name.startsWith('ribbon_tip_'))b.rotation=[18,0,0];
 }
 return{format_version:'1.16.0','minecraft:geometry':[{description:{identifier:`geometry.evangeliarium.${kind}`,texture_width:ATLAS,texture_height:ATLAS,visible_bounds_width:2,visible_bounds_height:2.5,visible_bounds_offset:[0,.5,0]},bones}]};
}
