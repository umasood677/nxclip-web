import {readFileSync} from 'node:fs';
import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {BrandOverviewProducts} from './BrandOverviewProducts';
import {overviewHeaderAssets,overviewCharacterState} from './brandOverviewModel';
import {newBrandCharacter} from '../guided/brandCharacterModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';
const assets=['Red','Maroon','Brown'].map((name,index)=>({id:'photo-'+index,role:'product_image',status:'ready',mimeType:'image/png',label:name}));
const kit:BrandKitSummary={id:'brand',name:'Actual Brand',assets,products:[]};
test('three uploaded product photos show Products (3) without a contradictory empty state or fabricated SKU',()=>{
 const before=JSON.stringify(kit),html=renderToStaticMarkup(<MemoryRouter><BrandOverviewProducts kit={kit} urls={{}}/></MemoryRouter>);
 assert.match(html,/Products \(3\)/);assert.doesNotMatch(html,/No registered products|No products added|SKU/);
 for(const photo of assets)assert.match(html,new RegExp('>'+photo.label+'<'));
 assert.equal(JSON.stringify(kit),before);
});
test('registered products retain their real SKU count and photographs are a separate subheading',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><BrandOverviewProducts kit={{...kit,products:[{id:'sku',name:'Actual SKU',sku:'red-01',status:'active'}]}} urls={{}}/></MemoryRouter>);
 assert.match(html,/Products \(1\)/);assert.match(html,/red-01/);assert.match(html,/Product photographs \(3\)/);
});
test('only a genuinely empty product collection shows its empty state',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><BrandOverviewProducts kit={{...kit,assets:[]}} urls={{}}/></MemoryRouter>);
 assert.match(html,/Products \(0\)/);assert.match(html,/No products added/);
});
test('header chooses brand-owned product and eligible model references without altering their source data',()=>{
 const model={id:'model-photo',role:'brand_model',status:'ready',mimeType:'image/png'};
 const profile={...newBrandCharacter('profile'),name:'Authorized model',kind:'human-model' as const,status:'approved' as const,referenceAssetIds:[model.id],permissions:{commercialUse:true,likenessConsent:true,origin:'licensed' as const,scopes:['ad-studio' as const],evidence:'Synthetic license'}};
 const configured:BrandKitSummary={...kit,assets:[...assets,model],voice:{studio:{schemaVersion:1,categoryId:'Beauty',nicheId:'Beauty',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['photo-1',model.id],characters:[profile]}}};
 const before=JSON.stringify(configured),header=overviewHeaderAssets(configured);
 assert.equal(header.model?.id,model.id);assert.equal(header.product?.id,'photo-1');assert.equal(JSON.stringify(configured),before);
 const expired={...profile,permissions:{...profile.permissions,expiresAt:'2000-01-01'}};
 assert.equal(overviewHeaderAssets({...configured,voice:{studio:{...configured.voice!.studio!,characters:[expired]}}}).model?.id,model.id);
});


test("Brand Kit header reuses Ad Studio framed image styling without changing prototype assets",()=>{const root=process.cwd()+"/src/pages/BrandKits/overview/",source=readFileSync(root+"BrandKitOverview.tsx","utf8"),css=readFileSync(root+"brandOverview.css","utf8");assert.match(source,/w0a-ads-hero__frame bo-hero-card bo-hero-card--model/);assert.match(source,/w0a-ads-hero__frame bo-hero-card bo-hero-card--product/);assert.match(css,/border-radius:10px/);assert.match(css,/bo-hero-card--product\{transform:translateY\(8px\) rotate\(6deg\)/);});

test('an uploaded model remains in the private header while its profile is a draft, without granting campaign permission',()=>{
 const model={id:'draft-photo',role:'brand_model',status:'ready',mimeType:'image/png'},profile={...newBrandCharacter('draft-profile'),name:'Draft model',referenceAssetIds:[model.id]},current:BrandKitSummary={...kit,assets:[model],voice:{studio:{schemaVersion:1,categoryId:'Beauty',nicheId:'Beauty',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:[],characters:[profile]}}},before=JSON.stringify(current);
 assert.equal(overviewHeaderAssets(current).model?.id,model.id);assert.equal(overviewCharacterState(profile,current).usable,false);assert.equal(JSON.stringify(current),before);
});
test('header model fallback uses only ready model images owned by the current kit',()=>{
 const current:BrandKitSummary={...kit,assets:[{id:'pending',role:'brand_model',status:'pending',mimeType:'image/png'},{id:'other',role:'campaign_reference',status:'ready',mimeType:'image/png'}]};assert.equal(overviewHeaderAssets(current).model,undefined);
 current.assets!.push({id:'ready-model',role:'brand_model',status:'ready',mimeType:'image/png'});assert.equal(overviewHeaderAssets(current).model?.id,'ready-model');
});
test('model header frame remains mounted during URL loading and uses a larger responsive portrait',()=>{
 const source=readFileSync('src/pages/BrandKits/overview/BrandKitOverview.tsx','utf8'),css=readFileSync('src/pages/BrandKits/overview/brandOverview.css','utf8');assert.match(source,/headerAssets.model&&<div/);assert.doesNotMatch(source,/headerAssets.model&&urls\[headerAssets.model.id\]&&/);assert.match(source,/<AssetPreview asset=\{headerAssets.model\}/);assert.match(css,/bo-hero-card--model\{flex:0 1 164px;height:205px/);assert.match(css,/@media\(max-width:400px\)/);
});
