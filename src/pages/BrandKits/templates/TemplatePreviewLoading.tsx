import React from 'react';
import {Sparkles, CircleAlert} from 'lucide-react';
import {Skeleton} from '../../../components/ui/skeleton';
/** One visual state for record hydration, media download and decode. */
export function TemplatePreviewLoading({label='Loading preview',active=true}:{label?:string;active?:boolean}){
 return <div className="bt-review-media-state" role="status" aria-live="polite" aria-busy={active} style={{position:'relative',overflow:'hidden'}}>
  {active&&<div className="bt-baking-stage" aria-hidden="true"><Skeleton className="bt-baking-glow"/><div className="bt-baking-orbit"/><div className="bt-baking-card"><i/><i/><i/><span/><b/></div><div className="bt-baking-sweep"/></div>}
  {active?<Sparkles size={25} aria-hidden="true" className="bt-baking-icon"/>:<CircleAlert size={25} aria-hidden="true"/>}
  <span style={{position:'relative'}}>{label}</span>
 </div>;
}
