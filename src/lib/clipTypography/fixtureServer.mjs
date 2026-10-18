import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = fileURLToPath(new URL('../../../', import.meta.url));
const worker = resolve(root, '../NxClip/apps/media-worker/assets/fonts/canonical/1.0.0');
const built = await build({ entryPoints: [resolve(root, 'src/lib/clipTypography/browserFixture.ts')], bundle: true, write: false, format: 'esm', target: 'es2022' });
const html = '<!doctype html><title>Loading font fixture</title><style>body{background:#181818;color:white;font-family:sans-serif}.stage{width:1280px;height:720px;position:relative;background:#202020}.sample{position:absolute;left:80px;top:50%;transform:translateY(-50%);width:1120px;text-align:center;font-size:42px;line-height:1.2;white-space:pre-wrap;-webkit-text-stroke:2px black;paint-order:stroke fill;text-shadow:1px 1px black;font-synthesis:none}img{display:block}pre{font-size:12px}</style><script type="module" src="/loader.js"></script>';
createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/results' && request.method === 'POST') {
      let body=''; request.on('data', (chunk) => { body+=chunk; if(body.length>100000) request.destroy(); });
      request.on('end', () => { writeFileSync(resolve(root,'src/lib/clipTypography/T2-B2-browser-results.json'),JSON.stringify(JSON.parse(body),null,2)); response.end('saved'); }); return;
    }
    if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html.replace('</style>', 'pre{max-height:180px;overflow:auto}section{display:grid;grid-template-columns:640px 640px;gap:8px}h2{grid-column:span 2}.stage{zoom:.5}img{width:640px;height:360px}</style>')); return; }
    if (url.pathname === '/loader.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(built.outputFiles[0].contents); return; }
    const path = url.pathname === '/renderer-manifest.json' ? resolve(worker, 'manifest.json') : url.pathname.startsWith('/exports/') ? resolve(worker, 'verification', url.pathname.slice(9)) : resolve(root, 'public', '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(worker + '/') && !path.startsWith(worker + '\\') && !path.startsWith(resolve(root, 'public/fonts/clip-typography') + '\\') && !path.startsWith(resolve(root, 'public/fonts/clip-typography') + '/')) throw new Error('Forbidden');
    response.setHeader('Content-Type', ({ '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' })[extname(path)] ?? 'application/octet-stream');
    response.end(readFileSync(path));
  } catch (error) { response.statusCode = 404; response.end(String(error)); }
}).listen(4317, '127.0.0.1', () => console.log('Typography parity fixture: http://127.0.0.1:4317'));
