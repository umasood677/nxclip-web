import type { BrandTemplate } from './brandTemplateModel';
import type { WorkspaceCreative } from '../../AdStudio/lib/projectWorkspace';
export function templateResponseId(value: Partial<BrandTemplate> | null | undefined, expected: string, duplicate = false) {
 if (!value?.id || ['undefined','null'].includes(value.id) || (!duplicate && value.id !== expected)) throw Error('Template response has no matching identity. Reload the library to verify the saved state.');
 return value.id;
}
export function unlistedDrafts<T extends WorkspaceCreative>(records: BrandTemplate[], drafts: T[], search = '') {
 const templateIds=new Set(records.map(t=>t.id));
 const published = new Set(records.flatMap(t=>t.provenance.sourceCreativeId ? [t.provenance.sourceCreativeId] : []));
 // A completed generated child supersedes its internal starter; siblings remain distinct proposals.
 const byId=new Map(drafts.map(d=>[d.id,d]));
 for(const source of new Set([...published,...drafts.filter(d=>d.imageRenderMode==="template-proposal"&&d.variationType?.startsWith("ai-")).map(d=>d.id)])){let child=byId.get(source);const seen=new Set<string>();while(child?.parentCreativeId&&child.variationType?.startsWith("ai-")&&!seen.has(child.id)){seen.add(child.id);const parent=byId.get(child.parentCreativeId);if(!parent||!parent.templateContext||!child.templateContext||parent.projectId!==child.projectId||parent.templateContext.brandKitId!==child.templateContext.brandKitId)break;published.add(parent.id);child=parent;}}
 return drafts.filter(d=>!published.has(d.id)&&!templateIds.has(d.templateContext?.brandTemplateId||String(d.conceptSnapshot?.brandTemplateId||''))&&d.name.toLowerCase().includes(search.toLowerCase()));
}
export function templateError(value: unknown) {
 const e=value as {statusCode?:number;message?:string};
 return e?.statusCode===409 ? 'This template changed. Reload the latest version and review it before trying again.' : e?.message || 'Could not save this action. Your edits are retained.';
}
