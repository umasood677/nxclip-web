import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {BrandProductPhotos} from './BrandProductPhotos';
import {uploadBrandImage} from '../lib/uploadBrandImage';
import {productPhotoMetadata,photoAspectRatio} from './productPhotoModel';
import {attachCharacterReference,newBrandCharacter,characterReviewIssues} from '../guided/brandCharacterModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';

test('multiple model photographs render independently with their own names and additive placeholder',()=>{
 const assets=[{id:'front',role:'brand_model',status:'ready',mimeType:'image/png',label:'Zoe front portrait'},{id:'side',role:'brand_model',status:'ready',mimeType:'image/png',label:'Zoe profile portrait'},{id:'product',role:'product_image',status:'ready'}];
 const html=renderToStaticMarkup(<BrandProductPhotos role="brand_model" brandId="kit" assets={assets} urls={{front:'blob:front',side:'blob:side'}} onKitUpdated={()=>{throw Error('No mutations on view');}} onManageCharacters={()=>{}}/>);
 assert.match(html,/Model photographs \(2\)/);assert.equal((html.match(/class="bpp-card"/g)||[]).length,2);
 assert.match(html,/Add model image/);assert.match(html,/Manage model profiles/);assert.match(html,/Zoe front portrait/);assert.match(html,/Zoe profile portrait/);
 assert.doesNotMatch(html,/Product image name|Add product image|Uploaded candidates|Replace/);
});
test('consecutive model uploads preserve previous photos and can link to one draft profile without approving it',async()=>{
 const profile={...newBrandCharacter('model'),name:'Zoe',kind:'human-model' as const};
 let kit:BrandKitSummary={id:'kit',name:'Brand',assetUploadPolicy:'append-product-model-v1',assets:[],voice:{studio:{schemaVersion:1,categoryId:'Beauty',nicheId:'Beauty',businessGoals:[],identityApproved:false,guidelinesApproved:false,characters:[profile]}}};
 const requests:{role:string;label?:string}[]=[];
 const api={getKit:async()=>structuredClone(kit),requestAssetUploadUrl:async(_id:string,body:{role:string;label?:string})=>{requests.push(body);return {uploadUrl:'https://synthetic.invalid/upload',assetId:'photo-'+requests.length};},confirmAsset:async(_id:string,id:string)=>{kit={...kit,assets:[...kit.assets!,{id,role:'brand_model',status:'ready',mimeType:'image/png',label:requests.at(-1)?.label}]};return structuredClone(kit);}};
 for(const name of ['Zoe front','Zoe profile'])await uploadBrandImage(api,async()=>{},'kit','brand_model',new File(['fixture'],name+'.png',{type:'image/png'}),productPhotoMetadata(name,'','','model'));
 assert.deepEqual(requests.map(r=>[r.role,r.label]),[['brand_model','Zoe front'],['brand_model','Zoe profile']]);
 const linked=attachCharacterReference(attachCharacterReference(profile,kit,'photo-1'),kit,'photo-2');
 assert.deepEqual(linked.referenceAssetIds,['photo-1','photo-2']);assert.equal(linked.status,'draft');assert.equal(kit.assets?.length,2);assert.deepEqual(kit.voice?.studio?.characters,[profile]);
});
test('creative descriptions stay optional while human approval still requires valid permission and references',()=>{
 const profile={...newBrandCharacter('model'),name:'Zoe',kind:'human-model' as const};
 assert.deepEqual(characterReviewIssues(profile,[]),[]);
 assert.ok(characterReviewIssues({...profile,status:'approved'},[]).length>0);
 const source=readFileSync(process.cwd()+'/src/pages/BrandKits/guided/BrandCharactersSection.tsx','utf8');
 assert.match(source,/<details className="bp-character-optional">/);assert.match(source,/Key characteristics/);assert.match(source,/Additional creative preferences/);
 for(const field of ['style','wardrobe','expressions','consistencyRules'])assert.ok(source.includes('"'+field+'"'));
 assert.match(source,/kit.id,\s*"brand_model",\s*file/);assert.doesNotMatch(source,/target.kind === "human-model" \? "brand_model" : "other"/);assert.match(source,/draft.permissions.likenessConsent/);assert.match(source,/draft.permissions.expiresAt/);
});

test("model media uses its native ratio rather than a letterboxed fixed-height frame",()=>{for(const [w,h] of [[900,1600],[1600,900],[1200,1200]])assert.equal(photoAspectRatio(w,h),w/h);assert.equal(photoAspectRatio(0,0),4/5);const html=renderToStaticMarkup(<BrandProductPhotos role="brand_model" brandId="kit" assets={[{id:"portrait",role:"brand_model",status:"ready",label:"Portrait"}]} urls={{}} onKitUpdated={()=>{}}/>);assert.match(html,/bpp-model-image/);assert.match(html,/aspect-ratio:0.8;height:auto/);});
