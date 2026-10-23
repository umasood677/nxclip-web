import React, { useMemo, useState } from "react";
import { SceneStage } from "../canvas/SceneStage";
import {
  alignLayer,
  reorderLayer,
  updateLayer,
  type AlignMode,
} from "../lib/sceneGraph";
import type { AdSceneGraph, AdSceneLayer } from "../types";
import {
  W87_SYNTHETIC_EDITOR_ENABLED_DEFAULT,
  type W87SyntheticEditorViewModel,
} from "./w87-synthetic-editor";

export interface W87EnhancementSlot { graph: AdSceneGraph; revision: number; variationId: string; productLayerId: string; commit: (graph: AdSceneGraph) => void; createVariation: (graph: AdSceneGraph, id: string, label: string) => void }
type Props = {
  /** Local disabled prototype extension only; existing production callers provide nothing. */
  renderEnhancements?: (slot: W87EnhancementSlot) => React.ReactNode;
  enabled?: boolean;
  model: W87SyntheticEditorViewModel;
  assetUrls: Readonly<Record<string, string>>;
  onModelChange?: (next: W87SyntheticEditorViewModel) => void;
};

/**
 * Stage A editor surface that reuses Ad Studio SceneStage + sceneGraph ops.
 * Not routed for beta; disabled unless explicitly enabled.
 */
export function W87SyntheticCompositionEditor(props: Props) {
  if ((props.enabled ?? W87_SYNTHETIC_EDITOR_ENABLED_DEFAULT) !== true) {
    return null;
  }
  return <EnabledEditor {...props} />;
}

function EnabledEditor({ model, assetUrls, onModelChange, renderEnhancements }: Props) {
  const [local, setLocal] = useState(model);
  const selected = local.variations.find((v) => v.variationId === local.selectedVariationId)!;
  const [history, setHistory] = useState<AdSceneGraph[]>([]);
  const [future, setFuture] = useState<AdSceneGraph[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const commit = (graph: AdSceneGraph) => {
    setHistory((h) => [...h, selected.graph].slice(-50));
    setFuture([]);
    const next: W87SyntheticEditorViewModel = {
      ...local,
      variations: local.variations.map((v) =>
        v.variationId === selected.variationId
          ? { ...v, graph, revision: v.revision + 1 }
          : v,
      ),
    };
    setLocal(next);
    onModelChange?.(next);
  };

  const switchVariation = (variationId: string) => {
    setHistory([]);
    setFuture([]);
    setSelectedLayerId(null);
    const next = { ...local, selectedVariationId: variationId };
    setLocal(next);
    onModelChange?.(next);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1]!;
    setFuture((f) => [selected.graph, ...f].slice(0, 50));
    setHistory((h) => h.slice(0, -1));
    const next: W87SyntheticEditorViewModel = {
      ...local,
      variations: local.variations.map((v) =>
        v.variationId === selected.variationId
          ? { ...v, graph: prev, revision: v.revision + 1 }
          : v,
      ),
    };
    setLocal(next);
    onModelChange?.(next);
  };

  const redo = () => {
    if (!future.length) return;
    const nxt = future[0]!;
    setHistory((h) => [...h, selected.graph].slice(-50));
    setFuture((f) => f.slice(1));
    const next: W87SyntheticEditorViewModel = {
      ...local,
      variations: local.variations.map((v) =>
        v.variationId === selected.variationId
          ? { ...v, graph: nxt, revision: v.revision + 1 }
          : v,
      ),
    };
    setLocal(next);
    onModelChange?.(next);
  };

  const createVariation = (graph: AdSceneGraph, id: string, label: string) => {
    if (local.variations.some(v => v.variationId === id)) throw new Error('DUPLICATE_VARIATION');
    const next = {...local, variations: [...local.variations, {...selected, variationId: id, label, graph: structuredClone(graph), revision: 0}]};
    setLocal(next); onModelChange?.(next);
  };
  const productLayerId = selected.productLayerId;
  const disclosure = useMemo(
    () =>
      `SYNTHETIC / MOCK · ${selected.intent} · isolation ${local.isolationApproval} · not beta`,
    [selected.intent, local.isolationApproval],
  );

  return (
    <section className="space-y-4 rounded-xl border border-amber-500/40 bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        {disclosure}
      </p>
      <p className="text-sm font-medium">{selected.label}</p>
      <p className="text-xs text-muted-foreground">
        Provider gates ready: {String(local.providerGatesReady)} · paid calls forbidden ·
        product preservation:{" "}
        {local.productPreservationOk ? "source RGB protected" : "failed"}
      </p>
      <div className="flex flex-wrap gap-2">
        {local.variations.map((v) => (
          <button
            key={v.variationId}
            type="button"
            className={`rounded border px-3 py-1 text-xs ${
              v.variationId === selected.variationId
                ? "border-foreground"
                : "border-border"
            }`}
            onClick={() => switchVariation(v.variationId)}
          >
            {v.label.startsWith('Adapted ') ? v.label : v.intent} (r{v.revision})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={undo}>
          Undo
        </button>
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={redo}>
          Redo
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SceneStage
          graph={selected.graph}
          assetUrls={assetUrls}
          size="hero"
          label={selected.label}
        />
        <ul className="space-y-2 text-xs">
          {selected.graph.layers.map((layer) => {
            const isProduct = layer.id === productLayerId;
            return (
              <li key={layer.id} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`underline ${selectedLayerId === layer.id ? "font-semibold" : ""}`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  {layer.name ?? layer.id}
                </button>
                <span>
                  ({layer.type}
                  {isProduct ? " · preserved/locked" : ""})
                </span>
                {!isProduct && layer.type === "text" ? (
                  <button
                    type="button"
                    className="rounded border px-1"
                    onClick={() => {
                      const text = String((layer as { text?: string }).text ?? "");
                      commit(
                        updateLayer(selected.graph, layer.id, {
                          text: `${text}*`,
                        } as Partial<AdSceneLayer>),
                      );
                    }}
                  >
                    Edit text
                  </button>
                ) : null}
                {!isProduct ? (
                  <>
                    <button
                      type="button"
                      className="rounded border px-1"
                      onClick={() =>
                        commit(reorderLayer(selected.graph, layer.id, "up"))
                      }
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="rounded border px-1"
                      onClick={() =>
                        commit(alignLayer(selected.graph, layer.id, "center" as AlignMode))
                      }
                    >
                      Align
                    </button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
      {renderEnhancements?.({graph:selected.graph,revision:selected.revision,variationId:selected.variationId,productLayerId,commit,createVariation})}
    </section>
  );
}
