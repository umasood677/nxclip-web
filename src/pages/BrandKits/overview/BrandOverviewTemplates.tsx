import {templateRecency} from '../templates/templateRecency';
import {templateCanvasPath} from '../templates/templateCanvasLink';
import {BrandTemplateGallery} from '../templates/BrandTemplateGallery';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Layers,ArrowRight} from 'lucide-react';
import {toast} from 'sonner';
import {brandTemplateApi} from '../../../services/apiClient';
import {EmptyState} from '../../../components/common/EmptyState';
import {Skeleton} from '../../../components/ui/skeleton';
import {BrandTemplateTile} from '../templates/BrandTemplateTile';
import {TemplateDeleteDialog} from '../templates/TemplateBulkDelete';
import {deletionEntries,deletionPayload,deletionFeedback,type TemplateDeleteEntry,type DeletableTemplateDraft} from '../templates/templateDeletion';
import {unlistedDrafts,templateResponseId,templateError} from '../templates/templateLibraryWorkflow';
import {isBrandTemplatesEnabled,type BrandTemplate} from '../templates/brandTemplateModel';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import {useCreativeAssetUrls} from '../../AdStudio/canvas/useCreativeAssetUrls';
import {creativeEditorPath} from '../../AdStudio/lib/projectWorkspace';
import {brandOverviewPaths} from './brandOverviewModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';

export function BrandOverviewTemplates({kit}:{kit:BrandKitSummary}){
 const navigate=useNavigate(),paths=brandOverviewPaths(kit.id),enabled=isBrandTemplatesEnabled();
 const [records,setRecords]=useState<BrandTemplate[]>([]),[drafts,setDrafts]=useState<DeletableTemplateDraft[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState<TemplateDeleteEntry[]|null>(null);
 const version=useRef(0),acting=useRef(false),activeBrand=useRef(kit.id);activeBrand.current=kit.id;
 const load=useCallback(async()=>{
  const request=++version.current;setLoading(true);setError('');
  if(!enabled){setLoading(false);return;}
  try{
   const [r,d]=await Promise.all([brandTemplateApi.list(kit.id),brandTemplateApi.listDrafts(kit.id)]);
   if(request!==version.current)return;
   if(r.items.some(t=>t.brandKitId!==kit.id)||d.items.some(t=>t.templateContext&&t.templateContext.brandKitId!==kit.id))throw Error('Brand context changed.');
   setRecords(r.items);setDrafts(d.items);
  }catch{if(request===version.current)setError('Brand Templates could not be loaded.');}
  finally{if(request===version.current)setLoading(false);}
 },[kit.id,enabled]);
 useEffect(()=>{setRecords([]);setDrafts([]);setDeleting(null);void load();return()=>{version.current++;};},[load]);
 const brandUrls=useAuthenticatedBrandAssetUrls(kit),generated=useCreativeAssetUrls([...records.filter(t=>!t.deletion).flatMap(t=>t.provenance.sourceCreativeId?[t.provenance.sourceCreativeId]:[]),...drafts.filter(d=>!d.deletionPending).map(d=>d.id)]),urls={...brandUrls,...generated};
 const unmatched=unlistedDrafts(records,drafts),shown=templateRecency(records.filter(t=>t.state!=='archived'||!!t.deletion),unmatched).slice(0,4);
 async function run(work:()=>Promise<void>){if(acting.current)return;acting.current=true;setBusy(true);const brand=kit.id;try{await work();}catch(e){if(activeBrand.current===brand)toast.error(templateError(e));}finally{acting.current=false;if(activeBrand.current===brand)setBusy(false);}}
 const archive=(t:BrandTemplate)=>void run(async()=>{const result=await brandTemplateApi.action(kit.id,t.id,t.revision,'archive');if(activeBrand.current!==kit.id)return;templateResponseId(result,t.id);toast.success('Template archived.');await load();});
 const remove=()=>void run(async()=>{if(!deleting)return;const request=deletionPayload(deleting,deleting.map(e=>e.kind+':'+e.id)),r=await brandTemplateApi.bulkDelete(kit.id,request),feedback=deletionFeedback(r.items,request);if(activeBrand.current!==kit.id)return;toast[feedback.tone](feedback.message);setDeleting(null);await load();});
 const edit=(t:BrandTemplate)=>void run(async()=>{if(t.provenance.method==='provider-ai-creative'){if(t.provenance.sourceCreativeId)navigate(templateCanvasPath(t.provenance.sourceCreativeId,t.id,t.revision));return;}const draft=await brandTemplateApi.editorDraft(kit.id,t.id);if(activeBrand.current!==kit.id)return;if(!draft.id)throw Error('Template editor could not be opened.');navigate(creativeEditorPath(draft.id));});
 return <section className="bo-panel bo-templates" id="brand-templates"><header><h2><Layers size={18}/> Brand Templates {!loading&&'('+String(records.length+unmatched.length)+')'}</h2><div className="bo-section-actions"><Link to={paths.templates}>View All <ArrowRight size={13}/></Link></div></header>
  <TemplateDeleteDialog entries={deleting} busy={busy} onCancel={()=>setDeleting(null)} onConfirm={remove}/>
  {loading?<div className="bo-template-grid">{[0,1,2,3].map(i=><Skeleton key={i} className="h-64 w-full"/>)}</div>:error?<div role="alert">{error}<button type="button" className="bo-button" onClick={()=>void load()}>Retry</button></div>:!enabled?<EmptyState title="Brand Templates are unavailable" description="Template creation is disabled in this environment."/>:!shown.length?<EmptyState title="Your template collection starts here" description="Create or review a template for this Brand Kit." actionLabel="Open Brand Templates" onAction={()=>navigate(paths.templates)}/>:<BrandTemplateGallery label="Recent Brand Templates">
   {shown.map(entry=>entry.kind==='template'?((t)=><BrandTemplateTile key={t.id} name={t.name} graph={t.sceneGraph} assetUrls={urls} format={t.format} status={t.deletion?'Cleanup pending':t.saved?'Saved':t.state} kind={t.provenance.method==='provider-ai-creative'?'AI artwork':'Editable layout'} selected={false} busy={busy} pending={!!t.deletion} hideSelection onToggle={()=>{}} onPreview={()=>navigate(paths.templates.split('?')[0]+'/'+encodeURIComponent(t.id))} onEdit={!t.deletion?()=>edit(t):undefined} onArchive={t.state!=='archived'?()=>archive(t):undefined} onDelete={()=>setDeleting(deletionEntries([t],[]))}/>)(entry.record):((d)=>
   <BrandTemplateTile key={d.id} name={d.name} graph={d.sceneGraph} assetUrls={urls} status={d.deletionPending?'Cleanup pending':'Draft'} kind={d.templateContext?.draftKind==='native'?'Editable layout':'AI proposal'} selected={false} busy={busy} pending={d.deletionPending} hideSelection onToggle={()=>{}} onPreview={()=>navigate(paths.templates+'&mode='+(d.templateContext?.draftKind||'ai')+'&source='+encodeURIComponent(d.id))} onEdit={()=>navigate(creativeEditorPath(d.id))} onDelete={()=>setDeleting(deletionEntries([], [d]))}/>)(entry.draft))}
  </BrandTemplateGallery>}
 </section>;
}
