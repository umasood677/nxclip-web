import React from "react";
import { Sparkles } from "lucide-react";
import type { WorkspaceCreative } from "../../AdStudio/lib/projectWorkspace";
import { AD_FORMATS } from "../../AdStudio/types";
import "./templateRenderReview.css";
/** One review-shaped loading surface; controls stay disabled until the saved render is available. */
export function TemplateRenderReview({
  source,
  name,
  format,
  active = true,
  phase = "Rendering your template…",
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
    <div className="xp-split bt-render-review" aria-busy={active}>
      <section
        className="xp-panel bt-render-preview"
        aria-label="Template preview"
      >
        <div
          className={"bt-render-stage" + (active ? " is-rendering" : "")}
          style={{
            aspectRatio:
              format === "vertical_1080x1920"
                ? "9 / 16"
                : format === "square_1080"
                  ? "1"
                  : format === "landscape_1920x1080"
                    ? "16 / 9"
                    : "4 / 5",
          }}
        >
          <div className="bt-render-light" aria-hidden="true" />
          <Sparkles size={34} aria-hidden="true" />
          <strong role="status" aria-live="polite">
            {phase}
          </strong>
        </div>
      </section>
      <section className="xp-panel bt-render-details">
        <h2>Template details</h2>
        <fieldset disabled className="bp-fieldset">
          <label className="xp-field">
            Template name
            <input readOnly value={source?.name || name || "Brand Template"} />
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
              <option value="pending">Preparing composition</option>
            </select>
          </label>
          <label className="xp-field">
            Format
            <select value={format || "portrait_1080x1350"} onChange={() => {}}>
              {AD_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div className="xp-actions">
            <button className="xp-secondary" type="button">
              Reject
            </button>
            <button className="xp-primary" type="button">
              Approve
            </button>
            <button className="xp-secondary" type="button">
              Save
            </button>
          </div>
        </fieldset>
        {children}
      </section>
    </div>
  );
}
