import {STRUCTURES,JOINERY_STRUCTURES,SURFACES,FRONTALS,LITURGICAL_COLORS,SHARED_TEXTILES,designById,sharedDesignFor,textileOf} from './catalog.ts';
import type {Finish,Tile} from './surface.ts';
export const MODELS=['classic',...STRUCTURES,...JOINERY_STRUCTURES,'colonnade'] as const;
export const CLOTHS=SHARED_TEXTILES;
export const CLASSIC_CLOTHS=['none','linen_short','linen_long','gold_short','gold_long'] as const;
export interface Customization {
 model:typeof MODELS[number];surface:typeof SURFACES[number];textile:typeof CLOTHS[number];color:typeof LITURGICAL_COLORS[number];relief:typeof FRONTALS[number];
 stone:number;cloth:number;ornamental:boolean;facing:number;ornateLace:boolean;
}
export function customizationFromFinish(f:Finish):Customization {
 const d=designById(f.design);if(f.design&&!d)throw Error('configuration');
 const textile=d?textileOf(d):CLASSIC_CLOTHS[f.cloth]??'none';
 return {model:d?.structure??'classic',surface:d?.surface??(f.stone===1?'limestone':'marble'),textile,color:d?.palette??'red',relief:d?.frontal??'none',stone:f.stone,cloth:f.cloth>=0&&f.cloth<=4?f.cloth:0,ornamental:f.ornamental,facing:f.facing,ornateLace:textile==='lace'};
}
export function customizationCapabilities(d:Customization){
 const architectural=d.model!=='classic',ornate=d.model==='colonnade',joinery=JOINERY_STRUCTURES.some(s=>s===d.model),color=d.textile==='floral';
 return {architectural,ornate,joinery,color,material:architectural&&!ornate&&!joinery,relief:architectural&&!ornate&&!joinery&&(!color||d.color==='red'),directional:!ornate||['agnus','floral','verdant','requiem'].includes(d.textile)};
}
export function customizationFinish(d:Customization):Finish {
 if(!MODELS.includes(d.model)||!SURFACES.includes(d.surface)||!CLOTHS.includes(d.textile)||!LITURGICAL_COLORS.includes(d.color)||!FRONTALS.includes(d.relief)||!Number.isInteger(d.stone)||d.stone<0||d.stone>2||!Number.isInteger(d.cloth)||d.cloth<0||d.cloth>4||!Number.isInteger(d.facing)||d.facing<0||d.facing>3||typeof d.ornamental!=='boolean'||typeof d.ornateLace!=='boolean')throw Error('configuration');
 const basic=CLASSIC_CLOTHS.indexOf(d.textile as typeof CLASSIC_CLOTHS[number]);
 if(d.model==='classic'&&basic>=0)return {stone:d.stone,cloth:basic,ornamental:d.ornamental,facing:d.facing};
 const caps=customizationCapabilities(d),surface=caps.joinery?'walnut':caps.ornate?'marble':d.surface,relief=caps.relief?d.relief:'none';
 const design=sharedDesignFor(d.model,surface,d.textile,relief,d.color);
 return {stone:d.model==='classic'?d.stone:0,cloth:0,ornamental:d.model==='classic'?d.ornamental:false,facing:design.codec==='symmetric'?0:d.facing,design:design.id};
}
export function changeCustomization(draft:Customization,patch:Partial<Customization>):Customization {
 const next={...draft,...patch};
 // Compatibility for callers of the former controls. New editors use textile.
 if(patch.ornateLace!==undefined&&patch.textile===undefined)next.textile=patch.ornateLace?'lace':'none';
 if(patch.cloth!==undefined&&patch.textile===undefined&&next.model==='classic')next.textile=CLASSIC_CLOTHS[patch.cloth]??next.textile;
 next.ornateLace=next.textile==='lace';customizationFinish(next);return next;
}

/** Centre/contour roles vary within one finish and must not imply mixed choices. */
export function hasMixedFinishes(tiles:readonly Tile[]):boolean {
 const ornamental=tiles.some(t=>t.frontal>0&&(!t.design||designById(t.design)?.structure==='classic'));
 const key=(tile:Tile)=>JSON.stringify(customizationFinish(customizationFromFinish({stone:tile.stone,cloth:tile.cloth,ornamental,facing:tile.facing,...(tile.design?{design:tile.design}:{})})));
 const first=tiles[0];if(!first)return false;
 const initial=key(first);return tiles.some(tile=>key(tile)!==initial);
}
