import { adaptCanvasFormat } from "../lib/sceneGraph";
import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SceneStage } from "../canvas/SceneStage";
import { AD_FORMATS } from "../types";
import type { W87EnhancementSlot } from "../composition/W87SyntheticCompositionEditor";
import {
  createCreativeProposal,
  createCreativeReviewGate,
  INTELLIGENT_AD_STUDIO_ENABLED_DEFAULT,
  type CreativeContext,
  type CreativeProposal,
} from "./contracts/ad-creative-proposals";
import { directCreativeCommand } from "./contracts/ad-creative-director";
import {
  applyCreativeDna,
  createDnaPresetRepository,
  CREATIVE_DNA_ATTRIBUTES,
  extractCreativeDna,
  setCreativeDnaLock,
  type CreativeDnaPreset,
  type DnaDocumentStore,
} from "./contracts/ad-creative-dna";
import { analyzeSmartCanvas, type CanvasFinding } from "./contracts/ad-smart-canvas";
import {
  adaptCreativeCampaign,
  type MeasureCampaignText,
} from "./contracts/ad-campaign-adapt";
import { validateAdSceneGraphDto } from "./contracts/ad-scene-graph";

type Props = {
  enabled?: boolean;
  context: CreativeContext;
  slot: W87EnhancementSlot;
  assetUrls: Readonly<Record<string, string>>;
  store: DnaDocumentStore;
  measure: MeasureCampaignText;
  onContextChange: (c: CreativeContext) => void;
  /**
   * When both mounts are set, Director+DNA portal to left and
   * Smart Canvas+Campaign+Proposal portal to right (shared state).
   */
  leftMount?: HTMLElement | null;
  rightMount?: HTMLElement | null;
};

const DNA_LABELS: Record<string, string> = {
  palette: "Color palette",
  typography: "Typography",
  productPosition: "Product position",
  productScale: "Product scale",
  hierarchy: "Visual hierarchy",
  logoPlacement: "Logo placement",
  spacing: "Spacing",
  mood: "Mood",
  lighting: "Lighting",
};

const SEVERITY_LABEL: Record<CanvasFinding["classification"], string> = {
  hardConstraint: "Must fix",
  geometric: "Layout",
  heuristic: "Suggestion",
};

const MODE_LABEL: Record<"constraintAware" | "proportional", string> = {
  constraintAware: "Smart reflow (keep hierarchy)",
  proportional: "Scale evenly",
};

function layerDisplayName(
  graph: CreativeContext["graph"],
  layerId: string,
): string {
  const layer = graph.layers.find((l) => l.id === layerId);
  const name = layer?.name?.trim();
  if (name) return name;
  if (layer?.type === "logo") return "Logo";
  if (layer?.type === "image") return "Product image";
  if (layer?.type === "text") return "Text";
  if (layer?.type === "shape") return "Shape";
  // Never show raw technical ids in creator UI
  const tail = layerId.split(":").filter(Boolean).pop();
  return tail ? tail.replace(/[-_]/g, " ") : "Layer";
}

function formatLayerList(
  graph: CreativeContext["graph"],
  ids: string[],
): string {
  return ids.map((id) => layerDisplayName(graph, id)).join(", ");
}

export function IntelligentAdStudioPanel(props: Props) {
  if ((props.enabled ?? INTELLIGENT_AD_STUDIO_ENABLED_DEFAULT) !== true) {
    return null;
  }
  return <EnabledPanel {...props} />;
}

/**
 * Isolates Smart Canvas (and other render-time analysis) so a contract throw
 * cannot unmount the rest of Ad Studio.
 */
class IntelligentFeatureBoundary extends React.Component<
  { label: string; children: React.ReactNode; fallback?: React.ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Feature unavailable",
    };
  }
  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.warn(`[IntelligentAdStudio] ${this.props.label} crashed:`, error);
    }
  }
  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <section
            className="w0a-intel-card"
            role="status"
            aria-label={`${this.props.label} unavailable`}
          >
            <p className="w0a-intel-card__title">{this.props.label}</p>
            <p className="w0a-intel-muted">
              Temporarily unavailable. Other tools below still work.
            </p>
          </section>
        )
      );
    }
    return this.props.children;
  }
}

