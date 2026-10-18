/** Read-only git/source audit. Builds exported snapshots; never checks out or stages files. */
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync,statSync,rmSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const head=git('rev-parse','HEAD'),area=resolve(root,'.tmp',`t3-reconcile-${head.slice(0,8)}-${Date.now()}`);
mkdirSync(area,{recursive:true});
const archive=resolve(area,'committed.tar');
execFileSync('git',['archive','--format=tar','--output',archive,head],{cwd:root,windowsHide:true});
const dependencyBuild=await build({absWorkingDir:root,entryPoints:['src/pages/ClipEditor/CanonicalCaptionPreview.tsx'],bundle:true,platform:'browser',format:'esm',packages:'external',metafile:true,write:false});
const dependencies=Object.keys(dependencyBuild.metafile.inputs).sort();
// Type-only imports vanish from a runtime bundler; explicitly retain their source dependencies.
for(const path of ['src/lib/clipTypography/packageTypes.ts'])if(!dependencies.includes(path))dependencies.push(path);
const files=[];function walk(folder){for(const name of readdirSync(folder)){const p=resolve(folder,name);if(statSync(p).isDirectory())walk(p);else files.push(relative(root,p).replaceAll('\\','/'));}}
walk(resolve(root,'public/fonts/clip-typography'));
const tracked=new Set(git('ls-files','-z').split('\0'));
const manifest=[...new Set([...dependencies,...files])].sort().map(path=>({path,tracked:tracked.has(path),sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')}));
const result={head,correctiveCommit:'0d0e33f02060948502147315aef946a9c5c7f980',area,dependencies:manifest,checks:[],integrationRestored:false,flags:{canonical:false,animated:false,templates:false}};
const run=(name,cmd,args,cwd)=>{const proc=spawnSync(cmd,args,{cwd,env:{...process.env,VITE_AD_STUDIO_ANIMATED:'false',VITE_AD_STUDIO_TEMPLATES_V1:'false'},windowsHide:true,encoding:'utf8',maxBuffer:20*1024*1024});writeFileSync(resolve(area,name+'.log'),(proc.stdout??'')+(proc.stderr??'')+(proc.error?.message??''));result.checks.push({name,exitCode:proc.status,signal:proc.signal});writeFileSync(resolve(here,'T3-RECONCILIATION.json'),JSON.stringify(result,null,2));console.log(name,proc.status);};
for(const name of ['committed','candidate']){
 const dir=resolve(area,name);mkdirSync(dir);execFileSync('tar',['-xf',archive,'-C',dir],{windowsHide:true});
 // Snapshot stays below this repository solely to resolve installed node_modules
 // through normal parent lookup. No working-tree source or .env files are copied.
 if(name==='candidate'){
  for(const file of manifest){const destination=resolve(dir,file.path);mkdirSync(dirname(destination),{recursive:true});copyFileSync(resolve(root,file.path),destination);}
  // Independent second production entry proves the entire component dependency graph resolves.
  // ClipEditor itself stays exactly at committed HEAD, preserving Cursor's correction.
  writeFileSync(resolve(dir,'t3-probe.html'),'<div id="root"></div><script type="module" src="/src/pages/ClipEditor/CanonicalCaptionPreview.tsx"></script>');
  writeFileSync(resolve(dir,'t3-probe.config.mjs'),`import config from './vite.config.ts';import {mergeConfig} from 'vite';export default async env=>mergeConfig(await (typeof config==='function'?config(env):config),{build:{rollupOptions:{input:{app:'index.html',typography:'t3-probe.html'}}}});`);
 }
 run(name+'-vite',process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'build',...(name==='candidate'?['--config','t3-probe.config.mjs']:[]),'--outDir',resolve(area,name+'-dist')],dir);
 run(name+'-server',process.execPath,[resolve(root,'node_modules/esbuild/bin/esbuild'),'server.ts','--bundle','--platform=node','--format=cjs','--packages=external','--outfile='+resolve(area,name+'-server.cjs')],dir);
}
result.editorUnchanged=git('hash-object','src/pages/ClipEditor/ClipEditor.tsx');
const logs=resolve(here,'T3-reconciliation-evidence');mkdirSync(logs,{recursive:true});
for(const check of result.checks)copyFileSync(resolve(area,check.name+'.log'),resolve(logs,check.name+'.log'));
result.logs=logs;
// Remove only this helper's own exported copies, after preserving all logs.
// This prevents temporary source trees entering later whole-repository typechecks.
if(dirname(area)!==resolve(root,'.tmp')||!area.startsWith(resolve(root,'.tmp','t3-reconcile-')))throw Error('Unexpected snapshot cleanup target');
rmSync(area,{recursive:true});result.snapshotRemoved=true;
writeFileSync(resolve(here,'T3-RECONCILIATION.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({head,files:manifest.length,checks:result.checks,area}));
if(result.checks.some(check=>check.exitCode!==0))process.exitCode=1;
