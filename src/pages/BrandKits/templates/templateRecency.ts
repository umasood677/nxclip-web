import type {BrandTemplate} from './brandTemplateModel';
import type {DeletableTemplateDraft} from './templateDeletion';
export function templateRecency(records:BrandTemplate[],drafts:DeletableTemplateDraft[]){
 const entries=[...records.map(record=>({kind:'template' as const,record,updatedAt:record.updatedAt||record.createdAt})),...drafts.map(draft=>({kind:'draft' as const,draft,updatedAt:draft.updatedAt}))];
 return entries.map((entry,index)=>({entry,index,time:Date.parse(entry.updatedAt||'')||0})).sort((a,b)=>b.time-a.time||a.index-b.index).map(v=>v.entry);
}
