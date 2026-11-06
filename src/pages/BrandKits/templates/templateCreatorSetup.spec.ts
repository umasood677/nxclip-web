import {test} from 'node:test';import assert from 'node:assert/strict';
import {brandKitProductChoices,automaticTemplateProducts,chooseTemplateProduct,templateCreatorIssues,TEMPLATE_IDEA_SUGGESTIONS,productShadeColor,templateIdeaNeedsModel} from './templateCreatorSetup';
import type {BrandKitSummary} from '../lib/brandKitTypes';
const kit:BrandKitSummary={id:'brand',name:'Synthetic brand',version:9,products:[{id:'sku-red',name:'Signature Red',status:'active',sku:'RED'},{id:'retired',name:'Retired',status:'archived'}],assets:[{id:'a',label:'Original red photograph',role:'product_image',status:'ready'},{id:'b',label:'Original plum photograph',role:'product_image',status:'ready'},{id:'c',label:'Unreviewed photograph',role:'product_image',status:'ready'},{id:'pending',role:'product_image',status:'pending'},{id:'logo',role:'logo_primary',status:'ready'}],voice:{studio:{schemaVersion:1,categoryId:'beauty',nicheId:'lipstick',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['a','b','logo']}}};
test('product records and photographs remain distinct; no product/photo association is invented',()=>{
 const choices=brandKitProductChoices(kit);assert.deepEqual(choices.map(c=>c.key),['product:sku-red','photo:a','photo:b','photo:c']);assert.equal(choices[0].assetId,undefined);assert.equal(choices[0].sku,'RED');assert.equal(choices[3].approved,false);
});
test('automatic mode binds only approved photographs and leaves unavailable requested products unbound',()=>{
 const before=JSON.stringify(kit),c=automaticTemplateProducts(kit,'Show three lipstick shades','chosen-model');
 assert.equal(c.slots.length,3);assert.deepEqual(c.slots.map(s=>s.assetId),['a','b',undefined]);assert.equal(c.modelProfileId,'chosen-model');assert.equal(JSON.stringify(kit),before);
});
test('collection mode derives count from available approved references, capped at existing four-slot contract',()=>{
 assert.equal(automaticTemplateProducts(kit,'A product collection').slots.length,2);
 assert.equal(automaticTemplateProducts({...kit,assets:[]},'A product collection').slots.length,1);
 assert.equal(automaticTemplateProducts(kit,'A cinematic hero').slots.length,1);
});
test('manual selection resets stale shade, preserves model and appends explicit product references without mutating inputs',()=>{
 const initial={schemaVersion:1 as const,slots:[{label:'Existing',assetId:'a',color:'#123456'}],modelProfileId:'model'},before=JSON.stringify(initial);
 let c=chooseTemplateProduct(initial,0,brandKitProductChoices(kit)[0]);assert.equal(c.slots[0].assetId,undefined);assert.equal(c.slots[0].label,'Signature Red');assert.equal(c.slots[0].color,'#b32032');
 c=chooseTemplateProduct(c,0,brandKitProductChoices(kit)[1]);c=chooseTemplateProduct(c,1,brandKitProductChoices(kit)[2]);c=chooseTemplateProduct(c,2,{key:'photo:third',label:'Third actual photo',assetId:'third',kind:'photograph',approved:true});
 assert.deepEqual(c.slots.map(s=>s.assetId),['a','b','third']);assert.equal(c.modelProfileId,'model');assert.equal(JSON.stringify(initial),before);
 assert.throws(()=>chooseTemplateProduct(c,4,brandKitProductChoices(kit)[1]),/four products/);
});
test('inline validation distinguishes missing references, unapproved photos and invalid models',()=>{
 const c=automaticTemplateProducts(kit,'Three products');assert.match(templateCreatorIssues(kit,c,'Three products',false,true).join(' '),/Choose a photograph/);
 assert.deepEqual(templateCreatorIssues(kit,c,'Three products',false,true,true),[]);
 assert.match(templateCreatorIssues(kit,{schemaVersion:1,slots:[{label:'Unreviewed',assetId:'c'}]},'Hero',false,true).join(' '),/approve the photograph/);
 assert.match(templateCreatorIssues(kit,{...automaticTemplateProducts(kit,'Hero'),modelProfileId:'unavailable'},'Hero',false,true).join(' '),/model authorization/);
 assert.match(templateCreatorIssues(kit,automaticTemplateProducts(kit,''),'',false,false).join(' '),/Describe your creative idea/);
 assert.deepEqual(templateCreatorIssues(kit,automaticTemplateProducts(kit,'Hero'),'Hero',false,true),[]);
});
import {readFileSync} from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
const source=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/BrandTemplateAiWorkspace.tsx','utf8'),tree=ts.createSourceFile('setup.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let prepareNode:ts.FunctionDeclaration|undefined,verifyNode:ts.FunctionDeclaration|undefined,chipCallback:ts.Expression|undefined;
function visit(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==='verifyTemplateSource')verifyNode=n;if(ts.isFunctionDeclaration(n)&&n.name?.text==='prepare')prepareNode=n;if(ts.isJsxAttribute(n)&&n.name.getText(tree)==='onClick'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression?.getText(tree).includes('setDirection(s.idea)'))chipCallback=n.initializer.expression;ts.forEachChild(n,visit);}visit(tree);assert.ok(prepareNode);assert.ok(chipCallback);
test('each suggestion chip populates the idea without starting generation',()=>{
 const code=ts.transpileModule('const click='+chipCallback.getText(tree)+';click;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const s of TEMPLATE_IDEA_SUGGESTIONS){let value='';const click=vm.runInNewContext(code,{s,setDirection:(v:string)=>{value=v;}}) as ()=>void;click();assert.equal(value,s.idea);}
});
function harness(configuration:ReturnType<typeof automaticTemplateProducts>,idea='An editorial collection',foreign=false){
 const calls:{kind:string;body:Record<string,unknown>}[]=[],errors:string[]=[],requested:boolean[]=[],paths:string[]=[],remembered:unknown[]=[];
 const code=ts.transpileModule(prepareNode!.getText(tree)+';prepare;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const verify=vm.runInNewContext(ts.transpileModule(verifyNode!.getText(tree).replace(/^export\s+/, '')+';verifyTemplateSource;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{Error});
 const prepare=vm.runInNewContext(code,{Error,pending:{current:false},kit,effectiveConfiguration:configuration,direction:idea,native:false,layoutValid:true,layout:'auto',format:'portrait_1080x1350',templateCreatorIssues,setError:(s:string)=>errors.push(s),setBusy:()=>{},setConfiguration:()=>{},setGenerationRequested:(v:boolean)=>requested.push(v),remember:(value:unknown)=>remembered.push(value),verifyTemplateSource:verify,navigate:(path:string)=>paths.push(path),creativeEditorPath:(id:string)=>'/create/ad/'+encodeURIComponent(id),brandTemplateApi:{createAiSource:async(_id:string,body:Record<string,unknown>)=>{calls.push({kind:'ai',body});return {};},createNativeSource:async(_id:string,body:Record<string,unknown>)=>{calls.push({kind:'native',body});return {id:'native-draft',documentPurpose:'template-draft',sceneGraph:{schemaVersion:'1.0',canvas:{width:1080,height:1350},layers:[]},currentVersion:1,templateContext:{brandKitId:foreign?'foreign':kit.id,draftKind:'native'}};}}}) as (draftOnly?:boolean)=>Promise<void>;
 return {prepare,calls,errors,requested,paths,remembered};
}
for(const count of [1,2])test('explicit '+count+'-product generation retains the existing configuration/API shape',async()=>{
 const c=automaticTemplateProducts(kit,count===1?'Hero':'Two products'),h=harness(c);await h.prepare();assert.equal(h.calls.length,1);assert.equal(h.calls[0].kind,'ai');
 assert.equal(h.calls[0].body.configuration,c);assert.equal(h.calls[0].body.templateId,'product-hero');assert.equal(h.calls[0].body.expectedBrandVersion,9);assert.deepEqual(h.requested,[true]);
});
test('invalid generation is blocked before any API request; editable draft can retain missing slots',async()=>{
 const c=automaticTemplateProducts(kit,'Three products'),h=harness(c);await h.prepare();assert.equal(h.calls.length,0);assert.match(h.errors.join(' '),/Choose a photograph/);await h.prepare(true);assert.equal(h.calls[0].kind,'native');assert.deepEqual(h.requested,[]);
});
test('labels and advanced options are concise; manual Product Count is absent',()=>{
 assert.match(source,/Describe your creative idea/);assert.match(source,/<details className="bt-advanced-options"><summary>Advanced Options/);assert.doesNotMatch(source,/<details[^>]*\bopen\b|Product count/);
 const library=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8');assert.doesNotMatch(library,/Create with AI/);assert.match(library,/Generate Template/);
});

test('Draft Editable Layout opens the verified native draft directly in the existing Canvas without AI or intermediate review',async()=>{
 const h=harness(automaticTemplateProducts(kit,'Hero'),'');await h.prepare(true);
 assert.deepEqual(h.calls.map(c=>c.kind),['native']);assert.equal('creativeDirection' in h.calls[0].body,false);assert.deepEqual(h.paths,['/create/ad/native-draft']);assert.deepEqual(h.requested,[]);assert.equal(h.remembered.length,0);assert.deepEqual(h.errors,['']);
});
test('a native draft from a different Brand Kit cannot open in Canvas',async()=>{
 const h=harness(automaticTemplateProducts(kit,'Hero'),'Hero',true);await h.prepare(true);
 assert.equal(h.paths.length,0);assert.match(h.errors.join(' '),/unavailable for the selected Brand Kit/);
});
test('automatic review does not consume its one attempt while another operation is pending',()=>{
 let callback:ts.Expression|undefined;function find(n:ts.Node){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0]?.getText(tree).includes('reviewAttempt.current!==key'))callback=n.arguments[0];ts.forEachChild(n,find);}find(tree);assert.ok(callback);
 const pending={current:true},reviewAttempt={current:''};let calls=0;
 const context={pending,reviewAttempt,busy:true,editingGeneration:false,params:{get:()=>null},source:{id:'draft',currentVersion:1},sourceId:'draft',native:true,generated:false,publish:()=>{calls++;}};
 const run=vm.runInNewContext(ts.transpileModule('const run='+callback!.getText(tree)+';run;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context) as ()=>void;
 run();assert.equal(calls,0);assert.equal(reviewAttempt.current,'');pending.current=false;context.busy=false;run();assert.equal(calls,1);assert.equal(reviewAttempt.current,'draft:1');run();assert.equal(calls,1);
});


test('product choice supplies its named Brand Kit shade and never retains another shade',()=>{
 const palette={...kit,colors:[{name:'Signature Red',hex:'#b31028'},{name:'Matte Maroon',hex:'#641322'},{name:'Chocolate Brown',hex:'#542e24'}]};
 assert.equal(productShadeColor(palette,'Matte Maroon lipstick'),'#641322');
 const selected=chooseTemplateProduct({schemaVersion:1,slots:[{label:'Red',color:'#b31028'}]},0,{key:'m',label:'Matte Maroon',assetId:'b',color:productShadeColor(palette,'Matte Maroon'),kind:'photograph',approved:true});
 assert.equal(selected.slots[0].color,'#641322');assert.equal(productShadeColor(palette,'Unknown shade'),undefined);
});
test('automatic references match named products in the idea instead of always choosing the first',()=>{
 assert.equal(automaticTemplateProducts(kit,'Original plum lipstick hero').slots[0].assetId,'b');
});
test('a requested model must be selected explicitly; product-only and optional models stay optional',()=>{
 assert.equal(templateIdeaNeedsModel('Use the approved female model alongside the product'),true);
 assert.equal(templateIdeaNeedsModel('Product-only, no brand model'),false);
 assert.equal(templateIdeaNeedsModel('Use products and optional approved Brand Model'),false);
 assert.ok(templateCreatorIssues(kit,automaticTemplateProducts(kit,''),'Use the brand model with lipstick',false,true).some(x=>x.includes('Select an approved Brand Model')));
});
