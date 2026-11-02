import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewImageUrls,preloadReviewImages,watchReviewMedia} from './reviewMediaLoading';
import type {AdSceneGraph} from '../../AdStudio/types';
const graph:AdSceneGraph={schemaVersion:'1.0',canvas:{width:100,height:125},layers:[
 {id:'image',type:'image',assetId:'image',x:0,y:0,width:100,height:125,zIndex:1},
 {id:'hidden',type:'image',assetId:'hidden',visible:false,x:0,y:0,width:10,height:10,zIndex:2},
 {id:'logo',type:'logo',assetId:'logo',x:0,y:0,width:10,height:10,zIndex:3},
]};
test('review waits for visible image bindings without requiring hidden originals',()=>{
 assert.equal(reviewImageUrls(graph,{image:'blob:product'}),null);
 assert.deepEqual(reviewImageUrls(graph,{image:'blob:product',logo:'blob:logo'}),['blob:product','blob:logo']);
});
function images(){
 const created:{src:string;onload:(()=>void)|null;onerror:(()=>void)|null;decode:()=>Promise<void>}[]=[];
 return {created,create:()=>{const image={src:'',onload:null,onerror:null,decode:async()=>{}};created.push(image);return image as unknown as HTMLImageElement;}};
}
test('partial preview does not complete until every image loads and decodes',async()=>{
 const h=images();let ready=false;const pending=preloadReviewImages(['blob:product','blob:logo'],h.create).then(()=>ready=true);
 h.created[0].onload!();await new Promise(resolve=>setImmediate(resolve));assert.equal(ready,false);
 h.created[1].onload!();await pending;assert.equal(ready,true);
});
test('duplicate URLs are decoded once and missing images reject without automatic retries',async()=>{
 const h=images(),pending=preloadReviewImages(['blob:same','blob:same'],h.create);
 assert.equal(h.created.length,1);h.created[0].onerror!();await assert.rejects(pending,/Preview image unavailable/);assert.equal(h.created.length,1);
});
test('empty image lists complete immediately for native text-only previews',async()=>{
 const h=images();await preloadReviewImages([],h.create);assert.equal(h.created.length,0);
});

test('binding waits for authenticated media and busy composition without premature twelve-second failure',()=>{const phases:string[]=[],timers:number[]=[];const clock={set:(_f:()=>void,ms:number)=>{timers.push(ms);return 1;},clear:()=>{}};const cancel=watchReviewMedia(null,false,p=>phases.push(p),async()=>{},clock);assert.deepEqual(phases,['loading']);assert.deepEqual(timers,[60000]);cancel();timers.length=0;watchReviewMedia(null,true,p=>phases.push(p),async()=>{},clock)();assert.equal(timers.length,0);});
test('late image decoding completes without refresh while canceled transitions cannot update review',async()=>{let resolve!:()=>void;const phases:string[]=[];const done=new Promise<void>(r=>resolve=r);const cancel=watchReviewMedia(['blob:owned'],false,p=>phases.push(p),()=>done,{set:()=>1,clear:()=>{}});resolve();await new Promise(r=>setImmediate(r));assert.deepEqual(phases,['loading','ready']);cancel();let release!:()=>void;const next:string[]=[];const stop=watchReviewMedia(['blob:old'],false,p=>next.push(p),()=>new Promise<void>(r=>release=r),{set:()=>1,clear:()=>{}});stop();release();await new Promise(r=>setImmediate(r));assert.deepEqual(next,['loading']);});
