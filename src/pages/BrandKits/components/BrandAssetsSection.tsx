import React, { useRef, useState } from "react";
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
};

function slotAsset(assets: BrandAssetEntry[], role: string) {
  return assets.find((a) => a.role === role && a.status === "ready") ?? null;
}

export function BrandAssetsSection({ brandId, assets, onKitUpdated }: Props) {
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { label: string; description: string; usageGuidance: string }>
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
    patch: Partial<{ label: string; description: string; usageGuidance: string }>,
  ) => {
    const current = draftFor(role, slotAsset(assets, role));
    setDrafts((prev) => ({ ...prev, [role]: { ...current, ...patch } }));
  };

  const upload = async (role: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file (PNG, JPEG, WebP, or SVG)");
      return;
    }
    const draft = draftFor(role, slotAsset(assets, role));
    setBusyRole(role);
    try {
      const uploadMeta = await brandApi.requestAssetUploadUrl(brandId, {
        role,
        fileName: file.name,
        mimeType: file.type || "image/png",
        fileSize: file.size,
        label: draft.label.trim() || undefined,
        description: draft.description.trim() || undefined,
        usageGuidance: draft.usageGuidance.trim() || undefined,
      });
      await putToUploadUrl(uploadMeta.uploadUrl, file, file.type || "image/png");
      const kit = (await brandApi.confirmAsset(
        brandId,
        uploadMeta.assetId,
      )) as BrandKitSummary;
      onKitUpdated(kit);
      toast.success("Asset uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyRole(null);
    }
  };

  const saveMeta = async (role: string) => {
    const asset = slotAsset(assets, role);
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
      toast.error(e instanceof Error ? e.message : "Failed to save asset details");
    } finally {
      setBusyRole(null);
    }
  };

  const remove = async (role: string) => {
    const asset = slotAsset(assets, role);
    if (!asset) return;
    if (!window.confirm("Remove this asset from the Brand Kit?")) return;
    setBusyRole(role);
    try {
      const kit = (await brandApi.deleteAsset(brandId, asset.id)) as BrandKitSummary;
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
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Logos & Assets</h2>
        <p className="text-sm text-muted-foreground">
          Upload logos, product photos, and brand-model imagery. Usage guidance is
          editorial instruction — not an AI identity guarantee. Files stay in secure
          storage (not Brand Kit JSON).
        </p>
      </div>

      <div className="space-y-4">
        {ASSET_SLOTS.map((slot) => {
          const asset = slotAsset(assets, slot.role);
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
                if (file) void upload(slot.role, file);
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{slot.label}</h3>
                  <p className="text-xs text-muted-foreground">{slot.hint}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
                  {slot.role}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
                  {asset?.readUrl ? (
                    <img
                      src={asset.readUrl}
                      alt={draft.label || slot.label}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center px-2 text-muted-foreground">
                      <ImagePlus className="mx-auto mb-1 opacity-60" size={22} />
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
                    <Label>Display name</Label>
                    <Input
                      value={draft.label}
                      onChange={(e) => setDraft(slot.role, { label: e.target.value })}
                      placeholder={slot.exampleLabel || slot.label}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={draft.description}
                      onChange={(e) =>
                        setDraft(slot.role, { description: e.target.value })
                      }
                      placeholder="Optional short description"
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <Label>Usage guidance</Label>
                    <Textarea
                      value={draft.usageGuidance}
                      onChange={(e) =>
                        setDraft(slot.role, { usageGuidance: e.target.value })
                      }
                      rows={2}
                      placeholder={slot.exampleGuidance || "How this asset should be used"}
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
                        if (file) void upload(slot.role, file);
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
    </div>
  );
}
