import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {brandOverviewPaths,overviewInventory,overviewCharacterState} from './brandOverviewModel';
import {newBrandCharacter} from '../guided/brandCharacterModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';
const kit={id:'brand-a',name:'Actual Brand',assets:[{id:'photo',role:'product_image',status:'ready',mimeType:'image/png'},{id:'pending',role:'product_image',status:'pending',mimeType:'image/png'}],products:[],colors:[],typography:[],voice:{studio:{schemaVersion:1,categoryId:'Beauty',nicheId:'Cosmetics',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['photo']}}} as BrandKitSummary;
test('overview counts only real ready assets and never turns photographs into product records',()=>{
 const before=JSON.stringify(kit),value=overviewInventory(kit);
 assert.equal(value.assets.length,1);assert.equal(value.productPhotos.length,1);assert.equal(value.products.length,0);assert.equal(JSON.stringify(kit),before);
});
test('all overview actions carry the saved brand ID into existing editors and project entry',()=>{
 const paths=brandOverviewPaths('brand-a');
 assert.equal(paths.overview,'/brands/brand-a/overview');assert.equal(paths.templates,'/brands/brand-a/templates?tab=brand');
 assert.match(paths.createAd,/brandId=brand-a/);assert.match(paths.assets,/guided\?step=assets/);assert.match(paths.generate,/mode=ai/);
});
test('expired, missing references and scope-limited model permissions never appear approved',()=>{
 const profile={...newBrandCharacter('character'),name:'Authorized Model',status:'approved' as const,referenceAssetIds:['photo'],permissions:{commercialUse:true,likenessConsent:true,origin:'licensed' as const,scopes:['ad-studio' as const],evidence:'Owner license',expiresAt:'2027-01-01'}};
 const now=new Date('2026-11-01');
 assert.equal(overviewCharacterState(profile,kit,now).usable,true);
 assert.equal(overviewCharacterState({...profile,permissions:{...profile.permissions,expiresAt:'2020-01-01'}},kit,now).label,'Authorization expired');
 assert.equal(overviewCharacterState({...profile,referenceAssetIds:['foreign']},kit,now).usable,false);
 assert.equal(overviewCharacterState({...profile,permissions:{...profile.permissions,scopes:[]}},kit,now).usable,false);
});
function loadReady(){
 const source=readFileSync(process.cwd()+'/src/pages/BrandKits/guided/BrandKitReadyCollection.tsx','utf8');
 const exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:(id:string)=>{
 if(id==='react')return React;if(id==='react-router-dom')return {Link:({to,children,...props}:any)=>React.createElement('a',{...props,href:to},children)};
 if(id==='lucide-react')return new Proxy({},{get:()=>()=>null});
 if(id.includes('brandOverviewModel'))return {brandOverviewPaths,overviewInventory,overviewCharacterState};
 if(id.endsWith('.css'))return {};throw Error(id);
 }});
 return exports.BrandKitReadySummary as React.ComponentType<any>;
}
test('Ready renders one compact saved overview link, scoped actions and actual counts without duplicated dashboard',()=>{
 const Ready=loadReady(),html=renderToStaticMarkup(<MemoryRouter><Ready kit={kit} dirty={false} urls={{}} onEdit={()=>{}} onAssets={()=>{}}/></MemoryRouter>);
 assert.match(html,/href="\/brands\/brand-a\/overview"/);assert.match(html,/View Brand Kit/);assert.match(html,/brandId=brand-a/);
 assert.match(html,/Brand Templates/);assert.doesNotMatch(html,/Identity and guidelines reviewed|Template drafts|bo-template-grid|bp-brochure/);
});
test('overview route stays protected and uses existing authenticated data access with stale response guards',()=>{
 const app=readFileSync(process.cwd()+'/src/App.tsx','utf8'),source=readFileSync(process.cwd()+'/src/pages/BrandKits/overview/BrandKitOverview.tsx','utf8');
 assert.match(app,/path="\/brands\/:brandId\/overview" element={<BrandKitOverview/);
 assert.match(source,/brandApi.getKit\(brandId\)/);assert.match(source,/result.id!==brandId/);assert.match(source,/active=false/);
 assert.doesNotMatch(source,/brandApi\.(create|update|delete)|fetch\(|localStorage/);
});

test('Ready distinguishes review, missing identity configuration and unsaved state without data writes',()=>{
 const Ready=loadReady(),before=JSON.stringify(kit),html=renderToStaticMarkup(<Ready kit={kit} dirty={true} urls={{}} onEdit={()=>{}} onAssets={()=>{}}/>);
 assert.match(html,/Unsaved changes/);assert.match(html,/Brand Kit readiness/);assert.match(html,/Brand identity/);assert.match(html,/Creative guidelines/);assert.match(html,/0 colors · 0 fonts/);assert.match(html,/1 available/);assert.equal((html.match(/data-complete="true"/g)||[]).length,3);assert.equal(JSON.stringify(kit),before);
 const missing={...kit,voice:{...kit.voice,studio:{...kit.voice!.studio!,identityApproved:false,guidelinesApproved:false}}};
 const needsReview=renderToStaticMarkup(<Ready kit={missing} dirty={false} urls={{}} onEdit={()=>{}} onAssets={()=>{}}/>);assert.match(needsReview,/Review needed/);assert.match(needsReview,/Review identity/);assert.match(needsReview,/Review guidelines/);
});
