import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {BrandProductPhotos} from './BrandProductPhotos';
import {productPhotoName,productPhotoMetadata} from './productPhotoModel';
import {uploadBrandImage} from '../lib/uploadBrandImage';
import type {BrandKitSummary} from '../lib/brandKitTypes';
const assets=[{id:'red',role:'product_image',status:'ready',label:'Signature Red Matte Lipstick',fileName:'red.jpg'},{id:'maroon',role:'product_image',status:'ready',label:'Signature Red Matte Lipstick',fileName:'maroon.jpg'}];
test('all ready product photos have separate named cards with a plus tile rather than a candidate dropdown',()=>{
 const html=renderToStaticMarkup(<BrandProductPhotos brandId="kit" assets={assets} urls={{red:'blob:red',maroon:'blob:maroon'}} onKitUpdated={()=>{throw Error('Viewing must not mutate');}}/>);
 assert.equal((html.match(/class="bpp-card"/g)||[]).length,2);
 assert.match(html,/product-name-red/);assert.match(html,/product-name-maroon/);
 assert.match(html,/red.jpg/);assert.match(html,/maroon.jpg/);assert.match(html,/Add product image/);
 assert.doesNotMatch(html,/<select|Replace|Uploaded candidates/);
});
test('empty collection retains the add-product placeholder without creating fictitious product entries',()=>{
 const html=renderToStaticMarkup(<BrandProductPhotos brandId="kit" assets={[{id:'logo',role:'logo_primary',status:'ready'},{id:'pending',role:'product_image',status:'pending'}]} urls={{}} onKitUpdated={()=>{throw Error('No write');}}/>);
 assert.match(html,/Product photography \(0\)/);assert.doesNotMatch(html,/class="bpp-card"/);assert.match(html,/Add product image/);
});
test('new names derive from their own file and disambiguate existing names without reusing another product label',()=>{
 assert.equal(productPhotoName('matte-maroon.jpg',assets),'matte maroon');
 assert.equal(productPhotoName('signature-red-matte-lipstick.png',assets),'signature red matte lipstick 2');
 assert.throws(()=>productPhotoMetadata(' '),/Enter a product image name/);
 assert.deepEqual(productPhotoMetadata('  Matte Maroon  '),{label:'Matte Maroon',description:undefined,usageGuidance:undefined});
});
test('successive named uploads preserve every previous photo and send independent labels',async()=>{
 let kit:BrandKitSummary={id:'kit',name:'Brand',assetUploadPolicy:'append-product-model-v1',assets:[...assets]};
 const requested:string[]=[];let next=0;
 const api={getKit:async()=>structuredClone(kit),requestAssetUploadUrl:async(_id:string,input:{label?:string})=>{requested.push(input.label||'');return {uploadUrl:'https://synthetic.invalid/upload',assetId:'new-'+(++next)};},confirmAsset:async(_id:string,id:string)=>{kit={...kit,assets:[...kit.assets!,{id,role:'product_image',status:'ready',label:requested.at(-1)}]};return structuredClone(kit);}};
 const before=JSON.stringify(assets);
 await uploadBrandImage(api,async()=>{},'kit','product_image',new File(['red'],'red-photo.png',{type:'image/png'}),productPhotoMetadata('Matte Red'));
 await uploadBrandImage(api,async()=>{},'kit','product_image',new File(['maroon'],'maroon-photo.png',{type:'image/png'}),productPhotoMetadata('Matte Maroon'));
 assert.deepEqual(requested,['Matte Red','Matte Maroon']);assert.equal(kit.assets?.length,4);assert.equal(JSON.stringify(assets),before);
});
