/** Read-only follow-up policy. A timed-out UI must never replay paid execution. */
export function isProcessingStatus(status:string){return ['queued','processing','running'].includes(status);}
export function retainedStatusDelay(status:string,started:number,now:number):number|null{
 return isProcessingStatus(status)&&now-started<120_000?3_000:null;
}
