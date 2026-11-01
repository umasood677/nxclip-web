import React from 'react';
import {Archive,RotateCcw,Trash2,X} from 'lucide-react';
import {formatChip} from '../../AdStudio/components/TemplateGallery';
import {AD_FORMATS,type AdSceneGraph} from '../../AdStudio/types';
import {BrandTemplateScenePreview} from './BrandTemplateScenePreview';

type Props={name:string;graph?:AdSceneGraph|null;assetUrls:Record<string,string>;format?:string;status:string;kind:string;selected:boolean;busy:boolean;pending?:boolean;onToggle:()=>void;onPreview:()=>void;onDelete:()=>void;onReject?:()=>void;onArchive?:()=>void};
export function BrandTemplateTile({name,graph,assetUrls,format,status,kind,selected,busy,pending=false,onToggle,onPreview,onDelete,onReject,onArchive}:Props){
 const width=graph?.canvas.width,height=graph?.canvas.height;
 const knownFormat=format||AD_FORMATS.find(f=>width&&height&&f.width*height===f.height*width)?.id;
 const ratio=knownFormat?formatChip(knownFormat):width&&height?width+' × '+height:'Layout';
 return <article className={'w0a-card bt-library-tile'+(selected?' bt-card-selected':'')}>
  <label className="bt-card-select"><input type="checkbox" aria-label={'Select '+name} checked={selected} disabled={busy} onChange={onToggle}/><span className="sr-only">Select template</span></label>
  <div className="w0a-brand-preview bt-tile-art" style={width&&height?{aspectRatio:width+' / '+height}:undefined}>
   {pending?<span className="bt-cleanup-placeholder"><Trash2 size={28}/> Cleanup pending</span>:<BrandTemplateScenePreview graph={graph||null} assetUrls={assetUrls} size="card" fillCard label={name+' visual preview'}/>}
  </div>
  <div className="w0a-card-body">
   <h3>{name}</h3><div className="bt-tile-meta"><div className="w0a-meta">{kind} · {ratio}</div><span className="bt-tile-status">{status}</span></div>
   <div className="w0a-formats bt-tile-controls"><span className="w0a-chip on" aria-label={'Format '+ratio}>{ratio}</span><div className="bt-tile-actions">
    {onReject&&!pending&&<button type="button" title="Reject template" aria-label={'Reject '+name} disabled={busy} onClick={onReject}><X size={15}/></button>}
    {onArchive&&!pending&&<button type="button" title="Archive template" aria-label={'Archive '+name} disabled={busy} onClick={onArchive}><Archive size={15}/></button>}
    <button type="button" title={pending?'Retry cleanup':'Delete template'} aria-label={(pending?'Retry cleanup for ':'Delete ')+name} disabled={busy} onClick={onDelete}>{pending?<RotateCcw size={15}/>:<Trash2 size={15}/>}</button>
   </div></div>
   <button type="button" className="w0a-btn" disabled={busy||pending} onClick={onPreview}>Preview template</button>
  </div>
 </article>;
}
