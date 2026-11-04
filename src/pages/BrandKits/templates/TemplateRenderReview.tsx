import React from "react";
import { Check,X,Palette,Copy,Archive } from "lucide-react";
import type { WorkspaceCreative } from "../../AdStudio/lib/projectWorkspace";
import { AD_FORMATS } from "../../AdStudio/types";
import {TemplatePreviewLoading} from "./TemplatePreviewLoading";
/** One review-shaped loading surface; controls stay disabled until the saved render is available. */
export function TemplateRenderReview({
  source,
  name,
  format,
  active = true,
  phase = "Loading preview",
  children,
}: {
  source?: WorkspaceCreative | null;
  name?: string;
  format?: string;
  active?: boolean;
  phase?: string;
  children?: React.ReactNode;
}) {
  const copy = (role: string) => {
    const l = source?.sceneGraph.layers.find(
      (l) => l.name === role && "text" in l,
    );
    return l && "text" in l ? l.text || "" : "";
  };
  return (
    <div className="xp-split bt-review" aria-busy={active}>
      <section
        className="xp-panel bt-preview-panel"
        aria-label="Template preview"
      >
        <div className="bt-review-art"><TemplatePreviewLoading label={phase} active={active}/></div>
        <span className="xp-status">Loading</span>
        <div className="bt-preview-actions"><button type="button" disabled className="xp-secondary">Customize in Canvas →</button></div>
      </section>
      <section className="xp-panel bt-review-details">
        <h2>Template details</h2>
        <fieldset disabled className="bp-fieldset bt-details-fields">
          <label className="xp-field">
            Template name
            <input readOnly value={source?.name || name || ""} />
          </label>
          <label className="xp-field">
            Customize headline
            <input readOnly value={copy("Headline")} />
          </label>
          <label className="xp-field">
            Supporting copy
            <textarea readOnly value={copy("Supporting copy")} rows={3} />
          </label>
          <label className="xp-field">
            CTA
            <input readOnly value={copy("CTA button")} />
          </label>
          <label className="xp-field">
            Composition
            <select value="pending" onChange={() => {}}>
              <option value="pending"> </option>
            </select>
          </label>
          <label className="xp-field">
            Format
            <select value={format || ""} onChange={() => {}}>
              <option value=""> </option>
              {AD_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <small>Edits require reapproval.</small><button type="button" className="xp-secondary">Save customization</button>

        </fieldset>
        <label className="xp-check"><input type="checkbox" disabled/>I reviewed the product, packaging and brand copy.</label>
        <div className="xp-actions bt-review-actions">{["Approve","Reject","Save","Duplicate","Archive"].map(label=><button type="button" disabled key={label} className={label==="Approve"?"xp-primary":"xp-secondary"}>{React.createElement(({Approve:Check,Reject:X,Save:Palette,Duplicate:Copy,Archive} as const)[label as "Approve"|"Reject"|"Save"|"Duplicate"|"Archive"],{size:14})}{label}</button>)}</div>
        <div className="bt-review-use"><button type="button" disabled className="xp-primary">Use Template in Ad Studio →</button></div>
        {children}
      </section>
    </div>
  );
}
