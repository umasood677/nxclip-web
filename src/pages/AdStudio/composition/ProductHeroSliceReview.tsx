import React, { useMemo, useState } from "react";
import { SceneStage } from "../canvas/SceneStage";
import { updateLayer } from "../lib/sceneGraph";
import type { ProductHeroSliceResultV1 } from "./product-hero-slice";
import { PRODUCT_HERO_SLICE_ENABLED_DEFAULT } from "./product-hero-slice";
import {
  productHeroSlicePreview,
  editProductHeroHeadline,
} from "./productHeroSlicePreview";

type Props = {
  enabled?: boolean;
  result: ProductHeroSliceResultV1;
  /** Local test URLs supplied explicitly by caller. No asset fetch/storage integration. */
  assetUrls: Readonly<Record<string, string>>;
};
/** Deliberately not imported into any app route, gallery or existing editor. */
export function ProductHeroSliceReview(props: Props) {
  if ((props.enabled ?? PRODUCT_HERO_SLICE_ENABLED_DEFAULT) !== true)
    return null;
  return (
    <EnabledReview
      key={
        props.result.exports.find((e) => e.format === "png")?.sha256 ??
        props.result.originalBlueprintSha256
      }
      {...props}
    />
  );
}
function EnabledReview({ result, assetUrls }: Props) {
  const preview = useMemo(() => productHeroSlicePreview(result), [result]);
  const [graph, setGraph] = useState(preview.graph);
  const [edited, setEdited] = useState(false);
  const headline = graph.layers.find(
    (l) => l.type === "text" && l.name === "Headline",
  ) as { text: string };
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">{preview.label}</p>
      <p className="text-xs text-muted-foreground">
        {result.entryPoint.kind} / {result.entryPoint.id}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <SceneStage
          graph={graph}
          assetUrls={assetUrls}
          size="hero"
          label={preview.label}
        />
        <div className="space-y-3">
          <label className="block text-sm">
            Headline (independent editable layer)
            <input
              className="mt-1 block w-full rounded border border-border bg-background p-2"
              value={headline.text}
              maxLength={80}
              onChange={(event) => {
                if (!event.target.value.trim()) return;
                setGraph(editProductHeroHeadline(graph, event.target.value));
                setEdited(true);
              }}
            />
          </label>
          <ul className="space-y-2 text-sm">
            {graph.layers.map((layer) => (
              <li key={layer.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={layer.visible !== false}
                    onChange={(event) => {
                      setGraph(
                        updateLayer(graph, layer.id, {
                          visible: event.target.checked,
                        }),
                      );
                      setEdited(true);
                    }}
                  />{" "}
                  {layer.name ?? layer.id} · {layer.type}
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {edited
              ? "Edited preview. Rerun quality checks before export."
              : "Technical validation only. Creative approval and human review remain pending."}
          </p>
          <p className="text-xs text-muted-foreground">
            Production preflight blockers:{" "}
            {result.productionPreflight.blockers.map((b) => b.code).join(", ")}
          </p>
        </div>
      </div>
    </section>
  );
}
