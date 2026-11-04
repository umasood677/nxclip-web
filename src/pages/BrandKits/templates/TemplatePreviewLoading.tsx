import React from 'react';
import {LoaderCircle} from 'lucide-react';
import {Skeleton} from '../../../components/ui/skeleton';
/** One visual state for record hydration, media download and decode. */
export function TemplatePreviewLoading({label='Loading preview',active=true}:{label?:string;active?:boolean}){
 return <div className="bt-review-media-state" role="status" aria-live="polite" style={{position:'relative',overflow:'hidden'}}>
  {active&&<Skeleton className="absolute inset-0 opacity-10 pointer-events-none"/>}
  <LoaderCircle size={25} aria-hidden="true" style={{position:'relative',animation:active?undefined:'none'}}/>
  <span style={{position:'relative'}}>{label}</span>
 </div>;
}
