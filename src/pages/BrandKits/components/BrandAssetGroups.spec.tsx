import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {BrandAssetsSection} from './BrandAssetsSection';
import {profileForModelPhoto,newBrandCharacter} from '../guided/brandCharacterModel';
import {readFileSync} from 'node:fs';
test('logos and campaign references are fixed cards with replacement but no deletion',()=>{
 const roles=['logo_primary','logo_light','logo_dark','logo_mark','campaign_reference'];
 const html=renderToStaticMarkup(<BrandAssetsSection brandId="kit" assets={roles.map(role=>({id:role,role,status:'ready',mimeType:'image/png',label:role+' image'}))} onKitUpdated={()=>{throw Error('No writes on render');}}/>);
 assert.match(html,/Logos &amp; campaign references \(5\)/);assert.match(html,/bpp-grid--row/);assert.equal((html.match(/>Replace image</g)||[]).length,5);assert.doesNotMatch(html,/aria-label="Remove logo|aria-label="Remove campaign/);
 for(const role of roles)assert.match(html,new RegExp('product-name-'+role));
 assert.equal((html.match(/Description &amp; usage/g)||[]).length,5);assert.doesNotMatch(html,/bpp-remove/);assert.doesNotMatch(html,/Uploaded candidates|Drop image or upload/);
});
test('every model photo exposes Create profile directly, without calling it while viewing',()=>{
 const assets=['front','side'].map(id=>({id,role:'brand_model',status:'ready',mimeType:'image/png',label:id}));
 let calls=0;const html=renderToStaticMarkup(<BrandAssetsSection brandId="kit" assets={assets} onKitUpdated={()=>{}} onUseModelImage={()=>calls++}/>);
 assert.equal((html.match(/>Create profile<\/span>/g)||[]).length,2);assert.equal(calls,0);
});
test('Create profile opens a linked profile without modifying approval or creating a duplicate',()=>{
 const profile={...newBrandCharacter('profile'),name:'Existing model',referenceAssetIds:['photo'],status:'approved' as const};
 const kit={assets:[{id:'photo',role:'brand_model',status:'ready',mimeType:'image/png'}],voice:{studio:{characters:[profile]}}},before=JSON.stringify(kit);
 const result=profileForModelPhoto(kit,'photo');assert.equal(result.id,'profile');assert.equal(result.status,'approved');assert.notEqual(result,profile);assert.equal(JSON.stringify(kit),before);
});
test('unlinked ready photos prepare only a new unsaved draft; foreign or non-model assets are rejected',()=>{
 const kit={assets:[{id:'photo',role:'brand_model',status:'ready',mimeType:'image/png'},{id:'product',role:'product_image',status:'ready',mimeType:'image/png'}]};
 const profile=profileForModelPhoto(kit,'photo');assert.equal(profile.status,'draft');assert.deepEqual(profile.referenceAssetIds,['photo']);assert.equal(profile.permissions.commercialUse,false);
 assert.throws(()=>profileForModelPhoto(kit,'foreign'));assert.throws(()=>profileForModelPhoto(kit,'product'));
});
test('singleton replacement is explicit and guarded, and model selection stays brand scoped',()=>{
 const root=process.cwd()+'/src/pages/BrandKits/',cards=readFileSync(root+'components/BrandProductPhotos.tsx','utf8'),profiles=readFileSync(root+'guided/BrandCharactersSection.tsx','utf8');
 assert.match(cards,/if\(replaces&&!window.confirm/);assert.match(cards,/replaces\?'Replace image'/);
 assert.match(profiles,/modelPhotoRequest.brandId!==kit.id/);assert.match(profiles,/choose\(profileForModelPhoto/);
});


test("empty logo/reference slots offer Add image and never Delete",()=>{const html=renderToStaticMarkup(<BrandAssetsSection brandId="kit" assets={[]} onKitUpdated={()=>{}}/>);assert.equal((html.match(/bpp-empty-slot/g)||[]).length,5);for(const label of ["Primary logo","Light logo","Dark logo","Brand icon","Campaign reference"])assert.ok(html.includes(label));assert.doesNotMatch(html,/bpp-remove|>Replace image</);});

test('approved model photos show a non-button Approved badge and Edit profile instead of Create profile',()=>{
 const assets=[{id:'linked',role:'brand_model',status:'ready',mimeType:'image/png',label:'Approved model'},{id:'unlinked',role:'brand_model',status:'ready',mimeType:'image/png',label:'New reference'}];
 const profile={...newBrandCharacter('linked-profile'),name:'Approved model',kind:'human-model' as const,status:'approved' as const,referenceAssetIds:['linked'],permissions:{commercialUse:true,likenessConsent:true,origin:'licensed' as const,scopes:['ad-studio' as const],evidence:'Synthetic release'}};
 const html=renderToStaticMarkup(<BrandAssetsSection brandId="kit" assets={assets} modelProfiles={[profile]} onKitUpdated={()=>{}} onUseModelImage={()=>{}}/>);
 assert.match(html,/<span class="bpp-model-status"[^>]*data-approved="true"[^>]*>Approved<\/span>/);
 assert.equal((html.match(/>Create profile<\/span>/g)||[]).length,1);assert.match(html,/>Edit profile<\/span>/);
 assert.doesNotMatch(html,/<button[^>]*>Approved<\/button>/);assert.match(html,/class="bpp-model-action"/);
});
test('expired approved profiles show Review profile and are never labelled currently approved',()=>{
 const assets=[{id:'linked',role:'brand_model',status:'ready',mimeType:'image/png',label:'Model'}];
 const profile={...newBrandCharacter('expired'),name:'Model',status:'approved' as const,referenceAssetIds:['linked'],permissions:{commercialUse:true,likenessConsent:false,origin:'owner-created' as const,scopes:['ad-studio' as const],evidence:'Synthetic declaration',expiresAt:'2000-01-01'}};
 const html=renderToStaticMarkup(<BrandAssetsSection brandId="kit" assets={assets} modelProfiles={[profile]} onKitUpdated={()=>{}} onUseModelImage={()=>{}}/>);
 assert.match(html,/Authorization expired/);assert.match(html,/>Review profile<\/span>/);assert.doesNotMatch(html,/data-approved="true"/);
});
