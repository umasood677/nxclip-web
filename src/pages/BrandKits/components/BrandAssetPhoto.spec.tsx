import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {BrandAssetPhoto} from './BrandAssetPhoto';
import {BrandAssetsSection} from './BrandAssetsSection';
test('photo rendering retains original URL and alt text inside a bounded media wrapper',()=>{
 const asset={id:'photo',role:'brand_model',status:'ready',label:'Model full portrait'};
 const html=renderToStaticMarkup(<BrandAssetPhoto brandId="kit" asset={asset} url="blob:synthetic"/>);
 assert.match(html,/class="bpp-photo"/);assert.match(html,/src="blob:synthetic"/);assert.match(html,/alt="Model full portrait"/);
 assert.match(html,/Loading preview/);
 const css=readFileSync(process.cwd()+'/src/pages/BrandKits/components/brandProductPhotos.css','utf8');
 assert.match(css,/\.bpp-image>\.bpp-photo\{position:absolute;inset:0/);
 assert.match(css,/\.bpp-photo>img,\.bpp-new-preview>img\{position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain/);
});
test('missing URLs show a loading state instead of silent empty markup, with bounded/manual-only recovery wired',()=>{
 const html=renderToStaticMarkup(<BrandAssetPhoto brandId="kit" asset={{id:'photo',label:'Product'}}/>);
 assert.match(html,/role="status"/);assert.match(html,/Loading preview/);
 const source=readFileSync(process.cwd()+'/src/pages/BrandKits/components/BrandAssetPhoto.tsx','utf8');
 assert.match(source,/15000/);assert.match(source,/onClick=\{\(\)=>void retry\(\)\}/);
 assert.match(source,/brandMediaLoader.load\(brandId,path,token/);
 assert.doesNotMatch(source,/fetch\(|setInterval|console\.|window\.location/);
});
test('additional files are explained without reclassifying them or writing Brand Kit data',()=>{
 const asset={id:'legacy',role:'other',status:'ready',mimeType:'image/png',label:'Existing character reference'};
 const before=JSON.stringify(asset),html=renderToStaticMarkup(<BrandAssetsSection brandId="kit" assets={[asset]} onKitUpdated={()=>{throw Error('No mutations');}}/>);
 assert.match(html,/Additional assets \(1\)/);assert.match(html,/Supporting files and older references/);assert.match(html,/Existing character reference/);
 assert.doesNotMatch(html,/Other attached assets/);assert.equal(JSON.stringify(asset),before);
});
