import {test} from 'node:test';import assert from 'node:assert/strict';
import {uploadBrandImage,type BrandImageUploadApi} from '../lib/uploadBrandImage';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import {templateAssetApprovalPatch} from './templateAssetApproval';
import {chooseTemplateProduct,templateCreatorIssues} from './templateCreatorSetup';
import type {TemplateProductConfiguration} from './templateProductSettings';
const image=new File([new Uint8Array([10,20,30])],'reference.png',{type:'image/png'});
function originalKit():BrandKitSummary{return {id:'kit',name:'Fixture',version:7,assetUploadPolicy:'append-product-model-v1',assets:[{id:'original',role:'product_image',status:'ready',label:'Original product'}],voice:{studio:{schemaVersion:1,categoryId:'General',nicheId:'Fashion',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['original']}}};}
test('adding and approving two more photos preserves the first slot and enables three-product generation',async()=>{
 let kit=originalKit(),index=0;
 const puts:File[]=[];
 const api:BrandImageUploadApi={getKit:async()=>kit,requestAssetUploadUrl:async()=>({assetId:'new-'+(++index),uploadUrl:'https://fixture.test/upload'}),confirmAsset:async(_id,assetId)=>{kit={...kit,version:kit.version!+1,assets:[...kit.assets!,{id:assetId,role:'product_image',status:'ready',label:'Photo '+index}]};return kit;}};
 let c:TemplateProductConfiguration={schemaVersion:1,slots:[{label:'Original product',assetId:'original',color:'#123456'}]};
 const first=JSON.stringify(c.slots[0]);
 for(let n=0;n<2;n++){
  const result=await uploadBrandImage(api,async(_url,file)=>{puts.push(file);},'kit','product_image',image);
  const patch=templateAssetApprovalPatch(result.kit,result.assetId);
  kit={...result.kit,version:result.kit.version!+1,voice:{...result.kit.voice,studio:{...result.kit.voice!.studio!,...patch.voice.studio}}};
  c=chooseTemplateProduct(c,c.slots.length,{key:'photo:'+result.assetId,label:'Photo '+index,assetId:result.assetId,kind:'photograph',approved:true});
  assert.equal(JSON.stringify(c.slots[0]),first);assert.equal(kit.assets!.find(a=>a.id==='original')?.status,'ready');
 }
 assert.deepEqual(c.slots.map(s=>s.assetId),['original','new-1','new-2']);assert.deepEqual(templateCreatorIssues(kit,c,'Show three actual product shades',false,true),[]);
 assert.equal(puts.length,2);assert.equal(puts.every(file=>file===image),true);
});
for(const role of ['product_image','brand_model'])test(role+' upload refuses the old destructive service before requesting an upload URL or sending bytes',async()=>{
 let writes=0,puts=0;const kit=originalKit();delete kit.assetUploadPolicy;
 await assert.rejects(uploadBrandImage({getKit:async()=>kit,requestAssetUploadUrl:async()=>{writes++;return {assetId:'new',uploadUrl:'unused'};},confirmAsset:async()=>{writes++;return kit;}},async()=>{puts++;},'kit',role,image),/updated Content service/);
 assert.equal(writes,0);assert.equal(puts,0);
});
test('cross-account and incomplete preflight data cannot start an upload',async()=>{
 for(const kit of [{...originalKit(),id:'other'},{...originalKit(),assets:undefined}]){
  let writes=0;await assert.rejects(uploadBrandImage({getKit:async()=>kit,requestAssetUploadUrl:async()=>{writes++;return {assetId:'new',uploadUrl:'unused'};},confirmAsset:async()=>kit},async()=>{},'kit','product_image',image),/could not be verified/);assert.equal(writes,0);
 }
});
test('a confirmation that unexpectedly loses an earlier photo is not accepted or retried',async()=>{
 let confirmations=0;const before=originalKit(),after={...before,assets:[{id:'new',role:'product_image',status:'ready'}]};
 await assert.rejects(uploadBrandImage({getKit:async()=>before,requestAssetUploadUrl:async()=>({assetId:'new',uploadUrl:'https://fixture.test/upload'}),confirmAsset:async()=>{confirmations++;return after;}},async()=>{},'kit','product_image',image),/earlier photograph became unavailable/);
 assert.equal(confirmations,1);assert.equal(before.assets![0].id,'original');
});

