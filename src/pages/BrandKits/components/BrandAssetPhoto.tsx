import React,{useEffect,useRef,useState} from 'react';
import {ImageOff,RotateCcw} from 'lucide-react';
import {Skeleton} from '../../../components/ui/skeleton';
import {useAuthToken} from '../../../services/auth/authService';
import {resolveBaseGatewayUrl} from '../../../services/apiClient';
import {brandMediaLoader} from '../../AdStudio/canvas/brandMediaLoader';
import type {BrandAssetEntry} from '../lib/brandKitTypes';

/** Fit original owner-scoped bytes. Retries are explicit and use the existing authenticated loader. */
export function BrandAssetPhoto({asset,brandId,url,onNaturalSize}:{asset:BrandAssetEntry;brandId:string;url?:string;onNaturalSize?:(width:number,height:number)=>void}){
 const token=useAuthToken(),scope=brandId+'\0'+asset.id+'\0'+token,active=useRef(scope),created=useRef('');active.current=scope;
 const [retried,setRetried]=useState({scope:'',url:''}),[phase,setPhase]=useState<'loading'|'ready'|'error'>('loading'),[retrying,setRetrying]=useState(false);
 const pending=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),visibleUrl=retried.scope===scope?retried.url||url:url;
 const name=asset.label||asset.fileName||'Brand image';
 useEffect(()=>{setPhase('loading');timer.current=setTimeout(()=>setPhase('error'),15000);return()=>clearTimeout(timer.current);},[visibleUrl,scope]);
 useEffect(()=>{active.current=scope;return()=>{active.current='';if(created.current){URL.revokeObjectURL(created.current);created.current='';}};},[scope]);
 async function retry(){
  if(pending.current)return;pending.current=true;setRetrying(true);const requestScope=scope;
  try{
   if(!token||asset.status&&asset.status!=='ready')throw Error('Image unavailable.');
   const path='/brands/'+encodeURIComponent(brandId)+'/assets/'+encodeURIComponent(asset.id)+'/media';
   const blob=await brandMediaLoader.load(brandId,path,token,resolveBaseGatewayUrl());
   if(active.current!==requestScope)return;
   const objectUrl=URL.createObjectURL(blob);if(created.current)URL.revokeObjectURL(created.current);created.current=objectUrl;setPhase('loading');setRetried({scope:requestScope,url:objectUrl});
  }catch{if(active.current===requestScope)setPhase('error');}
  finally{pending.current=false;if(active.current===requestScope)setRetrying(false);}
 }
 return <div className="bpp-photo" data-brand-photo>
 {visibleUrl&&phase!=='error'&&<img src={visibleUrl} alt={name} onLoad={event=>{clearTimeout(timer.current);const image=event.currentTarget;if(image.naturalWidth>0&&image.naturalHeight>0)onNaturalSize?.(image.naturalWidth,image.naturalHeight);setPhase('ready');}} onError={()=>{clearTimeout(timer.current);setPhase('error');}}/>}
 {phase==='loading'&&<div className="bpp-photo-loading" role="status"><Skeleton className="h-full w-full"/><span>Loading preview…</span></div>}
 {phase==='error'&&<div className="bpp-photo-error" role="status"><ImageOff size={22}/><span>Preview unavailable</span><button type="button" disabled={retrying} onClick={()=>void retry()} aria-label={'Retry preview for '+name}><RotateCcw size={13}/>{retrying?'Loading…':'Retry preview'}</button></div>}
 </div>;
}
