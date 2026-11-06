/** Materialize the existing Gospel author model for Blender inspection, not a second runtime source. */
import fs from 'node:fs';
import {ATLAS,tiles,authorBook} from '../../design.mjs';
const bones=authorBook().map(b=>({...b,cubes:b.cubes.map((c,i)=>({...c,name:`${b.name} ${i+1}`,faces:c.face??{}}))}));
fs.writeFileSync(new URL('../evangeliarium.author.json',import.meta.url),JSON.stringify({schema:1,name:'evangeliarium',atlasSize:ATLAS,tiles,bones},null,2)+'\n');
