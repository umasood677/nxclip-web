// Historical baseline report. Final implementation evidence uses T3-finalize.mjs.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = new URL('.', import.meta.url);
const root = fileURLToPath(new URL('../../../', here));
const read = name => JSON.parse(readFileSync(new URL(name, here), 'utf8'));
const baseline = read('T3-evidence/baseline.json');
const normalized = read('T3-evidence/results-normalized.json');
const worker = JSON.parse(readFileSync(resolve(root, '../NxClip/apps/media-worker/assets/fonts/canonical/1.0.0/manifest.json'), 'utf8'));
const runtime = read('T3-evidence/runtime.json');
const lines = ['# T3 raster baseline and metric experiment', '', '**T3 is incomplete. Production activation is not recommended.**', '', 'Real Chrome browser Canvas captures are compared with actual FFmpeg/libass frames. This single-line experiment does not exercise the ClipEditor DOM overlay or certify wrapping, effects, animations, shaping, or full project reopening.', '', 'The original baseline is nominal 42px on both engines. The experiment converts ASS size to CSS em using `ASS size = CSS pixels × (usWinAscent + usWinDescent) / unitsPerEm` and places the baseline explicitly. Browser baseline is 400px; ASS top is `400 − CSS pixels × usWinAscent / unitsPerEm`. No production renderer is changed.', '', 'The diagnostic tolerance is proposed: each ink-box edge, width and height must differ by at most 2px, thresholding foreground at red-channel distance >16 from each image background. It is not a user-approved overall visual tolerance. Different anti-aliasing is not scored; this is not a per-pixel similarity test.', '', `Browser: ${baseline.userAgent}`, '', `Renderer: ${runtime.ffmpeg}. Fresh baseline frames identical to T2-B2: ${runtime.results.filter(r => r.identicalToT2B2).length}/15.`, '', '| Face | Baseline browser/ASS width | Corrected browser/ASS width | Corrected max edge delta | Diagnostic pass | Ω browser/renderer |', '|---|---:|---:|---:|---|---|'];
const csv = ['face,browserOmega,rendererOmega,browserAccentSample,rendererSample,coverageIsLanguageCertification'];
for (const result of normalized.results) {
  const before = baseline.results.find(r => r.face === result.face);
  const face = worker.faces.find(f => f.id === result.face);
  const browserOmega = result.omega === 'supported';
  const rendererOmega = face.codepoints.includes(937);
  lines.push(`| ${result.face} | ${before.browser.width}/${before.renderer.width} | ${result.browser.width}/${result.renderer.width} | ${result.maxEdgeDifference} | ${result.pass ? 'pass' : 'FAIL'} | ${browserOmega ? 'yes' : 'no'}/${rendererOmega ? 'yes' : 'no'} |`);
  csv.push([face.id, browserOmega, rendererOmega, face.sampleUnicode.includes('é'), JSON.stringify(face.sampleUnicode), false].join(','));
}
lines.push('', 'Ω remains unavailable in nine browser faces despite renderer coverage; Poppins 700/900 and Caveat lack it in both. Only Inter 700/900 and JetBrains Mono load Ω in the current browser package. Unsupported canonical text fails explicitly; no silent substitute is certified.', '', 'Outstanding golden cases: production DOM short title; multiline; long wrapping; bold display; stroke/shadow; mixed Latin/symbol; saved-project browser reopening. Existing T2-B2 multiline frames remain useful evidence of differences, not passing goldens. Browser and renderer source releases are independently versioned.', '');
writeFileSync(new URL('T3-GOLDEN-BASELINE.md', here), lines.join('\n'));
writeFileSync(new URL('T3-BASELINE-FONT-COVERAGE.csv', here), csv.join('\n') + '\n');
const entries = [];
function walk(folder) { for (const name of readdirSync(folder)) { const path = resolve(folder, name); if (statSync(path).isDirectory()) walk(path); else entries.push({path: relative(root, path).replaceAll('\\', '/'), bytes:statSync(path).size, sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}); } }
walk(resolve(root, 'src/lib/clipTypography/T3-evidence'));
writeFileSync(new URL('T3-BASELINE-EVIDENCE-MANIFEST.json', here), JSON.stringify(entries, null, 2));
const changed = readdirSync(fileURLToPath(here)).filter(name => name.startsWith('T3-') && !statSync(new URL(name, here)).isDirectory()).map(name => resolve(fileURLToPath(here), name));
changed.push(resolve(fileURLToPath(here), 'T3-CHANGED-FILES.json'));
changed.push(...entries.map(entry => resolve(root, entry.path)));
changed.push(...['tools/typography/t3-baseline.cjs', 'tools/typography/t3-font-metrics.json', 'src/render/application/t3-legacy-compatibility.spec.ts'].map(path => resolve(root, '../NxClip/apps/media-worker', path)));
writeFileSync(new URL('T3-BASELINE-CHANGED-FILES.json', here), JSON.stringify({scope:'Historical baseline files only',files:[...new Set(changed)].sort()}, null, 2));
console.log(JSON.stringify({baselinePass:baseline.results.filter(r => r.pass).length,normalizedPass:normalized.results.filter(r => r.pass).length,files:entries.length}));
