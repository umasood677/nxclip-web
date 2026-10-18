import {loadCanonicalLayoutFont,PARITY_FONT_PACKAGE} from './canonicalLayout';
import type {CanonicalTypographyLayout} from './layoutContract';
const fixtures=await fetch('/fixtures.json').then(response=>response.json()) as Array<{plan:CanonicalTypographyLayout}>;
const results=[];
for(const id of ['poppins-700-normal','poppins-900-normal','caveat-700-normal']){
 const plan=structuredClone(fixtures.find(item=>item.plan.faceId===id)!.plan);
 plan.layers[0].lines[0].text='Latin Ω';
 let error='';try{await loadCanonicalLayoutFont(plan);}catch(reason){error=String(reason);}
 if(!error.includes('Unsupported codepoint'))throw Error(`Silent glyph substitution: ${id}`);
 results.push({faceId:id,omegaRejected:true,error});
}
const supported=fixtures.find(item=>item.plan.faceId==='inter-700-normal')!.plan;
await loadCanonicalLayoutFont(supported);
const result={capturedAt:new Date().toISOString(),unsupported:results,supportedInterLoaded:true,silentFallback:false};
await fetch('/coverage-results',{method:'POST',body:JSON.stringify(result)});
document.title='T3 Unicode coverage verified';const pre=document.createElement('pre');pre.textContent=JSON.stringify(result,null,2);document.body.append(pre);
