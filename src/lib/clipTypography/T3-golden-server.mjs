import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=resolve(root,'src/lib/clipTypography/T3-golden-evidence');mkdirSync(output,{recursive:true});
const bundle=await build({entryPoints:[resolve(root,'src/lib/clipTypography/T3-golden.tsx')],bundle:true,write:false,format:'esm',target:'es2022',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const failureBundle=await build({entryPoints:[resolve(root,'src/lib/clipTypography/T3-failure.tsx')],bundle:true,write:false,format:'esm',target:'es2022',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const coverageBundle=await build({entryPoints:[resolve(root,'src/lib/clipTypography/T3-coverage.ts')],bundle:true,write:false,format:'esm',target:'es2022'});
createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),path=url.pathname;
  try {
    if(req.method==='POST' && (/^\/(fixtures|browser-results|comparison|failure-results|cold-results|disabled-results|coverage-results)$/.test(path)||/^\/capture\/[a-z0-9-]+$/.test(path))) {
      const chunks=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>5000000)req.destroy();else chunks.push(chunk);});
      req.on('end',()=>{writeFileSync(resolve(output,path.startsWith('/capture/')?path.slice(9)+'-browser.png':path.slice(1)+'.json'),Buffer.concat(chunks));res.end('saved');});return;
    }
    if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>T3 golden loading</title><style>body{background:#181818;color:white}canvas{position:absolute;inset:0;width:100%;height:100%}</style><script type="module" src="/'+(url.searchParams.has('coverage')?'coverage':url.searchParams.has('failure')||url.searchParams.has('cold')||url.searchParams.has('disabled')?'failure':'fixture')+'.js"></script>');return;}
    if(path==='/coverage.js'){res.setHeader('Content-Type','text/javascript');res.end(coverageBundle.outputFiles[0].contents);return;}
    if(path==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
    if(path==='/failure.js'){res.setHeader('Content-Type','text/javascript');res.end(failureBundle.outputFiles[0].contents);return;}
    if(path==='/fixtures.json'){res.setHeader('Content-Type','application/json');res.end(readFileSync(resolve(output,'fixtures.json')));return;}
    if(path==='/browser-results.json'){res.setHeader('Content-Type','application/json');res.end(readFileSync(resolve(output,'browser-results.json')));return;}
    if(/^\/renderer\/[a-z0-9-]+\.png$/.test(path)){res.setHeader('Content-Type','image/png');res.end(readFileSync(resolve(output,path.slice(10))));return;}
    if(path.startsWith('/fonts/clip-typography/1.1.0/')&&!/[\\%]/.test(path)&&!path.includes('..')){if(req.headers.referer?.includes('failure')){res.statusCode=404;res.end('Intentional font failure fixture');return;}res.setHeader('Content-Type','font/ttf');res.end(readFileSync(resolve(root,'public','.'+path)));return;}
    res.statusCode=404;res.end('not found');
  }catch(error){res.statusCode=500;res.end(String(error));}
}).listen(4319,'127.0.0.1',()=>console.log('T3 goldens http://127.0.0.1:4319'));
