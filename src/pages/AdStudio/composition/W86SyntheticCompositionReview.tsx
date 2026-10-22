import React, { useMemo, useState } from "react";
import { SceneStage } from "../canvas/SceneStage";
import { updateLayer } from "../lib/sceneGraph";
import {
  W86_SYNTHETIC_COMPOSITION_ENABLED_DEFAULT,
  type W86SyntheticCompositionResultV1,
} from "./w86-synthetic-composition";

type Props = {
  enabled?: boolean;
  result: W86SyntheticCompositionResultV1;
  assetUrls: Readonly<Record<string, string>>;
};

/** Deliberately not routed for beta users. Feature flag defaults false. */
export function W86SyntheticCompositionReview(props: Props) {
  if ((props.enabled ?? W86_SYNTHETIC_COMPOSITION_ENABLED_DEFAULT) !== true) {
    return null;
  }
  return <EnabledW86Review {...props} />;
}

function EnabledW86Review({ result, assetUrls }: Props) {
  const [index, setIndex] = useState(0);
  const variation = result.variations[index] ?? result.variations[0];
  const [graph, setGraph] = useState(variation.sceneGraph);
  React.useEffect(() => {
    setGraph(variation.sceneGraph);
  }, [variation.variationId]);
  const preservationOk =
    result.productPreservation.rgbDifferences === 0 &&
    result.productPreservation.protectedAlphaViolations === 0;
  const label = useMemo(
    () => `${variation.label} · mock/synthetic`,
    [variation.label],
  );
  return (
    <section className="space-y-4 rounded-xl border border-amber-500/40 bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Synthetic / mock composition — not live AI · not beta
      </p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">
        Isolation: {result.isolationApproval} · Quality blockers:{" "}
        {result.qualityEvidence.isolationBlockers.length || "none"} · Paid calls:{" "}
        {result.paidProviderCalls}
      </p>
      <p className="text-xs">
        Product preservation:{" "}
        {preservationOk ? "source RGB protected" : "preservation failed"}
      </p>
      <div className="flex flex-wrap gap-2">
        {result.variations.map((v, i) => (
          <button
            key={v.variationId}
            type="button"
            className={`rounded border px-3 py-1 text-xs ${i === index ? "border-foreground" : "border-border"}`}
            onClick={() => setIndex(i)}
          >
            {v.intent}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SceneStage graph={graph} assetUrls={assetUrls} size="hero" label={label} />
        <ul className="space-y-2 text-xs">
          {graph.layers.map((layer) => (
            <li key={layer.id} className="flex items-center justify-between gap-2">
              <span>
                {layer.name ?? layer.id} ({layer.type})
                {layer.id.startsWith("product-") ? " · preserved" : ""}
              </span>
              {layer.type === "text" && !layer.locked ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setGraph(
                      updateLayer(graph, layer.id, {
                        text: `${(layer as { text?: string }).text ?? ""}*`,
                      }),
                    )
                  }
                >
                  Edit
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Approval: {result.creativeApproval} · executionAuthorized:{" "}
        {String(result.executionAuthorized)} · featureEnabled:{" "}
        {String(result.featureEnabled)}
      </p>
    </section>
  );
}
