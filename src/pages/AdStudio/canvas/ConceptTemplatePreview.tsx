import React, { useMemo } from "react";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { isAdStudioTemplatesV1Enabled } from "../lib/adStudioTemplatesFlag";
import type { AdConcept } from "../types";
import { ConceptMockup } from "../components/ConceptMockup";
import { buildBrandAssetUrlMap } from "./brandAssetUrls";
import { composeTemplatePreview } from "./composeTemplateScene";
import { SceneStage, type SceneStageSize } from "./SceneStage";

type Props = {
  concept: AdConcept;
  brand?: BrandKitSummary | null;
  outputFormat: string;
  imageUrl?: string | null;
  className?: string;
  compact?: boolean;
  hero?: boolean;
  /** Force templates path (tests). Default: env flag. */
  templatesEnabled?: boolean;
  onAssetLoadError?: (assetId: string) => void;
};

/**
 * Gallery / live-preview façade:
 * - Templates V1 OFF → legacy ConceptMockup (UX-1)
 * - Templates V1 ON → SceneStage from composed / server scene graph
 */
export function ConceptTemplatePreview({
  concept,
  brand,
  outputFormat,
  imageUrl,
  className,
  compact,
  hero,
  templatesEnabled,
  onAssetLoadError,
}: Props) {
  const enabled =
    templatesEnabled ?? isAdStudioTemplatesV1Enabled();

  const preview = useMemo(() => {
    if (!enabled) return null;
    return composeTemplatePreview({ concept, brand, outputFormat });
  }, [enabled, concept, brand, outputFormat]);

  const assetUrls = useMemo(
    () => (enabled ? buildBrandAssetUrlMap(brand) : {}),
    [enabled, brand],
  );

  if (!enabled) {
    return (
      <ConceptMockup
        concept={concept}
        brand={brand}
        outputFormat={outputFormat}
        imageUrl={imageUrl}
        className={className}
        compact={compact}
        hero={hero}
      />
    );
  }

  const size: SceneStageSize = hero ? "hero" : compact ? "compact" : "card";
  const blocked =
    preview?.status === "blocked"
      ? preview.warnings[0] ??
        `Add required Brand Kit assets (${preview.missingRequiredSlotIds.join(", ") || "slots"})`
      : null;

  return (
    <div className={className} data-templates-v1="on" data-template-id={preview?.templateId}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
          {blocked ? "Template blocked" : "Template preview"}
        </span>
        {preview?.templateName ? (
          <span className="text-[10px] text-muted-foreground truncate">
            {preview.templateName}
          </span>
        ) : null}
      </div>
      <SceneStage
        graph={preview?.sceneGraph}
        assetUrls={assetUrls}
        size={size}
        showSafeArea={Boolean(hero)}
        blockedMessage={blocked}
        label={`${concept.title} template composition`}
        onAssetLoadError={onAssetLoadError}
      />
    </div>
  );
}
