import { uploadBrandImage } from "../lib/uploadBrandImage";
import { BrandContentLibraryPicker } from "./BrandContentLibraryPicker";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import React, { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { brandApi, putToUploadUrl } from "../../../services/apiClient";
import { ASSET_SLOTS } from "../lib/assetSlots";
import type { BrandAssetEntry, BrandKitSummary } from "../lib/brandKitTypes";

type Props = {
  brandId: string;
  assets: BrandAssetEntry[];
  onKitUpdated: (kit: BrandKitSummary) => void;
  onManageCharacters?: () => void;
};

function slotAsset(assets: BrandAssetEntry[], role: string) {
  return assets.find((a) => a.role === role && a.status === "ready") ?? null;
}

export function BrandAssetsSection({
  brandId,
  assets,
  onKitUpdated,
  onManageCharacters,
}: Props) {
  const kit = useMemo(
    () => ({ id: brandId, name: "", assets }),
    [brandId, assets],
  );
  const assetUrls = useAuthenticatedBrandAssetUrls(kit);
  const [selectedByRole, setSelectedByRole] = useState<Record<string, string>>(
    {},
  );
  const [libraryRole, setLibraryRole] = useState<string | null>(null);
  const chosen = (role: string) =>
    assets.find(
      (a) =>
        a.id === selectedByRole[role] &&
        a.role === role &&
        a.status === "ready",
    ) || slotAsset(assets, role);
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { label: string; description: string; usageGuidance: string }
    >
  >({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const draftFor = (role: string, asset: BrandAssetEntry | null) => {
    if (drafts[role]) return drafts[role];
    const slot = ASSET_SLOTS.find((s) => s.role === role);
    return {
      label: asset?.label ?? slot?.exampleLabel ?? slot?.label ?? "",
      description: asset?.description ?? "",
      usageGuidance: asset?.usageGuidance ?? slot?.exampleGuidance ?? "",
    };
  };

  const setDraft = (
    role: string,
    patch: Partial<{
      label: string;
      description: string;
      usageGuidance: string;
    }>,
  ) => {
    const current = draftFor(role, chosen(role));
    setDrafts((prev) => ({ ...prev, [role]: { ...current, ...patch } }));
  };

  const upload = async (role: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file (PNG, JPEG, WebP, or SVG)");
      return;
    }
    const draft = draftFor(role, chosen(role));
    setBusyRole(role);
    try {
      const { kit, assetId } = await uploadBrandImage(
        brandApi,
        putToUploadUrl,
        brandId,
        role,
        file,
        {
          label: draft.label.trim() || undefined,
          description: draft.description.trim() || undefined,
          usageGuidance: draft.usageGuidance.trim() || undefined,
        },
      );
      onKitUpdated(kit);
      toast.success("Asset uploaded");
      setSelectedByRole((prev) => ({ ...prev, [role]: assetId }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      throw e;
    } finally {
      setBusyRole(null);
    }
  };

  const saveMeta = async (role: string) => {
    const asset = chosen(role);
    if (!asset) {
      toast.message("Upload an image first, then save guidance");
      return;
    }
    const draft = draftFor(role, asset);
    setBusyRole(role);
    try {
      const kit = (await brandApi.updateAsset(brandId, asset.id, {
        label: draft.label.trim() || null,
        description: draft.description.trim() || null,
        usageGuidance: draft.usageGuidance.trim() || null,
      })) as BrandKitSummary;
      onKitUpdated(kit);
      toast.success("Asset details saved");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to save asset details",
      );
    } finally {
      setBusyRole(null);
    }
  };

  const remove = async (role: string) => {
    const asset = chosen(role);
    if (!asset) return;
    if (!window.confirm("Remove this asset from the Brand Kit?")) return;
    setBusyRole(role);
    try {
      const kit = (await brandApi.deleteAsset(
        brandId,
        asset.id,
      )) as BrandKitSummary;
      onKitUpdated(kit);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
      toast.success("Asset removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove asset");
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div className="space-y-5" id={`brand-${brandId}-assets`}>
      <div>
        <h2 className="font-display text-lg font-semibold">Logos & Assets</h2>
        <p className="text-sm text-muted-foreground">
          Upload logos, product photos, and brand-model imagery. Usage guidance
          is editorial instruction — not an AI identity guarantee. Files stay in
          secure storage (not Brand Kit JSON).
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        {assets.length} attached assets. Selecting a candidate changes only this
        preview, not its role or approval.
      </p>
      <div className="space-y-4">
        {ASSET_SLOTS.map((slot) => {
          const asset = chosen(slot.role);
          const draft = draftFor(slot.role, asset);
          const busy = busyRole === slot.role;
          return (
            <div
              key={slot.role}
              className="rounded-xl border border-border bg-background/40 p-4 space-y-3"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void upload(slot.role, file).catch(() => undefined);
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{slot.label}</h3>
                  <p className="text-xs text-muted-foreground">{slot.hint}</p>
                </div>
              </div>

              {slot.role === "brand_model" && (
                <div className="bp-character-link-note">
                  <p>Use this image in a model profile below.</p>
                  {onManageCharacters && (
                    <button
                      type="button"
                      className="xp-secondary"
                      disabled={busy}
                      onClick={onManageCharacters}
                    >
                      Set up model / mascot profile
                    </button>
                  )}
                </div>
              )}
              {assets.filter(
                (a) => a.role === slot.role && a.status === "ready",
              ).length > 1 && (
                <label className="block text-xs">
                  Uploaded candidates
                  <select
                    aria-label={`${slot.label} candidate`}
                    className="block w-full mt-1 rounded-md border bg-background p-2"
                    value={asset?.id || ""}
                    onChange={(e) => {
                      setSelectedByRole((prev) => ({
                        ...prev,
                        [slot.role]: e.target.value,
                      }));
                      setDrafts((prev) => {
                        const next = { ...prev };
                        delete next[slot.role];
                        return next;
                      });
                    }}
                  >
                    {assets
                      .filter(
                        (a) => a.role === slot.role && a.status === "ready",
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label || a.fileName || a.id}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
                  {asset && assetUrls[asset.id] ? (
                    <img
                      src={assetUrls[asset.id]}
                      alt={draft.label || slot.label}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center px-2 text-muted-foreground">
                      <ImagePlus
                        className="mx-auto mb-1 opacity-60"
                        size={22}
                      />
                      <p className="text-[11px]">Drop image or upload</p>
                    </div>
                  )}
                  {busy ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="animate-spin" size={18} />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 min-w-0">
                  <div>
                    <Label htmlFor={`${brandId}-${slot.role}-label`}>
                      {" "}
                      Display name
                    </Label>
                    <Input
                      id={`${brandId}-${slot.role}-label`}
                      value={draft.label}
                      onChange={(e) =>
                        setDraft(slot.role, { label: e.target.value })
                      }
                      placeholder={slot.exampleLabel || slot.label}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${brandId}-${slot.role}-description`}>
                      {" "}
                      Description
                    </Label>
                    <Input
                      id={`${brandId}-${slot.role}-description`}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft(slot.role, { description: e.target.value })
                      }
                      placeholder="Optional short description"
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${brandId}-${slot.role}-usageGuidance`}>
                      {" "}
                      Usage guidance
                    </Label>
                    <Textarea
                      id={`${brandId}-${slot.role}-usageGuidance`}
                      value={draft.usageGuidance}
                      onChange={(e) =>
                        setDraft(slot.role, { usageGuidance: e.target.value })
                      }
                      rows={2}
                      placeholder={
                        slot.exampleGuidance || "How this asset should be used"
                      }
                      disabled={busy}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={(el) => {
                        inputRefs.current[slot.role] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file)
                          void upload(slot.role, file).catch(() => undefined);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => inputRefs.current[slot.role]?.click()}
                    >
                      <Upload size={14} className="mr-1" />
                      {asset ? "Replace" : "Upload"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setLibraryRole(slot.role)}
                    >
                      <ImagePlus size={14} className="mr-1" />
                      Content Library
                    </Button>
                    {asset ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void saveMeta(slot.role)}
                        >
                          Save details
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void remove(slot.role)}
                        >
                          <Trash2 size={14} className="mr-1" /> Remove
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {assets.some((a) => !ASSET_SLOTS.some((s) => s.role === a.role)) && (
        <section className="rounded-xl border p-4">
          <h3 className="font-medium mb-3">Other attached assets</h3>
          {assets
            .filter((a) => !ASSET_SLOTS.some((s) => s.role === a.role))
            .map((a) => (
              <div key={a.id} className="flex gap-3 items-center py-2">
                {assetUrls[a.id] && (
                  <img
                    src={assetUrls[a.id]}
                    className="w-14 h-14 object-contain"
                    alt={a.label || "Brand asset"}
                  />
                )}
                <div>
                  <p>{a.label || a.fileName || "Attached asset"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.status || "Status unavailable"}
                  </p>
                </div>
              </div>
            ))}
        </section>
      )}
      {libraryRole && (
        <BrandContentLibraryPicker
          roleLabel={
            ASSET_SLOTS.find((s) => s.role === libraryRole)?.label ||
            libraryRole
          }
          onClose={() => setLibraryRole(null)}
          onSelect={(file) => upload(libraryRole, file)}
        />
      )}
    </div>
  );
}
