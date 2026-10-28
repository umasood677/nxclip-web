import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { SEO } from "../../components/SEO";
import { cn } from "../../lib/utils";
import { BrandCharactersSection } from "./guided/BrandCharactersSection";
import { isGuidedBrandEnabled } from "./guided/guidedBrandModel";
import { brandApi } from "../../services/apiClient";
import { BrandAssetsSection } from "./components/BrandAssetsSection";
import {
  BrandVoiceSection,
  voiceDraftFromKit,
  voicePatchFromDraft,
  type VoiceDraft,
} from "./components/BrandVoiceSection";
import {
  CreativeGuidelinesSection,
  creativeFromDraft,
  guidelinesDraftFromKit,
  type GuidelinesDraft,
} from "./components/CreativeGuidelinesSection";
import { BrandKitLivePreview } from "./components/BrandKitLivePreview";
import {
  BRAND_FONT_CATALOG,
  findBrandFont,
  resolveBrandFontFamily,
} from "./lib/brandFontCatalog";
import {
  contrastLabel,
  contrastRatio,
  isValidHex,
  normalizeHex,
} from "./lib/colorContrast";
import {
  COLOR_ROLES,
  DEFAULT_COLORS,
  EDITOR_SECTIONS,
  TYPOGRAPHY_ROLES,
  type BrandKitSummary,
  type BrandVoiceFields,
  type EditorSection,
  type PreviewMode,
} from "./lib/brandKitTypes";

type IdentityDraft = {
  name: string;
  description: string;
  industry: string;
  website: string;
  signatureProduct: string;
};

type ColorDraft = Record<string, { hex: string; name: string }>;
type TypeDraft = Record<string, { family: string; weight: string }>;

function identityFromKit(kit: BrandKitSummary): IdentityDraft {
  const v = kit.voice ?? {};
  return {
    name: kit.name ?? "",
    description: kit.description ?? "",
    industry: (v.industry as string) ?? "",
    website: (v.website as string) ?? "",
    signatureProduct: (v.signatureProduct as string) ?? "",
  };
}

function colorsFromKit(kit: BrandKitSummary): ColorDraft {
  const draft: ColorDraft = {};
  for (const role of COLOR_ROLES) {
    const hit = kit.colors?.find((c) => c.role === role.role);
    draft[role.role] = {
      hex: hit?.hex ?? DEFAULT_COLORS[role.role] ?? "#0F172A",
      name: hit?.name ?? role.label,
    };
  }
  return draft;
}

function typeFromKit(kit: BrandKitSummary): TypeDraft {
  const draft: TypeDraft = {};
  for (const role of TYPOGRAPHY_ROLES) {
    const hit = kit.typography?.find((t) => t.role === role.role);
    draft[role.role] = {
      family: hit?.family ?? (role.role === "body" ? "Inter" : "Montserrat"),
      weight: hit?.weight ?? role.weight,
    };
  }
  return draft;
}

function draftsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function BrandKitEditor() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const [section, setSection] = useState<EditorSection>("identity");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<BrandKitSummary | null>(null);

  const [identity, setIdentity] = useState<IdentityDraft | null>(null);
  const [savedIdentity, setSavedIdentity] = useState<IdentityDraft | null>(null);
  const [colors, setColors] = useState<ColorDraft | null>(null);
  const [savedColors, setSavedColors] = useState<ColorDraft | null>(null);
  const [typography, setTypography] = useState<TypeDraft | null>(null);
  const [savedTypography, setSavedTypography] = useState<TypeDraft | null>(null);
  const [voice, setVoice] = useState<VoiceDraft | null>(null);
  const [savedVoice, setSavedVoice] = useState<VoiceDraft | null>(null);
  const [guidelines, setGuidelines] = useState<GuidelinesDraft | null>(null);
  const [savedGuidelines, setSavedGuidelines] = useState<GuidelinesDraft | null>(
    null,
  );

  const applyKit = useCallback((data: BrandKitSummary) => {
    setKit(data);
    const id = identityFromKit(data);
    const col = colorsFromKit(data);
    const typ = typeFromKit(data);
    const v = voiceDraftFromKit(data.voice);
    const g = guidelinesDraftFromKit(data.voice?.creative, data.guidelines);
    setIdentity(id);
    setSavedIdentity(id);
    setColors(col);
    setSavedColors(col);
    setTypography(typ);
    setSavedTypography(typ);
    setVoice(v);
    setSavedVoice(v);
    setGuidelines(g);
    setSavedGuidelines(g);
  }, []);

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await brandApi.getKit(brandId)) as BrandKitSummary;
      applyKit(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Brand Kit");
      setKit(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, applyKit]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (
      !identity ||
      !savedIdentity ||
      !colors ||
      !savedColors ||
      !typography ||
      !savedTypography ||
      !voice ||
      !savedVoice ||
      !guidelines ||
      !savedGuidelines
    ) {
      return false;
    }
    return (
      !draftsEqual(identity, savedIdentity) ||
      !draftsEqual(colors, savedColors) ||
      !draftsEqual(typography, savedTypography) ||
      !draftsEqual(voice, savedVoice) ||
      !draftsEqual(guidelines, savedGuidelines)
    );
  }, [
    identity,
    savedIdentity,
    colors,
    savedColors,
    typography,
    savedTypography,
    voice,
    savedVoice,
    guidelines,
    savedGuidelines,
  ]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const previewKit = useMemo((): BrandKitSummary | null => {
    if (!kit || !identity || !colors || !typography || !voice || !guidelines) {
      return null;
    }
    const voicePatch = voicePatchFromDraft(voice);
    return {
      ...kit,
      name: identity.name,
      description: identity.description,
      guidelines: guidelines.freeformGuidelines,
      voice: {
        ...(kit.voice ?? {}),
        ...voicePatch,
        industry: identity.industry || undefined,
        website: identity.website || undefined,
        signatureProduct: identity.signatureProduct || undefined,
        creative: creativeFromDraft(guidelines),
      },
      colors: Object.entries(colors).map(([role, v], i) => ({
        role,
        hex: normalizeHex(v.hex),
        name: v.name,
        sortOrder: i,
      })),
      typography: Object.entries(typography).map(([role, v], i) => ({
        role,
        family: v.family,
        weight: v.weight,
        sortOrder: i,
      })),
    };
  }, [kit, identity, colors, typography, voice, guidelines]);

  const save = async () => {
    if (
      !brandId ||
      !identity ||
      !colors ||
      !typography ||
      !voice ||
      !guidelines ||
      !kit
    ) {
      return;
    }
    const trimmedName = identity.name.trim();
    if (!trimmedName) {
      toast.error("Brand name is required");
      setSection("identity");
      return;
    }
    for (const role of COLOR_ROLES) {
      if (role.required && !isValidHex(colors[role.role]?.hex ?? "")) {
        toast.error(`${role.label} color must be a valid hex`);
        setSection("colors");
        return;
      }
    }

    setSaving(true);
    try {
      const voicePatch = voicePatchFromDraft(voice);
      const nextVoice: BrandVoiceFields = {
        ...voicePatch,
        industry: identity.industry.trim() || undefined,
        website: identity.website.trim() || undefined,
        signatureProduct: identity.signatureProduct.trim() || undefined,
        creative: creativeFromDraft(guidelines),
      };

      let updated = (await brandApi.updateKit(brandId, {
        name: trimmedName,
        description: identity.description.trim() || null,
        guidelines: guidelines.freeformGuidelines.trim() || null,
        voice: nextVoice,
      })) as BrandKitSummary;

      const colorPayload = Object.entries(colors)
        .filter(([, v]) => isValidHex(v.hex))
        .map(([role, v], i) => ({
          role,
          hex: normalizeHex(v.hex),
          name: v.name || undefined,
          sortOrder: i,
        }));
      updated = (await brandApi.replaceColors(brandId, colorPayload)) as BrandKitSummary;

      const typePayload = Object.entries(typography).map(([role, v], i) => ({
        role,
        family: v.family,
        weight: v.weight || undefined,
        sortOrder: i,
      }));
      updated = (await brandApi.replaceTypography(
        brandId,
        typePayload,
      )) as BrandKitSummary;

      applyKit(updated);
      toast.success("Brand Kit saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={18} /> Loading editor…
      </div>
    );
  }

  if (
    error ||
    !kit ||
    !identity ||
    !colors ||
    !typography ||
    !voice ||
    !guidelines
  ) {
    return (
      <div className="space-y-4 pb-10">
        <Button type="button" variant="ghost" asChild>
          <Link to="/brands">
            <ArrowLeft size={16} className="mr-1" /> Back
          </Link>
        </Button>
        <div className="rounded-2xl border border-border glass p-8 text-center space-y-3">
          <p className="text-sm text-destructive">{error || "Brand Kit not found"}</p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const textHex = normalizeHex(colors.text?.hex || colors.primary.hex);
  const bgHex = normalizeHex(colors.background?.hex || "#FFFFFF");
  const contrast =
    isValidHex(textHex) && isValidHex(bgHex) ? contrastRatio(textHex, bgHex) : 0;
  const contrastMeta = contrastLabel(contrast);

  return (
    <div className="space-y-4 pb-10 max-w-[100vw] overflow-x-hidden">
      {isGuidedBrandEnabled()&&<Link className="inline-flex rounded-md border border-amber-200/30 px-3 py-2 text-sm text-amber-100" to={"/brands/"+brandId+"/guided"}>Open guided Brand Kit</Link>}
      <SEO title={`${identity.name || "Brand Kit"} | Brand Kit Studio`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/brands">
              <ArrowLeft size={16} className="mr-1" /> Kits
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold">
              {identity.name || "Untitled"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {dirty ? (
                <Badge variant="outline">Unsaved changes</Badge>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check size={12} /> Saved
                </span>
              )}
              {kit.version != null ? <span>v{kit.version}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/create/ad")}>
            Open Ad Studio
          </Button>
          <Button type="button" disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? (
              <Loader2 className="mr-1 animate-spin" size={16} />
            ) : (
              <Save size={16} className="mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
        <nav className="rounded-2xl border border-border glass p-2 h-fit lg:sticky lg:top-4">
          {EDITOR_SECTIONS.filter(s=>s.id!=="characters"||isGuidedBrandEnabled()).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                section === s.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border border-border glass p-5 md:p-6 space-y-5 min-w-0">
          {section === "identity" ? (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Identity</h2>
                <p className="text-sm text-muted-foreground">
                  Only the name is required. Voice and guidelines live on their own
                  tabs.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="bk-name">Name *</Label>
                  <Input
                    id="bk-name"
                    value={identity.name}
                    onChange={(e) =>
                      setIdentity({ ...identity, name: e.target.value })
                    }
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="bk-industry">Industry</Label>
                  <Input
                    id="bk-industry"
                    value={identity.industry}
                    onChange={(e) =>
                      setIdentity({ ...identity, industry: e.target.value })
                    }
                    placeholder="Luxury Cosmetics"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="bk-website">Website</Label>
                  <Input
                    id="bk-website"
                    value={identity.website}
                    onChange={(e) =>
                      setIdentity({ ...identity, website: e.target.value })
                    }
                    placeholder="https://"
                    maxLength={2048}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="bk-desc">Description</Label>
                  <Textarea
                    id="bk-desc"
                    value={identity.description}
                    onChange={(e) =>
                      setIdentity({ ...identity, description: e.target.value })
                    }
                    rows={3}
                    maxLength={2000}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="bk-product">Signature product</Label>
                  <Input
                    id="bk-product"
                    value={identity.signatureProduct}
                    onChange={(e) =>
                      setIdentity({
                        ...identity,
                        signatureProduct: e.target.value,
                      })
                    }
                    placeholder="Signature Red Matte Lipstick"
                    maxLength={200}
                  />
                </div>
              </div>
            </>
          ) : null}

          {section === "colors" ? (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Colors</h2>
                <p className="text-sm text-muted-foreground">
                  Primary is required. Contrast is checked against background/text.
                </p>
              </div>
              <div className="space-y-4">
                {COLOR_ROLES.map((role) => {
                  const entry = colors[role.role];
                  const hex = normalizeHex(entry?.hex ?? "");
                  return (
                    <div
                      key={role.role}
                      className="grid gap-3 sm:grid-cols-[120px_1fr_auto] items-end"
                    >
                      <div>
                        <Label>
                          {role.label}
                          {role.required ? " *" : ""}
                        </Label>
                        <Input
                          value={entry?.name ?? role.label}
                          onChange={(e) =>
                            setColors({
                              ...colors,
                              [role.role]: {
                                ...entry,
                                hex: entry?.hex ?? DEFAULT_COLORS[role.role],
                                name: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="h-9 w-12 p-1 cursor-pointer"
                          value={isValidHex(hex) ? hex : DEFAULT_COLORS[role.role]}
                          onChange={(e) =>
                            setColors({
                              ...colors,
                              [role.role]: {
                                name: entry?.name ?? role.label,
                                hex: e.target.value,
                              },
                            })
                          }
                        />
                        <Input
                          value={entry?.hex ?? ""}
                          onChange={(e) =>
                            setColors({
                              ...colors,
                              [role.role]: {
                                name: entry?.name ?? role.label,
                                hex: e.target.value,
                              },
                            })
                          }
                          placeholder="#0F172A"
                        />
                      </div>
                      <span
                        className="h-9 w-9 rounded-md border border-border"
                        style={{
                          backgroundColor: isValidHex(hex) ? hex : "transparent",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3 text-sm flex flex-wrap items-center gap-3">
                <span className="text-muted-foreground">Text on background:</span>
                <Badge variant={contrastMeta.ok ? "secondary" : "destructive"}>
                  {contrast.toFixed(1)}:1 · {contrastMeta.label}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => savedColors && setColors(savedColors)}
                disabled={!savedColors || draftsEqual(colors, savedColors)}
              >
                Reset colors
              </Button>
            </>
          ) : null}

          {section === "typography" ? (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Typography</h2>
                <p className="text-sm text-muted-foreground">
                  Uses the NxClip font catalog. Non-exportable fonts show a warning.
                </p>
              </div>
              <div className="space-y-5">
                {TYPOGRAPHY_ROLES.map((role) => {
                  const entry = typography[role.role];
                  const meta = findBrandFont(entry?.family);
                  return (
                    <div key={role.role} className="space-y-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>{role.label} font</Label>
                          <select
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={entry?.family ?? ""}
                            onChange={(e) =>
                              setTypography({
                                ...typography,
                                [role.role]: {
                                  family: e.target.value,
                                  weight: entry?.weight ?? role.weight,
                                },
                              })
                            }
                          >
                            {BRAND_FONT_CATALOG.map((f) => (
                              <option key={f.id} value={f.family}>
                                {f.label}
                                {!f.exportFaithful ? " (preview only)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Weight</Label>
                          <select
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={entry?.weight ?? role.weight}
                            onChange={(e) =>
                              setTypography({
                                ...typography,
                                [role.role]: {
                                  family: entry?.family ?? "Montserrat",
                                  weight: e.target.value,
                                },
                              })
                            }
                          >
                            {["300", "400", "500", "600", "700", "800"].map((w) => (
                              <option key={w} value={w}>
                                {w}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p
                        className="rounded-lg border border-border bg-background/50 px-3 py-2 text-lg"
                        style={{
                          fontFamily: resolveBrandFontFamily(entry?.family),
                          fontWeight: Number(entry?.weight) || 400,
                        }}
                      >
                        {role.role === "heading"
                          ? identity.name || "Headline sample"
                          : role.role === "cta"
                            ? voice.preferredCta || "Shop now"
                            : "The quick brown fox jumps over the lazy dog."}
                      </p>
                      {meta && !meta.exportFaithful ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {meta.note ||
                            "This font may not export faithfully in rendered ads."}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {section === "assets" && brandId ? (
            <BrandAssetsSection
              brandId={brandId}
              assets={kit.assets ?? []}
              onKitUpdated={(next) => {
                setKit(next);
              }}
            />
          ) : null}

          {section === "characters" && isGuidedBrandEnabled() ? <BrandCharactersSection kit={kit} disabled={dirty} onKitUpdated={applyKit}/> : null}

          {section === "voice" ? (
            <BrandVoiceSection value={voice} onChange={setVoice} />
          ) : null}

          {section === "guidelines" ? (
            <CreativeGuidelinesSection
              value={guidelines}
              onChange={setGuidelines}
            />
          ) : null}

          {section === "review" ? (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Review</h2>
                <p className="text-sm text-muted-foreground">
                  Confirm identity, assets, voice, and guidelines before Ad Studio use.
                </p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{identity.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="font-medium">{identity.industry || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tagline</dt>
                  <dd className="font-medium">{voice.tagline || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Preferred CTA</dt>
                  <dd className="font-medium">{voice.preferredCta || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ready assets</dt>
                  <dd className="font-medium">
                    {(kit.assets ?? []).filter((a) => a.status === "ready").length}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Visual style</dt>
                  <dd className="font-medium line-clamp-2">
                    {guidelines.visualStyle || "—"}
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                disabled={saving || !dirty}
                onClick={() => void save()}
              >
                {saving ? <Loader2 className="mr-1 animate-spin" size={16} /> : null}
                Save Brand Kit
              </Button>
            </>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-4 h-fit">
          {previewKit ? (
            <div className="rounded-2xl border border-border glass p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Live preview
              </p>
              <BrandKitLivePreview
                kit={previewKit}
                mode={previewMode}
                onModeChange={setPreviewMode}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
