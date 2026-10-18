import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {ClipTypographyOverlay} from '../../pages/ClipEditor/ClipTypographyOverlay';
import type {CanonicalTypographyLayout} from './layoutContract';
const fixtures=await fetch('/fixtures.json').then(response=>response.json()) as Array<{plan:CanonicalTypographyLayout}>;
const shouldFail=new URL(location.href).searchParams.has('failure');
const disabled=new URL(location.href).searchParams.has('disabled');
const container=document.createElement('section');document.body.append(container);
createRoot(container).render(createElement(ClipTypographyOverlay,{raw:fixtures[0].plan,timeMs:500,locked:false,aspect:16/9,...(disabled?{}:{enabled:true})}));
const deadline=performance.now()+15000;
if(disabled){await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));const fontRequests=performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/fonts/clip-typography/')).length;const result={defaultOffVerified:!container.querySelector('canvas')&&fontRequests===0,fontRequests,canvasAbsent:!container.querySelector('canvas')};if(!result.defaultOffVerified)throw new Error('Disabled typography requested fonts');await fetch('/disabled-results',{method:'POST',body:JSON.stringify(result)});document.title='T3 default OFF: zero font requests';}
else {
while(container.querySelector('canvas')?.getAttribute('data-font-state')!==(shouldFail?'failed':'loaded')) {
  if(!shouldFail&&container.querySelector('[role=alert]'))throw new Error(container.textContent??'Unexpected preview error');
  if(performance.now()>deadline) throw new Error('Expected visible loading failure did not occur');
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
}
const alert=container.querySelector('[role=alert]')?.textContent;
const result={handled:true,alert,detail:container.querySelector('canvas')?.getAttribute('data-font-error'),noFallbackSuccess:container.querySelector('canvas')?.getAttribute('data-font-state')===(shouldFail?'failed':'loaded'),editorComponentSurvived:true};
if(!shouldFail){const image=document.createElement('canvas');image.width=1280;image.height=720;const ctx=image.getContext('2d')!;ctx.fillStyle='#202020';ctx.fillRect(0,0,1280,720);ctx.drawImage(container.querySelector('canvas')!,0,0);await fetch('/capture/cold-bebas-neue-400-normal-short-title',{method:'POST',body:await new Promise<Blob>(resolve=>image.toBlob(blob=>resolve(blob!)))});}
await fetch(shouldFail?'/failure-results':'/cold-results',{method:'POST',body:JSON.stringify(result)});
document.title=shouldFail?'T3 font HTTP failure handled':'T3 cold canonical font loaded';
const pre=document.createElement('pre');pre.textContent=JSON.stringify(result,null,2);document.body.append(pre);
}
