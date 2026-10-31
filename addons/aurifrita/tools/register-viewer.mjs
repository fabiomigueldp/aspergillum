import fs from 'node:fs';
import path from 'node:path';
import { loadProjects } from '../../../tools/addon-manager/projects.mjs';
const projectRoot=path.resolve(import.meta.dirname,'..');
const managerRoot=path.resolve(projectRoot,'../..');
const registryPath=path.join(managerRoot,'out/addon-manager-projects.json');
const previous=fs.existsSync(registryPath)?fs.readFileSync(registryPath,'utf8'):null;
const registry=previous?JSON.parse(previous):{schemaVersion:1,projects:[]};
const old=registry.projects.find(p=>p.id==='aurifrita');
if(old&&path.resolve(old.projectRoot)!==projectRoot)throw new Error(`Aurifrita already registered at ${old.projectRoot}`);
if(!old)registry.projects.push({id:'aurifrita',projectRoot});
fs.mkdirSync(path.dirname(registryPath),{recursive:true});
fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
try{loadProjects({managerRoot,skipMissing:true});}catch(error){
  if(previous!==null)fs.writeFileSync(registryPath,previous);else fs.unlinkSync(registryPath);
  throw error;
}
console.log('Aurifrita registered locally; existing project entries preserved.');
