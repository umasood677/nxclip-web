import React from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import type { AdBriefFormState } from "../lib/adStudioLabels";

/** Existing brief JSON, made visible before concept generation. No provider or asset processing. */
export function WorkingBriefPanel({ form, onChange, busy = false, onSave }: {
  form: AdBriefFormState; onChange: (patch: Partial<AdBriefFormState>) => void; busy?: boolean; onSave?: () => void;
}) {
  if (!form.exampleBriefId) return null;
  return <section className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4" aria-labelledby="working-brief-title">
    <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Working brief</p>
      <h2 id="working-brief-title" className="text-lg font-semibold mt-1">{form.exampleBriefTitle || "Selected Example Brief"}</h2>
      <p className="text-xs text-muted-foreground mt-1">Review these instructions before Generate concepts. Existing concepts update only when you generate again.</p></div>
    {form.campaignIdea ? <div><h3 className="text-xs font-medium">Campaign Idea · original direction</h3><p className="text-sm whitespace-pre-wrap break-words mt-1">{form.campaignIdea}</p></div> : null}
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="brief-objective">Example objective</Label><Textarea id="brief-objective" className="mt-2" value={form.exampleObjective ?? ""} maxLength={500} disabled={busy} onChange={e => onChange({exampleObjective:e.target.value})} /></div>
      <div><Label htmlFor="brief-direction">Creative direction</Label><Textarea id="brief-direction" className="mt-2" value={form.creativeDirection ?? ""} maxLength={1000} disabled={busy} onChange={e => onChange({creativeDirection:e.target.value})} /></div>
      <div><Label htmlFor="brief-product-category">Product category</Label><Input id="brief-product-category" className="mt-2" value={form.productCategory ?? ""} maxLength={160} disabled={busy} onChange={e => onChange({productCategory:e.target.value})} /></div>
      <div><Label htmlFor="brief-audience">Target audience</Label><Input id="brief-audience" className="mt-2" value={form.targetAudience} maxLength={500} disabled={busy} onChange={e => onChange({targetAudience:e.target.value})} /></div>
      <div><Label htmlFor="brief-message">Advertising message</Label><Input id="brief-message" className="mt-2" value={form.coreMessage} maxLength={500} disabled={busy} onChange={e => onChange({coreMessage:e.target.value})} /></div>
      <div><Label htmlFor="brief-tone">Desired tone</Label><Input id="brief-tone" className="mt-2" value={form.desiredTone} maxLength={200} disabled={busy} onChange={e => onChange({desiredTone:e.target.value})} /></div>
    </div>
    {onSave ? <Button type="button" variant="outline" disabled={busy} onClick={onSave}>{busy ? "Saving…" : "Save working brief"}</Button> : null}
    {form.productFocus === "shade-collection" ? <p className="text-xs text-muted-foreground">Collection direction only. Specific shades and product images need verified variant mapping; brand palette colors are not product variants.</p> : null}
  </section>;
}
