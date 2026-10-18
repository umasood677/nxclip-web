import { FontLoaderService } from "./FontLoaderService";

const loader = new FontLoaderService();
const manifest = await fetch('/renderer-manifest.json').then((response) => response.json()) as { faces: Array<{ id: string; family: string; weight: number; style: "normal" | "italic"; sampleUnicode: string }> };
const results: Array<Record<string, unknown>> = [];
for (const face of manifest.faces) {
  const fontId = face.id.replace(/-\d+-(normal|italic)$/, '');
  const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !?.,:;() - Mixed text\n' + face.sampleUnicode + ' Multiline wrapping: a controlled second line';
  const section = document.createElement('section');
  section.innerHTML = `<h2>${face.id}</h2><div class="stage"><div class="sample"></div></div><img width="1280" height="720" src="/exports/${face.id}.png" alt="ASS export ${face.id}">`;
  document.body.append(section);
  const sample = section.querySelector<HTMLElement>('.sample')!;
  try {
    await loader.loadFont(fontId, face.weight, face.style, text.replace(/[\r\n]/g, ''));
    sample.textContent = text;
    sample.style.fontFamily = `"NxClip T2 ${face.family}"`;
    sample.style.fontWeight = String(face.weight);
    sample.style.fontStyle = face.style;
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${face.style} ${face.weight} 42px "NxClip T2 ${face.family}"`;
    results.push({ face: face.id, loaded: loader.getFontLoadStatus(fontId, face.weight, face.style, text.replace(/[\r\n]/g, '')), width: context.measureText('Aa09 Mixed text').width, blockHeight: sample.offsetHeight, cssLineHeight: getComputedStyle(sample).lineHeight });
  } catch (error) { results.push({ face: face.id, error: String(error) }); }
}
const report = document.createElement('pre'); report.id = 'results'; report.textContent = JSON.stringify(results, null, 2); document.body.prepend(report);
document.title = results.every((item) => item.loaded === 'loaded') ? 'PASS: 15 canonical browser faces' : 'FAIL: browser font fixture';
await fetch('/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userAgent: navigator.userAgent, results }) });
