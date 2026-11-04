import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {BrandOverviewModels} from './BrandOverviewModels';
import {overviewModelEntries} from './brandOverviewModel';
import {BrandAssetsSection} from '../components/BrandAssetsSection';
import {BrandCharactersSection} from '../guided/BrandCharactersSection';
import {newBrandCharacter} from '../guided/brandCharacterModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import {readFileSync} from 'node:fs';
const assets=Array.from({length:5},(_,i)=>({id:'model-'+i,label:'Uploaded model '+i,role:'brand_model',status:'ready',mimeType:'image/png'}));
const profile={...newBrandCharacter('profile'),name:'Saved identity',referenceAssetIds:['model-0'],appearance:'Actual saved appearance',style:'Editorial'};
const kit:BrandKitSummary={id:'brand',name:'Brand',version:1,assets,voice:{studio:{schemaVersion:1,categoryId:'Beauty',nicheId:'Beauty',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:[],characters:[profile]}}};

test('overview includes unlinked uploaded models and makes every real photo available in the scrollable panel with a View All action',()=>{
 const before=JSON.stringify(kit),gallery=overviewModelEntries(kit);
 assert.equal(gallery.entries.length,5);assert.equal(gallery.imageCount,5);assert.equal(gallery.profileCount,1);
 const html=renderToStaticMarkup(<MemoryRouter><BrandOverviewModels kit={kit} urls={{}}/></MemoryRouter>);
 for(let i=0;i<5;i++)assert.match(html,new RegExp('Uploaded model '+i));
 assert.match(html,/View all 5/);assert.match(html,/Profile needed/);
 assert.equal((html.match(/data-brand-photo="true"/g)||[]).length,5);assert.equal(JSON.stringify(kit),before);
});
test('linked legacy reference photos are included once and profiles without photographs remain visible',()=>{
 const empty={...newBrandCharacter('no-image'),name:'No photo identity'},legacy={id:'legacy',role:'other',status:'ready',mimeType:'image/jpeg',label:'Existing legacy reference'};
 const value={...kit,assets:[...assets,legacy],voice:{studio:{...kit.voice!.studio!,characters:[{...profile,referenceAssetIds:['model-0','legacy']},empty]}}};
 const gallery=overviewModelEntries(value);
 assert.equal(gallery.imageCount,6);assert.equal(gallery.entries.filter(e=>e.asset?.id==='model-0').length,1);
 assert.ok(gallery.entries.some(e=>e.asset?.id==='legacy'));assert.ok(gallery.entries.some(e=>!e.asset&&e.profile?.id===empty.id));
});
test('profile details stay beside model photos before additional assets and rendering performs no writes',()=>{
 const value={...kit,assets:[...assets,{id:'extra',role:'other',status:'ready',mimeType:'text/plain',label:'Extra file'}]};
 const panel=<BrandCharactersSection kit={value} photoCardSelection onKitUpdated={()=>{throw Error('No writes');}}/>;
 const html=renderToStaticMarkup(<MemoryRouter><BrandAssetsSection brandId={value.id} assets={value.assets!} modelProfiles={[profile]} modelProfilePanel={panel} onKitUpdated={()=>{throw Error('No writes');}}/></MemoryRouter>);
 assert.match(html,/bp-model-workspace--with-profiles/);assert.match(html,/<aside class="bp-model-profiles">/);
 assert.ok(html.indexOf('Model photographs')<html.indexOf('bp-model-profiles'));assert.ok(html.indexOf('bp-model-profiles')<html.indexOf('Additional assets'));
 assert.match(html,/Actual saved appearance/);assert.match(html,/Editorial/);assert.doesNotMatch(html,/Not specified/);
});
test('profile styling keeps Brand Details-style rows and the editor beside model images',()=>{
 const root=process.cwd()+'/src/pages/BrandKits/',css=readFileSync(root+'components/brandProductPhotos.css','utf8'),wizard=readFileSync(root+'guided/GuidedBrandKit.tsx','utf8');
 assert.match(css,/bp-model-profiles \.bp-character-characteristics>div\{display:grid;grid-template-columns:86px minmax\(0,1fr\)/);
 assert.doesNotMatch(css,/bp-model-workspace:has\(\.bp-character-editor-shell\)\{grid-template-columns:1fr/);
 assert.equal((wizard.match(/<BrandCharactersSection/g)||[]).length,1);assert.match(wizard,/modelProfilePanel=\{kit/);
});
