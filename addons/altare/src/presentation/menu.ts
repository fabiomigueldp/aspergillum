import {CustomForm, ObservableBoolean, ObservableNumber, ObservableUIRawMessage, type UIRawMessage} from '@minecraft/server-ui';
import type {Player, RawMessage} from '@minecraft/server';
import {bounds, type Finish, type Tile} from '../domain/surface.ts';
import {SURFACES, FRONTALS, LITURGICAL_COLORS, designById} from '../domain/catalog.ts';
import {MODELS, CLOTHS, customizationFromFinish, customizationFinish, customizationCapabilities, changeCustomization, type Customization} from '../domain/customization.ts';

export const tr=(key:string):RawMessage=>({translate:`altare.${key}`});
export function tell(player:Player,key:string):void {try{player.onScreenDisplay.setActionBar(tr(key));}catch{/* Presentation never authorizes edits. */}}

export async function chooseFinish(player:Player,tiles:readonly Tile[],facing:number,isCurrent:()=>boolean=()=>true,onRelease:(callback:()=>void)=>()=>void=()=>()=>{}):Promise<Finish|undefined>{
  const tile=tiles[0]!, b=bounds(tiles);
  // Architectural frontal values are centre roles, not the classic Guadalupe.
  // Universal classic textiles keep the icon in frontal and cloth in textileRole.
  const ornamentalOnOpen=tiles.some(t=>t.frontal>0&&(!t.design||designById(t.design)?.structure==='classic'));
  const initial=customizationFromFinish({stone:tile.stone,cloth:tile.cloth,ornamental:ornamentalOnOpen,facing,...(tile.design?{design:tile.design}:{})});
  let draft=initial, selected:Finish|undefined, updating=false, alive=true;
  const labels=(items:readonly string[],prefix:string)=>items.map((id,value)=>({label:tr(`${prefix}.${id}`) as UIRawMessage,value}));
  const fields={model:MODELS,surface:SURFACES,textile:CLOTHS,color:LITURGICAL_COLORS,relief:FRONTALS,stone:[0,1,2],facing:[0,1,2,3]} as const;
  const values={} as Record<keyof typeof fields,ObservableNumber>;
  for(const key of Object.keys(fields) as (keyof typeof fields)[])values[key]=new ObservableNumber((fields[key] as readonly (string|number)[]).indexOf(draft[key]),{clientWritable:true});
  const ornamental=new ObservableBoolean(draft.ornamental,{clientWritable:true});
  const classic=new ObservableBoolean(false),color=new ObservableBoolean(false),relief=new ObservableBoolean(false),unavailable=new ObservableBoolean(false),material=new ObservableBoolean(false),joinery=new ObservableBoolean(false),ornate=new ObservableBoolean(false),directional=new ObservableBoolean(true);
  // Fixed materials and unavailable choices are read-only labels, not inputs.
  const unchanged=new ObservableBoolean(true),cleanups:(()=>void)[]=[];
  const titleFor=(front:number):UIRawMessage=>({rawtext:[tr('menu.title'),{text:` · ${front%2?b.maxZ-b.minZ+1:b.maxX-b.minX+1} × ${front%2?b.maxX-b.minX+1:b.maxZ-b.minZ+1}`}]});
  // Dimensions follow the draft front; a temporarily hidden front stays in
  // the draft for the next directional cloth, just like its control value.
  // Server-owned presentation only: changing the title never edits the world.
  const title=new ObservableUIRawMessage(titleFor(draft.facing));let titleFacing=draft.facing;
  const form=new CustomForm(player,title);
  function refresh(){
    updating=true;
    try{
      const c=customizationCapabilities(draft);
      if(draft.facing!==titleFacing){title.setData(titleFor(draft.facing));titleFacing=draft.facing;}
      classic.setData(!c.architectural);color.setData(c.color);relief.setData(c.relief);unavailable.setData(c.architectural&&!c.relief&&!c.joinery&&!c.ornate);material.setData(c.material);joinery.setData(c.joinery);ornate.setData(c.ornate);directional.setData(c.directional);
      for(const key of Object.keys(fields) as (keyof typeof fields)[])values[key].setData((fields[key] as readonly (string|number)[]).indexOf(draft[key]));
      ornamental.setData(draft.ornamental);
      unchanged.setData((Object.keys(initial) as (keyof Customization)[]).every(key=>draft[key]===initial[key]));
    }finally{updating=false;}
  }
  const close=()=>{
    if(!alive)return;
    alive=false;
    try{if(form.isShowing())form.close();}
    // Engine errors can leave the native screen open; let the user retry.
    catch(error){alive=form.isShowing();throw error;}
  };
  const editable=()=>{
    if(!alive||!form.isShowing())return false;
    if(!isCurrent()){close();return false;}
    return true;
  };
  const update=(patch:Partial<Customization>)=>{
    if(updating||!editable())return;
    try{draft=changeCustomization(draft,patch);}catch{/* Invalid client values never enter the draft. */}
    refresh();
  };
  for(const key of Object.keys(fields) as (keyof typeof fields)[]){
    const value=values[key],callback=value.subscribe(index=>{
      if(updating||!editable())return;
      const item=(fields[key] as readonly (string|number)[])[index];
      if(item===undefined){refresh();return;}update({[key]:item});
    });cleanups.push(()=>value.unsubscribe(callback));
  }
  const onOrnamental=ornamental.subscribe(value=>update({ornamental:value}));cleanups.push(()=>ornamental.unsubscribe(onOrnamental));
  form.label(tr('menu.scope')).header(tr('menu.structure'))
    .dropdown(tr('menu.model'),values.model,labels(MODELS,'structure'))
    .dropdown(tr('menu.surface'),values.surface,labels(SURFACES,'surface'),{visible:material})
    .label(tr('menu.material_walnut'),{visible:joinery})
    .label(tr('menu.material_marble'),{visible:ornate})
    .dropdown(tr('menu.surface'),values.stone,labels(['marble','limestone','basalt'],'stone'),{visible:classic})
    .spacer().header(tr('menu.cloth'))
    .dropdown(tr('menu.pattern'),values.textile,labels(CLOTHS,'textile'))
    .dropdown(tr('menu.color'),values.color,labels(LITURGICAL_COLORS,'color'),{visible:color})
    .spacer({visible:directional}).header(tr('menu.frontal'),{visible:directional})
    .dropdown(tr('menu.applique'),values.relief,labels(FRONTALS,'applique'),{visible:relief})
    .label(tr('menu.relief_limit'),{visible:unavailable})
    .toggle(tr('menu.ornamental'),ornamental,{visible:classic})
    .dropdown(tr('menu.front'),values.facing,labels(['0','1','2','3'],'facing'),{visible:directional,description:tr('menu.front_help')})
    .divider().button(tr('menu.apply'),()=>{
      if(!editable())return;
      // A failed dismissal must never leave a finish for a later Cancel.
      const finish=customizationFinish(draft);close();selected=finish;
    })
    // Apply stays enabled: reapplying also recentres an altar after placement.
    .button(tr('menu.restore'),()=>{if(!editable())return;draft=initial;refresh();},{disabled:unchanged})
    .button(tr('menu.cancel'),()=>{if(alive)close();});
  refresh();
  if(!isCurrent()){alive=false;for(const cleanup of cleanups)cleanup();return undefined;}
  const unsubscribe=onRelease(close);
  try{await form.show();return isCurrent()?selected:undefined;}
  finally{alive=false;unsubscribe();for(const cleanup of cleanups)cleanup();}
}
