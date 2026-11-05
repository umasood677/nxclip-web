import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
function load(){const exports:Record<string,unknown>={};vm.runInNewContext(ts.transpileModule(readFileSync('src/pages/BrandKits/templates/TemplatePreviewLoading.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:(id:string)=>{if(id==='react')return React;if(id==='lucide-react')return {Sparkles:()=>React.createElement('svg',{'data-icon':'sparkles'}),CircleAlert:()=>React.createElement('svg',{'data-icon':'attention'})};if(id.endsWith('/skeleton'))return {Skeleton:(p:object)=>React.createElement('div',p)};throw Error(id);}});return exports.TemplatePreviewLoading as React.ComponentType<{active?:boolean;label?:string}>;}
test('active preview presents the animated design surface without a spinner or artificial percentage',()=>{const View=load(),html=renderToStaticMarkup(<View label="Creating your template…"/>);assert.match(html,/bt-baking-stage/);assert.match(html,/bt-baking-card/);assert.match(html,/bt-baking-sweep/);assert.match(html,/Creating your template/);assert.match(html,/aria-busy="true"/);assert.doesNotMatch(html,/LoaderCircle|\d+%/);});
test('uncertain state stops the animation and shows an attention icon',()=>{const View=load(),html=renderToStaticMarkup(<View active={false} label="Check your saved generation"/>);assert.match(html,/data-icon="attention"/);assert.match(html,/aria-busy="false"/);assert.doesNotMatch(html,/bt-baking-stage|bt-baking-sweep/);});
test('animation respects reduced motion and explicitly disables inactive icon animation',()=>{const css=readFileSync('src/pages/BrandKits/templates/brandTemplates.css','utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\).*bt-baking-stage/);assert.match(css,/aria-busy=false.*animation:none/);});
