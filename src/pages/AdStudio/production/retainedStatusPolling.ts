/** Read-only follow-up policy. A timed-out UI must never replay paid execution. */
export function isProcessingStatus(status:string){return ['queued','processing','running'].includes(status);}
export function retainedStatusDelay(status:string,started:number,now:number):number|null{
 // Provider work can take longer than the original two-minute UI window.  The
 // poll is read-only and never repeats the paid request, so continue checking
 // the retained result with a progressively quieter cadence.
 if(!isProcessingStatus(status)||now-started>=8*60_000)return null;
 const elapsed=now-started;
 return elapsed<60_000?3_000:elapsed<3*60_000?5_000:10_000;
}
