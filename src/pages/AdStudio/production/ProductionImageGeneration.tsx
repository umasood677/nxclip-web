import React, { useEffect, useRef, useState } from "react";
import { adImageApi } from "../../../services/apiClient";
import { SceneStage } from "../canvas/SceneStage";
import { Skeleton } from "../../../components/ui/skeleton";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
import {
  hasGeneratedBackground,
  realImagesEnabled,
  validateImageQuote,
  verifyGeneratedCreative,
  type ImageQuote,
  type AdImageOperation,
} from "./imageExecutionModel";
export function ProductionImageGeneration({
  source,
  assetUrls,
  initialOperation = "generate",
  onSaved,
}: {
  source: WorkspaceCreative;
  assetUrls: Readonly<Record<string, string>>;
  initialOperation?: AdImageOperation;
  onSaved: (saved: WorkspaceCreative) => Promise<void>;
}) {
  const canEdit = hasGeneratedBackground(source),
    enabled = realImagesEnabled(),
    key = "nxclip:ad-image-request:" + source.id;
  const [operation, setOperation] = useState<AdImageOperation>(
      canEdit ? initialOperation : "generate",
    ),
    [instruction, setInstruction] = useState(""),
    [budget, setBudget] = useState("0.10"),
    [quote, setQuote] = useState<ImageQuote | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [retained, setRetained] = useState(false),
    [startNew, setStartNew] = useState(false),
    [requestId, setRequestId] = useState(() => {
      try {
        return sessionStorage.getItem(key) || "";
      } catch {
        return "";
      }
    });
  const epoch = useRef(0);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  useEffect(() => {
    setQuote(null);
    setConsent(false);
  }, [source.currentVersion]);
  const input = {
    operation,
    instruction,
    expectedVersion: source.currentVersion ?? 1,
    maxEstimatedCostUsd: Number(budget),
  };
  const valid =
    instruction.trim().length > 0 &&
    instruction.length <= 4000 &&
    Number.isFinite(Number(budget)) &&
    Number(budget) > 0 &&
    Number(budget) <= 1;
  const estimate = async () => {
    if (!enabled || !valid || busy || requestId) return;
    const n = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const q = validateImageQuote(
        await adImageApi.quote(source.id, input),
        Number(budget),
      );
      if (n === epoch.current) {
        setQuote(q);
        setConsent(false);
      }
    } catch (e) {
      if (n === epoch.current)
        setError(e instanceof Error ? e.message : "Image quote unavailable");
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  };
  const generate = async () => {
    if (!enabled || !quote || !consent || busy || requestId || !valid) return;
    const n = ++epoch.current,
      id = crypto.randomUUID();
    setBusy(true);
    setError("");
    setRequestId(id);
    try {
      sessionStorage.setItem(key, id);
    } catch {
      /* Retention is on the server; no credentials saved. */
    }
    try {
      const saved = verifyGeneratedCreative(
        await adImageApi.execute(source.id, {
          ...input,
          requestId: id,
          approvedQuoteHash: validateImageQuote(quote, Number(budget))
            .quoteHash,
          allowPaidProvider: true,
        }),
        source,
      );
      if (n === epoch.current) {
        setMessage(
          "AI background saved in a new editable creative; original preserved.",
        );
        await onSaved(saved);
      }
    } catch (e) {
      if (n === epoch.current)
        setError(
          e instanceof Error
            ? e.message
            : "Outcome uncertain. Check retained status; do not resubmit paid work.",
        );
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  };
  const status = async () => {
    if (!requestId || busy) return;
    const n = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const s = await adImageApi.status(source.id, requestId);
      if (n === epoch.current) {
        setRetained(s.hasRetainedImage);
        setMessage(
          "Actual request status: " +
            s.status +
            (s.creativeId
              ? ". A saved child creative exists; reopen the workspace."
              : ". No saved child confirmed yet."),
        );
      }
    } catch (e) {
      if (n === epoch.current)
        setError(e instanceof Error ? e.message : "Status unavailable");
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  };
  const recover = async () => {
    if (!retained || busy || !requestId) return;
    const n = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const saved = verifyGeneratedCreative(
        await adImageApi.recover(source.id, requestId),
        source,
      );
      if (n === epoch.current) await onSaved(saved);
    } catch (e) {
      if (n === epoch.current)
        setError(
          e instanceof Error
            ? e.message
            : "Recovery failed; retained output requires review",
        );
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  };
  const change = () => {
    setQuote(null);
    setConsent(false);
  };
  return (
    <div className="xp-split">
      <section className="xp-panel">
        <SceneStage
          graph={source.sceneGraph}
          assetUrls={assetUrls}
          size="hero"
          showSafeArea
        />
        <span className="xp-status">Saved source / {source.name}</span>
        <p>
          Generate a real AI scene behind the editable source layers. Original
          product photographs, printed packaging, text and logo layers remain
          unchanged. This does not perform product segmentation or certify
          reference fidelity.
        </p>
      </section>
      <section className="xp-panel">
        <h2>
          {operation === "refine"
            ? "Direct the next refinement."
            : operation === "variation"
              ? "A new visual expression."
              : "Build the world around your product."}
        </h2>
        {!enabled && (
          <p className="xp-notice">
            Real image execution awaits approved runtime/provider configuration
            and a specific owner testing budget. No provider call is available
            in this environment yet.
          </p>
        )}
        <label className="xp-field">
          Creative operation
          <select
            value={operation}
            disabled={busy || !!requestId}
            onChange={(e) => {
              setOperation(e.target.value as AdImageOperation);
              change();
            }}
          >
            <option value="generate">Generate AI background</option>
            <option value="variation" disabled={!canEdit}>
              AI visual variation
            </option>
            <option value="refine" disabled={!canEdit}>
              Natural-language refinement
            </option>
          </select>
        </label>
        {!canEdit && (
          <p>
            Generate the first AI background before requesting a provider-backed
            variation or refinement.
          </p>
        )}
        <label className="xp-field">
          Lighting, environment and creative direction
          <textarea
            value={instruction}
            maxLength={4000}
            disabled={busy || !!requestId}
            onChange={(e) => {
              setInstruction(e.target.value);
              change();
            }}
            placeholder="Describe the scene and the changes you want. Text and logos remain editable layers."
          />
        </label>
        <label className="xp-field">
          Maximum configured estimate (USD)
          <input
            type="number"
            min="0.000001"
            max="1"
            step="0.01"
            value={budget}
            disabled={busy || !!requestId}
            onChange={(e) => {
              setBudget(e.target.value);
              change();
            }}
          />
        </label>
        <button
          className="xp-secondary"
          disabled={!enabled || busy || !!requestId || !valid}
          onClick={() => void estimate()}
        >
          Review non-billable image quote
        </button>
        {quote && (
          <>
            <dl className="xp-spec">
              <dt>Provider / exact model</dt>
              <dd>
                {quote.provider} / {quote.modelId}
              </dd>
              <dt>Configured estimate</dt>
              <dd>${quote.estimatedCostUsd.toFixed(4)} for one image</dd>
              <dt>Scope</dt>
              <dd>
                AI background plate; {quote.referenceCount} owned background
                reference(s)
              </dd>
            </dl>
            <p>
              Estimate only, not a guaranteed invoice ceiling. No extra caption
              call or hidden model fallback. Image quality and scene integration
              require human review.
            </p>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy || !!requestId}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I approve this quoted provider call and its selected background
              references.
            </label>
            <button
              className="xp-primary"
              disabled={!enabled || busy || !!requestId || !consent}
              onClick={() => void generate()}
            >
              Generate and save a new creative
            </button>
          </>
        )}
        {busy && (
          <div role="status">
            <Skeleton className="h-16 w-full" />
            Waiting for the actual provider or application response. Leaving
            does not cancel paid work.
          </div>
        )}
        {requestId && (
          <>
            <button
              className="xp-secondary"
              disabled={busy}
              onClick={() => void status()}
            >
              Check retained status
            </button>
            <button
              className="xp-secondary"
              disabled={busy || !retained}
              onClick={() => void recover()}
            >
              Recover saved output without generation
            </button>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={startNew}
                disabled={busy}
                onChange={(e) => setStartNew(e.target.checked)}
              />
              I reviewed the prior outcome; a new request may incur another
              charge.
            </label>
            <button
              className="xp-secondary"
              disabled={!startNew || busy}
              onClick={() => {
                try {
                  sessionStorage.removeItem(key);
                } catch {
                  /* Optional ID only. */
                }
                setRequestId("");
                setRetained(false);
                setStartNew(false);
                change();
              }}
            >
              Review a new request
            </button>
          </>
        )}
        {error && (
          <p className="xp-notice" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="xp-notice" role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
