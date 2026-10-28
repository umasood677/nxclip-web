import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { AD_FORMATS } from "../types";
import {
  AD_CTA_SUGGESTIONS,
  AD_OBJECTIVES,
  AD_PLATFORMS,
  type AdBriefFormState,
} from "../lib/adStudioLabels";
import { BrandKitPicker } from "./BrandKitPicker";

type Props = {
  brandLocked?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AdBriefFormState;
  onChange: (patch: Partial<AdBriefFormState>) => void;
  brands: BrandKitSummary[];
  brandsLoading: boolean;
  brandsError: string | null;
  onRetryBrands: () => void;
  onSelectBrand: (id: string) => void;
  onCreateBrand: () => void;
  onEditBrand: (kit: BrandKitSummary) => void;
  onImportBrand?: () => void;
  /** Persist brief to server when project exists */
  onSaveBrief?: () => void | Promise<void>;
  saving?: boolean;
  projectReady: boolean;
};

function ChoiceChip({
  selected,
  title,
  hint,
  onClick,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 shadow-soft"
          : "border-border hover:border-primary/35 bg-card/40",
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      {hint ? (
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
      ) : null}
    </button>
  );
}

/** Optional project details drawer (dialog) — keeps the main workspace gallery-first. */
export function ProjectDetailsDrawer({
  open,
  onOpenChange,
  form,
  onChange,
  brands,
  brandsLoading,
  brandsError,
  onRetryBrands,
  onSelectBrand,
  onCreateBrand,
  onEditBrand,
  onImportBrand,
  onSaveBrief,
  saving,
  projectReady,
  brandLocked = false,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project details</DialogTitle>
          <DialogDescription>
            Edit the brief without leaving the concept workspace. Changes sync
            before concept generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label>What would you like to advertise?</Label>
            <Textarea
              value={form.productOrService}
              onChange={(e) => onChange({ productOrService: e.target.value })}
              rows={2}
              className="mt-1.5"
              placeholder="e.g. Zoe Artisan Rouge Velvet lipstick"
            />
          </div>
          <div>
            <Label>Core message</Label>
            <Input
              value={form.coreMessage}
              onChange={(e) => onChange({ coreMessage: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Who is this for?</Label>
            <Input
              value={form.targetAudience}
              onChange={(e) => onChange({ targetAudience: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Campaign objective</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {AD_OBJECTIVES.map((o) => (
                <ChoiceChip
                  key={o.value}
                  selected={form.advertisingObjective === o.value}
                  title={o.label}
                  hint={o.hint}
                  onClick={() => onChange({ advertisingObjective: o.value })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Target platform</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {AD_PLATFORMS.map((p) => (
                <ChoiceChip
                  key={p.value}
                  selected={form.platform === p.value}
                  title={p.label}
                  hint={p.hint}
                  onClick={() => onChange({ platform: p.value })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Aspect ratio</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {AD_FORMATS.map((f) => (
                <ChoiceChip
                  key={f.id}
                  selected={form.outputFormat === f.id}
                  title={f.label}
                  hint={`${f.width}×${f.height}`}
                  onClick={() => onChange({ outputFormat: f.id })}
                />
              ))}
            </div>
          </div>

          {brandLocked ? <div className="rounded-lg border border-border p-3 text-sm"><Label>Project Brand</Label><p className="mt-1">{brands.find(b => b.id === form.brandKitId)?.name ?? (form.brandKitId ? "Selected Brand Kit" : "Default Brand")}</p><p className="text-xs text-muted-foreground mt-1">This advertisement uses your project’s Brand Kit selection.</p></div> : <BrandKitPicker
            brands={brands}
            selectedId={form.brandKitId}
            loading={brandsLoading}
            error={brandsError}
            onSelect={onSelectBrand}
            onCreate={onCreateBrand}
            onEdit={onEditBrand}
            onImport={onImportBrand}
            onRetry={onRetryBrands}
          />}

          <div>
            <Label>Call to action</Label>
            <Input
              className="mt-1.5"
              value={form.cta}
              onChange={(e) => onChange({ cta: e.target.value })}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {AD_CTA_SUGGESTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "text-[11px] rounded-full border px-2.5 py-1",
                    form.cta === c
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onChange({ cta: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            More details (tone, project name)
          </button>
          {showAdvanced ? (
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
              <div>
                <Label>Project name</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                />
              </div>
              <div>
                <Label>Tone</Label>
                <Input
                  className="mt-1"
                  value={form.desiredTone}
                  onChange={(e) => onChange({ desiredTone: e.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {projectReady && onSaveBrief ? (
            <Button
              type="button"
              disabled={saving}
              onClick={() => void onSaveBrief()}
            >
              {saving ? "Saving…" : "Save brief"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
