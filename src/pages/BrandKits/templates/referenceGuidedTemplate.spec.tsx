import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {templateReferenceInput,templateRegenerationInstruction} from './templateReferenceInput';
import {TemplateFidelityReviewPanel,emptyFidelityReview,fidelityComplete} from './TemplateFidelityReview';
import {assertReferenceTemplateQuote,type ImageQuote} from '../../AdStudio/production/imageExecutionModel';
import type {WorkspaceCreative} from '../../AdStudio/lib/projectWorkspace';
import type {BrandKitSummary} from '../lib/brandKitTypes';
const source={id:'draft',projectId:'private',documentPurpose:'template-draft',proposalDirection:'Editorial direction.\nHeadline: Old sample',sceneGraph:{schemaVersion:'1.0',canvas:{width:1080,height:1350},layers:[{id:'p',type:'image',assetId:'product',x:0,y:0,width:200,height:300,zIndex:1},{id:'t',name:'Headline',type:'text',text:'Latest Canvas headline',x:0,y:0,width:800,height:100,zIndex:2}]}} as WorkspaceCreative;
const brand={assets:[{id:'product',role:'product_image'}],voice:{studio:{characters:[{id:'profile',referenceAssetIds:['portrait']} ]}}} as unknown as BrandKitSummary;
test('builds product/model/style inputs together without dropping selections',()=>{
 const r=templateReferenceInput(source,brand,['profile'],['style'],'generate');assert.equal(r.issue,null);assert.deepEqual(r.references.map(r=>r.purpose),['PRODUCT_IDENTITY','MODEL_IDENTITY','STYLE_REFERENCE']);
 assert.match(templateReferenceInput(source,brand,['profile'],['style','other'],'refine').issue!,/four/);
});
test('reopen/regenerate retains exact reference identities and hashes and latest editable copy',()=>{
 const retained={...source,templateReferenceManifest:[{assetId:'product',purpose:'PRODUCT_IDENTITY' as const,sha256:'a'.repeat(64),provenance:{brandKitId:'kit',brandVersion:2}}]};
 assert.equal(templateReferenceInput(retained,brand,[],[],'generate').references[0].expectedSha256,'a'.repeat(64));
 assert.match(templateRegenerationInstruction(source),/Headline: Latest Canvas headline/);assert.doesNotMatch(templateRegenerationInstruction(source),/Old sample/);
});
test('requires explicit fidelity review and leaves concerns unapproved',()=>{
 const r=emptyFidelityReview();assert.equal(fidelityComplete(r,true),false);
 for(const key of ['modelIdentity','modelProportions','productGeometry','packaging','shade','branding','noBakedCopy'] as const)r[key]=true;
 assert.equal(fidelityComplete(r,true),true);r.concerns=['Packaging typo'];assert.equal(fidelityComplete(r,true),false);
 const html=renderToStaticMarkup(<TemplateFidelityReviewPanel value={emptyFidelityReview()} onChange={()=>{}} hasModel disabled={false}/>);
 assert.match(html,/Same recognizable model/);assert.match(html,/packaging and printing/);assert.doesNotMatch(html,/checked=""/);
});
test('new template mode verifies runtime support and cannot silently fall back to native overlays',()=>{
 assert.throws(()=>assertReferenceTemplateQuote({compositionMode:'source-preserving-v1'} as ImageQuote,'reference-guided-template-v1'));
 assert.doesNotThrow(()=>assertReferenceTemplateQuote({compositionMode:'reference-guided-template-v1'} as ImageQuote,'reference-guided-template-v1'));
 const code=readFileSync('src/pages/AdStudio/production/ProductionImageGeneration.tsx','utf8');assert.match(code,/!referenceGuided && proposal && onProviderUnavailable/);
 const workspace=readFileSync('src/pages/BrandKits/templates/BrandTemplateAiWorkspace.tsx','utf8');assert.match(workspace,/replaceTemplateId:target.id/);assert.match(workspace,/regeneration=\{editingGeneration\}/);
});
