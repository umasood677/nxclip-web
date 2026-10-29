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
          "Analysis unavailable. Check provider setup before continuing.",
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
      "Review suggestions, then apply selected fields.",
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
          "Analysis incomplete. Check request status before retrying; credits may have been used.",
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
          `Request status: ${status.status}. No new AI call.`,
        );
    } catch {
      if (current === scope.current && token === sequence.current)
        setError(
          "Status unavailable. No new AI request was made.",
        );
    } finally {
      if (current === scope.current && token === sequence.current)
        setBusy(false);
    }
  };
  if (!enabled)
    return (
      <div className="xp-notice" role="status">
        AI analysis requires local activation.
      </div>
    );
  return (
    <section className="xp-panel" aria-label="AI-assisted saved brand analysis">
      <span className="xp-kicker">AI-ASSISTED BRAND INTELLIGENCE</span>
      <h3>Understand your brand before creating.</h3>
      <p>Analyze saved brand text. Review suggestions before applying.</p>
      {!kit || disabled ? (
        <p className="xp-notice">Save your Brand Kit before analysis.</p>
      ) : null}
      <fieldset className="bp-fieldset" disabled={busy || disabled || !kit}>
        <button className="xp-secondary" onClick={() => void getQuote()}>
          Check analysis availability
        </button>
        {quote && (
          <div className="xp-notice">
            <strong>
              {quote.provider} / {quote.modelId}
            </strong>
            <p>Uses Google credits. No automatic retries.</p>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              Allow one {quote.provider} analysis of this saved brand text using
              the displayed model.
            </label>
            <button
              className="xp-primary"
              disabled={!approved || !!result}
              onClick={() => void execute()}
            >
              Analyze saved brand
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
          Check request status
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
