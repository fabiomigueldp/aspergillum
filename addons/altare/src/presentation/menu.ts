import {CustomForm, ObservableBoolean, ObservableNumber, type UIRawMessage} from '@minecraft/server-ui';
import type {Player, RawMessage} from '@minecraft/server';
import {bounds, type Finish, type Tile} from '../domain/surface.ts';
import {SURFACES, FRONTALS, LITURGICAL_COLORS} from '../domain/catalog.ts';
import {MODELS, CLOTHS, customizationFromFinish, customizationFinish, customizationCapabilities, changeCustomization, type Customization} from '../domain/customization.ts';

export const tr=(key:string):RawMessage=>({translate:`altare.${key}`});
export function tell(player:Player,key:string):void {try{player.onScreenDisplay.setActionBar(tr(key));}catch{/* Presentation never authorizes edits. */}}

export async function chooseFinish(player:Player,tiles:readonly Tile[],facing:number,isCurrent:()=>boolean=()=>true,onRelease:(callback:()=>void)=>()=>void=()=>()=>{}):Promise<Finish|undefined>{
  const tile=tiles[0]!, b=bounds(tiles);
  const initial=customizationFromFinish({stone:tile.stone,cloth:tile.cloth,ornamental:tiles.some(t=>t.frontal>0),facing,...(tile.design?{design:tile.design}:{})});
  let draft=initial, selected:Finish|undefined, updating=false, alive=true;
  const labels=(items:readonly string[],prefix:string)=>items.map((id,value)=>({label:tr(`${prefix}.${id}`) as UIRawMessage,value}));
  const fields={model:MODELS,surface:SURFACES,textile:CLOTHS,color:LITURGICAL_COLORS,relief:FRONTALS,stone:[0,1,2],facing:[0,1,2,3]} as const;
  const values={} as Record<keyof typeof fields,ObservableNumber>;
  for(const key of Object.keys(fields) as (keyof typeof fields)[])values[key]=new ObservableNumber((fields[key] as readonly (string|number)[]).indexOf(draft[key]),{clientWritable:true});
  const ornamental=new ObservableBoolean(draft.ornamental,{clientWritable:true});
  const classic=new ObservableBoolean(false),architectural=new ObservableBoolean(false),color=new ObservableBoolean(false),relief=new ObservableBoolean(false),unavailable=new ObservableBoolean(false),material=new ObservableBoolean(false),joinery=new ObservableBoolean(false),ornate=new ObservableBoolean(false),directional=new ObservableBoolean(true);
  // Dropdown values must be client writable even when the control is disabled or hidden.
  // This display-only selection has no subscription and never enters the finish draft.
  const none=new ObservableNumber(0,{clientWritable:true}),cleanups:(()=>void)[]=[];
  const title:RawMessage={rawtext:[tr('menu.title'),{text:` · ${facing%2?b.maxZ-b.minZ+1:b.maxX-b.minX+1} × ${facing%2?b.maxX-b.minX+1:b.maxZ-b.minZ+1}`}]};
  const form=new CustomForm(player,title);
  function refresh(){
    updating=true;
    try{
      const c=customizationCapabilities(draft);
      classic.setData(!c.architectural);architectural.setData(c.architectural&&!c.ornate);color.setData(c.color);relief.setData(c.relief);unavailable.setData(c.architectural&&!c.relief&&!c.joinery&&!c.ornate);material.setData(c.material);joinery.setData(c.joinery);ornate.setData(c.ornate);directional.setData(c.directional);
      for(const key of Object.keys(fields) as (keyof typeof fields)[])values[key].setData((fields[key] as readonly (string|number)[]).indexOf(draft[key]));
      ornamental.setData(draft.ornamental);
    }finally{updating=false;}
  }
  const update=(patch:Partial<Customization>)=>{
    if(updating||!alive)return;
    if(!isCurrent()){if(form.isShowing())form.close();return;}
    try{draft=changeCustomization(draft,patch);}catch{/* Invalid client values never enter the draft. */}
    refresh();
  };
  for(const key of Object.keys(fields) as (keyof typeof fields)[]){
    const value=values[key],callback=value.subscribe(index=>{
      const item=(fields[key] as readonly (string|number)[])[index];
      if(item===undefined){refresh();return;}update({[key]:item});
    });cleanups.push(()=>value.unsubscribe(callback));
  }
  const onOrnamental=ornamental.subscribe(value=>update({ornamental:value}));cleanups.push(()=>ornamental.unsubscribe(onOrnamental));
  form.header(tr('menu.structure'))
    .dropdown(tr('menu.model'),values.model,labels(MODELS,'structure'))
    .dropdown(tr('menu.surface'),values.surface,labels(SURFACES,'surface'),{visible:material})
    .dropdown(tr('menu.surface'),none,labels(['walnut'],'surface'),{visible:joinery,disabled:true})
    .dropdown(tr('menu.surface'),none,labels(['marble'],'surface'),{visible:ornate,disabled:true})
    .dropdown(tr('menu.surface'),values.stone,labels(['marble','limestone','basalt'],'stone'),{visible:classic})
    .spacer().header(tr('menu.cloth'))
    .dropdown(tr('menu.pattern'),values.textile,labels(CLOTHS,'textile'))
    .dropdown(tr('menu.color'),values.color,labels(LITURGICAL_COLORS,'color'),{visible:color})
    .spacer().header(tr('menu.frontal'),{visible:directional})
    .dropdown(tr('menu.applique'),values.relief,labels(FRONTALS,'applique'),{visible:relief})
    .dropdown(tr('menu.applique'),none,labels(['none'],'applique'),{visible:unavailable,disabled:true,description:tr('menu.relief_limit')})
    .toggle(tr('menu.ornamental'),ornamental,{visible:classic})
    .dropdown(tr('menu.front'),values.facing,labels(['0','1','2','3'],'facing'),{visible:directional})
    .divider().button(tr('menu.apply'),()=>{
      if(!alive||!isCurrent()){if(form.isShowing())form.close();return;}
      selected=customizationFinish(draft);form.close();
    })
    .button(tr('menu.restore'),()=>{if(!alive||!isCurrent())return;draft=initial;refresh();})
    .button(tr('menu.cancel'),()=>form.close());
  refresh();
  if(!isCurrent()){alive=false;for(const cleanup of cleanups)cleanup();return undefined;}
  const unsubscribe=onRelease(()=>{alive=false;if(form.isShowing())form.close();});
  try{await form.show();return isCurrent()?selected:undefined;}
  finally{alive=false;unsubscribe();for(const cleanup of cleanups)cleanup();}
}
