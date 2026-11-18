import React from 'react';
import {ChevronDown,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../../../components/ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger} from '../../../components/ui/dropdown-menu';
import {deletionKey,type TemplateDeleteEntry} from './templateDeletion';
export function TemplateBulkActions({entries,selected,busy,onSelect,onDelete}:{entries:TemplateDeleteEntry[];selected:string[];busy:boolean;onSelect:(keys:string[])=>void;onDelete:()=>void}){
 const visibleKeys = entries.slice(0, 50).map(deletionKey);
 const rejectedKeys = entries.filter(entry => entry.rejected).slice(0, 50).map(deletionKey);
 return <DropdownMenu modal={false}>
  <DropdownMenuTrigger className="xp-secondary" disabled={busy || (!visibleKeys.length && !selected.length)} aria-label={selected.length ? `Template selection, ${selected.length} selected` : "Select templates"}>
   {selected.length ? `${selected.length} selected` : "Select templates"} <ChevronDown size={14} aria-hidden="true" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="min-w-44">
   <DropdownMenuItem disabled={!visibleKeys.length} onClick={() => onSelect(visibleKeys)}>Select visible{entries.length > 50 ? " (first 50)" : ""}</DropdownMenuItem>
   {rejectedKeys.length > 0 && <DropdownMenuItem onClick={() => onSelect(rejectedKeys)}>Select rejected</DropdownMenuItem>}
   {selected.length > 0 && <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => onSelect([])}>Clear selection</DropdownMenuItem>
    <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 aria-hidden="true" /> Delete selected</DropdownMenuItem>
   </>}
  </DropdownMenuContent>
 </DropdownMenu>;
}
export function TemplateDeleteDialog({entries,busy,onCancel,onConfirm}:{entries:TemplateDeleteEntry[]|null;busy:boolean;onCancel:()=>void;onConfirm:()=>void}){
 return <Dialog open={!!entries} onOpenChange={open=>{if(!open&&!busy)onCancel();}}><DialogContent className="bt-delete-dialog"><DialogTitle>Delete {entries?.length===1?'template':String(entries?.length||0)+' templates'}?</DialogTitle><DialogDescription>Deletes the selected templates and their unused generated images and exports. Uploaded Brand Kit assets and files used elsewhere are kept.</DialogDescription>
 <ul>{entries?.map(e=><li key={deletionKey(e)}>{e.name}{e.pending?' · Cleanup pending':''}</li>)}</ul>
 <p className="tc-caption">This cannot be undone. Storage retention policies may keep recoverable versions.</p>
 <div className="xp-actions"><button type="button" className="xp-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="bt-delete-button" disabled={busy} onClick={onConfirm}><Trash2 size={15}/>{busy?'Deleting…':'Delete templates and unused files'}</button></div>
 </DialogContent></Dialog>;
}
