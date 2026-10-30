import { characterReviewIssues } from "../../BrandKits/guided/brandCharacterModel";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import React, { useEffect, useRef, useState } from "react";
import { adImageApi } from "../../../services/apiClient";
import { BrandTemplateScenePreview as ResponsiveScenePreview } from "../../BrandKits/templates/BrandTemplateScenePreview";
import { Skeleton } from "../../../components/ui/skeleton";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
import {
  assertCharacterQuote,
  savedCharacterSelection,
  toggleAdCharacter,
  hasGeneratedBackground,
  imageSourceIssue,
  realImagesEnabled,
  validateImageQuote,
  verifyGeneratedCreative,
  type ImageQuote,
  type AdImageOperation,
} from "./imageExecutionModel";
export function ProductionImageGeneration({
  source,
  brand,
  assetUrls,
  initialOperation = "generate",
  initialInstruction = "",
  onSaved,
}: {
  source: WorkspaceCreative;
  brand?: BrandKitSummary | null;
  assetUrls: Readonly<Record<string, string>>;
  initialOperation?: AdImageOperation;
  initialInstruction?: string;
  onSaved: (saved: WorkspaceCreative) => Promise<void>;
}) {
  const canEdit = hasGeneratedBackground(source),
    enabled = realImagesEnabled(),
    key = "nxclip:ad-image-request:" + source.id;
  const [operation, setOperation] = useState<AdImageOperation>(
      canEdit ? initialOperation : "generate",
    ),
    [instruction, setInstruction] = useState(initialInstruction.slice(0, 4000)),
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
  const [selectedCharacterIds, setSelectedCharacterIds] = useState(() =>
    savedCharacterSelection(source),
  );
  const profiles = brand?.voice?.studio?.characters ?? [];
  const eligible = profiles.filter(
    (p) =>
      p.status === "approved" &&
      p.permissions.scopes.includes("ad-studio") &&
      !characterReviewIssues(p, brand?.assets ?? []).length &&
      p.referenceAssetIds.length &&
      brand?.voice?.studio?.approvedAssetIds?.includes(
        p.referenceAssetIds[0],
      ) &&
      brand?.assets?.some(
        (a) =>
          a.id === p.referenceAssetIds[0] &&
          ["brand_model", "other"].includes(a.role),
      ),
  );
  const selectionReady = selectedCharacterIds.every((id) =>
    eligible.some((p) => p.id === id),
  );
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
    selectedCharacterIds,
  };
  const sourceIssue = imageSourceIssue(source);
  const valid =
    !sourceIssue &&
    instruction.trim().length > 0 &&
    instruction.length <= 4000 &&
    selectionReady;
  const estimate = async () => {
    if (!enabled || !valid || busy || requestId) return;
    const n = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const q = validateImageQuote(await adImageApi.quote(source.id, input));
      assertCharacterQuote(q, selectedCharacterIds);
      if (n === epoch.current) {
        setQuote(q);
        setConsent(false);
      }
    } catch (e) {
      if (n === epoch.current)
        setError(
          e instanceof Error ? e.message : "Execution preflight unavailable",
        );
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
          approvedQuoteHash: validateImageQuote(quote).quoteHash,
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
    <div className="xp-split ai-generation-workspace">
      <section className="xp-panel ai-generation-preview">
        <ResponsiveScenePreview
          graph={source.sceneGraph}
          assetUrls={assetUrls}
          size="hero"
          showSafeArea
        />
        <span className="xp-status">{canEdit ? "AI artwork · saved creative" : "Starting layout · not AI-generated"}</span>
        <p>
          Your original product, logo and text stay editable.
        </p>
      </section>
      <section className="xp-panel ai-generation-controls">
        <h2>
          {operation === "refine"
            ? "Direct the next refinement."
            : operation === "variation"
              ? "A new visual expression."
              : "Generate your AI advertisement."}
        </h2>
        {sourceIssue && <p className="xp-notice" role="alert">{sourceIssue}</p>}
        {!enabled && (
          <p className="xp-notice">
            AI generation needs local activation.
          </p>
        )}
        {canEdit ? <label className="xp-field">
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
        </label> : <div className="ai-operation-label"><strong>New AI background</strong><p>Variations and refinement become available after generation.</p></div>}
        {!!requestId && <p role="status">A previous request is retained. Check its status below before starting another.</p>}
        {!canEdit && (
          <p>
            Describe your scene, check readiness, then approve one generation.
          </p>
        )}
        <label className="xp-field">
          Creative direction
          <textarea
            rows={4}
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
        <button
          className="xp-secondary"
          disabled={!enabled || busy || !!requestId || !valid}
          onClick={() => void estimate()}
        >
          {busy ? "Please wait…" : "Check AI generation readiness"}
        </button>
        {!instruction.trim() && <small>Enter creative direction to continue.</small>}
        {quote && (
          <>
            <dl className="xp-spec">
              <dt>Provider / exact model</dt>
              <dd>
                {quote.provider} / {quote.modelId}
              </dd>
              <dt>Scope</dt>
              <dd>
                AI background plate; {quote.referenceCount} owned background
                reference(s)
              </dd>
            </dl>
            <p>
              Uses Google credits. No automatic retries or model fallback. Review results before use.
            </p>
            <p className="xp-notice">
              {(quote.productLayerCount ?? 0) > 0
                ? `${quote.productLayerCount} original product photo(s) protected; backgrounds retained.`
                : "Background only. Add a product photo in Canvas for a product advertisement."}
            </p>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy || !!requestId}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I approve one owner-UAT provider request and its selected
              background references.
            </label>

          </>
        )}
            <button
              className="xp-primary"
              disabled={!enabled || busy || !!requestId || !consent || !quote || !valid}
              onClick={() => void generate()}
            >
              {busy ? "Generating…" : "Generate AI advertisement"}
            </button>
        <details className="ai-character-options">
          <summary>Models &amp; Mascots <span>{selectedCharacterIds.length ? selectedCharacterIds.length + " selected" : "Optional"}</span></summary>
        <fieldset className="xp-panel space-y-3" disabled={busy || !!requestId}>
          <legend className="text-sm font-semibold">
            Models & Mascots for this ad
          </legend>
          <p className="text-xs text-muted-foreground">
            Selected photos become editable layers. Faces and poses are not regenerated.
          </p>
          <button
            type="button"
            className="xp-secondary"
            aria-pressed={!selectedCharacterIds.length}
            onClick={() => {
              setSelectedCharacterIds([]);
              change();
            }}
          >
            No model / mascot
          </button>
          {profiles.map((profile) => {
            const allowed = eligible.some((p) => p.id === profile.id),
              selected = selectedCharacterIds.includes(profile.id);
            return (
              <label
                key={profile.id}
                className="flex items-start gap-3 rounded-lg border border-white/10 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={
                    (!allowed && !selected) ||
                    (!selected && selectedCharacterIds.length >= 4)
                  }
                  onChange={() => {
                    setSelectedCharacterIds((ids) =>
                      toggleAdCharacter(ids, profile.id),
                    );
                    change();
                  }}
                />
                {assetUrls[profile.referenceAssetIds[0]] && (
                  <img
                    src={assetUrls[profile.referenceAssetIds[0]]}
                    alt=""
                    className="h-14 w-12 rounded object-contain"
                  />
                )}
                <span>
                  <strong>{profile.name}</strong>
                  <span className="block text-xs text-muted-foreground">
                    {allowed
                      ? profile.kind === "human-model"
                        ? "Authorized model"
                        : "Approved mascot / character"
                      : "Unavailable — review approval, reference and Ad Studio usage permissions in Brand Kit."}
                  </span>
                  {profile.appearance && (
                    <span className="block text-xs mt-1">
                      {profile.appearance}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
          {!profiles.length && (
            <p className="text-xs text-muted-foreground">
              {brand
                ? "Add and approve a reference-backed profile in Brand Kit to use a model or mascot."
                : "This project has no Brand Kit profiles."}
            </p>
          )}
          {!selectionReady && (
            <p role="alert" className="xp-notice">
              A retained profile is no longer available. Deselect it or review
              its Brand Kit authorization before preflight.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedCharacterIds.length} / 4 selected. Your source creative
            remains unchanged; check placement and image backgrounds in the new
            creative before export.
          </p>
        </fieldset>
        </details>
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
