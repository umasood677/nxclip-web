import { FontLoaderService } from './FontLoaderService';

// Diagnostic only: nominal CSS em versus ASS size, without a layout correction.
const loader = new FontLoaderService();
const normalized = new URL(location.href).searchParams.has('normalized');
const prefix = normalized ? 'normalized-' : '';
const manifest = await fetch('/manifest.json').then(r => r.json()) as { faces: Array<{id: string; family: string; weight: number; style: 'normal' | 'italic'; sampleUnicode: string}> };
const results: Record<string, unknown>[] = [];
for (const face of manifest.faces) {
  await loader.loadFont(face.id.replace(/-\d+-(normal|italic)$/, ''), face.weight, face.style, 'Aa09 Mixed text');
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#202020'; ctx.fillRect(0, 0, 1280, 720);
  ctx.font = `${face.style} ${face.weight} 42px "NxClip T2 ${face.family}"`;
  ctx.textAlign = 'center'; ctx.textBaseline = normalized ? 'alphabetic' : 'middle'; ctx.fillStyle = '#ffffff';
  ctx.fillText('Aa09 Mixed text', 640, normalized ? 400 : 360);
  const bounds = (data: Uint8ClampedArray) => {
    let left = 1280, top = 720, right = -1, bottom = -1;
    for (let y = 0; y < 720; y++) for (let x = 0; x < 1280; x++) {
      if (Math.abs(data[(y * 1280 + x) * 4] - data[0]) > 16) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
  };
  const browser = bounds(ctx.getImageData(0, 0, 1280, 720).data);
  const image = new Image(); image.src = `/${normalized ? 'evidence' : 'exports'}/${prefix}${face.id}-metrics.png`; await image.decode();
  const rendererCanvas = document.createElement('canvas'); rendererCanvas.width = 1280; rendererCanvas.height = 720;
  const rendererContext = rendererCanvas.getContext('2d')!; rendererContext.drawImage(image, 0, 0);
  const renderer = bounds(rendererContext.getImageData(0, 0, 1280, 720).data);
  let omega: string;
  try { await loader.loadFont(face.id.replace(/-\d+-(normal|italic)$/, ''), face.weight, face.style, 'Ω'); omega = 'supported'; }
  catch { omega = 'rejected: unsupported browser glyph'; }
  const maxEdgeDifference = Math.max(...(['left', 'right', 'top', 'bottom'] as const).map(edge => Math.abs(browser[edge] - renderer[edge])));
  results.push({ face: face.id, browser, renderer, widthDifference: browser.width - renderer.width, heightDifference: browser.height - renderer.height, maxEdgeDifference, omega, tolerancePx: 2, pass: maxEdgeDifference <= 2 && Math.abs(browser.width - renderer.width) <= 2 && Math.abs(browser.height - renderer.height) <= 2 });
  const heading = document.createElement('h2'); heading.textContent = face.id; document.body.append(heading, canvas, image);
  await fetch(`/capture/${prefix}${face.id}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!))) });
}
const report = { purpose: normalized ? 'T3 metric conversion experiment; not production overlay certification' : 'T3 uncorrected baseline; Canvas raster versus real libass raster, not production overlay certification', userAgent: navigator.userAgent, results };
await fetch(`/results${normalized ? '-normalized' : ''}`, { method: 'POST', body: JSON.stringify(report) });
document.title = 'T3 baseline captured';
const pre = document.createElement('pre'); pre.textContent = JSON.stringify(report, null, 2); document.body.prepend(pre);
