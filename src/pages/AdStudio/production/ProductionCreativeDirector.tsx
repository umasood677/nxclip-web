import React, { useEffect, useRef, useState } from "react";
import { quotedConceptApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  realConceptsEnabled,
  validateConceptQuote,
  requireAiConceptResult,
  type ConceptQuote,
  type QuotedConceptResult,
} from "./conceptExecutionModel";
import type { WorkspaceProject } from "../lib/projectWorkspace";
export function ProductionCreativeDirector({
  project,
  dirty,
  onSaved,
  onReview,
}: {
  project: WorkspaceProject;
  dirty: boolean;
  onSaved: () => Promise<void>;
  onReview: () => void;
}) {
  const enabled = realConceptsEnabled(),
    key = "nxclip:concept-request:" + project.id;
  const [quote, setQuote] = useState<ConceptQuote | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [result, setResult] = useState<QuotedConceptResult | null>(null),
    [requestId, setRequestId] = useState(() => {
      try {
        return sessionStorage.getItem(key) || "";
      } catch {
        return "";
      }
    }),
    [newRequestAcknowledged, setNewRequestAcknowledged] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    setQuote(null);
    setConsent(false);
  }, [project.updatedAt, dirty]);
  const estimate = async () => {
    if (!enabled || dirty || busy || requestId) return;
    const token = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const next = validateConceptQuote(
        await quotedConceptApi.quote(project.id),
      );
      if (token === generation.current) {
        setQuote(next);
        setConsent(false);
      }
    } catch (e) {
      if (token === generation.current)
        setError(e instanceof Error ? e.message : "Quote unavailable");
    } finally {
      if (token === generation.current) setBusy(false);
    }
  };
  const execute = async () => {
    if (!enabled || dirty || busy || !consent || !quote || requestId) return;
    const token = ++generation.current;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    setRequestId(id);
    try {
      sessionStorage.setItem(key, id);
    } catch {
      /* Server retains request; no credentials stored. */
    }
    try {
      const next = requireAiConceptResult(
        await quotedConceptApi.execute(project.id, {
          requestId: id,
          approvedQuoteHash: validateConceptQuote(quote).quoteHash,
          allowPaidProvider: true,
        }),
      );
      if (token === generation.current) {
        setResult(next);
        setMessage(
          "AI concepts saved to the existing project. Images were not generated.",
        );
        await onSaved();
      }
    } catch (e) {
      if (token === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Request outcome uncertain. Check retained status before starting another paid request.",
        );
    } finally {
      if (token === generation.current) setBusy(false);
    }
  };
  const status = async () => {
    if (!requestId || busy) return;
    const token = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const existing = await quotedConceptApi.status(project.id, requestId);
      if (token === generation.current) {
        setMessage(
          "Retained request: " +
            existing.status +
            ". Status recovery does not generate or automatically save concepts.",
        );
        if (existing.result) setResult(requireAiConceptResult(existing.result));
      }
    } catch (e) {
      if (token === generation.current)
        setError(e instanceof Error ? e.message : "Status unavailable");
    } finally {
      if (token === generation.current) setBusy(false);
    }
  };
  const reset = () => {
    if (!newRequestAcknowledged || busy) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Optional recovery ID only. */
    }
    setRequestId("");
    setQuote(null);
    setConsent(false);
    setResult(null);
    setNewRequestAcknowledged(false);
    setMessage(
      "A new request requires a fresh source/model preflight and explicit UAT consent.",
    );
  };
  return (
    <div className="xp-split">
      <section className="xp-panel">
        <span className="xp-status">
          Campaign direction / saved project context
        </span>
        <h2>A creative partner. A clear point of view.</h2>
        <dl className="xp-spec">
          <dt>Campaign idea</dt>
          <dd>{project.brief?.campaignIdea || "Not supplied"}</dd>
          <dt>Objective</dt>
          <dd>
            {project.brief?.exampleObjective ||
              project.brief?.advertisingObjective ||
              "Not supplied"}
          </dd>
          <dt>Audience</dt>
          <dd>{project.brief?.targetAudience || "Not supplied"}</dd>
          <dt>Direction</dt>
          <dd>{project.brief?.creativeDirection || "Not supplied"}</dd>
          <dt>Message</dt>
          <dd>{project.brief?.coreMessage || "Not supplied"}</dd>
        </dl>
        <p>
          Plan distinct concepts from the saved campaign and server-authorized
          Brand Kit. Review and compare the strategy, then use the existing
          Create Editable Creative and Canvas workflow. Product claims and
          inventory remain subject to verification.
        </p>
        <button className="xp-secondary" onClick={onReview}>
          Review saved concepts →
        </button>
        <p className="xp-caption">
          This slice plans strategy and copy. Image generation, campaign-wide
          quality review, improvement execution and animation remain separate
          verification gates.
        </p>
      </section>
      <section className="xp-panel">
        <h2>Review the execution before you create.</h2>
        {!enabled && (
          <p className="xp-notice">
            Real concept execution is disabled. Existing heuristic generation
            remains available in the legacy project controls. No provider will
            be called by this panel.
          </p>
        )}
        {dirty && (
          <p className="xp-notice">
            Save the Working Brief before preparing execution.
          </p>
        )}
        <p>
          No commercial quote is required for beta. Only saved campaign text is
          sent; this action does not generate or edit product photographs.
        </p>
        <button
          className="xp-secondary"
          disabled={!enabled || dirty || busy || Boolean(requestId)}
          onClick={() => void estimate()}
        >
          Check source and model
        </button>
        {quote && (
          <>
            <dl className="xp-spec">
              <dt>Provider / model</dt>
              <dd>
                {quote.provider} / {quote.modelId}
              </dd>
              <dt>Output</dt>
              <dd>{quote.conceptCount} strategies / copy concepts</dd>
            </dl>
            <label className="xp-check">
              <input
                type="checkbox"
                disabled={busy || Boolean(requestId)}
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I authorize one owner-UAT provider request using the saved
              campaign text.
            </label>
            <button
              className="xp-primary"
              disabled={
                !enabled || dirty || busy || !consent || Boolean(requestId)
              }
              onClick={() => void execute()}
            >
              Authorize and generate concepts
            </button>
          </>
        )}
        {busy && (
          <div role="status">
            <Skeleton className="h-12 w-full" />
            Waiting for the actual application response. Leaving this page does
            not cancel provider work.
          </div>
        )}
        {requestId && (
          <>
            <button
              className="xp-secondary"
              disabled={busy}
              onClick={() => void status()}
            >
              Check retained request (no generation)
            </button>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={newRequestAcknowledged}
                disabled={busy}
                onChange={(e) => setNewRequestAcknowledged(e.target.checked)}
              />
              I checked the previous request. Starting another may incur an
              additional charge.
            </label>
            <button
              className="xp-secondary"
              disabled={busy || !newRequestAcknowledged}
              onClick={reset}
            >
              Review a new request
            </button>
          </>
        )}
        {message && (
          <p className="xp-notice" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="xp-notice" role="alert">
            {error}
          </p>
        )}
        {result && (
          <p className="xp-complete">
            Retained AI concepts: {result.concepts.length}. Review their content
            and saved project state before creating a visual.
          </p>
        )}
      </section>
    </div>
  );
}
