import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { brandApi, putToUploadUrl } from "../../services/apiClient";
import { AD_STUDIO_FONTS } from "../AdStudio/lib/adFonts";
import type { BrandKitSummary } from "./lib/brandKitTypes";

export type { BrandKitSummary };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (kit: BrandKitSummary) => void;
  /** When set, dialog edits this kit via existing brand APIs */
  initialKit?: BrandKitSummary | null;
};

const DEFAULT_PRIMARY = "#0F172A";
const DEFAULT_SECONDARY = "#38BDF8";

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
}

export function CreateBrandKitDialog({
  open,
  onOpenChange,
  onCreated,
  initialKit = null,
}: Props) {
  const editing = !!initialKit?.id;
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [headingFont, setHeadingFont] = useState<string>(AD_STUDIO_FONTS[0].family);
  const [bodyFont, setBodyFont] = useState<string>(AD_STUDIO_FONTS[1].family);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialKit) {
      setName(initialKit.name ?? "");
      setGuidelines(initialKit.guidelines ?? "");
      setPrimaryColor(
        initialKit.colors?.find((c) => c.role === "primary")?.hex ?? DEFAULT_PRIMARY,
      );
      setSecondaryColor(
        initialKit.colors?.find((c) => c.role === "secondary")?.hex ??
          DEFAULT_SECONDARY,
      );
      setHeadingFont(
        initialKit.typography?.find((t) => t.role === "heading")?.family ??
          AD_STUDIO_FONTS[0].family,
      );
      setBodyFont(
        initialKit.typography?.find((t) => t.role === "body")?.family ??
          AD_STUDIO_FONTS[1].family,
      );
    } else {
      setName("");
      setGuidelines("");
      setPrimaryColor(DEFAULT_PRIMARY);
      setSecondaryColor(DEFAULT_SECONDARY);
      setHeadingFont(AD_STUDIO_FONTS[0].family);
      setBodyFont(AD_STUDIO_FONTS[1].family);
    }
    setLogoFile(null);
    setBusy(false);
  }, [open, initialKit]);

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Brand name is required");
      return;
    }
    const primary = normalizeHex(primaryColor);
    const secondary = normalizeHex(secondaryColor);
    if (!/^#[0-9A-F]{6}$/i.test(primary) || !/^#[0-9A-F]{6}$/i.test(secondary)) {
      toast.error("Primary and secondary colors must be valid hex values");
      return;
    }
    if (logoFile && !logoFile.type.startsWith("image/")) {
      toast.error("Logo must be an image file");
      return;
    }

    setBusy(true);
    try {
      let kit: BrandKitSummary;
      if (editing && initialKit) {
        kit = await brandApi.updateKit(initialKit.id, {
          name: trimmedName,
          guidelines: guidelines.trim() || null,
        });
      } else {
        kit = await brandApi.createKit({
          name: trimmedName,
          guidelines: guidelines.trim() || undefined,
        });
      }

      kit = await brandApi.replaceColors(kit.id, [
        { role: "primary", hex: primary, name: "Primary", sortOrder: 0 },
        { role: "secondary", hex: secondary, name: "Secondary", sortOrder: 1 },
      ]);

      kit = await brandApi.replaceTypography(kit.id, [
        {
          role: "heading",
          family: headingFont,
          weight: "700",
          sortOrder: 0,
        },
        {
          role: "body",
          family: bodyFont,
          weight: "400",
          sortOrder: 1,
        },
      ]);

      if (guidelines.trim()) {
        kit = await brandApi.updateGuidelines(kit.id, guidelines.trim());
      }

      if (logoFile) {
        const upload = await brandApi.requestAssetUploadUrl(kit.id, {
          role: "logo_primary",
          fileName: logoFile.name,
          mimeType: logoFile.type || "image/png",
          fileSize: logoFile.size,
          label: "Primary logo",
        });
        await putToUploadUrl(upload.uploadUrl, logoFile, logoFile.type || "image/png");
        kit = await brandApi.confirmAsset(kit.id, upload.assetId);
      }

      toast.success(editing ? "Brand Kit updated" : "Brand Kit created");
      onCreated(kit);
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : editing
            ? "Failed to update Brand Kit"
            : "Failed to create Brand Kit",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Brand Kit" : "Create Brand Kit"}</DialogTitle>
          <DialogDescription>
            Name, colors, fonts, and guidelines for Static Ad Studio. Logo upload is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label htmlFor="brand-kit-name">Brand name</Label>
            <Input
              id="brand-kit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ZoeArtisan"
              disabled={busy}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="brand-primary">Primary color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="brand-primary"
                  type="color"
                  className="h-9 w-12 p-1 cursor-pointer"
                  value={normalizeHex(primaryColor) || DEFAULT_PRIMARY}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={busy}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#7F1D1D"
                  disabled={busy}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="brand-secondary">Secondary color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="brand-secondary"
                  type="color"
                  className="h-9 w-12 p-1 cursor-pointer"
                  value={normalizeHex(secondaryColor) || DEFAULT_SECONDARY}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={busy}
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#1C1917"
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Heading font</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={headingFont}
                onChange={(e) => setHeadingFont(e.target.value)}
                disabled={busy}
              >
                {AD_STUDIO_FONTS.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Body font</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={bodyFont}
                onChange={(e) => setBodyFont(e.target.value)}
                disabled={busy}
              >
                {AD_STUDIO_FONTS.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="brand-logo">Logo (optional)</Label>
            <Input
              id="brand-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={busy}
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <Label htmlFor="brand-guidelines">Brand guidelines / voice</Label>
            <Textarea
              id="brand-guidelines"
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={4}
              placeholder="Luxury beauty voice, do/don't, visual rules…"
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void submit()}>
            {busy ? <Loader2 className="animate-spin mr-1" size={16} /> : null}
            {editing ? "Save Brand Kit" : "Create Brand Kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
