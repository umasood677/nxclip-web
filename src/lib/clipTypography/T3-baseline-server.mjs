import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const worker = resolve(root, '../NxClip/apps/media-worker/assets/fonts/canonical/1.0.0');
const output = resolve(root, 'src/lib/clipTypography/T3-evidence'); mkdirSync(output, { recursive: true });
const bundle = await build({ entryPoints: [resolve(root, 'src/lib/clipTypography/T3-baseline.ts')], bundle: true, write: false, format: 'esm', target: 'es2022' });
createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (req.method === 'POST' && (/^\/results(-normalized)?$/.test(path) || /^\/capture\/[a-z0-9-]+$/.test(path))) {
      const chunks = []; let size = 0;
      req.on('data', chunk => { size += chunk.length; if (size > 2000000) req.destroy(); else chunks.push(chunk); });
      req.on('end', () => { const bytes = Buffer.concat(chunks); writeFileSync(resolve(output, path.startsWith('/results') ? path.slice(1) + '.json' : path.slice(9) + '.png'), bytes); res.end('saved'); }); return;
    }
    if (path === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>T3 baseline loading</title><style>canvas,img{width:640px;height:360px}body{background:#181818;color:white}pre{max-height:200px;overflow:auto}</style><script type="module" src="/fixture.js"></script>'); return; }
    if (path === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].contents); return; }
    if (path === '/manifest.json') { res.setHeader('Content-Type', 'application/json'); res.end(readFileSync(resolve(worker, 'manifest.json'))); return; }
    if (/^\/exports\/[a-z0-9-]+\.png$/.test(path)) { res.setHeader('Content-Type', 'image/png'); res.end(readFileSync(resolve(worker, 'verification', path.slice(9)))); return; }
    if (/^\/evidence\/[a-z0-9-]+\.png$/.test(path)) { res.setHeader('Content-Type', 'image/png'); res.end(readFileSync(resolve(output, path.slice(10)))); return; }
    if (path.startsWith('/fonts/clip-typography/1.0.0/') && !path.includes('..') && !path.includes('%') && !path.includes('\\')) {
      res.setHeader('Content-Type', 'font/woff2'); res.end(readFileSync(resolve(root, 'public', '.' + path))); return;
    }
    res.statusCode = 404; res.end('not found');
  } catch (error) { res.statusCode = 500; res.end(String(error)); }
}).listen(4318, '127.0.0.1', () => console.log('T3 baseline http://127.0.0.1:4318'));
