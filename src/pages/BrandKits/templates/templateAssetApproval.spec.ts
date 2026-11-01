import {test} from 'node:test';import assert from 'node:assert/strict';
import {templateAssetApprovalPatch} from './templateAssetApproval';import type {BrandKitSummary,BrandCharacterProfile} from '../lib/brandKitTypes';
const expired:BrandCharacterProfile={id:'model-profile',name:'Expired model',kind:'human-model',status:'approved',referenceAssetIds:['model-photo'],appearance:'',style:'',wardrobe:'',expressions:'',consistencyRules:'',permissions:{commercialUse:true,likenessConsent:true,origin:'consented',scopes:['ad-studio'],evidence:'Synthetic fixture',expiresAt:'2000-01-01T00:00:00Z'}};
const kit:BrandKitSummary={id:'kit',name:'Fixture',version:41,assets:[{id:'product',role:'product_image',status:'ready'},{id:'model-photo',role:'brand_model',status:'ready'}],voice:{tone:'Editorial',studio:{schemaVersion:1,categoryId:'beauty',nicheId:'lipstick',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['model-photo'],characters:[expired]}}};
test('source approval omits unrelated model profiles and voice fields',()=>{
 const before=JSON.stringify(kit),patch=templateAssetApprovalPatch(kit,'product');
 assert.equal(patch.expectedVersion,41);assert.deepEqual(patch.voice.studio.approvedAssetIds,['model-photo','product']);
 assert.equal(Object.hasOwn(patch.voice.studio,'characters'),false);assert.deepEqual(Object.keys(patch.voice),['studio']);assert.equal('tone'in patch.voice,false);assert.equal(JSON.stringify(kit),before);
 // This is the existing server studio merge; expiration and permissions remain unchanged.
 const merged={...kit.voice,studio:{...kit.voice!.studio,...patch.voice.studio}};assert.deepEqual(merged.studio.characters,[expired]);assert.equal(merged.tone,'Editorial');assert.equal(merged.studio.characters![0].permissions.expiresAt,'2000-01-01T00:00:00Z');
});
test('approval preserves required studio fields and deduplicates source identifiers',()=>{const patch=templateAssetApprovalPatch(kit,'model-photo');assert.deepEqual(patch.voice.studio.approvedAssetIds,['model-photo']);assert.equal(patch.voice.studio.schemaVersion,1);assert.equal(patch.voice.studio.identityApproved,true);});
test('foreign, pending and unversioned sources cannot produce a patch',()=>{assert.throws(()=>templateAssetApprovalPatch(kit,'foreign'),/this Brand Kit/);assert.throws(()=>templateAssetApprovalPatch({...kit,assets:[{id:'product',status:'pending'}]},'product'),/ready/);assert.throws(()=>templateAssetApprovalPatch({...kit,version:undefined},'product'),/Reload/);});
