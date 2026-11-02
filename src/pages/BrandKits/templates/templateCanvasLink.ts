import {creativeEditorPath} from '../../AdStudio/lib/projectWorkspace';
export function templateCanvasPath(sourceId:string,templateId:string,revision:number){
 return creativeEditorPath(sourceId)+'?template='+encodeURIComponent(templateId)+'&revision='+revision;
}
export function templateEditTarget(search:string){
 const p=new URLSearchParams(search),id=p.get('template'),revision=Number(p.get('revision'));
 return id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)&&Number.isSafeInteger(revision)&&revision>0?{id,revision}:null;
}
export function retainTemplateTarget(path:string,search:string){
 const t=templateEditTarget(search);return t?path+'&template='+encodeURIComponent(t.id)+'&revision='+t.revision:path;
}
export async function saveCanvasTemplate(api:Pick<typeof import('../../../services/apiClient').brandTemplateApi,'get'|'edit'>,kitId:string,source:import('../../AdStudio/lib/projectWorkspace').WorkspaceCreative,target:{id:string;revision:number}){
 const existing=await api.get(kitId,target.id);
 if(existing.brandKitId!==kitId || existing.provenance.sourceCreativeId!==source.id || existing.revision!==target.revision || !source.sceneGraph)throw Error('Template changed. Reopen it from the library before saving Canvas changes.');
 return JSON.stringify(existing.sceneGraph)===JSON.stringify(source.sceneGraph)?existing:api.edit(kitId,target.id,{expectedRevision:target.revision,name:existing.name,sceneGraph:source.sceneGraph});
}
