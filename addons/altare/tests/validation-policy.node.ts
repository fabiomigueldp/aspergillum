import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticColonnadeWarning,diagnosticGeometryWarning,diagnosticOgiveWarning} from '../tools/validation-policy.mjs';
import {ornateGeometry} from '../assets-src/atelier/ornate.mjs';
import {atelierGeometry} from '../assets-src/atelier/geometry.mjs';
const doc=()=>ornateGeometry(true,15).doc;
const row=(count:number)=>`GEOMETRY,501,"Warning","","More than 50 cubes in custom blocks may lead to degraded performance. Cubes used",${count},"/Altare_RP/models/blocks/ornate_colonnade_lace_e15.geo.json",`;
const count=(d:any)=>d['minecraft:geometry'][0].bones.flatMap((b:any)=>b.cubes).length;
test('diagnostic warning policy retains only the verified colonnade complexity warning',()=>{
 const d=doc();assert.equal(diagnosticColonnadeWarning(row(count(d)),()=>d),true);
 for(const style of ['linen_short','linen_long','gold_short','gold_long','agnus','ruby','verdant','requiem']){
  const name=`universal_colonnade_${style}_e15`;d['minecraft:geometry'][0].description.identifier=`geometry.altare.${name}`;
  assert.equal(diagnosticColonnadeWarning(row(count(d)).replace('ornate_colonnade_lace_e15',name),()=>d),true);
 }
 assert.equal(diagnosticColonnadeWarning(row(count(d)).replace('ornate_colonnade_lace_e15','universal_colonnade_unknown_e15'),()=>d),false);
});

test('pilaster complexity warnings require the published identity, measured mesh and bounded face count',()=>{
 const name='universal_pilaster_lace_cross_0_e15',d=atelierGeometry('pilaster','lace','cross',0,15).doc;
 d['minecraft:geometry'][0].description.identifier=`geometry.altare.${name}`;
 const line=row(count(d)).replace('ornate_colonnade_lace_e15',name);
 assert.equal(diagnosticGeometryWarning(line,()=>d),true);
 for(const edited of [line.replace(',501,',',500,'),line.replace('"Warning"','"Error"'),line.replace('_e15.geo','_e16.geo'),line.replace('_lace_', '_unknown_'),line.replace(`,${count(d)},`,`,${count(d)+1},`)])assert.equal(diagnosticGeometryWarning(edited,()=>d),false);
 const over=structuredClone(d);over['minecraft:geometry'][0].bones[0].cubes.push(...Array.from({length:10},()=>structuredClone(over['minecraft:geometry'][0].bones[0].cubes[0])));
 assert.equal(diagnosticGeometryWarning(row(count(over)).replace('ornate_colonnade_lace_e15',name),()=>over),false);
 const faces=structuredClone(d);for(const b of faces['minecraft:geometry'][0].bones)for(const c of b.cubes??[]){const uv=Object.values(c.uv).find(Boolean);for(const side of ['up','down','north','east','south','west'])c.uv[side]=structuredClone(uv);}
 assert.equal(diagnosticGeometryWarning(line,()=>faces),false);
 d['minecraft:geometry'][0].description.identifier='geometry.altare.other';assert.equal(diagnosticGeometryWarning(line,()=>d),false);
});
test('changed warning types, severity, paths and counts cannot enter the exception',()=>{
 const d=doc(),line=row(count(d));
 for(const edited of [line.replace(',501,',',500,'),line.replace('"Warning"','"Error"'),line.replace('ornate_colonnade_lace_e15','atelier_ogive_agnus_none_0'),line.replace('e15.geo','e16.geo'),row(count(d)+1)])assert.equal(diagnosticColonnadeWarning(edited,()=>d),false);
});
test('ogive exception checks severity, exact count, identity, contour and the independent face ceiling',()=>{
 const name='atelier_ogive_agnus_cross_0_e15',d=atelierGeometry('ogive','agnus','cross',0,15).doc;
 const line=row(count(d)).replace('ornate_colonnade_lace_e15',name);assert.equal(diagnosticOgiveWarning(line,()=>d),true);
 for(const edited of [line.replace(',501,',',500,'),line.replace('"Warning"','"Error"'),line.replace('_e15.geo','_e16.geo'),line.replace('_agnus_', '_unknown_'),line.replace(`,${count(d)},`,`,${count(d)+1},`)])assert.equal(diagnosticGeometryWarning(edited,()=>d),false);
 const over=structuredClone(d);over['minecraft:geometry'][0].bones[0].cubes.push(...Array.from({length:113},()=>structuredClone(over['minecraft:geometry'][0].bones[0].cubes[0])));
 assert.equal(diagnosticGeometryWarning(row(count(over)).replace('ornate_colonnade_lace_e15',name),()=>over),false);
 const faces=structuredClone(d);for(const b of faces['minecraft:geometry'][0].bones)for(const c of b.cubes??[]){const uv=Object.values(c.uv).find(Boolean);for(const side of ['up','down','north','east','south','west'])c.uv[side]=structuredClone(uv);}
 assert.equal(diagnosticGeometryWarning(line,()=>faces),false);
 d['minecraft:geometry'][0].description.identifier='geometry.altare.other';assert.equal(diagnosticGeometryWarning(line,()=>d),false);
});
test('the diagnostic exception cannot admit an over-budget geometry or a mismatched identity',()=>{
 let d=doc(),g=d['minecraft:geometry'][0];g.bones[0].cubes.push(...Array.from({length:10},()=>structuredClone(g.bones[0].cubes[0])));
 assert.equal(diagnosticColonnadeWarning(row(count(d)),()=>d),false);
 d=doc();g=d['minecraft:geometry'][0];
 for(const b of g.bones.filter((b:any)=>b.name.startsWith('columns_')))for(const c of b.cubes)c.uv.up=structuredClone(Object.values(c.uv).find(Boolean));
 assert.equal(diagnosticColonnadeWarning(row(count(d)),()=>d),false);
 d=doc();d['minecraft:geometry'][0].description.identifier='geometry.altare.other';
 assert.equal(diagnosticColonnadeWarning(row(count(d)),()=>d),false);
});


test('native pedestal warning requires exact content-addressed identity, measured count and face budget',()=>{
 const name='native_twin_'+'a'.repeat(24),d:any={'minecraft:geometry':[{description:{identifier:`geometry.altare.${name}`},bones:[{name:'body',cubes:Array.from({length:51},()=>({uv:{north:{uv:[0,0],uv_size:[1,1]}}}))}]}]};
 const line=row(51).replace('ornate_colonnade_lace_e15',name);
 assert.equal(diagnosticGeometryWarning(line,()=>d),true);
 for(const changed of [line.replace(',501,',',500,'),line.replace('"Warning"','"Error"'),line.replace(',51,',',52,'),line.replace(name,'native_twin_bad')])assert.equal(diagnosticGeometryWarning(changed,()=>d),false);
 const tooMany=structuredClone(d);tooMany['minecraft:geometry'][0].bones[0].cubes.push(...Array.from({length:10},()=>({uv:{north:{}}})));
 assert.equal(diagnosticGeometryWarning(row(61).replace('ornate_colonnade_lace_e15',name),()=>tooMany),false);
 const tooManyFaces=structuredClone(d);for(const c of tooManyFaces['minecraft:geometry'][0].bones[0].cubes)for(const side of ['south','east','west'])c.uv[side]={};
 assert.equal(diagnosticGeometryWarning(line,()=>tooManyFaces),false);
});
