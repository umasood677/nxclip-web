import { useEffect, useState } from "react";
import { brandTemplateApi } from "../../../services/apiClient";
import {
  applyBrandTemplateCopy,
  type BrandTemplate,
} from "./brandTemplateModel";
import type { AdSceneGraph } from "../../AdStudio/types";
export type BrandTemplateDraft = {
  name: string;
  templateId: string;
  format: string;
  primaryHeadline: string;
  supportingCopy: string;
  cta: string;
};
export function useBrandTemplateDraftPreview(
  brandId: string,
  selected: BrandTemplate | undefined,
  draft: BrandTemplateDraft | null,
) {
  const key = JSON.stringify([
    brandId,
    selected?.id,
    selected?.revision,
    draft,
  ]);
  const same =
    !!selected &&
    !!draft &&
    draft.templateId === selected.sourceTemplateId &&
    draft.format === selected.format;
  const [preview, setPreview] = useState<{
      key: string;
      graph: AdSceneGraph;
    } | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    if (!selected || !draft || same) return;
    const timer = setTimeout(() => {
      void brandTemplateApi
        .preview(brandId, selected.id, {
          ...draft,
          expectedRevision: selected.revision,
        })
        .then((record) => {
          if (record.id !== selected.id || record.brandKitId !== brandId)
            throw Error("Preview context changed.");
          if (active) setPreview({ key, graph: record.sceneGraph });
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "Preview unavailable. Your draft is retained.",
            );
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [brandId, selected, draft, same, key, retry]);
  return {
    graph:
      !selected || !draft
        ? selected?.sceneGraph
        : same
          ? applyBrandTemplateCopy(selected.sceneGraph, draft)
          : preview?.key === key
            ? preview.graph
            : null,
    loading: !!selected && !!draft && !same && preview?.key !== key && !error,
    error,
    retry: () => setRetry((n) => n + 1),
  };
}
