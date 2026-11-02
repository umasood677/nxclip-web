import {test} from 'node:test';import assert from 'node:assert/strict';
import {characterProfilePatch,newBrandCharacter,attachCharacterReference} from './brandCharacterModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';
const kit:BrandKitSummary={id:'kit',name:'Brand',version:82,assets:[{id:'new-model',role:'brand_model',status:'ready',mimeType:'image/png'}],voice:{tone:'Keep this tone',studio:{schemaVersion:1,categoryId:'General',nicheId:'Fashion',businessGoals:['Awareness'],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['removed-older-asset'],characters:[]}}};
test('saving a new model profile does not resubmit stale unrelated asset approvals',()=>{
 const draft=attachCharacterReference({...newBrandCharacter('profile'),kind:'human-model',name:'New model'},kit,'new-model'),before=JSON.stringify(kit),patch=characterProfilePatch(kit,draft,82);
 assert.equal(patch.expectedVersion,82);assert.deepEqual(Object.keys(patch.voice),['studio']);assert.equal('approvedAssetIds' in patch.voice.studio,false);assert.equal('tone' in patch.voice,false);
 assert.deepEqual(patch.voice.studio.characters[0].referenceAssetIds,['new-model']);assert.equal(patch.voice.studio.characters[0].status,'draft');assert.equal(JSON.stringify(kit),before);
 const merged={...kit.voice,studio:{...kit.voice!.studio,...patch.voice.studio}};assert.deepEqual(merged.studio.approvedAssetIds,['removed-older-asset']);assert.equal(merged.tone,'Keep this tone');
});
test('profile updates retain other models and all required DTO context without granting permissions',()=>{
 const existing={...newBrandCharacter('other'),name:'Existing'},current={...kit,voice:{...kit.voice,studio:{...kit.voice!.studio!,characters:[existing]}}},draft={...newBrandCharacter('profile'),name:'Second'};
 const patch=characterProfilePatch(current,draft,82);assert.equal(patch.voice.studio.schemaVersion,1);assert.equal(patch.voice.studio.categoryId,'General');assert.equal(patch.voice.studio.nicheId,'Fashion');assert.deepEqual(patch.voice.studio.businessGoals,['Awareness']);assert.deepEqual(patch.voice.studio.characters.map(p=>p.id),['other','profile']);assert.equal(draft.permissions.commercialUse,false);
});
test('stale versions, foreign references and unapproved human permissions still block saving',()=>{
 const draft={...newBrandCharacter('profile'),name:'New model'};assert.throws(()=>characterProfilePatch(kit,draft,81),/changed/);assert.throws(()=>characterProfilePatch(kit,draft,undefined),/changed/);
 assert.throws(()=>characterProfilePatch(kit,{...draft,referenceAssetIds:['foreign']},82),/ready images/);assert.throws(()=>characterProfilePatch(kit,{...draft,kind:'human-model',status:'approved',referenceAssetIds:['new-model']},82),/authorization|consent/);
});
test('upload version rebase saves only the selected new reference without clearing earlier profiles',()=>{
 const updated={...kit,version:83},draft=attachCharacterReference({...newBrandCharacter('profile'),name:'Uploaded'},updated,'new-model');assert.throws(()=>characterProfilePatch(updated,draft,82),/changed/);assert.equal(characterProfilePatch(updated,draft,83).expectedVersion,83);
});
