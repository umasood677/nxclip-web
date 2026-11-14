import { Button } from '../../../components/ui/button';
import {OriginalCampaignAd} from './OriginalCampaignAd';
import type {WorkspaceProject} from '../lib/projectWorkspace';
import type {BrandKitSummary} from '../../BrandKits/lib/brandKitTypes';
import {projectBriefForm} from '../lib/projectWorkspace';
import React,{useEffect,useMemo,useState} from 'react';
import {toast} from 'sonner';
import {adStudioApi} from '../../../services/apiClient';
import {BrandTemplateScenePreview} from '../../BrandKits/templates/BrandTemplateScenePreview';
import {ExportPanel} from './ExportPanel';
import {placementPreview,savePlacement} from '../production/placementReview';
import {AD_FORMATS} from '../types';
import type {WorkspaceCreative} from '../lib/projectWorkspace';
export type CampaignReviewTab='review'|'variations'|'formats'|'export'|'refine';
export function CampaignAdReview({creative,assetUrls,initialTab='review',onEdit,onSaved,project,brand,onDelete,onTabChange}:{project?:WorkspaceProject;brand?:BrandKitSummary|null;creative:WorkspaceCreative;assetUrls:Record<string,string>;initialTab?:CampaignReviewTab;onEdit:(id:string)=>void;onSaved:(creative:WorkspaceCreative)=>void;onDelete?:()=>Promise<void>;onTabChange?:(tab:CampaignReviewTab)=>void}){
 const normalizedInitialTab=initialTab==='variations'?'refine':initialTab;
 const [tab,setTab]=useState<CampaignReviewTab>(normalizedInitialTab),[format,setFormat]=useState<string>('square_1080'),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setTab(initialTab==='variations'?'refine':initialTab);setReviewed(false);setError('');},[creative.id,initialTab]);
 const [confirmDelete,setConfirmDelete]=useState(false);
 const changeTab=(next:CampaignReviewTab)=>{setTab(next);onTabChange?.(next);};
 async function deleteAd(){
  setBusy(true);setError('');
  try{await onDelete?.();}
  catch(e){setError(e instanceof Error?e.message:'Could not delete creative');}
  finally{setBusy(false);}
 }
 const adapted=useMemo(()=>{try{return placementPreview(creative,creative.projectId,format);}catch{return null;}},[creative,format]);
 async function saveFormat(){if(busy)return;setBusy(true);setError('');try{await savePlacement(adStudioApi,creative,creative.projectId,format,reviewed);toast.success('Format copy saved to this campaign');}catch(e){setError(e instanceof Error?e.message:'Could not save format');}finally{setBusy(false);}}
 return <div className="campaign-ad-review">
  <div className="campaign-ad-review__columns">
   <div className="campaign-ad-review__preview"><BrandTemplateScenePreview graph={tab==='formats'?adapted:creative.sceneGraph} assetUrls={assetUrls} maxHeight={450} readablePlaceholder/><Button variant="outline" onClick={()=>onEdit(creative.id)}>Open in Canvas</Button></div>
   <section className="campaign-ad-review__tools">
  <nav aria-label="Creative review views">
    <ul className="ad-project-template-tabs list-none">
      {(['review', ...(project ? ['refine' as const] : []), 'formats', 'export'] as const).map((value) => (
        <li key={value}>
          <button type="button" aria-pressed={tab === value} onClick={() => changeTab(value)}>
            <strong>{value === 'review' ? 'Review ad' : value === 'formats' ? 'Adapt formats' : value === 'export' ? 'Export' : 'AI variations'}</strong>
          </button>
        </li>
      ))}
    </ul>
  </nav>
    {tab==='review'&&<><h2>Creative details</h2><p className="w0a-meta">Saved ad · {creative.sceneGraph?.canvas.width} × {creative.sceneGraph?.canvas.height}</p><button className="w0a-btn" onClick={()=>changeTab('export')}>Continue to export →</button></>}
    {tab==='refine'&&project&&<OriginalCampaignAd project={project} brand={brand||null} form={projectBriefForm(project)} onChange={()=>undefined} onSaveBrief={async()=>project} initialSource={creative} onSaved={onSaved}/>}
    {tab==='formats'&&<><h3>Adapt this ad</h3><label>Output format<select value={format} onChange={e=>{setFormat(e.target.value);setReviewed(false);}}>{AD_FORMATS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><p className="w0a-meta">Review cropping and legibility. Photographic subjects remain part of the original image.</p><label className="campaign-ad-review__check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed the adapted layout.</label><button className="w0a-btn" disabled={!reviewed||busy||!adapted} onClick={()=>void saveFormat()}>{busy?'Saving…':'Save format copy'}</button></>}
    {tab==='export'&&<ExportPanel creativeId={creative.id} graph={creative.sceneGraph||null}/>}
    {onDelete && <div className="campaign-ad-review__delete">
      {confirmDelete ? <>
        <p>Remove this creative from the project?</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={()=>setConfirmDelete(false)}>Keep creative</Button>
          <Button variant="destructive" disabled={busy} onClick={()=>void deleteAd()}>{busy?'Deleting…':'Delete creative'}</Button>
        </div>
      </> : <Button variant="ghost" className="text-destructive" disabled={busy} onClick={()=>setConfirmDelete(true)}>Delete creative</Button>}
    </div>}
    {error&&<p role="alert">{error}</p>}
   </section>
  </div>
 </div>;
}
