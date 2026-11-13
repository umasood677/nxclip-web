import {canReuseTemplate, type BrandTemplate} from '../../BrandKits/templates/brandTemplateModel';
import type {WorkspaceCreative, WorkspaceProject} from './projectWorkspace';
import {projectBriefForm,saveWorkspaceBrief} from './projectWorkspace';
import { AD_FORMATS } from '../types';

export async function alignProjectToTemplateFormat(
 api:{updateProject:(id:string,payload:Record<string,unknown>)=>Promise<WorkspaceProject>},
 project:WorkspaceProject,
 format:string,
){
 if(project.outputFormat===format||project.brief?.outputFormat===format)return {...project,outputFormat:format};
 const form=projectBriefForm(project);
 form.outputFormat=format;
 const saved=await saveWorkspaceBrief(api,project,form);
 return {...saved,outputFormat:saved.outputFormat||saved.brief?.outputFormat||format};
}

export function existingBrandTemplateAd(items:WorkspaceCreative[],template:Pick<BrandTemplate,'id'|'revision'>){
 return items.filter(item=>item.documentPurpose!=='template-draft'&&item.conceptSnapshot?.purpose!=='brand-template-source'&&item.conceptSnapshot?.brandTemplateId===template.id&&item.conceptSnapshot?.brandTemplateRevision===template.revision)
  .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')||a.id.localeCompare(b.id))[0];
}

/** Re-entering the same saved template/revision opens its existing campaign draft. */
export async function openBrandTemplateAd(
 api:{get:(kit:string,id:string)=>Promise<BrandTemplate>;reuse:(kit:string,id:string,project:string,expectedRevision?:number)=>Promise<{id:string}>},
 reader:{listCreatives:(project:string)=>Promise<{items:WorkspaceCreative[]}>},
 project:Pick<WorkspaceProject,'id'|'brandKitId'|'outputFormat'>,
 template:BrandTemplate,
){
 const fresh=await api.get(template.brandKitId,template.id);
 if(fresh.id!==template.id||fresh.revision!==template.revision||fresh.format!==template.format||fresh.brandKitId!==project.brandKitId||!canReuseTemplate(fresh))
  throw Error('Choose a saved, approved template matching this campaign’s Brand Kit.');
 const {items}=await reader.listCreatives(project.id);
 if(items.some(item=>item.projectId!==project.id))throw Error('Campaign ownership could not be verified.');
 const dimensions = AD_FORMATS.find(format => format.id === project.outputFormat);
 if (!dimensions) throw Error('Choose a supported campaign format.');
 const existing=existingBrandTemplateAd(items.filter(item =>
  item.sceneGraph?.canvas.width === dimensions.width && item.sceneGraph.canvas.height === dimensions.height
 ),fresh);
 if(existing)return {id:existing.id,existing:true};
 const result=await api.reuse(fresh.brandKitId,fresh.id,project.id,fresh.revision);
 if(!result.id)throw Error('The saved ad could not be confirmed. Check campaign creatives before trying again.');
 return {...result,existing:false};
}