function EnabledPanel({
  context,
  slot,
  assetUrls,
  store,
  measure,
  onContextChange,
  leftMount,
  rightMount,
}: Props) {
  const [command, setCommand] = useState("center the product");
  const [proposal, setProposal] = useState<CreativeProposal | null>(null);
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [preset, setPreset] = useState<CreativeDnaPreset | null>(null);
  const [name, setName] = useState("My look");
  const [attributes, setAttributes] = useState<string[]>(["typography"]);
  const [format, setFormat] = useState<string>(AD_FORMATS[0]!.id);
  const [mode, setMode] = useState<"constraintAware" | "proportional">(
    "constraintAware",
  );

  const session = useMemo(() => {
    try {
      const graph = validateAdSceneGraphDto(slot.graph);
      const current: CreativeContext = {
        ...context,
        graph,
        revision: slot.revision,
        variationId: slot.variationId,
      };
      return { current, buildError: null as string | null };
    } catch (e) {
      return {
        current: null as CreativeContext | null,
        buildError: e instanceof Error ? e.message : "Invalid creative context",
      };
    }
  }, [context, slot.graph, slot.revision, slot.variationId]);

  const current = session.current;
  const refs = useRef({
    current: current as CreativeContext,
    slot,
    onContextChange,
  });
  if (current) refs.current = { current, slot, onContextChange };

  const gate = useMemo(
    () =>
      createCreativeReviewGate(
        () => refs.current.current,
        (graph, metadata, p) => {
          const r = refs.current;
          if (p.provenance.feature === "campaignAdapt") {
            r.slot.createVariation(
              graph,
              "adapt-" + p.proposalId,
              "Adapted " + graph.canvas.width + "×" + graph.canvas.height,
            );
          } else {
            r.slot.commit(graph);
            r.onContextChange({ ...r.current, metadata });
          }
        },
      ),
    [],
  );

  const repo = useMemo(
    () => createDnaPresetRepository(context.ownerId, store),
    [context.ownerId, store],
  );
  const sequence = useRef(0);
  const id = () => slot.variationId + "-" + ++sequence.current;

  const act = (fn: () => void) => {
    try {
      setMessage("");
      fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const offer = (p: CreativeProposal) => {
    if (!current) return;
    const fresh = createCreativeProposal(
      current,
      id(),
      p.operations,
      p.explanation,
      p.provenance.feature,
    );
    gate.register(fresh);
    setProposal(fresh);
  };

  const smartCanvas = useMemo(() => {
    if (!current) {
      return {
        findings: [] as CanvasFinding[],
        error: session.buildError ?? "INVALID_CONTEXT",
      };
    }
    try {
      const findings = analyzeSmartCanvas(current).filter(
        (f) =>
          !dismissed.includes(
            current.variationId + ":" + current.revision + ":" + f.id,
          ),
      );
      return { findings, error: null as string | null };
    } catch (e) {
      return {
        findings: [] as CanvasFinding[],
        error:
          e instanceof Error ? e.message : "Smart Canvas analysis failed",
      };
    }
  }, [current, dismissed, session.buildError]);

  if (!current) {
    return (
      <section
        className="w0a-intel w0a-intel--creator"
        aria-label="Creative tools unavailable"
        data-testid="intelligent-panel-unavailable"
      >
        <p className="w0a-intel-lead">Creative tools need a ready Brand Kit.</p>
        <p className="w0a-intel-muted" role="status">
          {session.buildError === "INVALID_CONTEXT"
            ? "Reload after binding a Brand Kit to this project."
            : session.buildError}
        </p>
      </section>
    );
  }

  const dismissFinding = (f: CanvasFinding) => {
    setDismissed([
      ...dismissed,
      current.variationId + ":" + current.revision + ":" + f.id,
    ]);
  };

  /** Editor passes mount props (even null) to request L/R docks — wait before full fallback. */
  const dockIntent = leftMount !== undefined || rightMount !== undefined;
  const docked = Boolean(leftMount && rightMount);

  const directorCard = (
        <IntelligentFeatureBoundary label="Creative Director">
          <section
            className="w0a-intel-card"
            aria-labelledby="creative-director-heading"
            data-testid="creative-director-card"
          >
            <h4 id="creative-director-heading" className="w0a-intel-card__title">
              Creative Director
            </h4>
            <p className="w0a-intel-muted">
              Describe a change in plain language. We propose an edit you can
              preview before it lands on the canvas.
            </p>
            <label className="w0a-intel-label" htmlFor="director-command">
              What should we change?
            </label>
            <div className="w0a-intel-row">
              <input
                id="director-command"
                aria-label="Creative Director command"
                className="w0a-intel-input"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g. center the product"
              />
              <button
                type="button"
                className="w0a-btn"
                onClick={() =>
                  act(() => {
                    const r = directCreativeCommand(current, command, id());
                    if (r.status === "proposed") {
                      offer(r.proposal);
                      setOptions([]);
                    } else {
                      setOptions(r.options);
                      setMessage(r.message);
                    }
                  })
                }
              >
                Propose edit
              </button>
            </div>
            {options.length > 0 ? (
              <div className="w0a-intel-chips" aria-label="Suggested commands">
                {options.map((o) => (
                  <button
                    type="button"
                    key={o}
                    className="w0a-intel-chip"
                    onClick={() => setCommand(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </IntelligentFeatureBoundary>
  );

  const dnaCard = (
        <IntelligentFeatureBoundary label="Creative DNA">
          <section
            className="w0a-intel-card"
            aria-labelledby="creative-dna-heading"
            data-testid="creative-dna-card"
          >
            <h4 id="creative-dna-heading" className="w0a-intel-card__title">
              Creative DNA
            </h4>
            <p className="w0a-intel-muted">
              Lock traits you want to keep, then save or reuse a look across
              edits.
            </p>

            <p className="w0a-intel-label">Protect while editing</p>
            <div className="w0a-intel-chips">
              {CREATIVE_DNA_ATTRIBUTES.map((a) => (
                <label key={a} className="w0a-intel-check">
                  <input
                    type="checkbox"
                    checked={current.locks.includes(a)}
                    onChange={(e) =>
                      act(() =>
                        onContextChange(
                          setCreativeDnaLock(
                            current,
                            a,
                            e.target.checked,
                            current.ownerId,
                          ),
                        ),
                      )
                    }
                  />
                  {DNA_LABELS[a] ?? a}
                </label>
              ))}
            </div>

            <label className="w0a-intel-label" htmlFor="dna-preset-name">
              Preset name
            </label>
            <input
              id="dna-preset-name"
              aria-label="DNA preset name"
              className="w0a-intel-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="w0a-intel-row w0a-intel-row--wrap">
              <button
                type="button"
                className="w0a-btn"
                onClick={() =>
                  act(() => {
                    const p = extractCreativeDna(
                      current,
                      "local-preset",
                      name,
                    );
                    repo.create(p);
                    setPreset(p);
                    setMessage("Look saved");
                  })
                }
              >
                Save look
              </button>
              <button
                type="button"
                className="w0a-btn ghost"
                onClick={() =>
                  act(() => {
                    setPreset(repo.load("local-preset"));
                    setMessage(
                      repo.load("local-preset")
                        ? "Look loaded"
                        : "No saved look yet",
                    );
                  })
                }
              >
                Load look
              </button>
              <button
                type="button"
                className="w0a-btn ghost"
                disabled={!preset}
                onClick={() =>
                  act(() => {
                    repo.rename("local-preset", name);
                    setPreset(repo.load("local-preset"));
                  })
                }
              >
                Rename
              </button>
              <button
                type="button"
                className="w0a-btn ghost"
                disabled={!preset}
                onClick={() =>
                  act(() => {
                    const p = extractCreativeDna(
                      current,
                      "local-preset",
                      name,
                    );
                    repo.update(p);
                    setPreset(p);
                  })
                }
              >
                Update
              </button>
              <button
                type="button"
                className="w0a-btn ghost"
                disabled={!preset}
                onClick={() =>
                  act(() => {
                    repo.remove("local-preset");
                    setPreset(null);
                  })
                }
              >
                Remove
              </button>
            </div>

            <p className="w0a-intel-label">Apply from saved look</p>
            <div className="w0a-intel-chips">
              {CREATIVE_DNA_ATTRIBUTES.map((a) => (
                <label key={`apply-${a}`} className="w0a-intel-check">
                  <input
                    type="checkbox"
                    checked={attributes.includes(a)}
                    onChange={(e) =>
                      setAttributes(
                        e.target.checked
                          ? [...attributes, a]
                          : attributes.filter((x) => x !== a),
                      )
                    }
                  />
                  {DNA_LABELS[a] ?? a}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="w0a-btn"
              disabled={!preset}
              onClick={() =>
                act(() => {
                  if (preset) {
                    offer(
                      applyCreativeDna(
                        current,
                        preset,
                        attributes as CreativeContext["locks"],
                        id(),
                      ),
                    );
                  }
                })
              }
            >
              Preview selected traits
            </button>
          </section>
        </IntelligentFeatureBoundary>
  );

  const smartCanvasCard = (
        <IntelligentFeatureBoundary label="Smart Canvas">
          <section
            className="w0a-intel-card"
            aria-labelledby="smart-canvas-heading"
            data-testid="smart-canvas-card"
          >
            <h4 id="smart-canvas-heading" className="w0a-intel-card__title">
              Smart Canvas
              {!smartCanvas.error ? (
                <span className="w0a-intel-count">
                  {smartCanvas.findings.length}
                </span>
              ) : null}
            </h4>
            {smartCanvas.error ? (
              <div data-testid="smart-canvas-unavailable">
                <p className="w0a-intel-muted" role="status">
                  {smartCanvas.error === "INVALID_CONTEXT"
                    ? "Creative context is incomplete. Reload after Brand Kit bind."
                    : "Smart Canvas could not analyze this ad right now."}
                </p>
              </div>
            ) : (
              <div data-testid="smart-canvas-ready">
                {smartCanvas.findings.length === 0 ? (
                  <p className="w0a-intel-muted">No open findings.</p>
                ) : (
                  <ul className="w0a-intel-findings">
                    {smartCanvas.findings.slice(0, 8).map((f) => (
                      <li key={f.id} className="w0a-intel-finding">
                        <div className="w0a-intel-finding__head">
                          <span
                            className={`w0a-intel-badge w0a-intel-badge--${f.classification}`}
                          >
                            {SEVERITY_LABEL[f.classification]}
                          </span>
                          <strong>{f.detected}</strong>
                        </div>
                        <p className="w0a-intel-finding__why">{f.why}</p>
                        <p className="w0a-intel-finding__action">
                          <span className="w0a-intel-label-inline">Try:</span>{" "}
                          {f.suggestion}
                        </p>
                        <p className="w0a-intel-muted">
                          Layers: {formatLayerList(current.graph, f.layers)}
                        </p>
                        <div className="w0a-intel-row w0a-intel-row--wrap">
                          {f.proposal ? (
                            <button
                              type="button"
                              className="w0a-btn"
                              onClick={() => act(() => offer(f.proposal!))}
                            >
                              Preview fix
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="w0a-btn ghost"
                            onClick={() => dismissFinding(f)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </IntelligentFeatureBoundary>
  );

  const campaignCard = (
        <IntelligentFeatureBoundary label="Campaign Adapt">
          <section
            className="w0a-intel-card"
            aria-labelledby="campaign-adapt-heading"
            data-testid="campaign-adapt-card"
          >
            <h4 id="campaign-adapt-heading" className="w0a-intel-card__title">
              Campaign Adapt
            </h4>
            <p className="w0a-intel-muted">
              Preview this creative in another format before creating a
              variation.
            </p>
            <label className="w0a-intel-label" htmlFor="campaign-format">
              Target format
            </label>
            <select
              id="campaign-format"
              aria-label="Campaign format"
              className="w0a-intel-input"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              {AD_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <label className="w0a-intel-label" htmlFor="adapt-mode">
              How to adapt
            </label>
            <select
              id="adapt-mode"
              aria-label="Adaptation mode"
              className="w0a-intel-input"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "constraintAware" | "proportional")
              }
            >
              <option value="constraintAware">
                {MODE_LABEL.constraintAware}
              </option>
              <option value="proportional">{MODE_LABEL.proportional}</option>
            </select>
            <button
              type="button"
              className="w0a-btn"
              onClick={() =>
                act(() => {
                  const target = AD_FORMATS.find((f) => f.id === format)!;
                  const r = adaptCreativeCampaign(
                    current,
                    {
                      formatId: target.id,
                      width: target.width,
                      height: target.height,
                    },
                    id(),
                    measure,
                    mode,
                    (graph, width, height) =>
                      validateAdSceneGraphDto(
                        adaptCanvasFormat(graph, width, height),
                      ),
                  );
                  if (r.status === "conflict") {
                    throw Error(r.conflicts.join("; "));
                  }
                  offer(r.proposal);
                })
              }
            >
              Preview new format
            </button>
          </section>
        </IntelligentFeatureBoundary>
  );

  const proposalCard = proposal ? (
        <section
          className="w0a-intel-card w0a-intel-card--proposal"
          aria-label="Proposed change"
          data-testid="composition-proposal"
        >
          <h4 className="w0a-intel-card__title">Proposed change</h4>
          <p>{proposal.explanation}</p>
          <p className="w0a-intel-muted">
            Affects:{" "}
            {formatLayerList(current.graph, proposal.affectedLayerIds)}
            {proposal.approval === "pending" ? " · awaiting your review" : ""}
          </p>
          {!proposal.constraints.valid ? (
            <p role="alert" className="w0a-intel-alert">
              {proposal.constraints.findings.join("; ")}
            </p>
          ) : null}
          <div className="w0a-intel-compare">
            <SceneStage
              graph={proposal.reversible.before}
              assetUrls={assetUrls}
              label="Before"
            />
            <SceneStage
              graph={proposal.reversible.after}
              assetUrls={assetUrls}
              label="After"
            />
          </div>
          <div className="w0a-intel-row w0a-intel-row--wrap">
            <button
              type="button"
              className="w0a-btn"
              disabled={
                !proposal.constraints.valid || proposal.approval !== "pending"
              }
              onClick={() =>
                act(() =>
                  setProposal(
                    gate.review(
                      proposal.proposalId,
                      "approve",
                      current.ownerId,
                    ),
                  ),
                )
              }
            >
              Apply to canvas
            </button>
            <button
              type="button"
              className="w0a-btn ghost"
              disabled={proposal.approval !== "pending"}
              onClick={() =>
                act(() =>
                  setProposal(
                    gate.review(
                      proposal.proposalId,
                      "reject",
                      current.ownerId,
                    ),
                  ),
                )
              }
            >
              Discard
            </button>
          </div>
        </section>
  ) : null;

  const statusLine = message ? (
        <p role="status" className="w0a-intel-status">
          {message}
        </p>
  ) : null;

  if (dockIntent) {
    if (!docked || !leftMount || !rightMount) {
      return null;
    }
    return (
      <>
        {createPortal(
          <div className="w0a-intel w0a-intel--docked space-y-2" data-testid="intelligent-panel-ready">
            {directorCard}
            {dnaCard}
            {statusLine}
          </div>,
          leftMount,
        )}
        {createPortal(
          <div className="w0a-intel w0a-intel--docked space-y-2">
            {smartCanvasCard}
            {campaignCard}
            {proposalCard}
          </div>,
          rightMount,
        )}
      </>
    );
  }

  return (
    <section
      className="w0a-intel w0a-intel--creator"
      aria-label="Creative composition tools"
      data-testid="intelligent-panel-ready"
    >
      <header className="w0a-intel-header">
        <div>
          <h3 className="w0a-intel-title">Creative composition</h3>
          <p className="w0a-intel-muted">
            Guide this ad with Director, DNA, Smart Canvas, and format adapt —
            proposals stay on-canvas until you approve.
          </p>
        </div>
        <span className="w0a-intel-pill" title="Local deterministic tools only">
          Local preview
        </span>
      </header>

      <div className="w0a-intel-grid">
        {directorCard}
        {dnaCard}
        {smartCanvasCard}
        {campaignCard}
      </div>

      {proposalCard}
      {statusLine}
    </section>
  );
}
