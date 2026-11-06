import {retainedStatusDelay,isProcessingStatus} from './retainedStatusPolling';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from './imageExecutionModel';

// Execute the actual component with deterministic hooks; no browser, network or provider.
// Explicitly replay passive effect cleanup/setup, as development StrictMode does.
type Node = {type: unknown; props: Record<string, unknown>; children: unknown[]};
const source={id:'fixture-source',name:'Fixture',projectId:'fixture-scope',currentVersion:1,sceneGraph:{schemaVersion:'1.0',canvas:{width:1080,height:1350},layers:[]}};
const validQuote=()=>({schemaVersion:'1.0',sourceHash:'a'.repeat(64),quoteHash:'b'.repeat(64),catalogId:'fixture',provider:'vertex',modelId:'fixture-model',estimatedCostUsd:null,pricingVersion:'usage-only',templateReviewMode:'approval-page-v1',imageCount:1,inputScope:'editable-template-proposal',sourceTreatment:'reference-guided-proposal',referenceCount:1,costBasis:'usage-only',characterSelectionSupported:true,selectedCharacterIds:[]});
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function harness(retained=false,onProviderUnavailable?:()=>Promise<void>,executeRequested=false,statusOutcome="completed",compact=false,existingImage=false){
 const text=readFileSync(process.cwd()+'/src/pages/AdStudio/production/ProductionImageGeneration.tsx','utf8');
 const tree=ts.createSourceFile('component.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const declaration=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ProductionImageGeneration');assert.ok(declaration);
 const code=ts.transpileModule(declaration.getText(tree).replace(/^export /,'')+';ProductionImageGeneration;', {compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 const slots:unknown[]=[],effects=new Map<number,{setup:()=>unknown;deps:unknown[];cleanup?:()=>void}>();let index=0,pending:number[]=[],writes=0,quotes=0,executions=0,statusReads=0,creativeReads=0,savedCallbacks=0,recoveries=0;
 const savedCreative=()=>({...source,id:'saved-child',sceneGraph:{...source.sceneGraph,layers:[{id:'ai-background-saved',type:'image',assetId:'saved-asset',x:0,y:0,width:1080,height:1350,zIndex:0}]}});
 const quote=deferred<ReturnType<typeof validQuote>>(),generation=deferred<unknown>();
 let timerId=0,now=0;const timers=new Map<number,{fn:()=>void;ms:number}>();
 const component=vm.runInNewContext(code,{
  retainedStatusDelay,isProcessingStatus,Date:{now:()=>now},setTimeout:(fn:()=>void,ms:number)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:(id:number)=>timers.delete(id),
  ...model,hasGeneratedBackground:()=>existingImage,Error,realImagesEnabled:()=>true,characterReviewIssues:()=>[],
  React:{createElement:(type:unknown,props:Record<string,unknown>,...children:unknown[])=>({type,props:props||{},children})},
  SparklesIcon:'icon',ResponsiveScenePreview:'preview',Skeleton:'skeleton',TemplateRenderReview:'review',
  useRef:(value:unknown)=>{const i=index++;if(!(i in slots))slots[i]={current:value};return slots[i];},
  useState:(initial:unknown)=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(next:unknown)=>{writes++;slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useEffect:(setup:()=>unknown,deps:unknown[])=>{const i=index++,old=effects.get(i);if(!old || old.deps.length!==deps.length || deps.some((d,k)=>d!==old.deps[k])){effects.set(i,{setup,deps,cleanup:old?.cleanup});pending.push(i);}},
  adImageApi:{recover:async()=>{recoveries++;if(statusOutcome==='recovery-error')throw Error('Retained output could not be loaded');return savedCreative();},quote:()=>{quotes++;return quote.promise;},execute:()=>{executions++;return generation.promise;},status:async()=>{statusReads++;if(statusOutcome==="processing-then-completed"&&statusReads<3||statusOutcome==="processing")return {status:'processing',creativeId:null,hasRetainedImage:false};if(statusOutcome==="error")throw {statusCode:502,message:"Status service unavailable"};if(statusOutcome==="retained-only"||statusOutcome==="recovery-error")return {status:"completed",creativeId:null,hasRetainedImage:true};return {status:'completed',creativeId:'saved-child',hasRetainedImage:true};}},
  adStudioApi:{getCreative:async()=>{creativeReads++;return savedCreative();}},
  crypto:{randomUUID:()=> 'fixture-request'},sessionStorage:{getItem:()=>retained?'retained-request':null,setItem:()=>{},removeItem:()=>{}},
 });
 const render=()=>{index=0;return component({source,compact,assetUrls:{},renderMode:'template-proposal',regeneration:existingImage,initialInstruction:'Cinematic fixture',autoPreflight:!executeRequested,executeRequested,onProviderUnavailable,onSaved:async()=>{savedCallbacks++;}}) as Node;};
 const flush=()=>{const work=pending;pending=[];for(const i of work){const e=effects.get(i)!;e.cleanup?.();const result=e.setup();e.cleanup=typeof result==='function'?result as ()=>void:undefined;}};
 const replay=()=>{const entries=[...effects.values()];for(const e of entries)e.cleanup?.();for(const e of entries){const result=e.setup();e.cleanup=typeof result==='function'?result as ()=>void:undefined;}};
 return {render,flush,replay,tick:(elapsed?:number)=>{const first=timers.entries().next().value;if(!first)return;const [id,timer]=first;timers.delete(id);now+=elapsed??timer.ms;timer.fn();},get timerCount(){return timers.size;},unmount:()=>{for(const e of effects.values())e.cleanup?.();},quote,generation,get writes(){return writes;},get quotes(){return quotes;},get executions(){return executions;},get statusReads(){return statusReads;},get creativeReads(){return creativeReads;},get savedCallbacks(){return savedCallbacks;},get recoveries(){return recoveries;}};
}
const flatten=(value:unknown):Node[]=>Array.isArray(value)?value.flatMap(flatten):value&&typeof value==='object'&&'children'in value?[value as Node,...flatten((value as Node).children)]:[];
const content=(value:unknown):string=>Array.isArray(value)?value.map(content).join(''):value&&typeof value==='object'&&'children'in value?content((value as Node).children):typeof value==='string'?value:'';
const settle=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
test('successful quote survives StrictMode replay, clears readiness and never starts paid work',async()=>{
 const h=harness();h.render();h.flush();h.replay();assert.equal(h.quotes,1);
 const waiting=h.render();assert.match(content(waiting),/Preparing your design/);assert.doesNotMatch(content(waiting),/Creating your template preview/);
 h.quote.resolve(validQuote());await settle();const ready=h.render();assert.doesNotMatch(content(ready),/Checking readiness/);assert.doesNotMatch(content(ready),/fixture-model|Check AI generation readiness/);assert.doesNotMatch(content(ready),/I approve one Google request/);assert.equal(h.executions,0);
 const generate=flatten(ready).find(n=>n.type==='button'&&content(n)==='Generate template');assert.equal(generate?.props.disabled,false);
});
test('failed quote after replay clears readiness and presents an actionable error without executing',async()=>{
 const h=harness();h.render();h.flush();h.replay();h.quote.reject(Error('Readiness unavailable'));await settle();const view=h.render();assert.match(content(view),/Readiness unavailable/);assert.doesNotMatch(content(view),/Checking readiness|Generating…/);assert.equal(h.quotes,1);assert.equal(h.executions,0);
});
test('real unmount discards a late response and performs no component state writes',async()=>{
 const h=harness();h.render();h.flush();h.unmount();const before=h.writes;h.quote.resolve(validQuote());await settle();assert.equal(h.writes,before);assert.equal(h.executions,0);
});
test('one deliberate Generate click submits one mocked execution; replay never retries it',async()=>{
 const h=harness();h.render();h.flush();h.replay();h.quote.resolve(validQuote());await settle();let view=h.render();
 assert.equal(flatten(view).some(n=>n.type==='input'&&n.props.type==='checkbox'),false);
 view=h.render();const generate=flatten(view).find(n=>n.type==='button'&&content(n)==='Generate template');assert.equal(generate?.props.disabled,false);(generate!.props.onClick as ()=>void)();(generate!.props.onClick as ()=>void)();assert.equal(h.executions,1);
 h.replay();assert.equal(h.executions,1);assert.match(content(h.render()),/Creating your template preview/);h.generation.reject(Error('Fixture uncertain outcome'));await settle();assert.match(content(h.render()),/retained|Check retained status/);assert.equal(h.executions,1);
});
test('retained request blocks automatic preflight and any new execution',()=>{
 const h=harness(true);h.render();h.flush();h.replay();assert.equal(h.quotes,0);assert.equal(h.executions,0);assert.match(content(h.render()),/previous request is retained/);
});


test('provider unavailable before execution offers native fallback without spending or retrying',async()=>{
 let fallbacks=0;const h=harness(false,async()=>{fallbacks++;});h.render();h.flush();
 const error=Object.assign(new Error('Provider unavailable'),{statusCode:503});h.quote.reject(error);await settle();
 assert.equal(fallbacks,1);assert.equal(h.executions,0);assert.equal(h.quotes,1);
});
test('authorization and invalid input failures never fall back or execute',async()=>{
 for(const statusCode of [400,401,403,409,429]){let fallbacks=0;const h=harness(false,async()=>{fallbacks++;});h.render();h.flush();h.quote.reject(Object.assign(new Error('Blocked'),{statusCode}));await settle();assert.equal(fallbacks,0);assert.equal(h.executions,0);}
});


test('setup Generate intent completes one request without an intermediate confirmation page',async()=>{
 const h=harness(false,undefined,true);h.render();h.flush();h.replay();assert.equal(h.quotes,1);assert.equal(h.executions,0);
 h.quote.resolve(validQuote());await settle();assert.equal(h.executions,1);h.replay();assert.equal(h.executions,1);
 h.generation.reject(Error('fixture outcome'));await settle();assert.match(content(h.render()),/retained|Check retained status/);
});
test('refresh with retained request cannot repeat the setup generation intent',()=>{
 const h=harness(true,undefined,true);h.render();h.flush();h.replay();assert.equal(h.quotes,0);assert.equal(h.executions,0);
});


test('refresh automatically opens a completed retained creative without generating or recovering',async()=>{
 const h=harness(true);h.render();h.flush();h.replay();await settle();
 assert.equal(h.statusReads,1);assert.equal(h.creativeReads,1);assert.equal(h.savedCallbacks,1);assert.equal(h.executions,0);assert.equal(h.quotes,0);
 h.render();h.flush();h.replay();await settle();assert.equal(h.statusReads,1);
});

test('plain API error bodies retain their explanation instead of becoming an unknown outcome',async()=>{
 const h=harness(false,undefined,true);h.render();h.flush();h.quote.resolve(validQuote());await settle();
 h.generation.reject({statusCode:502,message:'Upstream service unavailable'} as unknown as Error);await settle();
 assert.match(content(h.render()),/Upstream service unavailable/);assert.equal(h.executions,1);assert.equal(h.statusReads,0);
});


test('automatic status failure is visible and does not loop, regenerate or invoke recovery',async()=>{
 const h=harness(true,undefined,false,'error');h.render();h.flush();h.replay();await settle();
 const view=h.render();h.flush();h.replay();await settle();
 assert.match(content(view),/Status service unavailable/);assert.equal(h.statusReads,1);assert.equal(h.executions,0);assert.equal(h.creativeReads,0);
 const check=flatten(view).find(n=>n.type==='button'&&content(n)==='Check retained status');assert.ok(check);await (check.props.onClick as ()=>Promise<void>)();await settle();assert.equal(h.statusReads,2);
});
test('retained provider output without a saved creative offers explicit recovery instead of another paid call',async()=>{
 const h=harness(true,undefined,false,'retained-only');h.render();h.flush();await settle();const view=h.render();
 assert.equal(h.statusReads,1);assert.equal(h.creativeReads,0);assert.equal(h.executions,0);assert.equal(h.savedCallbacks,0);
 const recover=flatten(view).find(n=>n.type==='button'&&content(n)==='Recover saved output without generation');assert.ok(recover);assert.equal(recover.props.disabled,false);
});
test('unmount during automatic status does not open or publish a late result',async()=>{
 const h=harness(true);h.render();h.flush();h.unmount();const before=h.writes;await settle();assert.equal(h.savedCallbacks,0);assert.equal(h.writes,before);assert.equal(h.executions,0);
});


test('compact review opens a saved preview directly without recovery or provider work',async()=>{
 const h=harness(true,undefined,false,'completed',true);const initial=h.render();h.flush();h.replay();
 assert.doesNotMatch(content(initial),/Check saved status|Open saved result|Retry loading preview/);
 await settle();assert.equal(h.savedCallbacks,1);assert.equal(h.creativeReads,1);assert.equal(h.recoveries,0);assert.equal(h.quotes,0);assert.equal(h.executions,0);
});
test('compact review finishes retained output once and opens preview without another generation',async()=>{
 const h=harness(true,undefined,false,'retained-only',true);h.render();h.flush();h.replay();await settle();
 assert.equal(h.statusReads,1);assert.equal(h.recoveries,1);assert.equal(h.savedCallbacks,1);assert.equal(h.quotes,0);assert.equal(h.executions,0);
 h.render();h.flush();h.replay();await settle();assert.equal(h.recoveries,1);
});
test('compact recovery failure offers loading retry and never loops or regenerates',async()=>{
 const h=harness(true,undefined,false,'recovery-error',true);h.render();h.flush();h.replay();await settle();const view=h.render();h.flush();await settle();
 assert.match(content(view),/Retained output could not be loaded/);assert.doesNotMatch(content(view),/Check saved status|Recover saved output/);
 const retry=flatten(view).find(n=>n.type==='button'&&content(n)==='Retry loading preview');assert.ok(retry);
 assert.equal(h.recoveries,1);assert.equal(h.executions,0);assert.equal(h.quotes,0);
 (retry.props.onClick as ()=>void)();await settle();assert.equal(h.recoveries,2);assert.equal(h.executions,0);
});


test('processing status advances automatically to a saved preview without refresh or another provider request',async()=>{
 const h=harness(true,undefined,false,'processing-then-completed',true);h.render();h.flush();await settle();
 h.render();h.flush();assert.equal(h.timerCount,1);h.tick();await settle();h.render();h.flush();h.tick();await settle();h.render();h.flush();
 assert.equal(h.statusReads,3);assert.equal(h.savedCallbacks,1);assert.equal(h.creativeReads,1);assert.equal(h.quotes,0);assert.equal(h.executions,0);assert.equal(h.timerCount,0);
});

test('processing status polling is bounded and stops on unmount without generating',async()=>{
 const h=harness(true,undefined,false,'processing',true);h.render();h.flush();await settle();h.render();h.flush();h.tick(120001);await settle();h.render();h.flush();
 assert.equal(h.timerCount,0);assert.equal(h.executions,0);assert.equal(h.savedCallbacks,0);
 assert.match(String(h.render().props.phase),/taking longer/);
 const unmounted=harness(true,undefined,false,'processing',true);unmounted.render();unmounted.flush();await settle();unmounted.render();unmounted.flush();assert.equal(unmounted.timerCount,1);unmounted.unmount();assert.equal(unmounted.timerCount,0);
});


test('a regeneration started here checks its saved result after an uncertain response, without resubmitting',async()=>{
 const h=harness(false,undefined,true,'completed',true,true);h.render();h.flush();h.quote.resolve(validQuote());await settle();assert.equal(h.executions,1);
 h.generation.reject(Error('Upstream unavailable'));await settle();h.render();h.flush();await settle();
 assert.equal(h.statusReads,1);assert.equal(h.savedCallbacks,1);assert.equal(h.executions,1);
});
