import {useEffect,useState} from 'react';
import {adImageApi,resolveBaseGatewayUrl} from '../../../services/apiClient';
import {useAuthToken} from '../../../services/auth/authService';
import {createCreativeMediaLoader} from './creativeMediaLoader';
const media=createCreativeMediaLoader((input,init)=>fetch(input,init),id=>adImageApi.assets(id));
/** Share image bytes across preview/review; each consumer owns its disposable blob URLs. */
export function useCreativeAssetUrls(ids:readonly string[],assetIds?:readonly string[],reload=0):Record<string,string>{
 const token=useAuthToken(),gateway=typeof window==='undefined'?'':resolveBaseGatewayUrl(),key=[...new Set(ids)].sort().join(','),filter=assetIds===undefined?null:JSON.stringify([...new Set(assetIds)].sort()),scope=JSON.stringify([key,filter,token,gateway,reload]);
 const [state,setState]=useState<{scope:string;urls:Record<string,string>}>({scope:'',urls:{}});
 useEffect(()=>{let cancelled=false;const created:string[]=[];if(!token){media.clear();return;}if(!key||filter==='[]')return;
 const allowed=filter===null?null:new Set(JSON.parse(filter) as string[]);
 if(reload)media.invalidate(key.split(','),allowed?[...allowed]:[],token,gateway);
 void(async()=>{const next:Record<string,string>={};await Promise.all(key.split(',').map(async id=>{try{const list=await media.list(id,token,gateway);await Promise.all(list.items.filter(asset=>!allowed||allowed.has(asset.id)).map(async asset=>{try{const blob=await media.image(asset,token,gateway);if(cancelled)return;const url=URL.createObjectURL(blob);created.push(url);next[asset.id]=url;}catch{/* No automatic retries or public URL fallback. */}}));}catch{/* Missing owned media remains unresolved. */}}));if(!cancelled)setState({scope,urls:next});})();
 return()=>{cancelled=true;created.forEach(url=>URL.revokeObjectURL(url));};
 },[key,filter,token,gateway,scope,reload]);
 return state.scope===scope?state.urls:{};
}
