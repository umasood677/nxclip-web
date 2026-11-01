import type { BrandTemplate } from './brandTemplateModel';
import type { WorkspaceCreative } from '../../AdStudio/lib/projectWorkspace';
export function templateResponseId(value: Partial<BrandTemplate> | null | undefined, expected: string, duplicate = false) {
 if (!value?.id || ['undefined','null'].includes(value.id) || (!duplicate && value.id !== expected)) throw Error('Template response has no matching identity. Reload the library to verify the saved state.');
 return value.id;
}
export function unlistedDrafts<T extends WorkspaceCreative>(records: BrandTemplate[], drafts: T[], search = '') {
 const published = new Set(records.flatMap(t=>t.provenance.sourceCreativeId ? [t.provenance.sourceCreativeId] : []));
 return drafts.filter(d=>!published.has(d.id)&&d.name.toLowerCase().includes(search.toLowerCase()));
}
export function templateError(value: unknown) {
 const e=value as {statusCode?:number;message?:string};
 return e?.statusCode===409 ? 'This template changed. Reload the latest version and review it before trying again.' : e?.message || 'Could not save this action. Your edits are retained.';
}
