import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {TemplateSourceReferences} from './TemplateSourceReferences';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import type {TemplateReferenceMetadata} from './templateReferenceInput';
const kit:BrandKitSummary={id:'kit',name:'Fixture',assets:[{id:'red',role:'product_image',label:'Matte Red'},{id:'maroon',role:'product_image',label:'Matte Maroon'},{id:'model',role:'brand_model',label:'Brand portrait'},{id:'logo',role:'logo_primary',label:'Logo'}]};
const refs:TemplateReferenceMetadata[]=[{assetId:'red',purpose:'PRODUCT_IDENTITY',sha256:'a'.repeat(64),provenance:{brandKitId:'kit',brandVersion:1}},{assetId:'model',purpose:'MODEL_IDENTITY',sha256:'b'.repeat(64),provenance:{brandKitId:'kit',brandVersion:1}}];
test('product and model references render actual names and images in compact, read-only cards',()=>{
 const before=JSON.stringify({kit,refs}),html=renderToStaticMarkup(<TemplateSourceReferences kit={kit} references={refs} urls={{red:'data:image/png;base64,red',model:'data:image/png;base64,model'}}/>);
 assert.equal((html.match(/<figure/g)||[]).length,2);assert.match(html,/alt="Matte Red"/);assert.match(html,/alt="Brand portrait"/);assert.match(html,/Brand Model/);assert.doesNotMatch(html,/<button|approved/i);assert.equal(JSON.stringify({kit,refs}),before);
});
test('native source IDs use existing product/model assets without treating logos as products',()=>{
 const html=renderToStaticMarkup(<TemplateSourceReferences kit={kit} sourceAssetIds={['red','maroon','model','logo']} urls={{}}/>);
 assert.equal((html.match(/<figure/g)||[]).length,3);assert.match(html,/Matte Maroon/);assert.doesNotMatch(html,/>Logo</);assert.match(html,/Reference image unavailable/);
});
test('no references leaves no empty source-assets panel',()=>{
 assert.equal(renderToStaticMarkup(<TemplateSourceReferences kit={kit} urls={{}}/>),'');
});
