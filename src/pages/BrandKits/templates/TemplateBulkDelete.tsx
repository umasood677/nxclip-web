import React from 'react';
import {Trash2,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../../../components/ui/dialog';
import {deletionKey,type TemplateDeleteEntry} from './templateDeletion';
export function TemplateBulkActions({entries,selected,busy,onSelect,onDelete}:{entries:TemplateDeleteEntry[];selected:string[];busy:boolean;onSelect:(keys:string[])=>void;onDelete:()=>void}){
 const keys=entries.map(deletionKey),all=keys.length>0&&keys.slice(0,50).every(k=>selected.includes(k));
 return <div className="bt-bulk-actions" aria-label="Template selection">
  <label className="xp-check"><input type="checkbox" disabled={busy||!entries.length} checked={all} onChange={()=>onSelect(all?[]:keys.slice(0,50))}/> Select visible{entries.length>50?' (first 50)':''}</label>
  {entries.some(e=>e.rejected)&&<button type="button" className="xp-text-button" disabled={busy} onClick={()=>onSelect(entries.filter(e=>e.rejected).slice(0,50).map(deletionKey))}>Select rejected</button>}
  <span className="bt-bulk-count">{selected.length} selected</span>
  {!!selected.length&&<><button type="button" className="xp-text-button" disabled={busy} onClick={()=>onSelect([])}><X size={14}/> Clear</button><button type="button" className="bt-delete-button" disabled={busy} onClick={onDelete}><Trash2 size={14}/> Delete selected</button></>}
 </div>;
}
export function TemplateDeleteDialog({entries,busy,onCancel,onConfirm}:{entries:TemplateDeleteEntry[]|null;busy:boolean;onCancel:()=>void;onConfirm:()=>void}){
 return <Dialog open={!!entries} onOpenChange={open=>{if(!open&&!busy)onCancel();}}><DialogContent className="bt-delete-dialog"><DialogTitle>Delete {entries?.length===1?'template':String(entries?.length||0)+' templates'}?</DialogTitle><DialogDescription>Deletes the selected templates and their unused generated images and exports. Uploaded Brand Kit assets and files used elsewhere are kept.</DialogDescription>
 <ul>{entries?.map(e=><li key={deletionKey(e)}>{e.name}{e.pending?' · Cleanup pending':''}</li>)}</ul>
 <p className="tc-caption">This cannot be undone. Storage retention policies may keep recoverable versions.</p>
 <div className="xp-actions"><button type="button" className="xp-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="bt-delete-button" disabled={busy} onClick={onConfirm}><Trash2 size={15}/>{busy?'Deleting…':'Delete templates and unused files'}</button></div>
 </DialogContent></Dialog>;
}
