/** Offline T3 packaging: browser uses the exact verified static worker outlines. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { inspectFont } from './packageFonts.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const worker = resolve(root, '../NxClip/apps/media-worker/assets/fonts/canonical/1.0.0');
const fontkit = createRequire(resolve(root, '../NxClip/package.json'))('fontkit');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const base = 'public/fonts/clip-typography/1.1.0';
const manifest = JSON.parse(readFileSync(resolve(worker, 'manifest.json'), 'utf8'));
const files = [];
function put(path, bytes) {
  const target = resolve(root, path);
  if (existsSync(target) && hash(readFileSync(target)) !== hash(bytes)) throw Error(`Refusing changed versioned asset: ${path}`);
  mkdirSync(dirname(target), { recursive:true }); writeFileSync(target, bytes);
  files.push({path, sha256:hash(bytes),bytes:bytes.length});
}
const faces = manifest.faces.map(face => {
  const bytes = readFileSync(resolve(worker, face.filename));
  if (!face.verified || hash(bytes) !== face.sha256) throw Error(`Unverified worker asset: ${face.id}`);
  const path = `${base}/faces/${face.id}.ttf`; put(path, bytes);
  const font = fontkit.create(bytes);
  const inspection = inspectFont(bytes, face.assFamily, face.weight, face.style);
  return { id:face.id, family:face.family, weight:face.weight, style:face.style, assetVersion:'1.1.0', rendererAssetVersion:'1.0.0', path, sha256:face.sha256, sourceSha256:face.sourceSha256, sourceRevision:face.sourceRevision, inspection, metrics:{unitsPerEm:font.unitsPerEm,winAscent:font['OS/2'].winAscent,winDescent:font['OS/2'].winDescent}, license:'OFL-1.1', licenseNoticePath:`${base}/licenses/${face.id.replace(/-\d+-(normal|italic)$/, '')}-NOTICE.txt` };
});
for (const name of readdirSync(resolve(worker, 'licenses'))) put(`${base}/licenses/${name}`, readFileSync(resolve(worker,'licenses',name)));
const lock = {schemaVersion:'1.0.0',assetVersion:'1.1.0',rendererAssetVersion:'1.0.0',format:'truetype',reason:'Exact worker static outlines and full cmap; no synthetic weights, no new upstream downloads. WOFF2 compression can be added later without changing outlines.',faces,files};
writeFileSync(new URL('parity-font-lock.json', import.meta.url), JSON.stringify(lock,null,2));
console.log(JSON.stringify({faces:faces.length,files:files.length,bytes:files.reduce((sum,file)=>sum+file.bytes,0)}));
