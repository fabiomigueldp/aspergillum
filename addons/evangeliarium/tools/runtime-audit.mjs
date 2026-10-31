import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const dataRoot=path.join(process.env.APPDATA,'Minecraft Bedrock');
const logDir=path.join(dataRoot,'logs');
const latest=fs.readdirSync(logDir).filter(f=>/^ContentLog.*\.txt$/.test(f)).map(f=>({file:path.join(logDir,f),time:fs.statSync(path.join(logDir,f)).mtimeMs})).sort((a,b)=>b.time-a.time)[0]?.file;
const log=option('--log',latest);if(!log)throw Error('No Content Log found');
const size=fs.statSync(log).size;
const start=Math.max(0,Number(option('--from-byte',Math.max(0,size-8*1024*1024))));
if(!Number.isSafeInteger(start)||start>size)throw Error('Invalid log offset');
const length=Math.min(size-start,8*1024*1024),buffer=Buffer.alloc(length),fd=fs.openSync(log,'r');
try{fs.readSync(fd,buffer,0,length,start);}finally{fs.closeSync(fd);}
const text=buffer.toString('utf8');
const findings=text.split(/\r?\n/).filter(l=>/\[(error|warning)\]|\[Evangeliarium(?::inspect|:pose)?\]/i.test(l));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const worldRoot=path.join(dataRoot,'Users/8414181078248597151/games/com.mojang/minecraftWorlds');
const worlds=fs.readdirSync(worldRoot).filter(d=>{try{return fs.readFileSync(path.join(worldRoot,d,'levelname.txt'),'utf8').trim()==='devtest';}catch{return false;}});
if(worlds.length!==1)throw Error('Expected exactly one devtest world');
const packs={};
const listFiles=(base,prefix='')=>fs.readdirSync(path.join(base,prefix),{withFileTypes:true}).flatMap(entry=>{
 const relative=prefix?prefix+'/'+entry.name:entry.name;
 if(entry.isSymbolicLink())throw Error('Unexpected symlink in pack: '+relative);
 return entry.isDirectory()?listFiles(base,relative):[relative];
}).sort();
for(const [kind,folder] of [['behavior','behavior_packs'],['resource','resource_packs']]){
 const installed=path.join(worldRoot,worlds[0],folder,'evangeliarium.managed');
 const manifest=JSON.parse(fs.readFileSync(path.join(installed,'manifest.json'),'utf8'));
 const files=listFiles(path.join(root,'packs',kind)),installedFiles=listFiles(installed);
 packs[kind]={version:manifest.header.version,uuid:manifest.header.uuid,fileSetMatches:JSON.stringify(files)===JSON.stringify(installedFiles),files:Object.fromEntries(files.map(f=>[f,{installed:fs.existsSync(path.join(installed,f))?hash(fs.readFileSync(path.join(installed,f))):null,source:hash(fs.readFileSync(path.join(root,'packs',kind,f)))}]))};
}
const output=path.join(root,'out/runtime',`${version}-${new Date().toISOString().replace(/[:.]/g,'-')}`);fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'content-log.txt'),buffer);
const startupVersions=[...text.matchAll(/\[Evangeliarium\] ([0-9.]+) ready/g)].map(m=>m[1]);
const matchingRuntime=startupVersions.at(-1)===version;
const installedMatches=Object.values(packs).every(p=>p.version.join('.')===version&&p.fileSetMatches&&Object.values(p.files).every(f=>f.installed===f.source));
const errors=findings.filter(l=>/\[error\]/i.test(l));
const worldPath=path.join(worldRoot,worlds[0]);
const references=Object.fromEntries([['behavior','world_behavior_packs.json'],['resource','world_resource_packs.json']].map(([kind,file])=>[kind,JSON.parse(fs.readFileSync(path.join(worldPath,file),'utf8')).filter(p=>p.pack_id===packs[kind].uuid)]));
const uniqueReferences=Object.entries(references).every(([kind,entries])=>entries.length===1&&entries[0].version.join('.')===packs[kind].version.join('.'));
const report={version,captured:new Date().toISOString(),log,start,end:start+length,logBytes:size,truncated:start>0||start+length<size,packs,references,uniqueReferences,findings,startupVersions,matchingRuntime,installedMatches,contentLogAcceptance:!matchingRuntime||!installedMatches||!uniqueReferences?'unverified':errors.length?'failed':'no-errors-in-captured-interval',visualAcceptance:'Requires actual Minecraft screenshots; dispatch is not proof of pose.'};
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--archive')){
 if(report.contentLogAcceptance!=='no-errors-in-captured-interval')throw Error('Refusing to archive an unverified or failing runtime as release evidence: '+output);
 const archive=path.join(root,'dist/validation',version);fs.mkdirSync(archive,{recursive:true});
 fs.copyFileSync(path.join(output,'report.json'),path.join(archive,'runtime-audit.json'));
 fs.copyFileSync(path.join(output,'content-log.txt'),path.join(archive,'runtime-content-log.txt'));
 const summaryPath=path.join(archive,'release-summary.json');
 if(fs.existsSync(summaryPath)){const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));summary.minecraftContentLog={status:report.contentLogAcceptance,report:'runtime-audit.json',captured:report.captured,log:report.log};fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');}
}
console.log(JSON.stringify({output,version,log,start,end:start+length,contentLogAcceptance:report.contentLogAcceptance,installedMatches,uniqueReferences,findings},null,2));
