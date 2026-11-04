import {normalizeStudioConfig,migrateStudioConfig,validateStudioCamera} from './studio-contract.js';
import {studioCustomization,studioAppearance} from './altar-customization.js';

// This schema belongs only to Studio files/browser storage, never to Bedrock saves.
export const STUDIO_SCENE_SCHEMA=3;
// Older controllers autosave defaults when they encounter an unknown scene schema.
// Keep their storage key intact so rollback cannot overwrite the newer scene.
export const STUDIO_STORAGE_KEY='bedrock-studio.altare.v3';
export const LEGACY_STUDIO_STORAGE_KEY='bedrock-studio.altare';
const draftFields=['model','surface','textile','color','relief','stone','cloth','ornamental','facing','ornateLace'];
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

function validateDraft(input,config){
 if(!isRecord(input)||draftFields.some(key=>!Object.hasOwn(input,key)))throw Error('Escolhas do editor inválidas.');
 // Copy only scalar domain fields; imported metadata/prototypes never enter editor state.
 const draft=Object.fromEntries(draftFields.map(key=>[key,input[key]]));
 let appearance;
 try{appearance=studioAppearance(draft);}catch{throw Error('Escolhas do editor inválidas.');}
 if(draft.facing!==0||draft.ornateLace!==(draft.textile==='lace'))throw Error('Escolhas do editor inválidas.');
 // Compare effective appearance: old Classic scenes may carry an unused frontal.
 const expected=normalizeStudioConfig({...config,...studioAppearance(studioCustomization(config))});
 const projected=normalizeStudioConfig({...config,...appearance});
 if(Object.keys(expected).some(key=>projected[key]!==expected[key]))throw Error('Escolhas do editor incompatíveis com a cena.');
 return draft;
}

export function createStudioSceneState(input,draft){
 const config=normalizeStudioConfig(input);
 return {schema:STUDIO_SCENE_SCHEMA,config,draft:validateDraft(draft,config)};
}

export function restoreStudioSceneState(saved,{allowLegacySchema=false}={}){
 if(!isRecord(saved)||!isRecord(saved.config))throw Error('Arquivo de cena incompatível.');
 const schema=saved.schema??(allowLegacySchema?1:undefined);
 if(![1,2,STUDIO_SCENE_SCHEMA].includes(schema))throw Error('Arquivo de cena incompatível.');
 const config=migrateStudioConfig(saved.config,schema===STUDIO_SCENE_SCHEMA?2:schema);
 // Old files never recorded suspended choices. Preserve their appearance, not invented history.
 const draft=schema===STUDIO_SCENE_SCHEMA?validateDraft(saved.draft,config):studioCustomization(config);
 return {config,draft};
}

export function readStudioSceneFile(saved){
 if(!isRecord(saved)||saved.addon!=='altare')throw Error('Arquivo de cena incompatível.');
 const state=restoreStudioSceneState(saved),camera=validateStudioCamera(saved.camera);
 if(camera.projection!==state.config.projection)throw Error('Projeção da cena incompatível com a câmera.');
 return {...state,camera:{projection:camera.projection,position:[...camera.position],target:[...camera.target],orthoSpan:camera.orthoSpan}};
}
