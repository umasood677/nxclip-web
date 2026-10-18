/** Prepare reviewable tracked patches only. Does not stage, commit, push or deploy. */
import {execFileSync} from 'node:child_process';import {writeFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {resolve} from 'node:path';
const here=fileURLToPath(new URL('.',import.meta.url)),web=resolve(here,'../../..'),backend=resolve(web,'../NxClip');
const diff=(cwd,paths)=>execFileSync('git',['diff','--binary','--',...paths],{cwd,encoding:'utf8',windowsHide:true});
const owned=['apps/media-worker/Dockerfile','apps/media-worker/src/render/application/ass-captions.ts','apps/media-worker/src/render/application/ass-captions.spec.ts','apps/media-worker/src/render/application/caption-fonts.ts','apps/media-worker/src/render/application/ffmpeg-render.service.ts','apps/content-service/src/content/application/content.service.ts','apps/content-service/src/content/application/clip-studio.helpers.ts','libs/contracts/src/index.ts'];
let patch=diff(backend,owned);
for(const path of ['libs/contracts/src/lib/internal/index.ts','apps/media-worker/src/queue/dto/render-clip-queue.dto.ts']){
  const full=diff(backend,[path]),start=full.indexOf('@@ ');if(start<0)continue;
  const header=full.slice(0,start),hunks=full.slice(start).split(/(?=^@@ )/m).filter(Boolean);
  const selected=hunks.filter(hunk=>hunk.split('\n').some(line=>line.startsWith('+')&&/CanonicalTypographyLayout|canonicalLayout\?:/.test(line)));
  patch+=selected.length?header+selected.join(''):'';
}
writeFileSync(resolve(here,'T3-release-backend.patch'),patch);
// Cursor removed the incomplete T3 integration. Current ClipEditor dirty hunks
// belong to Sound Design; never package them as a typography release patch.
const editorDiff=diff(web,['src/pages/ClipEditor/ClipEditor.tsx']);
if(editorDiff.split('\n').some(line=>line.startsWith('+')&&/CanonicalCaptionPreview|canonicalTypographyRaw/.test(line)))throw Error('Restored editor integration needs fresh owner-hunk review; do not export its entire diff');
writeFileSync(resolve(here,'T3-release-frontend.patch'),'');
console.log('Prepared typography tracked patches; untracked T2/T3 prerequisites are listed separately in the changed-file manifest. No index changes.');
