import { EmptyState } from "../../../components/common/EmptyState";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { brandTemplateApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import { SceneThumb } from "./SceneThumb";
import {
  canReuseTemplate,
  isBrandTemplatesEnabled,
  type BrandTemplate,
} from "../../BrandKits/templates/brandTemplateModel";
import { reusableHomeTemplates } from "../lib/homeEntryFlow";
import type { BrandAssetUrlMap } from "../canvas/brandAssetUrls";
export function useSavedBrandTemplates(brandId: string) {
  const enabled = isBrandTemplatesEnabled(),
    [result, setResult] = useState<{
      brandId: string;
      items: BrandTemplate[];
      error: string;
    } | null>(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setResult(null);
    if (!brandId) return;
    void brandTemplateApi
      .list(brandId)
      .then((response) => {
        reusableHomeTemplates(response.items, brandId);
        if (active) setResult({ brandId, items: response.items, error: "" });
      })
      .catch((error: unknown) => {
        const status =
          error && typeof error === "object"
            ? Number(
                "statusCode" in error
                  ? error.statusCode
                  : "status" in error
                    ? error.status
                    : 0,
              )
            : 0;
        if (active)
          setResult({
            brandId,
            items: [],
            error: `Saved Brand Templates are unavailable${status ? ` (HTTP ${status})` : ""}. Review local activation/readiness before trying again.`,
          });
      });
    return () => {
      active = false;
    };
  }, [brandId, enabled, retry]);
  return {
    enabled,
    items: result?.brandId === brandId ? result.items : [],
    error: result?.brandId === brandId ? result.error : "",
    loading: !!brandId && result?.brandId !== brandId,
    retry: () => setRetry((value) => value + 1),
  };
}
export function SavedBrandTemplates({
  brandId,
  data,
  assetUrls,
  project,
}: {
  brandId: string;
  data: ReturnType<typeof useSavedBrandTemplates>;
  assetUrls: BrandAssetUrlMap;
  project?: {
    id: string;
    brandKitId?: string | null;
    outputFormat?: string | null;
  };
}) {
  const navigate = useNavigate(),
    pending = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const items = reusableHomeTemplates(data.items, brandId),
    reviewPath = `/brands/${encodeURIComponent(brandId)}/templates`;
  async function useInProject(template: BrandTemplate) {
    if (!project || !data.enabled || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const fresh = await brandTemplateApi.get(brandId, template.id);
      if (
        fresh.brandKitId !== brandId ||
        !canReuseTemplate(fresh) ||
        project.brandKitId !== brandId ||
        project.outputFormat !== fresh.format
      )
        throw Error(
          "Choose a current approved template with this project's Brand Kit and format.",
        );
      const creative = await brandTemplateApi.reuse(
        brandId,
        fresh.id,
        project.id,
      );
      navigate(`/create/ad/${encodeURIComponent(creative.id)}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Template could not be used. Your project is retained.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (data.loading)
    return (
      <div
        className="w0a-grid w0a-grid-3"
        aria-label="Loading saved Brand Templates"
      >
        {[0, 1, 2].map((value) => (
          <Skeleton key={value} className="h-64" />
        ))}
      </div>
    );
  if (data.error)
    return (
      <div role="alert" className="w0a-note">
        {data.error}
        <button onClick={data.retry}>Retry</button>
      </div>
    );
  return (
    <>
      {!data.enabled && (
        <p className="w0a-note">
          Saved recipes can be inspected here. Template editing and reuse
          require local activation.
        </p>
      )}
      <p className="w0a-note">
        Saved native layouts from this Brand Kit. Only approved, saved recipes
        without reported blockers are offered for reuse.
      </p>
      {error && <p role="alert">{error}</p>}
      {!items.length ? (
        <EmptyState
          title="No reusable Brand Templates yet"
          description={
            data.items.length
              ? `${data.items.length} recipe(s) need review, saving or blocker resolution.`
              : "Prepare templates from the Brand Kit, then review and save them."
          }
          actionLabel={
            data.enabled
              ? "Prepare / review Brand Templates"
              : "Review Brand Kit readiness"
          }
          onAction={() =>
            navigate(
              data.enabled
                ? reviewPath
                : `/brands/${encodeURIComponent(brandId)}?step=ready`,
            )
          }
        />
      ) : (
        <div className="w0a-grid w0a-grid-3">
          {items.map((template) => (
            <article key={template.id} className="w0a-card">
              <div className="flex justify-center items-center min-h-56 bg-black/20">
                <SceneThumb
                  graph={template.sceneGraph}
                  maxWidth={250}
                  maxHeight={280}
                  assetUrls={assetUrls}
                  label={`${template.name} saved template`}
                />
              </div>
              <div className="w0a-card-body">
                <h3>{template.name}</h3>
                <p className="w0a-meta">
                  Saved Brand Template · {template.format} · native layout
                </p>
                {data.enabled ? (
                  <Link
                    className="w0a-link"
                    to={`${reviewPath}/${encodeURIComponent(template.id)}`}
                  >
                    Review template →
                  </Link>
                ) : (
                  <span className="w0a-meta">
                    Read-only · reuse is disabled
                  </span>
                )}
                {project && (
                  <>
                    <button
                      className="w0a-btn"
                      disabled={
                        !data.enabled ||
                        busy ||
                        project.brandKitId !== brandId ||
                        project.outputFormat !== template.format
                      }
                      onClick={() => void useInProject(template)}
                    >
                      Use in this project
                    </button>
                    {project.outputFormat !== template.format && (
                      <p className="w0a-meta">
                        Choose a compatible project/format in the template
                        library.
                      </p>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
