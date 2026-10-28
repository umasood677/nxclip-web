import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {editorTypography,typographyExtras} from './editorTypography';
import {isOverlayActiveAtKeepMs,voiceOverlayStartOffsetSec} from '../../pages/ClipEditor/lib/voiceOverlayTiming';
import {ClipTypographyOverlay} from '../../pages/ClipEditor/ClipTypographyOverlay';
const source=readFileSync(new URL('../../pages/ClipEditor/ClipEditor.tsx',import.meta.url),'utf8');
const tree=ts.createSourceFile('ClipEditor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name:string,context:Record<string,unknown>) {
  let expression:ts.Expression|undefined;
  function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name&&node.initializer&&ts.isCallExpression(node.initializer))expression=node.initializer.arguments[0];ts.forEachChild(node,visit);}
  visit(tree);assert.ok(expression,`Actual editor callback ${name} missing`);
  const js=ts.transpileModule(`const fn = ${expression.getText(tree)}; fn;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return vm.runInNewContext(js,{isOverlayActiveAtKeepMs,voiceOverlayStartOffsetSec,...context}) as (...args:unknown[])=>unknown;
}
function state(raw?:unknown) {return {trimStart:2,trimEnd:6,colorCorrection:0,categoryLabel:'',niches:[],title:'Title',description:'Description',selectedTrackId:'bed',isClipMuted:true,clipVolume:0.8,isMusicMuted:true,musicVolume:0.7,masterVolume:1,topText:'Legacy caption',bottomText:'',memeCaptionStyle:'kinetic_hormozi',captionFontId:'impact',captionTextColor:'#FFFFFF',topOverlay:{x:50,y:10},bottomOverlay:{x:50,y:85},hooks:[],silenceEnabled:false,cropMode:'center',transcriptPreview:'Real transcript',prompt:'',hashtags:[],isNoiseReduced:false,appliedTransitions:[],canonicalTypographyRaw:raw,typographyExtras};}
describe('T3 integrated editor and Sound Design compatibility',()=>{
 it('keeps legacy overlays and no canonical DOM for saved metadata while OFF',()=>{
  for(const raw of [undefined,null,{version:99},'corrupt']){assert.equal(editorTypography(raw).active,false);assert.equal(renderToStaticMarkup(createElement(ClipTypographyOverlay,{raw,timeMs:0,locked:false})), '');}
 });
 it('contains invalid enabled layouts and honours lock/final gates',()=>{
  assert.match(renderToStaticMarkup(createElement(ClipTypographyOverlay,{raw:{version:99},timeMs:0,locked:false,enabled:true})),/role="alert"/);
  for(const props of [{locked:true},{locked:false,finalRender:true}])assert.equal(renderToStaticMarkup(createElement(ClipTypographyOverlay,{raw:{version:99},timeMs:0,enabled:true,...props})), '');
 });
 it('runs the actual save builder without changing legacy IDs or mute semantics',()=>{
  const spec=callback('buildClipEditSpec',state())() as {voiceVolume:number;bgmVolume:number;captions:{fontId:string};extras:Record<string,unknown>};
  assert.equal(spec.voiceVolume,0);assert.equal(spec.bgmVolume,0);assert.equal(spec.captions.fontId,'impact');assert.equal('canonicalTypography' in spec.extras,false);
 });
 it('preserves opaque metadata in the actual server blueprint and local JSON while OFF',()=>{
  const raw={version:99,preserved:'future-layout'};
  const spec=callback('buildClipEditSpec',state(raw))() as {extras:Record<string,unknown>};
  assert.deepEqual(JSON.parse(JSON.stringify(spec.extras.canonicalTypography)),raw);
  let saved='';
  callback('saveToLocalStorage',{...state(raw),id:'clip-1',specHydratedRef:{current:true},safeLocalStorage:{setItem:(_key:string,value:string)=>{saved=value;}},safeStringify:JSON.stringify})();
  assert.deepEqual(JSON.parse(saved).canonicalTypography,raw);
  assert.equal(JSON.parse(saved).captionFontId,'impact');
 });
 it('keeps live commentary playing despite Original mute, and stops at final render',()=>{
  class AudioStub {src='';volume=0;paused=true;currentTime=0;preload='';play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
  const audios=new Map<string,AudioStub>(),final={current:false};let stopped=0;
  const sync=callback('syncSoundOverlays',{showingFinalRenderRef:final,soundOverlayClips:[{id:'voice',startMs:0,endMs:4000,url:'https://example.test/commentary.wav',gain:1}],isMasterMuted:false,masterVolume:1,trimStart:2,stopSoundOverlays:()=>{stopped++;for(const audio of audios.values())audio.pause();},soundOverlayAudiosRef:{current:audios},soundOverlayFiredRef:{current:new Set()},Audio:AudioStub,isClipMuted:true});
  sync(3,true);assert.equal(audios.get('voice')?.paused,false);assert.equal(audios.get('voice')?.currentTime,1);
  sync(3,false);assert.equal(audios.get('voice')?.paused,true);
  final.current=true;sync(3,true);assert.equal(stopped,1);assert.equal(audios.get('voice')?.paused,true);
 });
 it('still silences commentary on Master mute',()=>{
  let paused=0;const audio={volume:1,pause(){paused++;}};
  const sync=callback('syncSoundOverlays',{showingFinalRenderRef:{current:false},soundOverlayClips:[{}],isMasterMuted:true,masterVolume:1,stopSoundOverlays:()=>{},soundOverlayAudiosRef:{current:new Map([['voice',audio]])}});
  sync(3,true);assert.equal(audio.volume,0);assert.equal(paused,1);
 });
});
