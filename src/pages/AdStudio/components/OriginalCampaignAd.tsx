import React, { useEffect, useRef, useState } from "react";
import { adImageApi, adStudioApi } from "../../../services/apiClient";
import {
  generateOriginalCampaignAd,
  type CampaignDraftInput,
} from "../lib/originalCampaignAd";
import type {
  WorkspaceCreative,
  WorkspaceProject,
} from "../lib/projectWorkspace";
import { campaignCta, campaignHeadline, campaignSupportingCopy } from "../lib/projectWorkspace";
import type { AdBriefFormState } from "../lib/adStudioLabels";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { characterReviewIssues } from "../../BrandKits/guided/brandCharacterModel";
import { realImagesEnabled } from "../production/imageExecutionModel";
import {
  isProcessingStatus,
  retainedStatusDelay,
} from "../production/retainedStatusPolling";
type Retained = {
  retryRequestId?: string;
  phase?: "prepared" | "executing";
  operation?: "generate" | "refine" | "variation";
  requestId: string;
  creativeId?: string;
  input: CampaignDraftInput;
};
function isTransientStatusReadError(error: unknown) {
  const candidate = error as { statusCode?: unknown; response?: { status?: unknown } } | null;
  const status = Number(candidate?.statusCode ?? candidate?.response?.status);
  return !Number.isFinite(status) || status >= 500;
}
export function campaignGenerationIsActive({
  busy,
  retained,
  status,
}: {
  busy: boolean;
  retained: Retained | null;
  status: string;
}) {
  if (busy) return true;
  if (!retained) return false;
  // `phase` records what the browser last submitted. The provider status is
  // authoritative once it is known, so a stale `executing` phase must never
  // keep a failed/cancelled request trapped in the progress view.
  if (status) return isProcessingStatus(status);
  return retained.phase === "executing";
}

function sourceLayerText(
  source: WorkspaceCreative | undefined,
  names: string[],
): string {
  const wanted = names.map((name) => name.toLowerCase());
  const layer = source?.sceneGraph?.layers?.find((candidate) => {
    const name = String(candidate.name ?? "").toLowerCase();
    return wanted.some((value) => name === value || name.includes(value));
  });
  if (!layer) return "";
  if ("text" in layer && typeof layer.text === "string") return layer.text.trim();
  return "";
}

