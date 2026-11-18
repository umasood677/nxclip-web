import { useEffect, useRef, useState } from 'react';
import {
  CANONICAL_TYPOGRAPHY_ENABLED,
  type CanonicalTypographyLayout,
} from '../../lib/clipTypography/layoutContract';

function fontIdentity(plan: CanonicalTypographyLayout): string {
  const faces = [
    plan.faceId,
    ...plan.layers.map((l) => l.faceId || plan.faceId),
  ].sort();
  return `${plan.rendererSha256}:${plan.assetVersion}:${[...new Set(faces)].join(',')}`;
}

type LayoutMod = {
  loadCanonicalLayoutFont: (plan: CanonicalTypographyLayout) => Promise<void>;
  drawCanonicalLayout: (
    context: CanvasRenderingContext2D,
    input: CanonicalTypographyLayout,
    timeMs: number,
    opts?: { ignoreTime?: boolean },
  ) => void;
};

/** Cached canonical fonts and synchronous repaint preserve playback timing without repeated loading. */
export function CanonicalCaptionPreview({
  plan,
  timeMs,
  enabled = CANONICAL_TYPOGRAPHY_ENABLED,
  aspect = plan.width / plan.height,
}: {
  plan: CanonicalTypographyLayout;
  timeMs: number;
  enabled?: boolean;
  aspect?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const loadedIdentityRef = useRef<string | null>(null);
  const modRef = useRef<LayoutMod | null>(null);
  const drawGenRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    if (!Number.isFinite(aspect) || Math.abs(plan.width / plan.height - aspect) > 0.001) {
      canvas.current?.getContext('2d')?.clearRect(0, 0, plan.width, plan.height);
      setError('aspect');
      setReady(false);
      return;
    }

    const gen = ++drawGenRef.current;
    const identity = fontIdentity(plan);
    const context = canvas.current?.getContext('2d');

    const paint = (mod: LayoutMod) => {
      if (!context) throw new Error('Canvas unavailable');
      context.clearRect(0, 0, plan.width, plan.height);
      mod.drawCanonicalLayout(context, plan, timeMs);
    };

    // Fast path: fonts already loaded — sync paint, no cancel race.
    if (modRef.current && loadedIdentityRef.current === identity) {
      try {
        paint(modRef.current);
        setError(null);
        setReady(true);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Font loading failed');
        setReady(false);
      }
      return;
    }

    setReady(false);
    context?.clearRect(0, 0, plan.width, plan.height);
    void (async () => {
      try {
        const mod = (modRef.current ??
          (await import('../../lib/clipTypography/canonicalLayout'))) as LayoutMod;
        if (gen !== drawGenRef.current) return;
        modRef.current = mod;

        if (loadedIdentityRef.current !== identity) {
          await mod.loadCanonicalLayoutFont(plan);
          if (gen !== drawGenRef.current) return;
          loadedIdentityRef.current = identity;
        }

        paint(mod);
        if (gen !== drawGenRef.current) return;
        setError(null);
        setReady(true);
      } catch (reason) {
        if (gen !== drawGenRef.current) return;
        setError(reason instanceof Error ? reason.message : 'Font loading failed');
        setReady(false);
      }
    })();
    return () => { ++drawGenRef.current; };
  }, [plan, timeMs, enabled, aspect]);

  if (!enabled) {
    return (
      <div role="status" className="absolute bottom-2 left-2 text-xs">
        Typography preview is not available for this project yet.
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvas}
        width={plan.width}
        height={plan.height}
        data-font-state={error ? 'failed' : ready ? 'loaded' : 'loading'}
        data-font-error={error ?? undefined}
        aria-label="Canonical caption preview"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {error ? (
        <div role="alert" className="absolute bottom-2 left-2 text-xs">
          {error === 'aspect'
            ? 'Typography does not match this clip size.'
            : 'Typography preview unavailable. Reload to retry.'}
        </div>
      ) : null}
    </>
  );
}
