import React,{useEffect,useState} from 'react';import {LoaderCircle} from 'lucide-react';
import type {AdSceneGraph} from '../../AdStudio/types';import {BrandTemplateScenePreview} from './BrandTemplateScenePreview';
import {reviewImageUrls,watchReviewMedia,type ReviewMediaPhase} from './reviewMediaLoading';
export function TemplateReviewMedia({graph,urls,busy=false,onRetry,onPhase}:{graph:AdSceneGraph|null|undefined;urls:Readonly<Record<string,string>>;busy?:boolean;onRetry:()=>void;onPhase?:(phase:ReviewMediaPhase)=>void}){
 const sources=graph?reviewImageUrls(graph,urls):null,key=JSON.stringify([sources,!!graph,busy]),[state,setState]=useState<{key:string;status:ReviewMediaPhase}|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const [currentSources,,waiting]=JSON.parse(key) as [string[]|null,boolean,boolean];return watchReviewMedia(currentSources,waiting,status=>setState({key,status}));},[key,attempt]);
 const status=state?.key===key?state.status:'loading';useEffect(()=>onPhase?.(status),[status,onPhase]);
 return <div className="bt-review-art" aria-busy={status==='loading'}>
 {status==='ready'&&graph?<BrandTemplateScenePreview graph={graph} assetUrls={urls} size="hero" fitHeight/>:status==='failed'?<div className="bt-review-media-state" role="alert"><p>Preview images could not load.</p><button type="button" className="xp-secondary" onClick={()=>{setAttempt(n=>n+1);onRetry();}}>Reload preview</button></div>:<div className="bt-review-media-state" role="status"><LoaderCircle size={25} aria-hidden="true"/><span>Loading your finished preview…</span></div>}
 </div>;
}
