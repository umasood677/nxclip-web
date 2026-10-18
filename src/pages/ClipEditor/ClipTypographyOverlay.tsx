import { CanonicalCaptionPreview } from './CanonicalCaptionPreview';
import { editorTypography } from '../../lib/clipTypography/editorTypography';

/** Both editor stages share the same activation/locked/final-render gates. */
export function ClipTypographyOverlay({ raw, timeMs, locked, finalRender = false, enabled, aspect = 9 / 16 }: {
  raw: unknown; timeMs: number; locked: boolean; finalRender?: boolean; enabled?: boolean; aspect?: number;
}) {
  const state = editorTypography(raw, enabled);
  if (!state.active || locked || finalRender) return null;
  if (state.invalid) return <div role="alert" className="absolute bottom-2 text-xs">Saved typography layout is invalid. Export requires repair.</div>;
  return state.plan ? <CanonicalCaptionPreview plan={state.plan} timeMs={timeMs} enabled={true} aspect={aspect} /> : null;
}
