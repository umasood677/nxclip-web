import React from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../../../components/ui/dialog';
export function TemplateLeaveDialog({open,onStay,onDiscard}:{open:boolean;onStay:()=>void;onDiscard:()=>void}){
 return <Dialog open={open} onOpenChange={value=>{if(!value)onStay();}}><DialogContent className="bt-delete-dialog bt-leave-dialog">
  <DialogTitle>Unsaved changes</DialogTitle><DialogDescription>Keep editing, or discard your changes before leaving.</DialogDescription>
  <div className="xp-actions"><button type="button" className="xp-secondary" onClick={onDiscard}>Discard and leave</button><button type="button" className="xp-secondary" autoFocus onClick={onStay}>Keep editing</button></div>
 </DialogContent></Dialog>;
}
