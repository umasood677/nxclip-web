import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import {applyTemplateProductShades,resolveProductShade,productShadeConflict,productShadeKey} from './templateProductShade';
import {automaticTemplateProducts,brandKitProductChoices,chooseTemplateProduct,templateCreatorIssues} from './templateCreatorSetup';

const kit:BrandKitSummary={id:'fixture',name:'Fixture',version:1,colors:[{role:'primary',hex:'#a6192e'},{role:'secondary',hex:'#641322'}],assets:[
 {id:'maroon',role:'product_image',status:'ready',label:'Matte Maroon lipstick'},
 {id:'red',role:'product_image',status:'ready',label:'Matte Red lipstick'},
 {id:'brown',role:'product_image',status:'ready',label:'Dark Chocolate Brown lipstick'},
],voice:{studio:{schemaVersion:1,categoryId:'beauty',nicheId:'lipstick',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['maroon','red','brown']}}};

test('selection changes the shade even when palette entries have only roles, not names',()=>{
 let config=chooseTemplateProduct({schemaVersion:1,slots:[]},0,brandKitProductChoices(kit)[1]);
 assert.equal(config.slots[0].color,'#b32032');
 config=chooseTemplateProduct(config,0,brandKitProductChoices(kit)[0]);
 assert.equal(config.slots[0].color,'#800000');
 assert.equal(resolveProductShade(kit,config.slots[0].label).source,'maroon shade guide');
});

test('exact named palette and product metadata take precedence over approximate named-color guides',()=>{
 assert.equal(resolveProductShade({...kit,colors:[{name:'Matte Maroon',hex:'#641322'}]},'Matte Maroon lipstick').color,'#641322');
 const details={...kit,assets:[{id:'neutral',role:'product_image',label:'Studio lipstick',description:'Product shade: #715062'}]};
 assert.equal(resolveProductShade(details,'Studio lipstick').color,'#715062');
 assert.equal(resolveProductShade(kit,'Unknown product').color,undefined);
});

test('product color in creative idea updates the effective generation payload as the idea changes',()=>{
 const config={schemaVersion:1 as const,slots:[{label:'Matte Red lipstick',assetId:'red'}]};
 assert.equal(applyTemplateProductShades(kit,config,'Product shade: #b51234').slots[0].color,'#b51234');
 assert.equal(applyTemplateProductShades(kit,config,'Lipstick color: #a23').slots[0].color,'#aa2233');
 assert.equal(applyTemplateProductShades(kit,config,'A product hero').slots[0].color,'#b32032');
 assert.equal(config.slots[0].assetId,'red');
 const generic={schemaVersion:1 as const,slots:[{label:'Studio lipstick',color:'#b51234'}]};
 assert.equal(applyTemplateProductShades(kit,generic,'A product hero').slots[0].color,undefined);
});

test('background, clothing, packaging and text colors never become a product shade',()=>{
 for(const idea of ['Burgundy background','Gold packaging','Pink wardrobe','Red lips','Headline color: #ffffff','CTA: #ff0000']){
  assert.equal(resolveProductShade(kit,'Matte Maroon lipstick',idea).color,'#800000',idea);
  assert.equal(productShadeConflict('Matte Maroon lipstick',idea),undefined,idea);
 }
 assert.equal(resolveProductShade(kit,'Rose Gold Artisan Lipstick Set','Use the red lipstick against a burgundy background').color,'#b32032');
});

test('automatic selection prioritizes the requested product shade over background palette words',()=>{
 assert.equal(automaticTemplateProducts(kit,'Use the red lipstick. Deep burgundy background.').slots[0].assetId,'red');
 assert.equal(automaticTemplateProducts(kit,'Maroon lipstick against a red background').slots[0].assetId,'maroon');
});

test('conflicting product identity blocks generation instead of silently recoloring a selected reference',()=>{
 const config={schemaVersion:1 as const,slots:[{label:'Matte Maroon lipstick',assetId:'maroon'}]};
 assert.equal(resolveProductShade(kit,config.slots[0].label,'Use red lipstick').color,'#800000');
 assert.ok(templateCreatorIssues(kit,config,'Use red lipstick',false,true).some(s=>s.includes('selected product is maroon')));
});

test('multiple selected products retain independent colors and manual swatch overrides',()=>{
 const config={schemaVersion:1 as const,slots:[{label:'Matte Maroon lipstick',assetId:'maroon'},{label:'Matte Red lipstick',assetId:'red'}]};
 const before=JSON.stringify(config),idea='Red lipstick shade: #b51234; Maroon lipstick shade: #651321';
 const resolved=applyTemplateProductShades(kit,config,idea);
 assert.deepEqual(resolved.slots.map(s=>s.color),['#651321','#b51234']);
 const overrides={[productShadeKey(0,config.slots[0])]:'#712235'};
 assert.deepEqual(applyTemplateProductShades(kit,config,idea,overrides).slots.map(s=>s.color),['#712235','#b51234']);
 assert.equal(JSON.stringify(config),before);
 assert.equal(resolveProductShade(kit,'Studio lipstick','Show red and maroon lipstick shades',false).color,undefined);
});