/** A reviewed ad owns editable copy even when a legacy brief lacks copy fields. */
export function campaignVariationCopy(
  form: AdBriefFormState,
  source?: WorkspaceCreative,
) {
  return {
    headline:
      sourceLayerText(source, ["headline"]) || campaignHeadline(form),
    supportingCopy:
      sourceLayerText(source, ["supporting copy", "supporting", "body copy"]) ||
      campaignSupportingCopy(form),
    cta:
      sourceLayerText(source, ["cta button", "cta", "call to action"]) ||
      campaignCta(form),
  };
}
export function OriginalCampaignAd({
  project,
  brand,
  form,
  onChange,
  onSaveBrief,
  onSaved,
  initialSource,
  production,
}: {
  project: WorkspaceProject;
  brand: BrandKitSummary | null;
  form: AdBriefFormState;
  onChange: (patch: Partial<AdBriefFormState>) => void;
  onSaveBrief: () => Promise<WorkspaceProject>;
  onSaved: (creative: WorkspaceCreative) => void;
  initialSource?: WorkspaceCreative;
  production?: ReturnType<typeof import("../lib/campaignProductionBrief").campaignProductionBrief>;
}) {
  const key =
      "nxclip:campaign-ai:" +
      project.id +
      (initialSource ? ":" + initialSource.id : "") + (production ? ":direction:" + production.conceptId : ""),
    campaignDirection = [
      form.campaignIdea,
      form.creativeDirection,
      form.coreMessage,
    ]
      .filter((value): value is string => typeof value === "string" && !!value.trim())
      .join("\n\n"),
    [productIds, setProducts] = useState<string[]>(() => production?.verifiedAssets.filter(asset => asset.role === "product_image").map(asset => asset.id) ?? []),
    // A production candidate carries the deliberately selected Brand Kit model.
    // Do not make every approved model a reference: only the brief's selection
    // is allowed to become an identity input for campaign photography.
    [profileId, setProfile] = useState(() => String(project.brief?.preferredModelProfile ?? "")),
    [instruction, setInstruction] = useState(
      initialSource
        ? [
            "Create a distinct campaign-specific photographic variation.",
            "Retain the approved product and model identities. Change scene, pose, camera, lighting or composition only when it strengthens this campaign direction.",
            campaignDirection ? `Campaign direction:\n${campaignDirection}` : "",
          ].filter(Boolean).join("\n\n")
        : production ? production.direction + "\nComposition: " + production.composition : form.creativeDirection || form.campaignIdea || form.coreMessage,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retained, setRetained] = useState<Retained | null>(() => {
      try {
        return JSON.parse(sessionStorage.getItem(key) || "null");
      } catch {
        return null;
      }
    }),
    [status, setStatus] = useState(""),
    [watch, setWatch] = useState(0);
  const [consent, setConsent] = useState<number>();
  const consentResponse = useRef<(approved: boolean) => void>(undefined);
  function resolveConsent(approved: boolean) {
    consentResponse.current?.(approved);
    consentResponse.current = undefined;
    setConsent(undefined);
  }
  const operation: "generate" | "refine" | "variation" = initialSource
    ? "variation"
    : "generate";
  const mounted = useRef(true),
    flight = useRef(false),
    started = useRef(0);
  useEffect(() => {
    mounted.current = true;
    if (retained?.creativeId) {
      if (retained.phase === "prepared") return () => { mounted.current = false; };
      started.current = Date.now();
      setStatus("processing");
      setWatch(1);
    }
    return () => {
      mounted.current = false;
      consentResponse.current?.(false);
    };
  }, []);
  const assets = brand?.assets || [],
    products = assets.filter(
      (a) =>
        a.role === "product_image" &&
        a.status === "ready" &&
        brand?.voice?.studio?.approvedAssetIds?.includes(a.id),
    );
  const profiles = (brand?.voice?.studio?.characters || []).filter(
    (p) =>
      p.status === "approved" &&
      !characterReviewIssues(p, assets).length &&
      p.permissions.scopes.includes("ad-studio"),
  );
  const model = profiles.find((p) => p.id === profileId),
    refs: CampaignDraftInput["references"] = [
      ...(production?.verifiedAssets.filter(asset => asset.role === "campaign_reference" || asset.role === "other")
        .map(asset => ({ assetId: asset.id, purpose: "STYLE_REFERENCE" as const })) ?? []),
      ...productIds.map((assetId) => ({
        assetId,
        purpose: "PRODUCT_IDENTITY" as const,
      })),
      ...(model
        ? model.referenceAssetIds.map((assetId) => ({
            assetId,
            purpose: "MODEL_IDENTITY" as const,
            profileId: model.id,
          }))
        : []),
    ];
  const variationCopy = production ? { headline: form.headline || production.headline, supportingCopy: form.supportingCopy ?? production.supportingCopy, cta: form.cta || production.cta } : campaignVariationCopy(form, initialSource),
    headline = variationCopy.headline,
    supportingCopy = variationCopy.supportingCopy,
    cta = variationCopy.cta,
    needsModel =
      !!brand && /\b(model|woman|female|mascot|character)\b/i.test(instruction),
    needsProduct = !!brand && /\b(product|lipstick|shade)\b/i.test(instruction);
  const issue = production?.unverifiedAssetCount ? "Review unavailable or unauthorized campaign assets before generating." : !instruction.trim()
    ? "Describe the campaign direction."
    : !headline.trim()
      ? "Enter a headline."
      : !cta.trim()
        ? "Enter a CTA."
        : !initialSource && needsModel && !model
          ? "Select an authorized Brand Model."
          : !initialSource && needsProduct && !productIds.length
            ? "Select the product photographs to use."
            : refs.length > 4
              ? "Choose up to four references in total, including every photograph linked to the selected model."
              : "";
  const progressActive = campaignGenerationIsActive({
    busy,
    retained,
    status,
  });
  function remember(value: Retained) {
    sessionStorage.setItem(key, JSON.stringify(value));
    setRetained(value);
  }
  async function checkSaved() {
    if (!retained?.creativeId || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await adImageApi.status(
        retained.creativeId,
        retained.requestId,
      );
      if (!mounted.current) return;
      setStatus(result.status);
      if (result.creativeId) {
        const saved = await adStudioApi.getCreative(result.creativeId);
        if (mounted.current) {
          sessionStorage.removeItem(key);
          setRetained(null);
          onSaved(saved);
        }
        return;
      }
      if (result.hasRetainedImage) {
        const saved = await adImageApi.recover(
          retained.creativeId,
          retained.requestId,
        );
        if (mounted.current) {
          sessionStorage.removeItem(key);
          setRetained(null);
          onSaved(saved);
        }
        return;
      }
      if (isProcessingStatus(result.status)) {
        if (!started.current) started.current = Date.now();
        setWatch((v) => v + 1);
      } else
        setError(
          "This generation did not produce artwork. It was not submitted again.",
        );
    } catch (e) {
      if (!mounted.current) return;
      // A status read is only an observation of an existing request.  Keep
      // polling a transient outage; never resubmit or charge for it again.
      if (isTransientStatusReadError(e)) {
        if (!started.current) started.current = Date.now();
        setStatus("processing");
        setError("Still checking the saved generation. It will not be submitted again.");
        setWatch((v) => v + 1);
      } else {
        setError(e instanceof Error ? e.message : "Could not read saved status.");
      }
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (!watch || !retained?.creativeId) return;
    const delay = retainedStatusDelay(status, started.current, Date.now());
    if (delay === null) return;
    const timer = setTimeout(() => void checkSaved(), delay);
    return () => clearTimeout(timer);
  }, [watch, status, retained?.creativeId]);
  async function generate(resume = false) {
    if (flight.current || (!resume && issue) || (retained && !resume)) return;
    flight.current = true;
    setBusy(true);
    setError("");
    let executing = false;
    try {
      if (!resume && !initialSource && !production) await onSaveBrief();
      const input: CampaignDraftInput =
        resume && retained
          ? retained.input
          : {
              requestId: crypto.randomUUID(),
              ...(production ? { conceptId: production.conceptId } : {}),
              instruction: instruction.trim(),
              headline: headline.trim(),
              supportingCopy,
              cta: cta.trim(),
              references: refs,
              ...(initialSource || production?.startingCreativeId ? { sourceCreativeId: initialSource?.id ?? production?.startingCreativeId ?? undefined } : {}),
            };
      const hold: Retained = {
        phase: "prepared",
        operation: resume
          ? retained?.operation
          : initialSource
            ? operation
            : "generate",
        requestId: input.requestId,
        input,
      };
      remember(hold);
      let preparedId = retained?.creativeId;
      const saved = await generateOriginalCampaignAd(
        adImageApi,
        project.id,
        input,
        (draft) => {
          preparedId = draft.id;
          if (mounted.current) remember({ ...hold, creativeId: draft.id });
        },
        {
          authorizeQuote: production ? async (quote) => {
            if (quote.costBasis !== "configured-estimate" || quote.estimatedCostUsd === null)
              throw Error("An artwork cost estimate is unavailable. No artwork was requested.");
            if (!mounted.current) return false;
            return new Promise<boolean>(resolve => {
              consentResponse.current = resolve;
              setConsent(quote.estimatedCostUsd!);
            });
          } : undefined,
          onExecuting: () => {
            executing = true;
            remember({ ...hold, creativeId: preparedId, phase: "executing" });
          },
        },
      );
      if (mounted.current && saved) {
        sessionStorage.removeItem(key);
        setRetained(null);
        onSaved(saved);
      }
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Generation outcome is not confirmed. Check saved status.",
        );
        if (executing) {
          setStatus("processing");
          started.current = Date.now();
          setWatch((v) => v + 1);
        }
      }
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function prepareRetry() {
    if (!retained?.creativeId || flight.current || status !== "failed") return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const requestId = retained.retryRequestId || crypto.randomUUID();
      remember({ ...retained, retryRequestId: requestId });
      const draft = await adStudioApi.getCreative(retained.creativeId);
      await adImageApi.retryCampaign(draft.id, {
        previousRequestId: retained.requestId,
        requestId,
        expectedVersion: draft.currentVersion || 1,
      });
      remember({
        ...retained,
        retryRequestId: undefined,
        requestId,
        input: { ...retained.input, requestId },
        phase: "prepared",
      });
      setStatus("");
      setError(
        "A retry is prepared on the same ad. Continue only when you want to generate again.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare a safe retry.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  function discardIncompleteAttempt() {
    // A client-side entry without a creative id was never durably prepared.
    // Retrying its recovery can cause an opaque stale-state loop, so discard
    // only this local pointer; it never cancels or repeats provider work.
    sessionStorage.removeItem(key);
    setRetained(null);
    setStatus("");
    setError("");
    setWatch(0);
  }
  if (consent !== undefined) return <section className="original-campaign-ad" aria-label="Artwork authorization">
    <p>Estimated artwork cost: ${consent} USD. Actual provider charges may differ.</p>
    <div className="flex flex-wrap gap-2">
      <button className="w0a-create-project" type="button" onClick={() => resolveConsent(true)}>Authorize and generate</button>
      <button className="w0a-btn" type="button" onClick={() => resolveConsent(false)}>Cancel</button>
    </div>
  </section>;
  if (progressActive) {
    const title = initialSource
      ? "Creating your AI variation"
      : "Creating your original AI ad";
    return (
      <section
        className="original-campaign-ad original-campaign-ad--progress"
        aria-label="Campaign AI generation in progress"
        aria-live="polite"
      >
        <div className="original-campaign-ad__progress-stage">
          <span className="original-campaign-ad__progress-orbit" aria-hidden="true" />
          <span className="original-campaign-ad__progress-spark" aria-hidden="true">✦</span>
          <p className="w0a-eyebrow">Campaign creative</p>
          <h3>{title}</h3>
          <p>
            We’re composing the campaign direction with its approved Brand Kit
            references. Editable copy and CTA are added after the photographic
            scene is ready.
          </p>
          <ol className="original-campaign-ad__progress-steps">
            <li>Campaign brief prepared</li>
            <li>Brand Kit references attached</li>
            <li className="is-active">Photographic composition rendering</li>
          </ol>
        </div>
        {error && <p role="alert">{error}</p>}
        {retained?.creativeId && !busy && (
          <button
            type="button"
            className="w0a-btn"
            onClick={() => void checkSaved()}
          >
              Check generation status
          </button>
        )}
      </section>
    );
  }
  return (
    <section
      className="original-campaign-ad"
      aria-label="Original AI advertisement"
    >
      <h3>
        {production ? "Prepare artwork" : initialSource ? "Create AI variation" : "Generate Original AI Ad"}
      </h3>
      {!initialSource && (
        <fieldset
          disabled={busy || !!retained}
          className="original-campaign-ad__copy"
        >
          <label>
            Headline
            <input
              value={form.headline ?? ""}
              maxLength={120}
              onChange={(e) => onChange({ headline: e.target.value })}
            />
          </label>
          <label>
            Supporting copy
            <textarea
              value={form.supportingCopy || ""}
              maxLength={240}
              onChange={(e) => onChange({ supportingCopy: e.target.value })}
            />
          </label>
          <label>
            CTA
            <input
              value={form.cta}
              maxLength={64}
              onChange={(e) => onChange({ cta: e.target.value })}
            />
          </label>
        </fieldset>
      )}
      {initialSource && (
        <p className="w0a-meta">
          A new campaign-specific variation will use this campaign brief and
          the same authorized Brand Kit references. The current ad is not
          changed.
        </p>
      )}
      <label>
        {initialSource ? "Variation direction" : "Creative direction"}
        <textarea
          value={instruction}
          maxLength={3500}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={busy || !!retained}
        />
      </label>
      {!initialSource && brand && (
        <div className="original-campaign-ad__references">
          <fieldset disabled={busy || !!retained}>
            <legend>Products</legend>
            {products.map((asset) => (
              <label key={asset.id}>
                <input
                  type="checkbox"
                  checked={productIds.includes(asset.id)}
                  onChange={(e) =>
                    setProducts((old) =>
                      e.target.checked
                        ? [...old, asset.id]
                        : old.filter((id) => id !== asset.id),
                    )
                  }
                />
                {asset.label || asset.fileName}
              </label>
            ))}
            {!products.length && (
              <p>
                No approved product photographs. Add and approve them in Brand
                Kit Assets.
              </p>
            )}
          </fieldset>
          <label>
            Brand Model · optional
            <select
              value={profileId}
              disabled={busy || !!retained}
              onChange={(e) => setProfile(e.target.value)}
            >
              <option value="">No model</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!brand && !initialSource && (
        <p className="w0a-meta">
          No Brand Kit selected. Generate original photography from your brief.
        </p>
      )}
      {busy && (
        <div className="original-campaign-ad__baking" role="status">
          <span />
          Preparing your campaign creative…
        </div>
      )}
      {issue && !retained && (
        <p role="status" className="w0a-meta">
          {issue}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {retained?.creativeId && status === "failed" && (
        <div className="original-campaign-ad__attempt-notice" role="status">
          <h4>Generation needs a new attempt</h4>
          <p>
            The previous request is finished and has no saved artwork. Preparing
            a retry is free; generation only starts after you confirm the next
            step.
          </p>
          <button
            type="button"
            className="w0a-btn"
            disabled={busy}
            onClick={() => void prepareRetry()}
          >
            Prepare new attempt
          </button>
        </div>
      )}
      {!retained ? (
        <button
          type="button"
          className="w0a-btn"
          disabled={busy || !!issue || !realImagesEnabled()}
          onClick={() => void generate()}
        >
          {initialSource
            ? operation === "generate"
              ? "Regenerate photograph"
              : operation === "variation"
                ? "Generate photographic variation"
                : "Refine photograph"
            : production ? "Review artwork cost" : "Generate Original AI Ad"}
        </button>
      ) : (
        retained.creativeId && status !== "failed" ? (
          <button
            type="button"
            className="w0a-btn"
            disabled={busy}
            onClick={() => void checkSaved()}
          >
            Check generation status
          </button>
        ) : !retained.creativeId ? (
          <div className="original-campaign-ad__attempt-notice" role="status">
            <p>A previous local attempt was not started. You can safely begin a new request.</p>
            <button type="button" className="w0a-btn" disabled={busy} onClick={discardIncompleteAttempt}>
              Start a new {initialSource ? "variation" : "generation"}
            </button>
          </div>
        ) : null
      )}
      {retained?.phase === "prepared" && retained.creativeId && (
        <button
          type="button"
          className="w0a-btn"
          disabled={busy || !realImagesEnabled()}
          onClick={() => void generate(true)}
        >
          Continue generation
        </button>
      )}
      {!realImagesEnabled() && (
        <p className="w0a-meta">
          AI image generation is disabled in this frontend.
        </p>
      )}
    </section>
  );
}
