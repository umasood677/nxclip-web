import { BRAND_TAXONOMY } from './guidedBrandModel';
import {productPhotoName} from '../components/productPhotoModel';
import { toast } from "sonner";
import { uploadBrandImage } from "../lib/uploadBrandImage";
import { BrandContentLibraryPicker } from "../components/BrandContentLibraryPicker";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Save, Upload, ImagePlus, Loader2, Users } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { EmptyState } from "../../../components/common/EmptyState";
import { brandApi, putToUploadUrl } from "../../../services/apiClient";
import type {
  BrandCharacterProfile,
  BrandKitSummary,
} from "../lib/brandKitTypes";
import {
  characterProfilePatch,
  profileForModelPhoto,
  CHARACTER_SCOPES,
  characterReviewIssues,
  newBrandCharacter,
  attachCharacterReference,
  characterUnchangedAfterAssetUpdate,
} from "./brandCharacterModel";
type Props = {
  kit: BrandKitSummary;
  modelPhotoRequest?:{brandId:string;assetId:string;requestId:number}|null;
  photoCardSelection?:boolean;
  disabled?: boolean;
  onKitUpdated: (kit: BrandKitSummary) => void;
  onDraftStateChange?: (dirty: boolean, busy: boolean) => void;
};
export function BrandCharactersSection({
  kit,
  modelPhotoRequest,
  photoCardSelection=false,
  disabled = false,
  onKitUpdated,
  onDraftStateChange,
}: Props) {
  const [draft, setDraft] = useState<BrandCharacterProfile | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const setMessage = (message: string) => { if (message) toast.success(message); };
  const [discardRequested, setDiscardRequested] = useState(false);
  const [uploading, setUploading] = useState(false),
    [libraryOpen, setLibraryOpen] = useState(false);
  const [profileCategory,setProfileCategory]=useState(kit.voice?.studio?.categoryId || "");
  const [profileNiche,setProfileNiche]=useState(kit.voice?.studio?.nicheId || "");
  const editorRef=useRef<HTMLDivElement>(null);
  const activeProfileId=draft?.id;
  useEffect(()=>{if(!activeProfileId)return;editorRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"});editorRef.current?.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.focus({preventScroll:true});},[activeProfileId]);
  const inputRef = useRef<HTMLInputElement>(null),
    operation = useRef(false);
  const assetUrls = useAuthenticatedBrandAssetUrls(kit);
  const baseline = useRef(""),
    draftVersion = useRef(kit.version);
  const dirty = !!draft && JSON.stringify(draft) !== baseline.current;
  useEffect(() => {
    onDraftStateChange?.(dirty, saving || uploading);
    return () => onDraftStateChange?.(false, false);
  }, [dirty, saving, uploading, onDraftStateChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const choose = useCallback((next: BrandCharacterProfile) => {
    if (operation.current) return;
    if (dirty && !window.confirm("Discard unsaved character edits?")) return;
    setDiscardRequested(false);
    setDraft(next);
    baseline.current = kit.voice?.studio?.characters?.some(
      (p) => p.id === next.id,
    )
      ? JSON.stringify(next)
      : "";
    draftVersion.current = kit.version;
    setError("");
    setMessage("");
  },[dirty,kit.version,kit.voice?.studio?.characters]);
  const profiles = kit.voice?.studio?.characters || [],
    assets = (kit.assets || []).filter(
      (a) => a.status === "ready" && a.mimeType?.startsWith("image/"),
    );
  const edit = (patch: Partial<BrandCharacterProfile>) => {
    if (draft)
      setDraft({ ...draft, ...patch, status: patch.status || "draft" });
  };
  const permission = (patch: Partial<BrandCharacterProfile["permissions"]>) =>
    draft && edit({ permissions: { ...draft.permissions, ...patch } });
  const save = async () => {
    if (!draft || disabled || operation.current) return;
    if (!dirty) { toast.info("No changes to save."); return; }
    const issues = characterReviewIssues(draft, kit.assets || []);
    if (issues.length) {
      setError(issues.join(" "));
      return;
    }
    operation.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated: BrandKitSummary = await brandApi.updateKit(kit.id, characterProfilePatch(kit,draft,draftVersion.current,{categoryId:profileCategory,nicheId:profileNiche}));
      onKitUpdated(updated);
      baseline.current = JSON.stringify(draft);
      draftVersion.current = updated.version;
      setDraft(null);
      setMessage(
        "Profile saved.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save character. Your draft is retained.",
      );
    } finally {
      setSaving(false);
      operation.current = false;
    }
  };
  const uploadReference = async (file: File) => {
    if (!draft || disabled || operation.current)
      throw Error(
        "Finish saving the current Brand Kit edits or wait for the current operation before attaching a reference.",
      );
    if (draft.referenceAssetIds.length >= 8)
      throw Error(
        "Remove a reference before adding another; the limit is eight.",
      );
    const target = draft;
    operation.current = true;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const result = await uploadBrandImage(
        brandApi,
        putToUploadUrl,
        kit.id,
        "brand_model",
        file,
        {
          label: productPhotoName(file.name,kit.assets||[]),
          description: target.appearance.trim() || undefined,
          usageGuidance: target.consistencyRules.trim() || undefined,
        },
      );
      onKitUpdated(result.kit);
      const unchanged = characterUnchangedAfterAssetUpdate(
        kit,
        result.kit,
        target.id,
      );
      if (unchanged) draftVersion.current = result.kit.version;
      const asset = result.kit.assets?.find((a) => a.id === result.assetId);
      if (asset?.status !== "ready") {
        setMessage(
          "Image attached to this Brand Kit and still processing. Select it after it becomes ready. Your profile draft is retained.",
        );
        return;
      }
      setDraft(attachCharacterReference(target, result.kit, result.assetId));
      if (!unchanged)
        setError(
          "The saved profile changed while the image was attached. Your draft is retained; review the latest profile before saving. The image remains in shared Brand Kit assets.",
        );
      else
        setMessage(
          "Reference uploaded to this Brand Kit and selected in your draft. Save the profile to keep the association; usage approval remains separate.",
        );
    } catch {
      const message =
        "The reference could not be attached. Your profile draft is retained. Check shared Brand Kit assets before retrying; no automatic retry was made.";
      setError(message);
      throw Error(message);
    } finally {
      operation.current = false;
      setUploading(false);
    }
  };
  const handledPhotoRequest=useRef("");
  useEffect(()=>{if(!modelPhotoRequest||modelPhotoRequest.brandId!==kit.id||disabled||saving||uploading||operation.current)return;const key=kit.id+":"+modelPhotoRequest.requestId;if(handledPhotoRequest.current===key)return;handledPhotoRequest.current=key;try{choose(profileForModelPhoto(kit,modelPhotoRequest.assetId));}catch(e){setError(e instanceof Error?e.message:"This model image is unavailable.");}},[modelPhotoRequest,kit,disabled,saving,uploading,choose]);
  const unlinkedModels = assets.filter(
    (a) =>
      a.role === "brand_model" &&
      !profiles.some((p) => p.referenceAssetIds.includes(a.id)),
  );
  return (
    <section className={"space-y-5 bp-characters"+(draft?" bp-characters--editing":"")}>
      <header>
        <h2 className="text-xl font-semibold">
          <Users size={16}/> {draft?(draft.kind==="human-model"?"Model profile":"Character profile"):"Models & Mascots ("+profiles.length+")"}
        </h2>
      </header>
      {disabled && (
        <p role="status" className="text-sm text-amber-200">
          Save your identity edits before changing character profiles.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <fieldset
        disabled={disabled || saving || uploading}
        className="min-w-0 space-y-5"
      >
        {!draft&&<><div className="flex flex-wrap gap-3 bp-character-actions">
          <button
            type="button"
            className="xp-primary"
            onClick={() =>
              choose({ ...newBrandCharacter(), kind: "human-model" })
            }
          >
            <Plus size={15} />
            Add model profile
          </button>
          <button
            type="button"
            className="xp-secondary"
            onClick={() => choose(newBrandCharacter())}
          >
            <Plus size={15} />
            Add mascot / character
          </button>
        </div>
        {!!profiles.length && (
          <div className="bp-character-profile-list">
            {profiles.map((p) => (
              <article
                key={p.id}
                className="bp-character-profile-card"
                aria-label={`${p.name} profile`}
              >
                <header className="bp-character-profile-heading">
                  {assetUrls[p.referenceAssetIds[0]] && (
                    <img
                      className="bp-character-avatar"
                      src={assetUrls[p.referenceAssetIds[0]]}
                      alt=""
                    />
                  )}
                  <div className="bp-character-profile-title">
                    <strong>{p.name}</strong>
                    <span>
                      {
                        {
                          "human-model": "Human model",
                          mascot: "Fictional mascot",
                          "fictional-character": "Fictional character",
                        }[p.kind]
                      }{" "}
                      · {p.referenceAssetIds.length} linked{" "}
                      {p.referenceAssetIds.length === 1
                        ? "reference"
                        : "references"}
                    </span>
                  </div>
                  <span className="bp-character-status" data-status={p.status}>
                    {
                      {
                        draft: "Draft",
                        approved: "Approved",
                        archived: "Archived",
                      }[p.status]
                    }
                  </span>
                  <button
                    type="button"
                    className="xp-secondary"
                    onClick={() => choose(structuredClone(p))}
                    aria-label={`Edit ${p.name}`}
                  >
                    Edit profile
                  </button>
                </header>
                <dl className="bp-character-characteristics">
                  {[
                    ["Appearance", p.appearance],
                    ["Visual style", p.style],
                    ["Wardrobe", p.wardrobe],
                    ["Expressions", p.expressions],
                    ["Consistency rules", p.consistencyRules],
                    [
                      "Declared uses",
                      p.permissions.scopes
                        .map(
                          (scope) =>
                            ({
                              "ad-studio": "Ad Studio",
                              "image-studio": "Image Studio",
                              "ad-animation": "Ad Animation",
                            })[scope],
                        )
                        .join(" · "),
                    ],
                  ].filter(([,value])=>value?.trim()).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd
                        className={
                          value?.trim() ? undefined : "bp-character-unspecified"
                        }
                      >
                        {value?.trim() || "Not specified"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        )}
        {!photoCardSelection && !!unlinkedModels.length && (
          <section className="bp-character-existing">
            <h3>Your uploaded model references</h3>
            <div className="bp-character-source-grid">
              {unlinkedModels.map((asset) => (
                <article key={asset.id}>
                  <strong>
                    {asset.label ||
                      asset.fileName ||
                      "Uploaded model reference"}
                  </strong>
                  <button
                    type="button"
                    className="xp-secondary"
                    onClick={() => {
                      const next = attachCharacterReference(
                        {
                          ...newBrandCharacter(),
                          kind: "human-model",
                          name: asset.label || "",
                        },
                        kit,
                        asset.id,
                      );
                      choose(next);
                    }}
                  >
                    Use uploaded model
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        {!profiles.length && !draft && (
          <EmptyState
            title="No character profiles yet"
            description="Add a model or mascot, link its photos, and confirm permitted use."
          />
        )}
        </>}
        {draft && dirty && (
          <p className="bp-character-draft-status" role="status">
            Unsaved profile changes
          </p>
        )}
        {draft && (
          <div ref={editorRef} className="bp-character-editor-shell" role="region" aria-label="Profile editor">
            {!kit.voice?.studio && <div className="bp-profile-taxonomy">
              <label>Brand category<select aria-label="Profile brand category" value={profileCategory} onChange={e=>{setProfileCategory(e.target.value);setProfileNiche("");}}><option value="">Choose category</option>{BRAND_TAXONOMY.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
              <label>Niche<select aria-label="Profile brand niche" value={profileNiche} onChange={e=>setProfileNiche(e.target.value)}><option value="">Choose niche</option>{(BRAND_TAXONOMY.find(c=>c.id===profileCategory)?.niches||[]).map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
            </div>}

            <div className="grid gap-6 xl:grid-cols-2 bp-character-editor">
              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <label className="grid gap-2 text-sm">
                  Profile name
                  <Input
                    value={draft.name}
                    maxLength={120}
                    onChange={(e) => edit({ name: e.target.value })}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Profile type
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3"
                    value={draft.kind}
                    onChange={(e) =>
                      edit({
                        kind: e.target.value as BrandCharacterProfile["kind"],
                      })
                    }
                  >
                    <option value="human-model">Real person / model</option>
                    <option value="mascot">Mascot</option>
                    <option value="fictional-character">
                      Fictional character
                    </option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">Key characteristics <span className="text-xs text-muted-foreground">Optional</span><Textarea rows={2} maxLength={1500} value={draft.appearance} onChange={e=>edit({appearance:e.target.value})} placeholder="Only details the advertisement should preserve."/></label>
                <details className="bp-character-optional"><summary>Additional creative preferences <span>Optional</span></summary><div>
                {(
                  [
                    "style",
                    "wardrobe",
                    "expressions",
                    "consistencyRules",
                  ] as const
                ).map((key) => (
                  <label className="grid gap-2 text-sm" key={key}>
                    {
                      {
                        appearance: "Appearance",
                        style: "Visual style",
                        wardrobe: "Wardrobe preferences",
                        expressions: "Expression preferences",
                        consistencyRules: "Character consistency rules",
                      }[key]
                    }
                    <Textarea
                      rows={2}
                      maxLength={
                        key === "consistencyRules"
                          ? 2000
                          : 1000
                      }
                      value={draft[key]}
                      onChange={(e) => edit({ [key]: e.target.value })}
                    />
                  </label>
                ))}
                </div></details>
              </section>
              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <h3 className="font-semibold">Reference images</h3>
                <p className="text-xs text-muted-foreground">
                  Select up to eight authorized reference images.
                </p>
                <div className="bp-character-upload-actions">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    aria-label="Upload a model or mascot reference image"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file)
                        void uploadReference(file).catch(() => undefined);
                    }}
                  />
                  <button
                    type="button"
                    className="xp-primary"
                    disabled={draft.referenceAssetIds.length >= 8}
                    onClick={() => inputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    Upload reference image
                  </button>
                  <button
                    type="button"
                    className="xp-secondary"
                    disabled={draft.referenceAssetIds.length >= 8}
                    onClick={() => setLibraryOpen(true)}
                  >
                    <ImagePlus size={15} />
                    Choose from Content Library
                  </button>
                </div>
                <p className="bp-character-selection-count">
                  {draft.referenceAssetIds.length} / 8 references selected
                </p>
                <div className="bp-character-selected">
                  {assets
                    .filter((a) => draft.referenceAssetIds.includes(a.id))
                    .map((asset) => (
                      <div key={asset.id}>
                        {assetUrls[asset.id] && (
                          <img src={assetUrls[asset.id]} alt="" />
                        )}
                        <span>
                          {asset.label || asset.fileName || "Reference image"}
                        </span>
                        <button
                          type="button"
                          className="xp-secondary"
                          aria-label={`Remove reference ${asset.label || asset.fileName || "image"}`}
                          onClick={() =>
                            edit({
                              referenceAssetIds: draft.referenceAssetIds.filter(
                                (id) => id !== asset.id,
                              ),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
                {!assets.length ? (
                  <EmptyState
                    title="Add your first reference image"
                    description="Upload an image here or choose one from your authorized Content Library. Other accounts' private assets are never listed."
                  />
                ) : (
                  <details className="bp-character-reference-picker">
                    <summary>Choose from Brand Kit Assets</summary>
                    {assets.map((asset) => (
                      <label
                        key={asset.id}
                        className="flex gap-3 text-sm bp-character-reference"
                      >
                        <input
                          type="checkbox"
                          checked={draft.referenceAssetIds.includes(asset.id)}
                          disabled={
                            !draft.referenceAssetIds.includes(asset.id) &&
                            draft.referenceAssetIds.length >= 8
                          }
                          onChange={(e) =>
                            e.target.checked
                              ? setDraft(
                                  attachCharacterReference(
                                    draft,
                                    kit,
                                    asset.id,
                                  ),
                                )
                              : edit({
                                  referenceAssetIds:
                                    draft.referenceAssetIds.filter(
                                      (id) => id !== asset.id,
                                    ),
                                })
                          }
                        />
                        <span>
                          {asset.label ||
                            asset.fileName ||
                            "Brand reference"}{" "}
                        </span>
                      </label>
                    ))}
                  </details>
                )}
                <hr className="border-white/10" />
                <h3 className="font-semibold">Usage authorization</h3>
                <label className="grid gap-2 text-sm">
                  Permission source
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3"
                    value={draft.permissions.origin}
                    onChange={(e) =>
                      permission({
                        origin: e.target
                          .value as BrandCharacterProfile["permissions"]["origin"],
                      })
                    }
                  >
                    <option value="unverified">Not established</option>
                    <option value="owner-created">
                      Original character created by owner
                    </option>
                    <option value="licensed">Licensed usage</option>
                    <option value="consented">Explicit likeness consent</option>
                  </select>
                </label>
                <label className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.permissions.commercialUse}
                    onChange={(e) =>
                      permission({ commercialUse: e.target.checked })
                    }
                  />
                  I have permission for commercial use
                </label>
                {draft.kind === "human-model" && (
                  <label className="flex gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.permissions.likenessConsent}
                      onChange={(e) =>
                        permission({ likenessConsent: e.target.checked })
                      }
                    />
                    This person has consented to use of their likeness
                  </label>
                )}
                <fieldset className="bp-character-scopes">
                  <legend>Permitted uses</legend>
                  <div>
                    {CHARACTER_SCOPES.map((scope) => (
                      <label key={scope}>
                        <input
                          type="checkbox"
                          checked={draft.permissions.scopes.includes(scope)}
                          onChange={(event) =>
                            permission({
                              scopes: event.target.checked
                                ? [...draft.permissions.scopes, scope]
                                : draft.permissions.scopes.filter(
                                    (s) => s !== scope,
                                  ),
                            })
                          }
                        />
                        {
                          {
                            "ad-studio": "Ad Studio",
                            "image-studio": "Image Studio",
                            "ad-animation": "Ad Animation",
                          }[scope]
                        }
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="grid gap-2 text-sm">
                  Permission reference
                  <Input
                    placeholder="Model release, license or permission reference"
                    value={draft.permissions.evidence}
                    maxLength={1000}
                    onChange={(e) => permission({ evidence: e.target.value })}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Permission expiry (optional, UTC)
                  <Input
                    type="date"
                    value={draft.permissions.expiresAt?.slice(0, 10) || ""}
                    onChange={(e) =>
                      permission({
                        expiresAt: e.target.value
                          ? e.target.value + "T23:59:59.000Z"
                          : undefined,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Profile status
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3"
                    value={draft.status}
                    onChange={(e) =>
                      edit({
                        status: e.target
                          .value as BrandCharacterProfile["status"],
                      })
                    }
                  >
                    <option value="draft">
                      Draft
                    </option>
                    <option value="approved">
                      Approved for selected uses
                    </option>
                    <option value="archived">
                      Archived
                    </option>
                  </select>
                </label>
              </section>
            </div>
            <footer className="bp-character-editor-footer">
              {" "}
              <div className="flex flex-wrap gap-3 bp-character-actions">
                <button
                  type="button"
                  className="xp-primary"
                  onClick={() => void save()}
                  disabled={saving}
                >
                  <Save size={15} />
                  {saving ? "Saving…" : "Save profile"}
                </button>
                <button
                  type="button"
                  className="xp-secondary"
                  onClick={() =>
                    dirty ? setDiscardRequested(true) : setDraft(null)
                  }
                >
                  {dirty ? "Cancel changes" : "Done editing"}
                </button>
              </div>
              {discardRequested && (
                <div className="bp-character-discard" role="alert">
                  <p>
                    Close without saving these profile changes? Any images you
                    uploaded remain in Brand Kit Assets; no saved profile is
                    deleted.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      className="xp-secondary"
                      onClick={() => setDiscardRequested(false)}
                    >
                      Keep editing
                    </button>
                    <button
                      type="button"
                      className="xp-secondary"
                      onClick={() => {
                        setDraft(null);
                        setDiscardRequested(false);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Discard profile draft
                    </button>
                  </div>
                </div>
              )}
            </footer>
          </div>
        )}
      </fieldset>
      {libraryOpen && draft && (
        <BrandContentLibraryPicker
          roleLabel={
            draft.kind === "human-model"
              ? "Model reference"
              : "Mascot / character reference"
          }
          onClose={() => setLibraryOpen(false)}
          onSelect={uploadReference}
        />
      )}
    </section>
  );
}
