/** Build a source-only backend candidate excluding every Ad Studio dirty hunk. */
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync,statSync,rmSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../NxClip');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
const head=git('rev-parse','HEAD').trim(),area=resolve(root,'.tmp',`t3-candidate-${Date.now()}`),candidate=resolve(area,'candidate');mkdirSync(candidate,{recursive:true});
const owned=['apps/media-worker/Dockerfile','apps/media-worker/src/render/application/ass-captions.ts','apps/media-worker/src/render/application/ass-captions.spec.ts','apps/media-worker/src/render/application/caption-fonts.ts','apps/media-worker/src/render/application/ffmpeg-render.service.ts','apps/content-service/src/content/application/content.service.ts','apps/content-service/src/content/application/clip-studio.helpers.ts','libs/contracts/src/index.ts'];
let patch=git('diff','--binary','--',...owned);
const mixed=['libs/contracts/src/lib/internal/index.ts','apps/media-worker/src/queue/dto/render-clip-queue.dto.ts'];
for(const path of mixed){const full=git('diff','--',path),start=full.indexOf('@@ ');if(start<0)continue;const selected=full.slice(start).split(/(?=^@@ )/m).filter(hunk=>hunk.split('\n').some(line=>line.startsWith('+')&&/CanonicalTypographyLayout|canonicalLayout\?:/.test(line)));if(selected.length)patch+=full.slice(0,start)+selected.join('');}
if(patch.split('\n').some(line=>line.startsWith('+')&&/adAnimatedExport|queueRenderAnimatedAd|class RenderAnimatedAd/.test(line)))throw Error('Ad Studio hunk entered typography scope');
const patchPath=resolve(here,'T3-integration-backend.patch');writeFileSync(patchPath,patch);
const files=['libs/contracts/src/lib/clip-typography-layout.ts','libs/contracts/src/lib/clip-typography-layout.spec.ts','apps/content-service/src/content/application/canonical-typography.ts','apps/media-worker/src/render/application/canonical-caption-fonts.ts','apps/media-worker/src/render/application/canonical-caption-fonts.spec.ts','apps/media-worker/src/render/application/canonical-typography-layout.ts','apps/media-worker/src/render/application/canonical-typography-layout.spec.ts','apps/media-worker/src/render/application/t3-legacy-compatibility.spec.ts'];
function walk(dir){for(const name of readdirSync(dir)){const path=resolve(dir,name);if(statSync(path).isDirectory())walk(path);else files.push(relative(root,path).replaceAll('\\','/'));}}
walk(resolve(root,'apps/media-worker/assets/fonts/canonical'));walk(resolve(root,'apps/media-worker/src/render/application/typography-fixtures'));
for(const name of readdirSync(resolve(root,'apps/media-worker/tools/typography')))files.push('apps/media-worker/tools/typography/'+name);
const archive=resolve(area,'head.tar');execFileSync('git',['archive','--format=tar','--output',archive,head],{cwd:root,windowsHide:true});execFileSync('tar',['-xf',archive,'-C',candidate],{windowsHide:true});
for(const path of files){const dest=resolve(candidate,path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(resolve(root,path),dest);}
const prefix=relative(root,candidate).replaceAll('\\','/');execFileSync('git',['apply','--check','--directory='+prefix,patchPath],{cwd:root,windowsHide:true});execFileSync('git',['apply','--directory='+prefix,patchPath],{cwd:root,windowsHide:true});
const manifest=[...new Set([...owned,...mixed,...files])].sort().map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(candidate,path))).digest('hex'),kind:mixed.includes(path)?'typography-only hunks':'typography source/assets'}));
const logDir=resolve(here,'T3-integration-evidence');mkdirSync(logDir,{recursive:true});
// Nx requires a physical pnpm node_modules/.modules.yaml in an exported tree.
// Do not install or link dependencies. Compile both real applications and their
// imported source packages directly, retaining the repository compiler settings.
const config={extends:'./tsconfig.base.json',compilerOptions:{module:'commonjs',esModuleInterop:true,types:['node'],typeRoots:[resolve(root,'node_modules/@types')],outDir:resolve(area,'compiled'),declaration:true,incremental:false},include:['apps/media-worker/src/**/*.ts','apps/content-service/src/**/*.ts'],exclude:['**/*.spec.ts','**/*.test.ts']};
writeFileSync(resolve(candidate,'t3-candidate.tsconfig.json'),JSON.stringify(config,null,2));
const proc=spawnSync(process.execPath,[resolve(root,'node_modules/typescript/bin/tsc'),'-p','t3-candidate.tsconfig.json'],{cwd:candidate,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});
writeFileSync(resolve(logDir,'backend-build.log'),(proc.stdout??'')+(proc.stderr??''));
const result={head,files:manifest,checks:[{name:'clean source TypeScript emit: media-worker, content-service and imported packages',exitCode:proc.status}],nxLimitation:'Initial Nx attempt exited 1: exported tree lacks physical pnpm .modules.yaml. No dependency installation or linking performed.',excludes:'Ad Studio 4C-B, Sound Design dirty changes, deployment, dependency manifests',patch:'T3-integration-backend.patch'};
writeFileSync(resolve(here,'T3-BACKEND-CANDIDATE.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({head,files:manifest.length,exitCode:proc.status}));
if(dirname(area)!==resolve(root,'.tmp')||!area.startsWith(resolve(root,'.tmp','t3-candidate-')))throw Error('Unexpected cleanup target');rmSync(area,{recursive:true});if(proc.status!==0)process.exitCode=1;
