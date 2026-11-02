import {TemplateRenderReview} from "../../BrandKits/templates/TemplateRenderReview";
import { Sparkles as SparklesIcon } from "lucide-react";
import { characterReviewIssues } from "../../BrandKits/guided/brandCharacterModel";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import React, { useEffect, useRef, useState } from "react";
import { adImageApi } from "../../../services/apiClient";
import { BrandTemplateScenePreview as ResponsiveScenePreview } from "../../BrandKits/templates/BrandTemplateScenePreview";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
import {
  assertCharacterQuote,
  assertImageRenderMode,
  assertSingleTemplateReview,
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
  renderMode = source.imageRenderMode || "background",
  autoPreflight = false,
  executeRequested = false,
  onProviderUnavailable,
  onCustomize,
  onReview,
  compact = false,
  onSaved,
}: {
  source: WorkspaceCreative;
  brand?: BrandKitSummary | null;
  assetUrls: Readonly<Record<string, string>>;
  initialOperation?: AdImageOperation;
  initialInstruction?: string;
  renderMode?: "background" | "template-proposal";
  autoPreflight?: boolean;
  executeRequested?: boolean;
  onProviderUnavailable?: () => Promise<void>;
  onCustomize?: () => void;
  onReview?: () => void;
  compact?: boolean;
  onSaved: (saved: WorkspaceCreative) => Promise<void>;
}) {
  const proposal = renderMode === "template-proposal";
  const [refiningProposal,setRefiningProposal]=useState(initialOperation === "refine");
  const autoAttempt=useRef(false),executing=useRef(false),explicitIntentConsumed=useRef(false);
  const canEdit = hasGeneratedBackground(source),
    enabled = realImagesEnabled(),
    key = "nxclip:ad-image-request:" + source.id;
  const [operation, setOperation] = useState<AdImageOperation>(
      canEdit ? initialOperation : "generate",
    ),
    [instruction, setInstruction] = useState(initialInstruction.slice(0, 4000)),
    [quote, setQuote] = useState<ImageQuote | null>(null),
    [consent, setConsent] = useState(false),
    [activity, setActivity] = useState<"readiness" | "generation" | "status" | "recovery" | null>(null),
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
  const busy = activity !== null;
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
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    setQuote(null);
    setConsent(false);
  }, [source.currentVersion]);
  const input = {
    operation,
    ...(proposal ? {renderMode: "template-proposal" as const} : {}),
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
    setActivity("readiness");
    setError("");
    try {
      const q = validateImageQuote(await adImageApi.quote(source.id, input));
      assertCharacterQuote(q, selectedCharacterIds);
      assertImageRenderMode(q,renderMode);
      if(compact && proposal)assertSingleTemplateReview(q);
      if (mounted.current && n === epoch.current) {
        setQuote(q);
        setConsent(false);
      }
    } catch (e) {
      if (proposal && onProviderUnavailable && [502,503].includes(Number((e as {statusCode?:number})?.statusCode))) { await onProviderUnavailable(); return; }
      if (mounted.current && n === epoch.current)
        setError(
          e instanceof Error ? e.message : "Execution preflight unavailable",
        );
    } finally {
      if (mounted.current && n === epoch.current) setActivity(null);
    }
  };
  useEffect(()=>{
    if(autoPreflight && enabled && valid && !quote && !requestId && !autoAttempt.current){autoAttempt.current=true;void estimate();}
  },[autoPreflight,enabled,valid,quote,requestId,estimate]);
  const generate = async () => {
    if (!enabled || (!proposal && (!quote || !consent)) || busy || requestId || !valid || executing.current) return;
    executing.current=true;
    let executionQuote=quote;
    if (!executionQuote) {
      setActivity('readiness');setError('');
      try { executionQuote=validateImageQuote(await adImageApi.quote(source.id,input));assertCharacterQuote(executionQuote,selectedCharacterIds);assertImageRenderMode(executionQuote,renderMode);if(compact && proposal)assertSingleTemplateReview(executionQuote); }
      catch(e){executing.current=false;if(mounted.current){setActivity(null);if(proposal && onProviderUnavailable && [502,503].includes(Number((e as {statusCode?:number})?.statusCode))){await onProviderUnavailable();return;}setError(e instanceof Error?e.message:'Could not prepare this generation.');}return;}
    }
    if (!mounted.current){executing.current=false;return;}
    const n = ++epoch.current,
      id = crypto.randomUUID();
    setActivity("generation");
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
          approvedQuoteHash: validateImageQuote(executionQuote).quoteHash,
          allowPaidProvider: true,
        }),
        source,
      );
      if (proposal && saved.imageRenderMode !== "template-proposal")throw Error("The saved result is not a finished-template proposal. Check retained status before retrying.");
      if (mounted.current && n === epoch.current) {
        setMessage(
          proposal ? "Template preview saved." : "AI background saved in a new editable creative; original preserved.",
        );
        await onSaved(saved);
      }
    } catch (e) {
      if (mounted.current && n === epoch.current)
        setError(
          e instanceof Error
            ? e.message
            : "Outcome uncertain. Check retained status; do not resubmit paid work.",
        );
    } finally {
      executing.current=false;
      if (mounted.current && n === epoch.current) setActivity(null);
    }
  };
  // In-memory intent comes only from the owner's Generate click in template setup.
  // It is never persisted in the URL: refresh/reopen cannot start paid work.
  useEffect(()=>{
    if(executeRequested && proposal && enabled && valid && !busy && !requestId && !explicitIntentConsumed.current){
      explicitIntentConsumed.current=true;void generate();
    }
  },[executeRequested,proposal,enabled,valid,busy,requestId,generate]);
  const status = async () => {
    if (!requestId || busy) return;
    const n = ++epoch.current;
    setActivity("status");
    setError("");
    try {
      const s = await adImageApi.status(source.id, requestId);
      if (mounted.current && n === epoch.current) {
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
      if (mounted.current && n === epoch.current)
        setError(e instanceof Error ? e.message : "Status unavailable");
    } finally {
      if (mounted.current && n === epoch.current) setActivity(null);
    }
  };
  const recover = async () => {
    if (!retained || busy || !requestId) return;
    const n = ++epoch.current;
    setActivity("recovery");
    setError("");
    try {
      const saved = verifyGeneratedCreative(
        await adImageApi.recover(source.id, requestId),
        source,
      );
      if (mounted.current && n === epoch.current) await onSaved(saved);
    } catch (e) {
      if (mounted.current && n === epoch.current)
        setError(
          e instanceof Error
            ? e.message
            : "Recovery failed; retained output requires review",
        );
    } finally {
      if (mounted.current && n === epoch.current) setActivity(null);
    }
  };
  const change = () => {
    setQuote(null);
    setConsent(false);
  };
  if(proposal && !canEdit && compact)return <TemplateRenderReview source={source} format={source.sceneGraph.canvas.width===source.sceneGraph.canvas.height?'square_1080':source.sceneGraph.canvas.width>source.sceneGraph.canvas.height?'landscape_1920x1080':source.sceneGraph.canvas.height/source.sceneGraph.canvas.width>1.5?'vertical_1080x1920':'portrait_1080x1350'} active={enabled&&(busy||executeRequested&&!error&&!requestId)} phase={error?'Your template needs attention':!enabled?'Generation is unavailable':requestId&&!busy?'Check your saved generation':activity==='readiness'?'Preparing your design…':'Rendering your template…'}>
    {error&&<p className="xp-notice" role="alert">{error}</p>}
    {!enabled&&<p className="xp-notice">AI generation needs local activation.</p>}
    {!busy&&!requestId&&(!executeRequested||!!error)&&<button className="xp-primary" disabled={!enabled||!valid} onClick={()=>void generate()}>Generate Template</button>}
    {message&&<p role="status">{message}</p>}
    {!busy&&requestId&&<div className="xp-actions"><button className="xp-secondary" onClick={()=>void status()}>Check saved status</button>{retained&&<button className="xp-secondary" onClick={()=>void recover()}>Open saved result</button>}</div>}
  </TemplateRenderReview>;
  if(proposal && canEdit && !refiningProposal)return (
    <section className="ai-proposal-result" aria-label="Finished template proposal">
      <div className="xp-panel ai-generation-preview"><ResponsiveScenePreview graph={source.sceneGraph} assetUrls={assetUrls} size="hero" maxHeight={680}/></div>
      <aside className="xp-panel ai-generation-controls"><h2>Your template preview</h2>{onReview && <button className="xp-primary" onClick={onReview}>Review template →</button>}{onCustomize && <button className="xp-secondary" onClick={onCustomize}>Customize in Canvas →</button>}<button className="xp-text-button" onClick={()=>{setOperation("refine");change();setRefiningProposal(true);}}>Refine this design</button><details><summary>About this artwork</summary><p>AI artwork is one image layer. Product depiction is not verified product inventory; review it before approval. Original photos remain available in Canvas.</p></details></aside>
    </section>
  );
  return (
    <div className="xp-split ai-generation-workspace">
      <section className="xp-panel ai-generation-preview">
        {proposal && !canEdit ? <div className="ai-proposal-pending"><SparklesIcon/><h3>Your preview will appear here</h3></div> : <ResponsiveScenePreview
          graph={source.sceneGraph}
          assetUrls={assetUrls}
          size="hero"
          showSafeArea
        />}
        {!proposal && <span className="xp-status">{canEdit ? "AI artwork · saved creative" : "Starting layout · not AI-generated"}</span>}
        <p>
          {proposal ? "A finished visual proposal with editable brand copy and logo." : "Your original product, logo and text stay editable."}
        </p>
      </section>
      <section className="xp-panel ai-generation-controls">
        <h2>
          {operation === "refine"
            ? "Direct the next refinement."
            : operation === "variation"
              ? "A new visual expression."
              : proposal ? "Preview your finished template." : "Generate your AI advertisement."}
        </h2>
        {proposal && canEdit && <button className="xp-text-button" disabled={busy} onClick={()=>setRefiningProposal(false)}>← Back to proposal</button>}
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
            <option value="generate">{proposal ? "New template proposal" : "Generate AI background"}</option>
            <option value="variation" disabled={!canEdit}>
              AI visual variation
            </option>
            <option value="refine" disabled={!canEdit}>
              Natural-language refinement
            </option>
          </select>
        </label> : <div className="ai-operation-label"><strong>{proposal ? "Finished template design" : "New AI background"}</strong>{!compact && <p>Variations and refinement become available after generation.</p>}</div>}
        {!!requestId && <p role="status">A previous request is retained. Check its status below before starting another.</p>}
        {!canEdit && !proposal && (
          <p>
            Describe your scene, check readiness, then approve one generation.
          </p>
        )}
        <details open={!compact}><summary>Edit creative direction</summary><label className="xp-field">
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
        </details>
        {!proposal && !quote && <button
          className="xp-secondary"
          disabled={!enabled || busy || !!requestId || !valid}
          onClick={() => void estimate()}
        >
          {activity === "readiness" ? "Checking readiness…" : "Check AI generation readiness"}
        </button>
        }
        {!instruction.trim() && <small>Enter creative direction to continue.</small>}
        {quote && !proposal && (
          <>
            <label className="xp-check">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy || !!requestId}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {proposal ? "I approve one Google request." : "I approve one owner-UAT provider request and its selected background references."}
            </label>

          </>
        )}
            <button
              className="xp-primary"
              disabled={!enabled || busy || !!requestId || (!proposal && (!consent || !quote)) || !valid}
              onClick={() => void generate()}
            >
              {activity === "generation" ? "Generating…" : proposal ? "Generate template" : "Generate AI advertisement"}
            </button>
        {!proposal && <details className="ai-character-options">
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
        </details>}
        {busy && <div className="ai-generation-progress" role="status" aria-live="polite">
          <div className="ai-generation-orbit" aria-hidden="true"><SparklesIcon/><i/><i/><i/></div>
          <strong>{activity==='generation'?'Creating your template preview…':activity==='readiness'?'Preparing your design…':'Loading your saved result…'}</strong>
          <span>{activity==='generation'?'Your design is taking shape. You can keep this page open.':'Just a moment.'}</span>
        </div>}
        {requestId && !busy && (
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
