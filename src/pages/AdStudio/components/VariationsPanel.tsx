import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Columns2, Loader2, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { adStudioApi } from "../../../services/apiClient";
import { SceneThumb } from "./SceneThumb";
import { useCreativeAssetUrls } from "../canvas/useCreativeAssetUrls";
import type { BrandAssetUrlMap } from "../canvas/brandAssetUrls";
import type { AdSceneGraph } from "../types";
import { AD_FORMATS } from "../types";

export type VariationItem = {
  id: string;
  name: string;
  variationType?: string | null;
  parentCreativeId?: string | null;
  sceneGraph?: AdSceneGraph;
  projectId?: string;
};

export function isCampaignAiVariation(item: Pick<VariationItem, "variationType">) {
  return String(item.variationType ?? "").startsWith("ai-");
}

export function campaignAiVariationPath(projectId: string, creativeId: string) {
  return `/create/ad/projects/${encodeURIComponent(projectId)}?review=${encodeURIComponent(creativeId)}&reviewTab=refine`;
}

interface VariationsPanelProps {
  creativeId: string;
  projectId?: string | null;
  currentGraph: AdSceneGraph;
  onOpenVariation?: (id: string) => void;
  assetUrls?: BrandAssetUrlMap;
  beforeNavigate?: () => boolean;
}

function formatLabel(graph?: AdSceneGraph | null): string {
  if (!graph?.canvas) return "";
  const hit = AD_FORMATS.find(
    (f) => f.width === graph.canvas.width && f.height === graph.canvas.height,
  );
  return hit?.label ?? `${graph.canvas.width}×${graph.canvas.height}`;
}

function headlineOf(graph?: AdSceneGraph | null): string {
  const t = graph?.layers?.find((l) => l.type === "text" && l.name === "Headline");
  if (t && "text" in t) return String((t as { text?: string }).text ?? "");
  const anyText = graph?.layers?.find((l) => l.type === "text");
  return anyText && "text" in anyText
    ? String((anyText as { text?: string }).text ?? "")
    : "";
}

function ctaOf(graph?: AdSceneGraph | null): string {
  const shape = graph?.layers?.find(
    (l) => l.type === "shape" && (l.name?.includes("CTA") || (l as { text?: string }).text),
  );
  return shape && "text" in shape
    ? String((shape as { text?: string }).text ?? "")
    : "";
}

export function VariationsPanel({
  creativeId,
  projectId,
  currentGraph,
  onOpenVariation,
  assetUrls,
  beforeNavigate,
}: VariationsPanelProps) {
  const navigate = useNavigate();
  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState<VariationItem[]>([]);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const previewUrls = useCreativeAssetUrls([creativeId, ...items.map(({ id }) => id)]);
  const mediaUrls = { ...assetUrls, ...previewUrls };

  const loadSiblings = useCallback(async () => {
    if (!projectId) return;
    setLoadingList(true);
    setLoadFailed(false);
    try {
      const listed = await adStudioApi.listCreatives(projectId);
      const children = (listed.items ?? []).filter(
        (c: VariationItem) =>
          c.parentCreativeId === creativeId && isCampaignAiVariation(c),
      );
      setItems(
        children.map((c: VariationItem) => ({
          id: c.id,
          name: c.name,
          variationType: c.variationType,
          parentCreativeId: c.parentCreativeId,
          sceneGraph: c.sceneGraph as AdSceneGraph | undefined,
          projectId: c.projectId,
        })),
      );
    } catch {
      setLoadFailed(true);
    } finally {
      setLoadingList(false);
    }
  }, [creativeId, projectId]);

  useEffect(() => {
    void loadSiblings();
  }, [loadSiblings]);

  const startAiVariation = () => {
    if (projectId && (beforeNavigate?.() ?? true)) navigate(campaignAiVariationPath(projectId, creativeId));
  };

  const open = (id: string) => {
    if (!(beforeNavigate?.() ?? true)) return;
    if (onOpenVariation) onOpenVariation(id);
    else navigate(`/create/ad/${id}`);
  };

  const compareItem = useMemo(
    () => items.find((i) => i.id === compareId) ?? null,
    [compareId, items],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-medium">Variations</div>
          <p className="text-[11px] text-muted-foreground">
            Create campaign-specific photographic alternatives from the brief
            and approved Brand Kit references. The original stays unchanged.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!projectId}
          onClick={startAiVariation}
        >
          <Sparkles size={14} className="mr-1" />
          Create AI variation
        </Button>
      </div>

      {loadingList && !items.length ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </p>
      ) : null}

      {loadFailed && (
        <div role="alert" className="flex items-center gap-2 text-xs">
          Could not load variations.
          <Button type="button" size="sm" variant="outline" onClick={() => void loadSiblings()}>Retry</Button>
        </div>
      )}

      {!loadingList && !loadFailed && !items.length ? (
        <p className="text-xs text-muted-foreground">
          {projectId
            ? "No AI variations yet. Create one from the campaign review, then compare or edit it here."
            : "Save this creative to a campaign before creating an AI variation."}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {items.map((v) => {
          const selected = compareId === v.id;
          return (
            <div
              key={v.id}
              className={`rounded-xl border p-2 transition-colors ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/35"
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setCompareId(v.id)}
              >
                <SceneThumb
                  graph={v.sceneGraph}
                  assetUrls={mediaUrls}
                  maxWidth={110}
                  maxHeight={130}
                  className="mx-auto"
                />
                <div className="mt-1.5 text-[11px] font-medium truncate">
                  {v.name}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[9px]">
                    {v.variationType ?? "variation"}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {formatLabel(v.sceneGraph)}
                  </Badge>
                </div>
              </button>
              <div className="flex gap-1 mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => setCompareId(v.id)}
                >
                  <Columns2 size={12} className="mr-1" /> Compare
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => open(v.id)}
                >
                  Open
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {compareItem?.sceneGraph ? (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <div className="text-xs font-medium">Compare with original</div>
          <div className="flex gap-3 justify-center flex-wrap">
            <SceneThumb
              graph={currentGraph}
              assetUrls={mediaUrls}
              maxWidth={100}
              maxHeight={120}
              label="Original"
            />
            <SceneThumb
              graph={compareItem.sceneGraph}
              assetUrls={mediaUrls}
              maxWidth={100}
              maxHeight={120}
              label={compareItem.variationType ?? "Variation"}
            />
          </div>
          <ul className="text-[11px] text-muted-foreground space-y-0.5">
            <li>
              Headline:{" "}
              <span className="text-foreground">
                {headlineOf(currentGraph) || "—"}
              </span>
              {" → "}
              <span className="text-foreground">
                {headlineOf(compareItem.sceneGraph) || "—"}
              </span>
            </li>
            <li>
              CTA:{" "}
              <span className="text-foreground">
                {ctaOf(currentGraph) || "—"}
              </span>
              {" → "}
              <span className="text-foreground">
                {ctaOf(compareItem.sceneGraph) || "—"}
              </span>
            </li>
            <li>
              Format: {formatLabel(currentGraph)} →{" "}
              {formatLabel(compareItem.sceneGraph)}
            </li>
          </ul>
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => open(compareItem.id)}
          >
            Edit this variation
          </Button>
        </div>
      ) : null}
    </div>
  );
}
