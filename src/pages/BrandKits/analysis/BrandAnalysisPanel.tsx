import React, { useEffect, useRef, useState } from "react";
import { brandAnalysisApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  ANALYSIS_SELECTIONS,
  isBrandAnalysisEnabled,
  requireExecutableAnalysisQuote,
  type AnalysisSelection,
  type BrandAnalysisProposal,
  type BrandAnalysisQuote,
  type BrandAnalysisResult,
} from "./brandAnalysisModel";
import type { BrandKitSummary } from "../lib/brandKitTypes";
type Props = {
  kit: BrandKitSummary | null;
  disabled: boolean;
  onApply: (
    proposal: BrandAnalysisProposal,
    selected: AnalysisSelection[],
  ) => void;
};
export function BrandAnalysisPanel({ kit, disabled, onApply }: Props) {
  const enabled = isBrandAnalysisEnabled();
  const [quote, setQuote] = useState<BrandAnalysisQuote | null>(null),
    [result, setResult] = useState<BrandAnalysisResult | null>(null);
  const [approved, setApproved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selection, setSelection] = useState<AnalysisSelection[]>([]),
    [requestId, setRequestId] = useState("");
  const scope = useRef("");
  scope.current = `${kit?.id || ""}:${kit?.version || 0}`;
  const sequence = useRef(0);
  useEffect(() => {
    sequence.current++;
    setQuote(null);
    setResult(null);
    setApproved(false);
    setSelection([]);
    setRequestId("");
    setError("");
    setMessage("");
    setBusy(false);
  }, [kit?.id, kit?.version]);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const getQuote = async () => {
    if (!kit || disabled) return;
    const current = scope.current,
      token = ++sequence.current;
    setBusy(true);
    setError("");
    setApproved(false);
    setResult(null);
    setSelection([]);
    setMessage("");
    try {
      const next = await brandAnalysisApi.quote(kit.id, kit.version);
      if (current !== scope.current || token !== sequence.current) return;
      setQuote(requireExecutableAnalysisQuote(next, kit.version));
      setRequestId(crypto.randomUUID());
    } catch {
      if (current === scope.current && token === sequence.current)
        setError(
          "No executable estimate is available. Check configured model availability, known pricing and feature readiness. No analysis was authorized.",
        );
    } finally {
      if (current === scope.current && token === sequence.current)
        setBusy(false);
    }
  };
  const acceptResult = (next: BrandAnalysisResult) => {
    if (
      next.generationSource !== "ai" ||
      next.approvalState !== "requires-owner-review" ||
      next.sourceVersion !== kit?.version ||
      next.sourceHash !== quote?.sourceHash
    )
      throw new Error("Analysis does not match the reviewed saved source.");
    setResult(next);
    setSelection([]);
    setMessage(
      "Analysis returned. Review suggestions and choose which fields to apply as an unsaved draft.",
    );
  };
  const execute = async () => {
    if (!kit || !quote || disabled || !approved || !requestId) return;
    const current = scope.current,
      token = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const next = await brandAnalysisApi.execute(kit.id, {
        expectedBrandVersion: kit.version,
        requestId,
        approvedQuoteHash: quote.quoteHash,
        allowPaidProvider: true,
      });
      if (current === scope.current && token === sequence.current)
        acceptResult(next);
    } catch {
      if (current === scope.current && token === sequence.current)
        setError(
          "Analysis did not complete in this view. Check the same request status before authorizing anything new. A failed or timed-out provider request may still have incurred usage.",
        );
    } finally {
      if (current === scope.current && token === sequence.current)
        setBusy(false);
    }
  };
  const checkStatus = async () => {
    if (!kit || !requestId) return;
    const current = scope.current,
      token = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const status = await brandAnalysisApi.status(kit.id, requestId);
      if (current !== scope.current || token !== sequence.current) return;
      if (status.result) acceptResult(status.result);
      else
        setMessage(
          `Analysis request is ${status.status}. Status checks never invoke a provider. No automatic retry is performed.`,
        );
    } catch {
      if (current === scope.current && token === sequence.current)
        setError(
          "Request status is unavailable. No provider call or automatic retry was made by this status check.",
        );
    } finally {
      if (current === scope.current && token === sequence.current)
        setBusy(false);
    }
  };
  if (!enabled)
    return (
      <div className="xp-notice">
        Real AI brand analysis is not enabled in this environment. Your current
        identity, assets and manual editing remain available. No simulated
        analysis is substituted.
      </div>
    );
  return (
    <section className="xp-panel" aria-label="AI-assisted saved brand analysis">
      <span className="xp-kicker">AI-ASSISTED BRAND INTELLIGENCE</span>
      <h3>Understand your brand before creating.</h3>
      <p>
        Analyze the saved brand brief through the existing Gemini/Vertex model
        router. This text-only analysis does not inspect private images, fetch
        your website, verify product inventory or approve rights.
      </p>
      {!kit || disabled ? (
        <p className="xp-notice">
          Save the current Brand Kit draft before preparing analysis or applying
          suggestions.
        </p>
      ) : null}
      <fieldset className="bp-fieldset" disabled={busy || disabled || !kit}>
        <button className="xp-secondary" onClick={() => void getQuote()}>
          Check saved source / prepare UAT request
        </button>
        {quote && (
          <div className="xp-notice">
            <strong>
              {quote.provider} / {quote.modelId}
            </strong>
            <p>
              Beta UAT uses your Google credits. Output is bounded to{" "}
              {quote.maxOutputTokens} tokens. No automatic retry is performed.
            </p>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              I authorize sending this saved brand text to {quote.provider} for
              one owner-UAT analysis request using the displayed model.
            </label>
            <button
              className="xp-primary"
              disabled={!approved || !!result}
              onClick={() => void execute()}
            >
              Authorize and analyze saved brief
            </button>
          </div>
        )}
      </fieldset>
      {requestId && (
        <button
          className="xp-text-button"
          disabled={busy}
          onClick={() => void checkStatus()}
        >
          Check this request status — no provider call
        </button>
      )}
      {busy && (
        <div role="status" aria-label="Processing analysis request">
          <Skeleton className="h-20 w-full" />
        </div>
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
      {result && (
        <div>
          <span className="xp-status">
            AI proposal · owner review required · {result.modelId}
          </span>
          <dl className="grid gap-3">
            <dt>Description</dt>
            <dd>{result.proposal.description}</dd>
            <dt>Audience</dt>
            <dd>{result.proposal.audience}</dd>
            <dt>Voice</dt>
            <dd>
              {result.proposal.tone} / {result.proposal.personality}
            </dd>
            <dt>Visual direction</dt>
            <dd>{result.proposal.visualStyle}</dd>
            <dt>Lighting</dt>
            <dd>{result.proposal.lighting}</dd>
            <dt>Typography guidance</dt>
            <dd>{result.proposal.typographyDirection}</dd>
          </dl>
          <div className="xp-actions">
            {result.proposal.palette.map((c) => (
              <span key={c.role} className="xp-status">
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    background: c.hex,
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    marginRight: 6,
                  }}
                />
                {c.role}: {c.hex}
              </span>
            ))}
          </div>
          <ul>
            {result.proposal.rationale.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
          {result.proposal.warnings.map((text, i) => (
            <p className="xp-notice" key={i}>
              {text}
            </p>
          ))}
          <fieldset disabled={disabled || busy}>
            <legend>Apply selected suggestions to the unsaved draft</legend>
            <div className="xp-actions">
              {ANALYSIS_SELECTIONS.map((key) => (
                <label className="xp-check" key={key}>
                  <input
                    type="checkbox"
                    checked={selection.includes(key)}
                    onChange={(e) =>
                      setSelection((previous) =>
                        e.target.checked
                          ? [...previous, key]
                          : previous.filter((v) => v !== key),
                      )
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
            <button
              className="xp-primary"
              disabled={!selection.length}
              onClick={() => {
                try {
                  onApply(result.proposal, selection);
                  setRequestId("");
                } catch {
                  setError(
                    "Selected suggestions exceed the existing field limits. Your current draft was preserved; review those fields manually.",
                  );
                  return;
                }
                setMessage(
                  "Selected suggestions applied to your unsaved draft. Save and review the identity and guidelines again before downstream use.",
                );
                setQuote(null);
                setApproved(false);
              }}
            >
              Apply selected as draft
            </button>
          </fieldset>
        </div>
      )}
    </section>
  );
}
