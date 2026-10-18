import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ClipTypographyOverlay } from '../../pages/ClipEditor/ClipTypographyOverlay';
import { prepareCanonicalLayout, PARITY_FONT_PACKAGE, validateTypographyLayout, type CanonicalTypographyLayout } from './canonicalLayout';
import { resolveLegacyFont } from './registry';
const results:Array<Record<string,unknown>>=[];
const fixtures:Array<{id:string;plan:CanonicalTypographyLayout}>=[];
const comparison=new URL(location.href).searchParams.has('compare');
const spacingOnly=new URL(location.href).searchParams.has('spacing');
const definitions=[
  {id:'short-title',text:'Smart Type 2026!',align:'center',size:42,width:1000,spacing:0,outline:0,shadow:0},
  {id:'multiline',text:'First line 123\nSecond line éñÅ',align:'left',size:42,width:1000,spacing:0,outline:0,shadow:0},
  {id:'long-wrap',text:'A long wrapped caption includes uppercase ABC, lowercase letters, punctuation!? and numbers 0123456789 with accents éñÅ.',align:'center',size:42,width:580,spacing:0,outline:0,shadow:0},
  {id:'bold-display',text:'BOLD DISPLAY 900',align:'right',size:64,width:1000,spacing:0,outline:0,shadow:0},
  {id:'stroke-shadow',text:'Stroke & Shadow!? 123',align:'center',size:42,width:1000,spacing:0,outline:3,shadow:4},
  {id:'mixed-symbols',text:'Aa09 éñÅ Ω !?.,:;()',align:'center',size:42,width:1000,spacing:0,outline:0,shadow:0},
  {id:'letter-spacing',text:'SPACED Aa09',align:'left',size:42,width:1000,spacing:2,outline:0,shadow:0},
] as const;
async function post(path:string,body:BodyInit) { const response=await fetch(path,{method:'POST',body}); if(!response.ok) throw new Error(await response.text()); }
function bounds(data:Uint8ClampedArray) {
  let left=1280,top=720,right=-1,bottom=-1;
  for(let y=0;y<720;y++) for(let x=0;x<1280;x++) if(Math.abs(data[(y*1280+x)*4]-32)>16) {left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return {left,top,right,bottom,width:right-left+1,height:bottom-top+1};
}
async function capture(id:string,plan:CanonicalTypographyLayout) {
  const container=document.createElement('section'); container.style.cssText='position:relative;width:1280px;height:720px;background:#202020'; document.body.append(container);
  const root=createRoot(container); root.render(createElement(ClipTypographyOverlay,{raw:plan,timeMs:500,enabled:true,locked:false,aspect:16/9}));
  const deadline=performance.now()+15000;
  while(container.querySelector<HTMLCanvasElement>('canvas')?.dataset.fontState!=='loaded') {
    if(container.querySelector('[role=alert]')) throw new Error(container.textContent ?? 'Preview error');
    if(performance.now()>deadline) throw new Error('Preview timeout');
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#202020';ctx.fillRect(0,0,1280,720);ctx.drawImage(container.querySelector('canvas')!,0,0);
  const browserData=ctx.getImageData(0,0,1280,720).data;
  const browser=bounds(browserData);
  await post(`/capture/${id}`,await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!))));
  let result:Record<string,unknown>={id,browser,lineCount:plan.layers[0].lines.length};
  if(comparison) {
    const image=new Image();image.src=`/renderer/${id}.png`;await image.decode();ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,1280,720).data,renderer=bounds(data);
    const edgeDelta=Math.max(...(['left','right','top','bottom'] as const).map(edge=>Math.abs(browser[edge]-renderer[edge])));
    // Bidirectional foreground-neighbour agreement tolerates rasterizer AA within 2px.
    let foreground=0,unmatched=0;
    function mask(pixels:Uint8ClampedArray,x:number,y:number) {return x>=0 && y>=0 && x<1280 && y<720 && Math.abs(pixels[(y*1280+x)*4]-32)>16;}
    for(const [a,b] of [[browserData,data],[data,browserData]]) for(let y=Math.max(0,Math.min(browser.top,renderer.top)-2);y<=Math.min(719,Math.max(browser.bottom,renderer.bottom)+2);y++) for(let x=Math.max(0,Math.min(browser.left,renderer.left)-2);x<=Math.min(1279,Math.max(browser.right,renderer.right)+2);x++) if(mask(a,x,y)) {
      foreground++;let match=false;for(let dy=-2;dy<=2 && !match;dy++) for(let dx=-2;dx<=2;dx++) if(mask(b,x+dx,y+dy)){match=true;break;} if(!match) unmatched++;
    }
    const unmatchedRatio=foreground ? unmatched/foreground : 1;
    result={...result,renderer,edgeDelta,unmatchedRatio,tolerance:{edgePx:2,foregroundNeighbourPx:2,maxUnmatchedRatio:0.02},pass:edgeDelta<=2 && unmatchedRatio<=0.02};
  }
  results.push(result);root.unmount();container.remove();
  document.querySelector('pre')!.textContent=JSON.stringify({completed:results.length,last:result},null,2);
}
document.body.innerHTML='<h1>T3 canonical Clip Studio preview fixtures</h1><pre></pre>';
for(const face of PARITY_FONT_PACKAGE.faces) for(const sample of definitions) {
  if(spacingOnly && sample.id!=='letter-spacing') continue;
  let text:string=sample.text;
  if(sample.id==='mixed-symbols' && !face.inspection.unicodeRanges.some(range=>{const [start,end]=range.replace('U+','').split('-').map(value=>parseInt(value,16));return 937>=start && 937<=(end??start);})) text=text.replace(' Ω','');
  const id=`${face.id}-${sample.id}`;
  const plan=await prepareCanonicalLayout({faceId:face.id,width:1280,height:720,layers:[{id:'caption',text,align:sample.align,fontSize:sample.size,lineHeight:sample.size*1.35,letterSpacing:sample.spacing,outline:sample.outline,shadow:sample.shadow,fill:'#FFFFFF',left:80,firstBaseline:180,maxWidth:sample.width,startMs:0,endMs:1000}]});
  fixtures.push({id,plan});await capture(id,plan);
}
// Round-trip actual JSON storage without changing the persisted legacy selection.
for(const legacyId of ['montserrat_black','anton','bebas_neue','inter_bold','impact','arial_black','arial']) {
  const mapping=resolveLegacyFont('clip',legacyId);
  if(!mapping || !('canonicalId' in mapping)) throw new Error(`Missing legacy ${legacyId}`);
  const raw={fontId:legacyId,unrelated:{keep:true}};
  localStorage.setItem(`t3-legacy-${legacyId}`,JSON.stringify(raw));
  const restored=JSON.parse(localStorage.getItem(`t3-legacy-${legacyId}`)!);
  if(restored.fontId!==legacyId || !restored.unrelated.keep) throw new Error('Legacy storage changed');
  localStorage.removeItem(`t3-legacy-${legacyId}`);
}
const saved=fixtures[0].plan;localStorage.setItem('t3-canonical-project',JSON.stringify({extras:{canonicalTypography:saved}}));
const restored=validateTypographyLayout(JSON.parse(localStorage.getItem('t3-canonical-project')!).extras.canonicalTypography);
localStorage.removeItem('t3-canonical-project');if(JSON.stringify(saved)!==JSON.stringify(restored)) throw new Error('Canonical storage roundtrip changed');
let outputFixtures=fixtures,outputResults=results;
if(spacingOnly){const oldFixtures=await fetch('/fixtures.json').then(response=>response.json()) as typeof fixtures;outputFixtures=oldFixtures.map(previous=>fixtures.find(current=>current.id===previous.id)??previous);const oldReport=await fetch('/browser-results.json').then(response=>response.json()) as {results:typeof results};outputResults=oldReport.results.map(previous=>results.find(current=>current.id===previous.id)??previous);}
await post('/fixtures',JSON.stringify(outputFixtures));
await post(comparison?'/comparison':'/browser-results',JSON.stringify({userAgent:navigator.userAgent,results:outputResults,legacyIdsPreserved:7,canonicalRoundtrip:true}));
document.title=`T3 ${comparison?'comparison':'browser'} complete: ${results.length}`;
document.querySelector('pre')!.textContent=JSON.stringify({count:results.length,failures:results.filter(result=>result.pass===false),legacyIdsPreserved:7,canonicalRoundtrip:true},null,2);
