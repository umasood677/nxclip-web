import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const inventory=JSON.parse(readFileSync(resolve(here,'T3-RECONCILIATION.json'),'utf8'));
for(const file of inventory.dependencies)if(hash(resolve(root,file.path))!==file.sha256)throw Error(`Reconciliation inventory changed: ${file.path}`);
const editor='src/pages/ClipEditor/ClipEditor.tsx';
// Use only the reviewed patch. Never regenerate it from a live editor diff:
// Cursor may have added unrelated work since the original ownership snapshot.
const patch=readFileSync(resolve(here,'T3-integration-editor.patch'),'utf8');
writeFileSync(resolve(here,'T3-integration-editor.patch'),patch);
const compiled=await build({absWorkingDir:root,entryPoints:['src/pages/ClipEditor/ClipTypographyOverlay.tsx'],bundle:true,platform:'browser',format:'esm',packages:'external',metafile:true,write:false});
const paths=new Set([...inventory.dependencies.map(file=>file.path),...Object.keys(compiled.metafile.inputs),'src/lib/clipTypography/packageTypes.ts']);
const manifest=[...paths].sort().map(path=>({path,sha256:hash(resolve(root,path))}));
const head=git('rev-parse','HEAD'),area=resolve(root,'.tmp',`t3-integrated-${Date.now()}`),candidate=resolve(area,'candidate');mkdirSync(candidate,{recursive:true});
const archive=resolve(area,'head.tar');execFileSync('git',['archive','--format=tar','--output',archive,head],{cwd:root,windowsHide:true});execFileSync('tar',['-xf',archive,'-C',candidate],{windowsHide:true});
for(const file of manifest){const dest=resolve(candidate,file.path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(resolve(root,file.path),dest);if(hash(dest)!==file.sha256)throw Error('Snapshot checksum mismatch');}
const prefix=relative(root,candidate).replaceAll('\\','/');
execFileSync('git',['apply','--check','--directory='+prefix,resolve(here,'T3-integration-editor.patch')],{cwd:root,windowsHide:true});
execFileSync('git',['apply','--directory='+prefix,resolve(here,'T3-integration-editor.patch')],{cwd:root,windowsHide:true});
manifest.push({path:editor,sha256:hash(resolve(candidate,editor)),kind:'HEAD plus typography-only patch; excludes Cursor dirty hunks'});
const results={head,checks:[],dependencies:manifest,inventoryVerified:inventory.dependencies.length,canonicalEnabled:false,editorPatch:'T3-integration-editor.patch',logs:'T3-integration-evidence'};
const logs=resolve(here,'T3-integration-evidence');mkdirSync(logs,{recursive:true});
for(const [name,args] of [['vite',[resolve(root,'node_modules/vite/bin/vite.js'),'build','--outDir',resolve(area,'dist')]],['server',[resolve(root,'node_modules/esbuild/bin/esbuild'),'server.ts','--bundle','--platform=node','--format=cjs','--packages=external','--outfile='+resolve(area,'server.cjs')]]]){
 const proc=spawnSync(process.execPath,args,{cwd:candidate,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024,env:{...process.env,VITE_AD_STUDIO_ANIMATED:'false',VITE_AD_STUDIO_TEMPLATES_V1:'false'}});writeFileSync(resolve(logs,name+'.log'),(proc.stdout??'')+(proc.stderr??''));results.checks.push({name,exitCode:proc.status});console.log(name,proc.status);
}
if(dirname(area)!==resolve(root,'.tmp')||!area.startsWith(resolve(root,'.tmp','t3-integrated-')))throw Error('Unexpected cleanup target');rmSync(area,{recursive:true});
writeFileSync(resolve(here,'T3-INTEGRATED-BUILD.json'),JSON.stringify(results,null,2));
if(results.checks.some(check=>check.exitCode!==0))process.exitCode=1;
