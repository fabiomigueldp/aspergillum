import {nativePedestalStudyBudget} from '../assets-src/atelier/twin-pedestal-recipe-study.mjs';
import {colonnadeBudget} from '../assets-src/atelier/colonnade-model.mjs';
import {pilasterBudget} from '../assets-src/atelier/pilaster-model.mjs';
import {ogiveBudget} from '../assets-src/atelier/ogive-model.mjs';

// This exception is diagnostic and deliberately narrow. Keep the original
// warning in the release report; errors and every other warning still fail.
export function diagnosticColonnadeWarning(line,readGeometry){
 const match=/^GEOMETRY,501,"Warning","","More than 50 cubes in custom blocks may lead to degraded performance\. Cubes used",(\d+),"\/Altare_RP\/models\/blocks\/((?:ornate_colonnade_(?:bare|lace)|universal_colonnade_(?:linen_short|linen_long|gold_short|gold_long|agnus|ruby|verdant|requiem))_e(?:[0-9]|1[0-5]))\.geo\.json",?$/.exec(line);
 if(!match)return false;
 const [,reported,name]=match,g=readGeometry(name)['minecraft:geometry'][0];
 if(g.description.identifier!==`geometry.altare.${name}`)return false;
 const cubes=g.bones.flatMap(b=>b.cubes??[]),quads=cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0);
 return cubes.length===Number(reported)&&cubes.length>50&&cubes.length<=colonnadeBudget.cubes&&quads<=colonnadeBudget.quads;
}

export function diagnosticPilasterWarning(line,readGeometry){
 const match=/^GEOMETRY,501,"Warning","","More than 50 cubes in custom blocks may lead to degraded performance\. Cubes used",(\d+),"\/Altare_RP\/models\/blocks\/((?:atelier|universal)_pilaster_(?:none|agnus|ruby|verdant|requiem|linen_short|linen_long|gold_short|gold_long|lace)_(?:none|cross|agnus)_[0-3](?:_e(?:[0-9]|1[0-5]))?)\.geo\.json",?$/.exec(line);
 if(!match)return false;
 const [,reported,name]=match,g=readGeometry(name)['minecraft:geometry'][0];
 if(g.description.identifier!==`geometry.altare.${name}`)return false;
 const cubes=g.bones.flatMap(b=>b.cubes??[]),quads=cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0);
 return cubes.length===Number(reported)&&cubes.length>50&&cubes.length<=pilasterBudget.cubes&&quads<=pilasterBudget.quads;
}

export function diagnosticOgiveWarning(line,readGeometry){
 const match=/^GEOMETRY,501,"Warning","","More than 50 cubes in custom blocks may lead to degraded performance\. Cubes used",(\d+),"\/Altare_RP\/models\/blocks\/((?:atelier|universal)_ogive_(?:none|agnus|ruby|verdant|requiem|linen_short|linen_long|gold_short|gold_long|lace)_(?:none|cross|agnus)_[0-3](?:_e(?:[0-9]|1[0-5]))?)\.geo\.json",?$/.exec(line);
 if(!match)return false;
 const [,reported,name]=match,g=readGeometry(name)['minecraft:geometry'][0];
 if(g.description.identifier!==`geometry.altare.${name}`)return false;
 const cubes=g.bones.flatMap(b=>b.cubes??[]),quads=cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0);
 return cubes.length===Number(reported)&&cubes.length>50&&cubes.length<=ogiveBudget.cubes&&quads<=ogiveBudget.quads;
}

export function diagnosticNativePedestalWarning(line,readGeometry){
 const match=/^GEOMETRY,501,"Warning","","More than 50 cubes in custom blocks may lead to degraded performance\. Cubes used",(\d+),"\/Altare_RP\/models\/blocks\/(native_twin_[a-f0-9]{24})\.geo\.json",?$/.exec(line);
 if(!match)return false;
 const [,reported,name]=match,g=readGeometry(name)['minecraft:geometry'][0];
 if(g.description.identifier!==`geometry.altare.${name}`)return false;
 const cubes=g.bones.flatMap(b=>b.cubes??[]),quads=cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0);
 return cubes.length===Number(reported)&&cubes.length>50&&cubes.length<=nativePedestalStudyBudget.cubes&&quads<=nativePedestalStudyBudget.quads;
}

export function diagnosticGeometryWarning(line,readGeometry){
 return diagnosticNativePedestalWarning(line,readGeometry)||diagnosticColonnadeWarning(line,readGeometry)||diagnosticPilasterWarning(line,readGeometry)||diagnosticOgiveWarning(line,readGeometry);
}
