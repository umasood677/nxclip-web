import React, { useState } from "react";
import type { BrandKitSummary } from "../lib/brandKitTypes";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import {
  downloadJson,
  exportBrandKit,
  stringifyExport,
} from "../lib/brandKitExport";
import { brochureSections, exportBrochure } from "./brandBrochureExport";

/** Saved identity, never an advertisement preview or a claim of asset permission. */
export function BrandKitBrochure({
  kit,
  dirty,
}: {
  kit: BrandKitSummary;
  dirty: boolean;
}) {
  const urls = useAuthenticatedBrandAssetUrls(kit);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const approved = new Set(kit.voice?.studio?.approvedAssetIds || []);
  async function download(format: "pdf" | "png") {
    setBusy(true);
    setError("");
    try {
      await exportBrochure(kit, urls, format);
    } catch {
      setError(
        "The brochure could not be exported. Wait for asset previews to load, then retry. Your Brand Kit is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bp-brochure" aria-label="Saved Brand Kit brochure">
      <header className="bp-brochure-cover">
        <span className="xp-kicker">
          BRAND IDENTITY / SAVED VERSION {kit.version || 1}
        </span>
        <h2>{kit.name}</h2>
        <p>
          {kit.description ||
            "Your saved brand identity and creative guidance."}
        </p>
        <div className="xp-actions">
          <button
            className="xp-secondary"
            disabled={dirty || busy}
            onClick={() => void download("pdf")}
          >
            Export PDF
          </button>
          <button
            className="xp-secondary"
            disabled={dirty || busy}
            onClick={() => void download("png")}
          >
            Export image
          </button>
          <button
            className="xp-secondary"
            disabled={dirty || busy}
            onClick={() =>
              downloadJson(
                "nxclip-brand-kit.json",
                stringifyExport(exportBrandKit(kit)),
              )
            }
          >
            Export JSON
          </button>
        </div>
        {dirty && (
          <p role="status">
            Save your changes before exporting. This brochure shows the last
            saved version.
          </p>
        )}
        {busy && <p role="status">Preparing your brochure locally...</p>}
        {error && <p role="alert">{error}</p>}
      </header>
      <section className="bp-brochure-section">
        <h3>Brand palette</h3>
        <div className="bp-brochure-palette">
          {(kit.colors || []).map((c, i) => (
            <div key={i}>
              <span style={{ background: c.hex }} />
              <strong>{c.name || c.role || "Brand color"}</strong>
              <code>{c.hex}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="bp-brochure-section">
        <h3>Typography</h3>
        {(kit.typography || []).map((t, i) => (
          <div className="bp-type-specimen" key={i}>
            <small>
              {t.role} / {t.weight || "Regular"}
            </small>
            <p
              style={{
                fontFamily: [t.family, t.fallbackStack || "sans-serif"].join(
                  ",",
                ),
              }}
            >
              {t.family} - {kit.name}
            </p>
            <small>
              {t.assetId
                ? "Linked font file"
                : "System/browser font; PDF uses a portable fallback"}
            </small>
          </div>
        ))}
      </section>
      {brochureSections(kit).map((section) => (
        <section className="bp-brochure-section" key={section.title}>
          <h3>{section.title}</h3>
          <dl>
            {section.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section className="bp-brochure-section">
        <h3>Brand assets</h3>
        <p>
          Uploaded assets and approved creative sources are different. Human
          likeness requires separate approved model permissions.
        </p>
        <div className="bp-brochure-assets">
          {(kit.assets || []).map((a) => (
            <article key={a.id}>
              {urls[a.id] && a.mimeType?.startsWith("image/") !== false ? (
                <img
                  src={urls[a.id]}
                  alt={a.label || a.role || "Brand asset"}
                />
              ) : (
                <div className="bp-asset-pending">Preview unavailable</div>
              )}
              <strong>
                {a.label || a.fileName || a.role || "Brand asset"}
              </strong>
              <small>
                {a.role} / {a.status || "Processing"}
              </small>
              <small>
                {approved.has(a.id)
                  ? "Approved source"
                  : "Usage review required"}
              </small>
            </article>
          ))}
        </div>
        {!kit.assets?.length && (
          <p>
            No assets attached. Add logos and product photographs in Assets.
          </p>
        )}
      </section>
    </section>
  );
}
