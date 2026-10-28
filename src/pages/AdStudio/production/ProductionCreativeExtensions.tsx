import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { adStudioApi } from "../../../services/apiClient";
import { SceneStage } from "../canvas/SceneStage";
import { VariationsPanel } from "../components/VariationsPanel";
import { collectExportWarnings } from "../lib/exportWarnings";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
import { AD_FORMATS } from "../types";
import {
  placementPreview,
  savePlacement,
  type PlacementId,
} from "./placementReview";

type Props = {
  creative: WorkspaceCreative;
  projectId: string;
  assetUrls: Record<string, string>;
  mode: "formats" | "variations";
  onSaved: (creative: WorkspaceCreative) => void;
  onOpen: (id: string) => void;
};
export function ProductionCreativeExtensions({
  creative,
  projectId,
  assetUrls,
  mode,
  onSaved,
  onOpen,
}: Props) {
  const [format, setFormat] = useState<PlacementId>("square_1080"),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => {
    try {
      return {
        graph: placementPreview(creative, projectId, format),
        error: null,
      };
    } catch (e) {
      return {
        graph: null,
        error: e instanceof Error ? e.message : "Preview unavailable",
      };
    }
  }, [creative, projectId, format]);
  const warnings = useMemo(
    () => collectExportWarnings(preview.graph),
    [preview.graph],
  );
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await savePlacement(
        adStudioApi,
        creative,
        projectId,
        format,
        reviewed,
      );
      toast.success("Placement saved as a separate creative");
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Placement save failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="xp-split">
      <section className="xp-panel">
        {preview.graph && (
          <SceneStage
            graph={mode === "formats" ? preview.graph : creative.sceneGraph}
            assetUrls={assetUrls}
            size="hero"
            showSafeArea
          />
        )}
      </section>
      <section className="xp-panel">
        <span className="xp-status">
          Deterministic / existing creative workflow
        </span>
        <h2>
          {mode === "formats"
            ? "A consistent campaign. Every placement."
            : "One idea, new expressions."}
        </h2>
        {mode === "formats" ? (
          <>
            <p>
              Preview the existing proportional reflow. Product and logo assets
              remain unchanged; geometry and text size adapt. This is not AI art
              direction or an approval of legibility.
            </p>
            <div className="xp-choice-grid">
              {AD_FORMATS.map((item) => (
                <button
                  key={item.id}
                  disabled={busy}
                  className={format === item.id ? "is-selected" : ""}
                  aria-pressed={format === item.id}
                  onClick={() => {
                    setFormat(item.id);
                    setReviewed(false);
                    setError(null);
                  }}
                >
                  {item.label}
                  <small>
                    {item.width} × {item.height}
                  </small>
                </button>
              ))}
            </div>
            {warnings.length > 0 && (
              <ul className="xp-notice">
                {warnings.map((item) => (
                  <li key={item.code}>{item.message}</li>
                ))}
              </ul>
            )}
            <label className="xp-check">
              <input
                type="checkbox"
                disabled={busy}
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed text, product geometry, cropping and safe areas.
            </label>
            <button
              className="xp-primary"
              disabled={busy || !reviewed || !preview.graph}
              onClick={() => void save()}
            >
              {busy ? "Saving placement…" : "Save placement as a new creative"}
            </button>
            <p className="xp-caption">
              The original stays unchanged. Export checks still apply in the
              existing Canvas and Export panel.
            </p>
          </>
        ) : creative.sceneGraph ? (
          <>
            <p>
              Use the existing native variation engine and compare saved child
              creatives. No generative provider is called by this action.
            </p>
            <VariationsPanel
              creativeId={creative.id}
              projectId={projectId}
              currentGraph={creative.sceneGraph}
              onOpenVariation={onOpen}
            />
          </>
        ) : null}
        {(error || preview.error) && (
          <p className="xp-notice" role="alert">
            {error || preview.error}
          </p>
        )}
        <button className="xp-secondary" onClick={() => onOpen(creative.id)}>
          Open original in Canvas →
        </button>
      </section>
    </div>
  );
}
