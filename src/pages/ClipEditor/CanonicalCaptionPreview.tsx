import { useEffect, useRef, useState } from 'react';
import { CANONICAL_TYPOGRAPHY_ENABLED, type CanonicalTypographyLayout } from '../../lib/clipTypography/layoutContract';

/** Explicit canonical path. Failed loads show an error, never a substituted font. */
export function CanonicalCaptionPreview({plan,timeMs,enabled=CANONICAL_TYPOGRAPHY_ENABLED,aspect=plan.width/plan.height}:{plan:CanonicalTypographyLayout;timeMs:number;enabled?:boolean;aspect?:number}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error,setError] = useState<string | null>(null);
  const [ready,setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    setReady(false);
    if(!Number.isFinite(aspect)||Math.abs(plan.width/plan.height-aspect)>0.001){canvas.current?.getContext('2d')?.clearRect(0,0,plan.width,plan.height);setError('aspect');return;}
    let cancelled=false;
    void (async () => {
      const {loadCanonicalLayoutFont,drawCanonicalLayout}=await import('../../lib/clipTypography/canonicalLayout');
      await loadCanonicalLayoutFont(plan);
      if(cancelled) return;
      const context=canvas.current?.getContext('2d'); if(!context) throw new Error('Canvas unavailable');
      context.clearRect(0,0,plan.width,plan.height); drawCanonicalLayout(context,plan,timeMs); setError(null); setReady(true);
    })().catch(reason => { if(!cancelled) { canvas.current?.getContext('2d')?.clearRect(0,0,plan.width,plan.height); setError(reason instanceof Error ? reason.message : 'Font loading failed'); } });
    return () => {cancelled=true;};
  },[plan,timeMs,enabled,aspect]);
  if (!enabled) return <div role="status" className="absolute bottom-2 left-2 text-xs">Typography preview is not available for this project yet.</div>;
  return <><canvas ref={canvas} width={plan.width} height={plan.height} data-font-state={error ? 'failed' : ready ? 'loaded' : 'loading'} data-font-error={error ?? undefined} aria-label="Canonical caption preview" className="pointer-events-none absolute inset-0 h-full w-full" />{error ? <div role="alert" className="absolute bottom-2 left-2 text-xs">{error==='aspect'?'Typography does not match this clip size.':'Typography preview unavailable. Reload to retry.'}</div> : null}</>;
}
