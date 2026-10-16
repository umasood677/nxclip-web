import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { brandApi } from "../../../services/apiClient";
import { executeBrandKitImport } from "../lib/brandKitExecuteImport";
import { mapPortableKit } from "../lib/brandKitImportMap";
import {
  BRAND_KIT_TEMPLATES,
  type BrandKitTemplate,
} from "../lib/brandKitTemplates";
import type { BrandKitSummary } from "../lib/brandKitTypes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (kit: BrandKitSummary) => void;
};

export function BrandKitTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const createFrom = async (template: BrandKitTemplate) => {
    setBusyId(template.id);
    try {
      const mapped = mapPortableKit(template.portable);
      const results = await executeBrandKitImport([
        { mapped, selected: true, mode: "create" },
      ]);
      const ok = results.find((r) => r.status === "success" && r.kitId);
      if (!ok?.kitId) {
        throw new Error(results[0]?.error || "Template creation failed");
      }
      const kit = (await brandApi.getKit(ok.kitId)) as BrandKitSummary;
      toast.success(`Created “${kit.name}” from template`);
      onCreated(kit);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create from template");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Templates are editable examples. Creating one makes a new Brand Kit you own —
            not a shared system brand.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {BRAND_KIT_TEMPLATES.map((t) => {
            const palette = [
              t.portable.colors?.primary,
              t.portable.colors?.secondary,
              t.portable.colors?.accent,
            ].filter(Boolean) as string[];
            return (
              <button
                key={t.id}
                type="button"
                disabled={!!busyId}
                onClick={() => void createFrom(t)}
                className="rounded-xl border border-border glass p-4 text-left hover:border-primary/40 transition-colors disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-sm">{t.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {t.exampleBadge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3 min-h-[2.5rem]">
                  {t.blurb}
                </p>
                <div className="flex gap-1 mb-3">
                  {palette.map((hex) => (
                    <span
                      key={hex}
                      className="h-6 w-6 rounded-md border border-border"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-primary inline-flex items-center gap-1">
                  {busyId === t.id ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : null}
                  Use template
                </span>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
