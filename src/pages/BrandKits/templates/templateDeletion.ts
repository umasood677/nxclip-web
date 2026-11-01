import type {BrandTemplate} from './brandTemplateModel';
import type {WorkspaceCreative} from '../../AdStudio/lib/projectWorkspace';
export type TemplateDeleteItem={kind:'template'|'draft';id:string;expectedVersion:number};
export type TemplateDeleteResult={kind:'template'|'draft';id:string;status:'deleted'|'cleanup_pending'|'blocked';removedObjects:number;retainedObjects:number;message?:string};
export type DeletableTemplateDraft=WorkspaceCreative&{deletionPending?:boolean};
export type TemplateDeleteEntry=TemplateDeleteItem&{name:string;rejected:boolean;pending:boolean};
export const deletionKey=(item:Pick<TemplateDeleteItem,'kind'|'id'>)=>item.kind+':'+item.id;
export function deletionEntries(records:BrandTemplate[],drafts:DeletableTemplateDraft[]):TemplateDeleteEntry[]{
 return [...records.map(t=>({kind:'template' as const,id:t.id,expectedVersion:t.revision,name:t.name,rejected:t.state==='rejected',pending:!!t.deletion})),
 ...drafts.map(d=>({kind:'draft' as const,id:d.id,expectedVersion:d.currentVersion,name:d.name,rejected:false,pending:!!d.deletionPending}))];
}
export function deletionPayload(entries:TemplateDeleteEntry[],keys:string[]){
 if(!keys.length||keys.length>50)throw Error('Select between 1 and 50 templates.');
 const selected=entries.filter(e=>keys.includes(deletionKey(e)));
 if(selected.length!==keys.length)throw Error('Selection changed. Reload and select templates again.');
 return selected.map(({kind,id,expectedVersion})=>({kind,id,expectedVersion}));
}
export function deletionSummary(results:TemplateDeleteResult[],request:TemplateDeleteItem[]){
 const keys=new Set(request.map(deletionKey));
 if(results.length!==request.length||new Set(results.map(deletionKey)).size!==request.length||results.some(r=>!keys.has(deletionKey(r))||!['deleted','cleanup_pending','blocked'].includes(r.status)))throw Error('Deletion response could not be verified. Reload to check the saved state.');
 return {deleted:results.filter(r=>r.status==='deleted').length,pending:results.filter(r=>r.status!=='deleted').length,removedObjects:results.reduce((sum,r)=>sum+r.removedObjects,0),retainedObjects:results.reduce((sum,r)=>sum+r.retainedObjects,0)};
}
