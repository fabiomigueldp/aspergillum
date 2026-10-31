import {normalizeStudioConfig} from '../shared/studio-contract.js';
import {sanctuaryLayout} from './scene-layout.js';

export const ARRANGEMENT_REVISION=3;
export const LITURGICAL_SOURCE='https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_sp.html';

/** Roman Mass staging, in world block units. Dimensions come from the imported meshes. */
export function planLiturgy(input,catalog){
 const c=normalizeStudioConfig(input),placements=[],linens=[],supports=[];
 const plan={revision:ARRANGEMENT_REVISION,moment:c.dressing,candleCount:0,placements,linens,supports,active:false,notes:[],source:LITURGICAL_SOURCE};
 if(c.dressing==='none'||c.environment==='transparent')return plan;
 if(c.textile==='none'){plan.notes.push('A montagem litúrgica requer toalha.');return plan;}
 const entries=new Map(catalog.assets.map(a=>[a.id,a]));
 const size=id=>{const a=entries.get(id);if(!a?.size)throw Error(`Objeto local indisponível: ${id}. Sincronize os packs de origem ou escolha Só altar.`);return a.size;};
 const place=(id,position,support,role)=>{size(id);placements.push({id,position,support,role,size:size(id),yaw:0,scale:1});};
 const w=c.width,d=c.depth,top=1.018,layout=sanctuaryLayout(w,d);
 plan.active=true;
 // The cross belongs to the apse, outside the celebrant's working area.
 const crossCell=layout.crossCell,crossZ=crossCell+.5-d/2;
 place('wood-crucifix',[0,0,crossZ],'pedestal','crucifix');
 const pairs=Math.floor(c.candles/2);
 const candle=c.furnishing==='wood'?'floor-candle-1':'candlestick-table';
 const step=size(candle)[0]+.12;
 const onTable=c.candlePlacement==='mensa'&&w/2-.12-size(candle)[0]-(pairs-1)*step>=.65&&d>=size(candle)[2]+.2;
 if(c.candlePlacement==='mensa'&&!onTable)plan.notes.push('Os castiçais escolhidos não cabem nos extremos da mesa; foram colocados nas laterais do chão.');
 for(const side of [-1,1])for(let i=0;i<pairs;i++){
  if(onTable){place(candle,[side*(w/2-.12-size(candle)[0]/2-i*step),top,-d/2+.12+size(candle)[2]/2],'altar','candle');continue;}
  const x=side*(w/2+.72+i*step);
  place(candle,[x,0,0],'platform','candle');
 }
 // The seventh candle is opt-in and explicitly labelled for the diocesan bishop.
 // Axial candle remains below the corpus and leaves walking space behind the mensa.
 if(c.candles===7)place(candle,[0,0,d/2+2.25],'platform','candle');
 plan.candleCount=placements.filter(p=>p.role==='candle').reduce((n,p)=>n+(entries.get(p.id).flames??0),0);
 if(plan.candleCount!==c.candles)throw Error('Contagem de chamas incompatível com a montagem.');
 plan.candlesOnAltar=onTable;

 // The credence shares the sanctuary floor and has its own lateral zone.
 const credence=layout.credence,credenceTop=credence[1]+1;
 plan.credence={position:credence,width:2,depth:1,top:credenceTop};
 linens.push({role:'credence-cloth',position:[credence[0],credenceTop+.009,credence[2]],size:[1.95,.008,.95]});
 if(c.dressing==='ready'){
  place('gospel',[0,top,0],'altar','gospel');
  place('chalice',[credence[0]-.56,credenceTop+.014,credence[2]],'credence','vessel');
  place('paten',[credence[0],credenceTop+.014,credence[2]],'credence','vessel');
  place('ciborium',[credence[0]+.56,credenceTop+.014,credence[2]],'credence','vessel');
 }else{
  // Actual Evangeliarium is never presented as a missal. This is a vessel arrangement study.
  const z=Math.max(0,d/2-.65),y=top+.009;
  linens.push({role:'corporal',position:[w>=2?.125:0,top+.004,z],size:[w>=2?1.25:.86,.008,.86]});
  place('chalice-wine',[-.22,y,z+.13],'corporal','vessel');
  place('paten-bread',[.17,y,z-.17],'corporal','vessel');
  if(w>=2)place('ciborium-open',[.60,y,z+.1],'corporal','vessel');
  else place('ciborium',[credence[0],credenceTop+.014,credence[2]],'credence','vessel');
  plan.notes.push('Estudo dos vasos sobre o corporal. A biblioteca ainda não inclui missal, pala e purificatório.');
 }
 // Ornament is lateral; flowers never occupy the mensa. Lent has no flowers.
 const flowerSides=c.season==='lent'?[]:c.season==='advent'?[-1]:[-1,1];
 for(const side of flowerSides){
  // Integer-block pedestal centre, outside both the walking space and candle bases.
  const cellX=side<0?-2:w+2,cellZ=d+4;
  supports.push({x:cellX,z:cellZ,role:'flower-tray'});
  place('flowers-white',[cellX-w/2,.125,cellZ-d/2],'planter','flowers');
 }
 const statueX=layout.statueCell+.5-w/2,statueZ=crossZ;
 supports.push({x:layout.statueCell,z:crossCell,height:2,role:'image'});
 place('aparecida',[statueX,1,statueZ],'pedestal','image');
 return plan;
}
