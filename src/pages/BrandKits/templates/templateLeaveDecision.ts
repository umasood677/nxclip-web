export function templateLeaveDecision(dirty:boolean,current:string,destination:string):'stay'|'confirm'|'navigate'{
 if(current===destination)return 'stay';
 return dirty?'confirm':'navigate';
}
