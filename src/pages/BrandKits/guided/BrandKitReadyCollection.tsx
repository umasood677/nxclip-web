import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Plus,Maximize2} from 'lucide-react';
import {brandTemplateApi} from '../../../services/apiClient';
import {Skeleton} from '../../../components/ui/skeleton';
import {Dialog,DialogContent,DialogTitle} from '../../../components/ui/dialog';
import {BrandKitBrochure} from './BrandKitBrochure';
import {BrandTemplateScenePreview} from '../templates/BrandTemplateScenePreview';
import {isBrandTemplatesEnabled,type BrandTemplate} from '../templates/brandTemplateModel';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import {useCreativeAssetUrls} from '../../AdStudio/canvas/useCreativeAssetUrls';
import {unlistedDrafts} from '../templates/templateLibraryWorkflow';
import type {WorkspaceCreative} from '../../AdStudio/lib/projectWorkspace';
import type {BrandKitSummary} from '../lib/brandKitTypes';
export function BrandKitBrochurePreview({kit,dirty}:{kit:BrandKitSummary;dirty:boolean}){
 const [open,setOpen]=useState(false);
 return <section className="bp-ready-brochure"><div className="bp-ready-brochure-cover"><BrandKitBrochure kit={kit} dirty={dirty} summary/></div>
 <button type="button" className="xp-secondary" onClick={()=>setOpen(true)}><Maximize2 size={15}/> View Brand Kit</button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="!max-w-[1100px] !w-[96vw] !max-h-[94dvh] overflow-y-auto"><DialogTitle>{kit.name} · Brand Kit</DialogTitle><BrandKitBrochure kit={kit} dirty={dirty}/></DialogContent></Dialog></section>;
}
export function BrandKitReadyCollection({kit,dirty}:{kit:BrandKitSummary;dirty:boolean}){
 const [records,setRecords]=useState<BrandTemplate[]>([]),[drafts,setDrafts]=useState<WorkspaceCreative[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const enabled=isBrandTemplatesEnabled(),base='/brands/'+encodeURIComponent(kit.id)+'/templates';
 const brandUrls=useAuthenticatedBrandAssetUrls(kit),generated=useCreativeAssetUrls(records.flatMap(t=>t.provenance.sourceCreativeId?[t.provenance.sourceCreativeId]:[]));
 useEffect(()=>{let active=true;setLoading(true);setRecords([]);setDrafts([]);setError('');
 if(!enabled){setLoading(false);return;}
 void Promise.all([brandTemplateApi.list(kit.id),brandTemplateApi.listDrafts(kit.id)]).then(([r,d])=>{if(active){setRecords(r.items.filter(t=>t.brandKitId===kit.id));setDrafts(d.items);}}).catch(()=>{if(active)setError('Templates could not be loaded.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[kit.id,enabled]);
 const unmatched=unlistedDrafts(records,drafts);
 return <section className="xp-panel bp-ready-templates"><header><h2>Brand Templates ({records.length+unmatched.length})</h2><Link className="xp-primary" aria-disabled={dirty} to={dirty?'#':base+'?tab=brand&mode=ai'}><Plus size={15}/> Create template</Link></header>
 {loading?<Skeleton className="h-40 w-full"/>:error?<p role="alert">{error}</p>:!records.length&&!unmatched.length?<p>No templates yet.</p>:<div className="bp-ready-template-grid">{records.map(t=><Link key={t.id} to={base+'/'+encodeURIComponent(t.id)}><BrandTemplateScenePreview graph={t.sceneGraph} assetUrls={{...brandUrls,...generated}} size="card" maxHeight={180}/><strong>{t.name}</strong><small>{t.saved?'Saved':t.state} · {kit.name}</small></Link>)}{unmatched.map(d=><Link key={d.id} to={base+'?tab=brand&mode='+(d.templateContext?.draftKind||'ai')+'&source='+encodeURIComponent(d.id)}><strong>{d.name}</strong><small>Draft · {kit.name}</small></Link>)}</div>}
 </section>;
}
