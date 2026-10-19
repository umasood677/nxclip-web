import React, { useMemo, useState } from "react";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  TEMPLATE_CATALOG_V1,
  type AdSceneOutputFormatId,
  type AdStudioTemplateId,
  getTemplateDef,
} from "../canvas/templateCatalog";
import { AD_FORMATS } from "../types";

type Props = {
  selectedFormat: string;
  busy?: boolean;
  onUseTemplate: (templateId: AdStudioTemplateId, format: AdSceneOutputFormatId) => void;
};

function formatLabel(formatId: string): string {
  return AD_FORMATS.find((f) => f.id === formatId)?.label ?? formatId;
}

function categoryFor(layoutFamily: string): string {
  switch (layoutFamily) {
    case "centered-hero":
      return "Hero";
    case "left-editorial":
      return "Editorial";
    case "top-banner":
      return "Launch";
    case "bottom-stack":
      return "Promo";
    case "diagonal-luxury":
      return "Luxury";
    default:
      return "Template";
  }
}

export function TemplateGallery({ selectedFormat, busy, onUseTemplate }: Props) {
  const [pickFormat, setPickFormat] = useState<Record<string, AdSceneOutputFormatId>>({});

  const defaultFormat = useMemo(() => {
    const hit = AD_FORMATS.find((f) => f.id === selectedFormat);
    return (hit?.id ?? "portrait_1080x1350") as AdSceneOutputFormatId;
  }, [selectedFormat]);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start gap-2">
        <LayoutTemplate size={18} className="text-primary mt-0.5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Template gallery</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick a catalog layout — no AI concepts required. Brand Kit optional; missing assets show
            as editor hints.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_CATALOG_V1.map((tpl) => {
          const format =
            pickFormat[tpl.templateId] ??
            (tpl.formats.includes(defaultFormat as AdSceneOutputFormatId)
              ? (defaultFormat as AdSceneOutputFormatId)
              : tpl.formats[0]!);
          const def = getTemplateDef(tpl.templateId);
          const requiredSlots = def.slots.filter((s) => s.required).map((s) => s.label);

          return (
            <article
              key={tpl.templateId}
              className="flex flex-col rounded-lg border border-border/80 bg-background/60 p-3 gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium leading-tight">{tpl.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {categoryFor(tpl.layoutFamily)} · {tpl.templateId}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {tpl.formats.length} formats
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1">
                {tpl.formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={busy}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                      format === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                    onClick={() =>
                      setPickFormat((prev) => ({ ...prev, [tpl.templateId]: f }))
                    }
                  >
                    {formatLabel(f)}
                  </button>
                ))}
              </div>

              {requiredSlots.length > 0 ? (
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Expects: {requiredSlots.join(", ")}
                </p>
              ) : null}

              <Button
                type="button"
                size="sm"
                className="mt-auto w-full"
                disabled={busy}
                onClick={() => onUseTemplate(tpl.templateId, format)}
              >
                {busy ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Use template"
                )}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
