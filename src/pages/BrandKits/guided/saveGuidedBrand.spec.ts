import { test } from "node:test";
import assert from "node:assert/strict";
import { saveGuidedBrand } from "./saveGuidedBrand";
import { newGuidedDraft } from "./guidedBrandModel";
test("unchanged existing draft performs no write", async () => {
 const draft=newGuidedDraft(); let writes=0;
 const api={createKit:async()=>{writes++;return {id:"b",name:"Brand",version:1};},updateKit:async()=>{writes++;return {id:"b",name:"Brand",version:2};}};
 const result=await saveGuidedBrand(draft,{id:"b",name:"Brand",version:1},JSON.stringify(draft),api);
 assert.equal(writes,0); assert.equal(result.changed,false);
});
test("changed save preserves concurrency and metadata and returns persisted identity", async () => {
 const draft={...newGuidedDraft(),name:"Updated"};
 const result=await saveGuidedBrand(draft,{id:"b",name:"Brand",version:7,voice:{custom:"retained"}},"old",{
 createKit:async()=>{throw Error("must update");},updateKit:async(id,payload)=>{assert.equal(id,"b");assert.equal(payload.expectedVersion,7);assert.equal(payload.voice.custom,"retained");return {id,name:payload.name,version:8};}});
 assert.equal(result.kit.name,"Updated");assert.equal(result.changed,true);
});
test("save failure rejects without a success result or fallback create",async()=>{
 await assert.rejects(saveGuidedBrand({...newGuidedDraft(),name:"Brand"},{id:"b",name:"Brand",version:1},"old",{createKit:async()=>{throw Error("must not create");},updateKit:async()=>{throw Error("Save unavailable");}}),/Save unavailable/);
});
test("new draft is created once and can subsequently be saved without another create",async()=>{
 const draft={...newGuidedDraft(),name:"Brand"};let writes=0;
 const api={createKit:async()=>{writes++;return {id:"b",name:"Brand",version:1};},updateKit:async()=>{throw Error("no update expected");}};
 const first=await saveGuidedBrand(draft,null,"",api);
 await saveGuidedBrand(draft,first.kit,JSON.stringify(draft),api);assert.equal(writes,1);
});
