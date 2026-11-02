import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrandMediaLoader} from './brandMediaLoader';
const path='/brands/kit/assets/image/media',gateway='http://localhost:5100';
const image=()=>new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});
test('parallel consumers and immediate remounts share one authorized image request',async()=>{
 let requests=0;const loader=createBrandMediaLoader((async(url,init)=>{requests++;assert.equal(url,'/api/gateway-proxy'+path);const headers=new Headers(init?.headers);assert.equal(headers.get('Authorization'),'Bearer fixture');assert.equal(headers.get('X-Target-Gateway-Url'),gateway);assert.equal(init?.redirect,'error');return image();}) as typeof fetch);
 const [a,b]=await Promise.all([loader.load('kit',path,'fixture',gateway),loader.load('kit','https://ignored.example'+path+'?token=never-forward','fixture',gateway)]);
 assert.equal(a,b);assert.equal(await loader.load('kit',path,'fixture',gateway),a);assert.equal(requests,1);
});
test('a session or gateway change cannot reuse another authentication scope',async()=>{
 let count=0;const loader=createBrandMediaLoader((async()=>{count++;return image();}) as typeof fetch);
 await loader.load('kit',path,'first',gateway);await loader.load('kit',path,'second',gateway);await loader.load('kit',path,'second','http://localhost:other');assert.equal(count,3);loader.clear();await loader.load('kit',path,'second','http://localhost:other');assert.equal(count,4);
});
test('rate limited responses do not trigger retries or remount request storms',async()=>{
 let count=0,time=0;const loader=createBrandMediaLoader((async()=>{count++;return new Response('{}',{status:429});}) as typeof fetch,()=>time);
 await assert.rejects(loader.load('kit',path,'fixture',gateway),/429/);await assert.rejects(loader.load('kit',path,'fixture',gateway),/429/);assert.equal(count,1);
 time=60_001;await assert.rejects(loader.load('kit',path,'fixture',gateway),/429/);assert.equal(count,2);
});
test('invalid or missing owner scope never makes a request',async()=>{
 let count=0;const loader=createBrandMediaLoader((async()=>{count++;return image();}) as typeof fetch);
 await assert.rejects(loader.load('other',path,'fixture',gateway));await assert.rejects(loader.load('kit',path,'',gateway));await assert.rejects(loader.load('kit','https://arbitrary.example/image.png','fixture',gateway));assert.equal(count,0);
});
test('failed responses and JSON bodies never become image previews',async()=>{
 for(const response of [new Response('{}',{status:401}),new Response('{}',{headers:{'Content-Type':'application/json'}})]){
 let count=0;const loader=createBrandMediaLoader((async()=>{count++;return response;}) as typeof fetch);
 await assert.rejects(loader.load('kit',path,'fixture',gateway));await assert.rejects(loader.load('kit',path,'fixture',gateway));assert.equal(count,1);
 }
});
test('successful bytes expire and are retained in a bounded cache',async()=>{
 let count=0,time=0;const loader=createBrandMediaLoader((async()=>{count++;return image();}) as typeof fetch,()=>time);
 await loader.load('kit',path,'fixture',gateway);time=120_001;await loader.load('kit',path,'fixture',gateway);assert.equal(count,2);
 for(let i=0;i<25;i++)await loader.load('kit','/brands/kit/assets/'+i+'/media','fixture',gateway);
 const previous=count;await loader.load('kit',path,'fixture',gateway);assert.equal(count,previous+1);
});
