import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateTypographyLayout,wrapTypographyText,CANONICAL_TYPOGRAPHY_ENABLED} from './layoutContract';
import parity from './parity-font-lock.json';
const sample=()=>({version:1,assetVersion:'1.0.0',faceId:parity.faces[0].id,rendererSha256:parity.faces[0].sha256,width:1280,height:720,layers:[{id:'title',startMs:0,endMs:1000,fontSize:42,lineHeight:56,letterSpacing:0,align:'center',fill:'#FFFFFF',outline:0,shadow:0,lines:[{text:'AéΩ',x:100,baseline:200,width:100}]}]});
describe('T3 canonical layout contract and same-outline assets',()=>{
  it('keeps production activation OFF and preserves a JSON round trip',()=>{assert.equal(CANONICAL_TYPOGRAPHY_ENABLED,false);assert.deepEqual(validateTypographyLayout(JSON.parse(JSON.stringify(sample()))),sample());});
  it('keeps browser/backend contract source identical',()=>{assert.equal(readFileSync(new URL('./layoutContract.ts',import.meta.url),'utf8'),readFileSync(new URL('../../../../NxClip/libs/contracts/src/lib/clip-typography-layout.ts',import.meta.url),'utf8'));});
  it('validates every packaged byte and same browser/worker outlines',()=>{
    assert.equal(parity.faces.length,15);assert.equal(new Set(parity.faces.map(face=>face.id)).size,15);
    for(const file of parity.files) {const bytes=readFileSync(new URL('../../../'+file.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
    for(const face of parity.faces) {const worker=readFileSync(new URL('../../../../NxClip/apps/media-worker/assets/fonts/canonical/1.0.0/faces/'+face.id+'.ttf',import.meta.url));assert.equal(createHash('sha256').update(worker).digest('hex'),face.sha256);assert.ok(face.metrics.winAscent>0);assert.ok(face.metrics.winDescent>0);assert.equal(face.inspection.kind,'static');assert.equal(face.inspection.reportedWeight,face.weight);}
  });
  it('rejects unsupported versions, checksums, excessive complexity and unknown fields',()=>{
    for(const change of [{version:2},{assetVersion:'2.0.0'},{rendererSha256:'bad'},{faceId:'Arial'},{height:Infinity},{layers:Array(129).fill(sample().layers[0])},{untrusted:true}]) assert.throws(()=>validateTypographyLayout({...sample(),...change}));
  });
  it('rejects injection, duplicate IDs, invalid timing and off-frame geometry',()=>{
    const layer=sample().layers[0];
    for(const change of [{fontSize:0},{lineHeight:1},{letterSpacing:-1},{endMs:0},{fill:'red'},{outline:17},{shadow:33},{lines:[{...layer.lines[0],text:'{\\fnArial}'}]},{lines:[{...layer.lines[0],x:1270,width:20}]},{lines:[{...layer.lines[0],baseline:NaN}]}]) assert.throws(()=>validateTypographyLayout({...sample(),layers:[{...layer,...change}]}));
    assert.throws(()=>validateTypographyLayout({...sample(),layers:[layer,layer]}));
  });
  it('wraps hard breaks and long words without splitting a combining grapheme',()=>{
    const measure=(text:string)=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)).length;
    assert.deepEqual(wrapTypographyText('AB CD\nÉéΩ',3,measure),['AB','CD','ÉéΩ']);
    assert.deepEqual(wrapTypographyText('ABCDE',2,measure),['AB','CD','E']);
    assert.throws(()=>wrapTypographyText('A',0,measure));
    assert.throws(()=>wrapTypographyText('A',1,()=>2));
  });
});
