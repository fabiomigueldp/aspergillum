import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {loadProjects,registerProject} from '../../tools/addon-manager/projects.mjs';
import {STUDIO_PRESETS,STUDIO_VERSION} from '../src/shared/studio-contract.js';
const viewer=path.resolve(import.meta.dirname,'..'),managerRoot=path.resolve(viewer,'..'),projectRoot=path.join(managerRoot,'addons/altare');
const previous=loadProjects({managerRoot,skipMissing:true}).find(p=>p.id==='altare');
if(previous&&previous.projectRoot!==projectRoot)throw Error('Altare já registrado em outro caminho.');
if(!previous)registerProject({managerRoot,projectRoot});
const result=spawnSync(process.execPath,[path.join(viewer,'scripts/sync-assets.mjs')],{cwd:viewer,stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
const models=spawnSync(process.execPath,[path.join(viewer,'scripts/capture-studio-models.mjs')],{cwd:viewer,stdio:'inherit',windowsHide:true});
if(models.error)throw models.error;if(models.status!==0)process.exit(models.status??1);
let catalog;try{catalog=JSON.parse(fs.readFileSync(path.join(viewer,'public/studio-gallery/catalog.json'),'utf8'));}catch{}
if(catalog?.renderer!==STUDIO_VERSION||STUDIO_PRESETS.some(preset=>!fs.existsSync(path.join(viewer,'public/studio-gallery',preset.id+'.png')))){
 console.log('Atualizando as miniaturas da coleção.');
 const thumbnails=spawnSync(process.execPath,[path.join(viewer,'scripts/render-altars.mjs'),'--size','640','--output','out/altar-renders/thumbnails'],{cwd:viewer,stdio:'inherit',windowsHide:true});
 if(thumbnails.error)throw thumbnails.error;if(thumbnails.status!==0)process.exit(thumbnails.status??1);
}
