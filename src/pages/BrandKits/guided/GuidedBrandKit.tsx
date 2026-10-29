import "../components/brandCharacters.css";
import { brandFontKey, useBrandFontPreviews } from "../lib/brandFontPreview";
import "../components/brandVoice.css";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import { BrandKitBrochure } from "./BrandKitBrochure";
import {
  BrandVoiceSection,
  voiceDraftFromKit,
  voicePatchFromDraft,
} from "../components/BrandVoiceSection";
import {
  CreativeGuidelinesSection,
  guidelinesDraftFromKit,
  creativeFromDraft,
} from "../components/CreativeGuidelinesSection";
import { BrandKitJsonTools } from "./BrandKitJsonTools";
import { mergeBrandJsonDraft } from "./guidedBrandImport";
import { BrandAnalysisPanel } from "../analysis/BrandAnalysisPanel";
import {
  applyBrandAnalysisProposal,
  isBrandAnalysisEnabled,
} from "../analysis/brandAnalysisModel";
import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Check, Save, Plus } from "lucide-react";
import { isBrandTemplatesEnabled } from "../templates/brandTemplateModel";
import { brandTemplateApi } from "../../../services/apiClient";
import { brandApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import { EmptyState } from "../../../components/common/EmptyState";
import { BrandCharactersSection } from "./BrandCharactersSection";
import { BrandAssetsSection } from "../components/BrandAssetsSection";
import { BRAND_FONT_CATALOG } from "../lib/brandFontCatalog";
import type { BrandKitSummary } from "../lib/brandKitTypes";
import {
  BRAND_TAXONOMY,
  BRAND_GOALS,
  BRAND_PERSONALITIES,
  GUIDED_STEPS,
  newGuidedDraft,
  draftFromKit,
  changeGuidedCategory,
  guidedErrors,
  guidedPayload,
  type GuidedBrandDraft,
  type GuidedStep,
} from "./guidedBrandModel";
import "../../AdStudio/uxPreview/preview.css";
import "../../AdStudio/uxPreview/roadmap.css";
import "../../AdStudio/styles/production-theme.css";
import "./guidedBrand.css";
const LABELS = [
  "Brand",
  "Category",
  "Goals",
  "Assets",
  "Identity",
  "Guidelines",
  "Ready",
];
const TITLES = [
  "A brand starts with a story.",
  "Find your creative territory.",
  "What does success look like?",
  "Build a library with a point of view.",
  "An identity, ready for your judgment.",
  "Make the signature unmistakable.",
  "Your brand. Ready to create.",
];
type Version = {
  id: string;
  version: number;
  changeSummary: string | null;
  createdAt: string;
};
export default function GuidedBrandKit() {
  return <GuidedBrandKitWorkspace />;
}
export function GuidedBrandKitWorkspace({
  embedded = false,
  initialBrandId,
  onSaved,
}: {
  embedded?: boolean;
  initialBrandId?: string;
  onSaved?: (kit: BrandKitSummary) => void;
} = {}) {
  const { brandId: routeBrandId } = useParams<{ brandId: string }>(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const brandId = initialBrandId || routeBrandId;
  const [embeddedStep, setEmbeddedStep] = useState<GuidedStep>("brand");
  const raw = embedded ? embeddedStep : params.get("step"),
    step: GuidedStep = GUIDED_STEPS.includes(raw as GuidedStep)
      ? (raw as GuidedStep)
      : "brand",
    index = GUIDED_STEPS.indexOf(step);
  const [kit, setKit] = useState<BrandKitSummary | null>(null),
    [draft, setDraft] = useState(newGuidedDraft),
    [loading, setLoading] = useState(!!brandId),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState(""),
    [versions, setVersions] = useState<Version[]>([]),
    [versionsLoading, setVersionsLoading] = useState(false),
    [versionsError, setVersionsError] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const characterEditor = useRef({ dirty: false, busy: false });
  const title = useRef<HTMLHeadingElement>(null),
    saved = useRef("");
  const go = (next: GuidedStep) => {
    if (step === "assets" && next !== "assets") {
      if (characterEditor.current.busy) {
        setError(
          "Wait for the model or mascot operation to finish before leaving Assets.",
        );
        return;
      }
      if (
        characterEditor.current.dirty &&
        !window.confirm(
          "Leave without saving the model or mascot profile? Uploaded images remain in Brand Kit Assets.",
        )
      )
        return;
    }
    setMessage("");
    if (embedded) setEmbeddedStep(next);
    else setParams({ step: next });
  };
  const edit = (patch: Partial<GuidedBrandDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));
  const loadVersions = async (id: string) => {
    setVersionsLoading(true);
    setVersionsError("");
    try {
      setVersions((await brandApi.listVersions(id)).items);
    } catch (e) {
      setVersionsError(
        e instanceof Error ? e.message : "Could not load versions.",
      );
    } finally {
      setVersionsLoading(false);
    }
  };
  const sourceUrls = useAuthenticatedBrandAssetUrls(kit);
  const [fontAttempt, setFontAttempt] = useState(0);
  const previewFonts = useBrandFontPreviews(
    draft.typography,
    `${draft.name} ${draft.voiceExtras?.tagline || ""} Aa Bb Cc 0123456789`,
    fontAttempt,
  );
  useEffect(() => {
    let active = true;
    if (!brandId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    brandApi
      .getKit(brandId)
      .then((data: BrandKitSummary) => {
        if (!active) return;
        setKit(data);
        const next = draftFromKit(data);
        setDraft(next);
        saved.current = JSON.stringify(next);
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load Brand Kit.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [brandId]);
  useEffect(() => {
    title.current?.focus();
  }, [step]);
  useEffect(() => {
    if (step === "ready" && kit?.id) void loadVersions(kit.id);
  }, [step, kit?.id, kit?.version]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saved.current && JSON.stringify(draft) !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft]);
  const persist = async (complete: boolean, target: GuidedStep) => {
    const problems = guidedErrors(draft, complete);
    if (problems.length) {
      setError(problems.join(" "));
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = guidedPayload(draft, kit);
      const result: BrandKitSummary = kit
        ? await brandApi.updateKit(kit.id, {
            ...payload,
            expectedVersion: kit.version,
          })
        : await brandApi.createKit(payload);
      setKit(result);
      const next = draftFromKit(result);
      setDraft(next);
      saved.current = JSON.stringify(next);
      let templatesPrepared = false;
      if (complete && isBrandTemplatesEnabled()) {
        try {
          await brandTemplateApi.generate(
            result.id,
            result.version,
            "square_1080",
          );
          templatesPrepared = true;
        } catch {
          setError(
            "Brand Kit saved successfully. Automatic template preparation failed; open Brand Templates to retry without creating another Brand Kit.",
          );
        }
      }
      if (embedded) onSaved?.(result);
      else if (!brandId)
        navigate("/brands/" + result.id + "/guided?step=" + target, {
          replace: true,
        });
      else go(target);
      setMessage(
        complete
          ? templatesPrepared
            ? "Reviewed identity saved and native template suggestions prepared. Each recipe requires separate approval."
            : "Reviewed identity saved. Template preparation is gated; no AI generation has run."
          : "Brand Kit draft saved.",
      );
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Save failed.") +
          (!kit
            ? " Check your Brand Kit library before retrying an uncertain network result."
            : " Your draft is retained; reload if the version changed."),
      );
    } finally {
      setSaving(false);
    }
  };
  const current: BrandKitSummary = {
    ...(kit || { id: "", name: draft.name }),
    ...guidedPayload(draft, kit),
  };
  const field = (
    label: string,
    key: "name" | "description" | "website" | "audience",
    max: number,
  ) => (
    <label className="xp-field">
      {label}
      <input
        value={draft[key]}
        maxLength={max}
        onChange={(event) =>
          edit({
            [key]: event.target.value,
            identityApproved: false,
            guidelinesApproved: false,
          })
        }
      />
    </label>
  );
  const preview = (
    <aside className="bp-draft-preview" aria-label="Brand Kit draft preview">
      <header>
        <span className="xp-kicker">LIVE IDENTITY</span>
        <h2>Brand Kit draft</h2>
        <p>
          Your complete identity, using the current palette, type and messaging.
          Changes remain a draft until saved.
        </p>
      </header>
      <div
        className="bp-draft-preview-scroll"
        tabIndex={0}
        role="region"
        aria-label="Scrollable Brand Kit identity brochure"
      >
        <BrandKitBrochure
          kit={current}
          dirty={JSON.stringify(draft) !== saved.current}
          summary
        />
      </div>
    </aside>
  );
  if (loading)
    return (
      <div
        className="grid gap-5"
        aria-busy="true"
        aria-label="Loading Brand Kit"
      >
        <Skeleton className="h-20 w-full" />
        <div className="grid md:grid-cols-2 gap-5">
          <Skeleton className="h-[460px]" />
          <Skeleton className="h-[460px]" />
        </div>
      </div>
    );
  if (brandId && !kit)
    return (
      <EmptyState
        title="Brand Kit unavailable"
        description={
          error || "This kit could not be loaded with your current account."
        }
        actionLabel="Back to Brand Kits"
        onAction={() => navigate("/brands")}
      />
    );
  return (
    <div className="xp-root nxclip-production bp-guided-root">
      <main className="xp-main">
        <header className="xp-page-heading">
          <div>
            <div className="xp-breadcrumb">
              <Link to="/brands">
                <ArrowLeft size={14} /> BRAND KIT STUDIO
              </Link>
            </div>
            <h1 tabIndex={-1} ref={title}>
              {TITLES[index]}
            </h1>
          </div>
          <div className="xp-actions">
            <BrandKitJsonTools
              kit={{
                ...(kit || { id: "", name: draft.name }),
                ...guidedPayload(draft, kit),
              }}
              onImport={(mapped) => {
                setDraft((current) => mergeBrandJsonDraft(current, mapped));
                setMessage(
                  "JSON applied to this draft. Review and save when ready; existing assets are preserved.",
                );
              }}
            />
            <button
              className="xp-secondary"
              disabled={saving}
              onClick={() => void persist(false, step)}
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save Brand Kit"}
            </button>
          </div>
        </header>
        <nav className="xp-wizard-steps" aria-label="Brand Kit creation steps">
          {GUIDED_STEPS.map((id, i) => (
            <button
              key={id}
              className={id === step ? "is-active" : ""}
              aria-current={id === step ? "step" : undefined}
              onClick={() => go(id)}
            >
              <span>{i + 1}</span>
              {LABELS[i]}
            </button>
          ))}
        </nav>
        {error && (
          <div role="alert" className="xp-message bp-error">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="xp-message">
            {message}
          </div>
        )}
        <fieldset disabled={saving} className="bp-fieldset">
          {step === "brand" && (
            <div className="xp-split">
              <section className="xp-panel">
                <h2>A little context goes a long way.</h2>
                {field("Brand name *", "name", 120)}
                <label className="xp-field">
                  Business type
                  <select
                    aria-label="Business type"
                    value={draft.businessType}
                    onChange={(e) =>
                      edit({
                        businessType: e.target.value,
                        identityApproved: false,
                      })
                    }
                  >
                    {[
                      "Retail brand",
                      "Game studio",
                      "Professional services",
                      "Fashion label",
                      "Travel & hospitality",
                      "Creator / other business",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {field("Website — optional, not analyzed", "website", 2048)}
                <label className="xp-field">
                  Industry — optional
                  <input
                    value={String(
                      guidedPayload(draft, kit).voice.industry || "",
                    )}
                    maxLength={200}
                    onChange={(event) =>
                      edit({
                        voiceExtras: {
                          ...draft.voiceExtras,
                          industry: event.target.value,
                        },
                        identityApproved: false,
                      })
                    }
                  />
                </label>
                <label className="xp-field">
                  Signature product — approved details only
                  <input
                    value={String(
                      guidedPayload(draft, kit).voice.signatureProduct || "",
                    )}
                    maxLength={500}
                    onChange={(event) =>
                      edit({
                        voiceExtras: {
                          ...draft.voiceExtras,
                          signatureProduct: event.target.value,
                        },
                        identityApproved: false,
                      })
                    }
                  />
                  <small>
                    Describe your actual product. This does not verify shades,
                    inventory or asset permissions.
                  </small>
                </label>
                {field("Business description — optional", "description", 2000)}
                <button
                  className="xp-secondary"
                  disabled={!isBrandAnalysisEnabled()}
                  onClick={() => {
                    setAnalysisOpen(true);
                    go("identity");
                  }}
                  title="Review saved text, provider and estimated cost before analysis."
                >
                  Suggest description
                </button>
                <button
                  className="xp-primary"
                  onClick={() =>
                    draft.name.trim()
                      ? go("category")
                      : setError("Enter a brand name to continue.")
                  }
                >
                  Choose category & niche →
                </button>
              </section>
              <aside className="xp-panel">
                <span className="xp-kicker">A GUIDED START</span>
                <h2>Your identity, with less guesswork.</h2>
                <p>
                  Seven connected steps build a reusable identity using the
                  existing Brand Kit system. Nothing is generated or charged
                  automatically.
                </p>
                <Link className="xp-secondary" to="/brands">
                  Manage existing Brand Kits
                </Link>
              </aside>
            </div>
          )}
          {step === "category" && (
            <section className="xp-panel">
              <h2>Use the NxClip category library.</h2>
              <label className="xp-field">
                Search categories
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search existing categories"
                />
              </label>
              <label className="xp-field">
                Category
                <select
                  aria-label="Category"
                  value={draft.categoryId}
                  onChange={(e) =>
                    setDraft(changeGuidedCategory(draft, e.target.value))
                  }
                >
                  <option value="">Choose category</option>
                  {BRAND_TAXONOMY.filter(
                    (c) =>
                      c.label.toLowerCase().includes(search.toLowerCase()) ||
                      c.id === draft.categoryId,
                  ).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="xp-field">
                Niche
                <select
                  aria-label="Niche"
                  value={draft.nicheId}
                  onChange={(e) =>
                    edit({
                      nicheId: e.target.value,
                      taxonomyConfirmed: false,
                      identityApproved: false,
                      guidelinesApproved: false,
                    })
                  }
                >
                  <option value="">Choose niche</option>
                  {BRAND_TAXONOMY.find(
                    (c) => c.id === draft.categoryId,
                  )?.niches.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="xp-secondary"
                disabled
                title="AI recommendations require the provider integration slice."
              >
                Recommend category & niche
              </button>
              <label className="xp-check">
                <input
                  type="checkbox"
                  checked={draft.taxonomyConfirmed}
                  onChange={(e) =>
                    edit({ taxonomyConfirmed: e.target.checked })
                  }
                />{" "}
                I confirm this category and niche
              </label>
              <button
                className="xp-primary"
                onClick={() =>
                  draft.categoryId && draft.nicheId && draft.taxonomyConfirmed
                    ? go("goals")
                    : setError("Choose and confirm your category and niche.")
                }
              >
                Choose goals →
              </button>
            </section>
          )}
          {step === "goals" && (
            <section className="xp-panel">
              <h2>Give your identity a purpose.</h2>
              <div className="xp-choice-grid">
                {BRAND_GOALS.map((goal) => (
                  <button
                    key={goal}
                    className={draft.goals.includes(goal) ? "is-selected" : ""}
                    aria-pressed={draft.goals.includes(goal)}
                    onClick={() =>
                      edit({
                        goals: draft.goals.includes(goal)
                          ? draft.goals.filter((g) => g !== goal)
                          : [...draft.goals, goal],
                        guidelinesApproved: false,
                      })
                    }
                  >
                    {goal}
                  </button>
                ))}
              </div>
              <h3>Visual personality</h3>
              <div className="xp-choice-grid">
                {BRAND_PERSONALITIES.map((p) => (
                  <button
                    key={p}
                    className={
                      "xp-personality xp-personality--" +
                      p.toLowerCase() +
                      (draft.personality === p ? " is-selected" : "")
                    }
                    aria-pressed={draft.personality === p}
                    onClick={() =>
                      edit({
                        personality: p,
                        identityApproved: false,
                        guidelinesApproved: false,
                      })
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button className="xp-primary" onClick={() => go("assets")}>
                Choose brand assets →
              </button>
            </section>
          )}
          {step === "assets" && (
            <section className="xp-panel">
              <h2>Build a library with a point of view.</h2>
              {!kit ? (
                <>
                  <p>
                    Save the draft to attach assets securely to your account's
                    Brand Kit. Uploads are explicit and use the existing secure
                    asset workflow.
                  </p>
                  <button
                    className="xp-primary"
                    onClick={() => void persist(false, "assets")}
                  >
                    Save Brand Kit & add assets
                  </button>
                </>
              ) : (
                <BrandAssetsSection
                  brandId={kit.id}
                  assets={kit.assets || []}
                  onManageCharacters={() =>
                    document
                      .getElementById(`brand-${kit.id}-characters`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  onKitUpdated={(updated) => {
                    setKit(updated);
                    setMessage("Asset changes saved to this Brand Kit.");
                  }}
                />
              )}
              {kit && (
                <div className="mt-6">
                  <h3>Approve source assets</h3>
                  <p>
                    Ready means uploaded. Select only sources you authorize for
                    brand creative and templates.
                  </p>
                  {(kit.assets || [])
                    .filter((a) => a.status === "ready")
                    .map((asset) => (
                      <label className="xp-check" key={asset.id}>
                        <input
                          type="checkbox"
                          checked={draft.approvedAssetIds.includes(asset.id)}
                          onChange={(e) =>
                            edit({
                              approvedAssetIds: e.target.checked
                                ? [...draft.approvedAssetIds, asset.id]
                                : draft.approvedAssetIds.filter(
                                    (id) => id !== asset.id,
                                  ),
                              identityApproved: false,
                              guidelinesApproved: false,
                            })
                          }
                        />
                        {sourceUrls[asset.id] &&
                          asset.mimeType?.startsWith("image/") !== false && (
                            <img
                              className="bp-source-thumb"
                              src={sourceUrls[asset.id]}
                              alt=""
                            />
                          )}
                        <span>
                          {asset.label || asset.fileName || "Brand asset"}
                          <small className="block">
                            Uploaded and ready
                          </small>
                        </span>
                      </label>
                    ))}
                </div>
              )}

              {kit && (
                <section
                  className="bp-character-section"
                  id={`brand-${kit.id}-characters`}
                >
                  <div>
                    <BrandCharactersSection
                      kit={kit}
                      onDraftStateChange={(dirty, busy) => {
                        characterEditor.current = { dirty, busy };
                      }}
                      disabled={JSON.stringify(draft) !== saved.current}
                      onKitUpdated={(updated) => {
                        setKit(updated);
                        setDraft(draftFromKit(updated));
                        saved.current = JSON.stringify(draftFromKit(updated));
                      }}
                    />
                  </div>
                </section>
              )}
              <div className="xp-actions">
                <button className="xp-primary" onClick={() => go("identity")}>
                  Review identity →
                </button>
              </div>
            </section>
          )}
          {step === "identity" && (
            <>
              <div className="bp-identity-layout">
                <section className="xp-panel bp-identity-visual">
                  <header className="bp-identity-section-heading">
                    <span className="xp-kicker">VISUAL IDENTITY</span>
                    <h2>Make every detail yours.</h2>
                    <p>
                      Set your palette and typography, then define how your
                      brand speaks below.
                    </p>
                  </header>
                  <button
                    className="xp-secondary"
                    disabled={!isBrandAnalysisEnabled()}
                    onClick={() => setAnalysisOpen((value) => !value)}
                    aria-expanded={analysisOpen}
                    title="Requires a saved draft, an available provider and explicit cost approval."
                  >
                    Analyze brand identity
                  </button>
                  {analysisOpen && (
                    <BrandAnalysisPanel
                      kit={kit}
                      disabled={JSON.stringify(draft) !== saved.current}
                      onApply={(proposal, selected) => {
                        const next = applyBrandAnalysisProposal(
                          draft,
                          proposal,
                          selected,
                        );
                        setDraft(next);
                      }}
                    />
                  )}
                  <p>
                    Review your identity before approving it. AI suggestions
                    remain unverified and require explicit review; no simulated
                    analysis is substituted.
                  </p>
                  <section
                    className="bp-identity-control-section"
                    aria-label="Brand color palette"
                  >
                    <h3>Color palette</h3>
                    <p>
                      Choose a color for each brand role. Your saved colors
                      remain the starting point.
                    </p>
                    <div className="bp-identity-color-grid">
                      {draft.colors.map((color, i) => (
                        <label
                          className="xp-field bp-identity-color"
                          key={color.role || i}
                        >
                          {color.role} color
                          <input
                            type="color"
                            value={color.hex}
                            onChange={(event) =>
                              edit({
                                colors: draft.colors.map((c, n) =>
                                  n === i
                                    ? { ...c, hex: event.target.value }
                                    : c,
                                ),
                                identityApproved: false,
                                guidelinesApproved: false,
                              })
                            }
                          />
                          <code>{color.hex.toUpperCase()}</code>
                        </label>
                      ))}
                    </div>
                  </section>
                  <section
                    className="bp-identity-control-section"
                    aria-label="Brand typography"
                  >
                    <h3>Typography</h3>
                    {Object.values(previewFonts).some(
                      (f) => f.status === "unavailable",
                    ) && (
                      <button
                        type="button"
                        className="xp-secondary"
                        onClick={() => setFontAttempt((value) => value + 1)}
                      >
                        Reload local font previews
                      </button>
                    )}
                    <p>
                      Give headlines, body copy and calls to action a consistent
                      hierarchy.
                    </p>
                    <div className="bp-identity-type-grid">
                      {draft.typography.map((entry, i) => (
                        <label
                          className="xp-field bp-identity-type"
                          key={entry.role || i}
                        >
                          {entry.role} typography
                          <select
                            aria-label={entry.role + " typography"}
                            value={entry.family}
                            onChange={(e) =>
                              edit({
                                typography: draft.typography.map((t, n) =>
                                  n === i
                                    ? {
                                        ...t,
                                        family: e.target.value,
                                        assetId: null,
                                      }
                                    : t,
                                ),
                                identityApproved: false,
                                guidelinesApproved: false,
                              })
                            }
                          >
                            {!BRAND_FONT_CATALOG.some(
                              (f) => f.family === entry.family,
                            ) && <option>{entry.family}</option>}
                            {BRAND_FONT_CATALOG.map((font) => (
                              <option key={font.id} value={font.family}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                          <span
                            className="bp-identity-type-sample"
                            style={{
                              fontFamily:
                                previewFonts[brandFontKey(entry)]?.status ===
                                "loaded"
                                  ? `"${previewFonts[brandFontKey(entry)].family}",sans-serif`
                                  : "sans-serif",
                              fontWeight:
                                previewFonts[brandFontKey(entry)]?.weight,
                              fontSynthesis: "none",
                            }}
                          >
                            Aa{" "}
                            <small>
                              {entry.family}
                              <br />
                              {previewFonts[brandFontKey(entry)]?.note ||
                                "Loading font..."}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                </section>
                <div className="bp-identity-preview">{preview}</div>
              </div>
              <section className="xp-panel bp-identity-voice">
                <BrandVoiceSection
                  value={voiceDraftFromKit(guidedPayload(draft, kit).voice)}
                  onChange={(next) =>
                    edit({
                      voiceExtras: {
                        ...draft.voiceExtras,
                        ...voicePatchFromDraft(next),
                      },
                      personality: next.personality,
                      tone: next.tone,
                      audience: next.targetAudience,
                      identityApproved: false,
                      guidelinesApproved: false,
                    })
                  }
                />
              </section>
              <section className="xp-panel bp-identity-review">
                <div>
                  <span className="xp-kicker">YOUR REVIEW</span>
                  <h2>Approve the complete identity.</h2>
                  <p>
                    Check your palette, typography and brand voice. Editing
                    these details clears the related review approvals; saving
                    never approves them automatically.
                  </p>
                </div>
                <div className="bp-identity-review-actions">
                  <label className="xp-check">
                    <input
                      type="checkbox"
                      checked={draft.identityApproved}
                      onChange={(e) =>
                        edit({ identityApproved: e.target.checked })
                      }
                    />{" "}
                    I approve these identity choices
                  </label>
                  <button
                    className="xp-primary"
                    onClick={() => go("guidelines")}
                  >
                    Review guidelines →
                  </button>
                </div>
              </section>
            </>
          )}
          {step === "guidelines" && (
            <>
              <div className="bp-guidelines-layout">
                <section className="xp-panel bp-guidelines-editor">
                  <CreativeGuidelinesSection
                    categoryLabel={[
                      BRAND_TAXONOMY.find((c) => c.id === draft.categoryId)
                        ?.label,
                      BRAND_TAXONOMY.find(
                        (c) => c.id === draft.categoryId,
                      )?.niches.find((n) => n.id === draft.nicheId)?.label,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                    value={guidelinesDraftFromKit(
                      guidedPayload(draft, kit).voice.creative,
                      draft.guidelines,
                    )}
                    onChange={(next) =>
                      edit({
                        voiceExtras: {
                          ...draft.voiceExtras,
                          creative: creativeFromDraft(next),
                        },
                        guidelines: next.freeformGuidelines,
                        guidelinesApproved: false,
                      })
                    }
                  />
                </section>
                <aside
                  className="bp-draft-preview"
                  aria-label="Live Brand Kit draft"
                >
                  <header>
                    <span className="xp-kicker">LIVE CAMPAIGN IDENTITY</span>
                    <h2>Brand Kit draft</h2>
                    <p>
                      Your creative guidelines appear first, followed by the
                      complete brand identity. Edits on the left update this
                      preview without saving or generating an advertisement.
                    </p>
                  </header>
                  <div
                    className="bp-draft-preview-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Scrollable campaign Brand Kit brochure"
                  >
                    <BrandKitBrochure
                      kit={current}
                      dirty={JSON.stringify(draft) !== saved.current}
                      summary
                      focusGuidelines
                    />
                  </div>
                </aside>
              </div>
              <section className="xp-panel bp-guidelines-review">
                <h2>Review and save your campaign playbook.</h2>
                <label className="xp-check">
                  <input
                    type="checkbox"
                    checked={draft.guidelinesApproved}
                    onChange={(e) =>
                      edit({ guidelinesApproved: e.target.checked })
                    }
                  />{" "}
                  I approve the identity summary and usage rules
                </label>
                <div className="xp-actions">
                  <button
                    className="xp-secondary"
                    onClick={() => go("identity")}
                  >
                    Edit identity
                  </button>
                  <button
                    className="xp-primary"
                    onClick={() => void persist(true, "ready")}
                  >
                    <Check size={15} /> Complete Brand Kit
                  </button>
                </div>
              </section>
            </>
          )}
          {step === "ready" && (
            <div className="bp-ready-layout">
              <section className="xp-panel">
                <h2>{kit?.name || draft.name}</h2>
                <p>
                  {BRAND_TAXONOMY.find((c) => c.id === draft.categoryId)?.label}{" "}
                  /{" "}
                  {
                    BRAND_TAXONOMY.find(
                      (c) => c.id === draft.categoryId,
                    )?.niches.find((n) => n.id === draft.nicheId)?.label
                  }
                </p>
                {!kit ||
                !kit.voice?.studio?.identityApproved ||
                !kit.voice.studio.guidelinesApproved ? (
                  <p className="xp-notice">
                    Complete and save the reviewed identity before using it
                    downstream.
                  </p>
                ) : (
                  <p className="xp-notice">
                    Reviewed identity saved in your existing Brand Kit. No AI
                    generation has run.
                  </p>
                )}
                <div className="xp-actions">
                  <button className="xp-secondary" onClick={() => go("brand")}>
                    Edit Brand Kit
                  </button>
                  <button className="xp-secondary" onClick={() => go("assets")}>
                    Manage assets
                  </button>
                  {kit && (
                    <Link
                      className="xp-primary"
                      to={"/brands/" + kit.id + "/templates"}
                    >
                      Review / prepare Brand Templates →
                    </Link>
                  )}

                  <Link className="xp-primary" to="/create/ad">
                    Open Ad Studio →
                  </Link>
                </div>
                <details className="bp-version-history">
                  <summary>Version history ({versions.length})</summary>
                  {versionsLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : versionsError ? (
                    <div role="alert">
                      <p>{versionsError}</p>
                      <button
                        className="xp-secondary"
                        onClick={() => kit && void loadVersions(kit.id)}
                      >
                        Retry history
                      </button>
                    </div>
                  ) : !versions.length ? (
                    <EmptyState
                      title="No version history available"
                      description="Save the Brand Kit to create a version snapshot."
                    />
                  ) : (
                    <ol className="bp-versions">
                      {versions.map((v) => (
                        <li key={v.id}>
                          <strong>Version {v.version}</strong>
                          <span>{v.changeSummary || "Brand Kit update"}</span>
                          <time>{new Date(v.createdAt).toLocaleString()}</time>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              </section>
              {kit && (
                <section className="xp-panel bp-template-launch">
                  <div>
                    <span className="xp-kicker">
                      NEXT / BRAND TEMPLATE STUDIO
                    </span>
                    <h2>A template collection made from your identity.</h2>
                    <p>
                      Choose a format and prepare editable layouts using this
                      Brand Kit's reviewed colors, typography and permitted
                      assets. Review and save candidates before using them in
                      campaigns.
                    </p>
                    <small>
                      Native layouts preserve your source assets. This action
                      does not start paid AI image generation.
                    </small>
                    {!isBrandTemplatesEnabled() && (
                      <p role="status" className="xp-notice">
                        Template generation controls are disabled in this local
                        frontend. The Template Studio will explain the
                        activation requirement.
                      </p>
                    )}
                  </div>
                  <Link
                    className="xp-primary"
                    to={`/brands/${encodeURIComponent(kit.id)}/templates`}
                    onClick={(e) => {
                      if (JSON.stringify(draft) !== saved.current) {
                        e.preventDefault();
                        setError(
                          "Save your Brand Kit changes before opening Template Studio.",
                        );
                      }
                    }}
                  >
                    <Plus size={16} aria-hidden />
                    Create Brand Templates
                  </Link>
                </section>
              )}
              {kit && (
                <BrandKitBrochure
                  kit={kit}
                  dirty={JSON.stringify(draft) !== saved.current}
                />
              )}
            </div>
          )}
        </fieldset>
      </main>
    </div>
  );
}
