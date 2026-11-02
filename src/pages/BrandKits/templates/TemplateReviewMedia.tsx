import React,{useEffect,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import type {AdSceneGraph} from '../../AdStudio/types';
import {BrandTemplateScenePreview} from './BrandTemplateScenePreview';
import {reviewImageUrls,preloadReviewImages} from './reviewMediaLoading';
export function TemplateReviewMedia({graph,urls,busy=false,onRetry}:{graph:AdSceneGraph|null|undefined;urls:Readonly<Record<string,string>>;busy?:boolean;onRetry:()=>void}){
 const sources=graph?reviewImageUrls(graph,urls):null,key=JSON.stringify([sources,!!graph,busy]),[state,setState]=useState<{key:string;status:'ready'|'failed'}|null>(null);
 useEffect(()=>{const [currentSources,,waiting]=JSON.parse(key) as [string[]|null,boolean,boolean];let active=true;const timer=setTimeout(()=>{if(active)setState({key,status:'failed'});},12000);if(currentSources&&!waiting)void preloadReviewImages(currentSources).then(()=>{if(active){clearTimeout(timer);setState({key,status:'ready'});}}).catch(()=>{if(active){clearTimeout(timer);setState({key,status:'failed'});}});return()=>{active=false;clearTimeout(timer);};},[key]);
 const status=state?.key===key?state.status:'loading';
 return <div className="bt-review-art" aria-busy={status==='loading'}>
  {status==='ready'&&graph?<BrandTemplateScenePreview graph={graph} assetUrls={urls} size="hero" fitHeight/>:status==='failed'?<div className="bt-review-media-state" role="alert"><p>Preview images could not load.</p><button type="button" className="xp-secondary" onClick={onRetry}>Reload preview</button></div>:<div className="bt-review-media-state" role="status"><LoaderCircle size={25} aria-hidden="true"/><span>Loading preview…</span></div>}
 </div>;
}
