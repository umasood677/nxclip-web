import { brandBrochureTheme } from "./brandBrochureTheme";
import { brandFontKey, useBrandFontPreviews } from "../lib/brandFontPreview";
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
  summary = false,
  focusGuidelines = false,
}: {
  kit: BrandKitSummary;
  dirty: boolean;
  summary?: boolean;
  focusGuidelines?: boolean;
}) {
  const urls = useAuthenticatedBrandAssetUrls(kit);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [fontAttempt, setFontAttempt] = useState(0);
  const fonts = useBrandFontPreviews(
    kit.typography || [],
    `${kit.name} ${kit.voice?.tagline || ""} Aa Bb Cc 0123456789`,
    fontAttempt,
  );
  const theme = brandBrochureTheme(kit);
  const headingEntry = kit.typography?.find((t) => t.role === "heading"),
    coverFont = headingEntry ? fonts[brandFontKey(headingEntry)] : undefined;
  const logo = kit.assets?.find(
    (a) =>
      ["logo_primary", "logo_light", "logo_dark", "logo_mark"].includes(
        a.role || "",
      ) && urls[a.id],
  );
  const themeStyle = Object.fromEntries(
    Object.entries(theme).map(([key, value]) => [`--brochure-${key}`, value]),
  ) as React.CSSProperties;
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
  const sections = brochureSections(kit);
  const campaignGuidelines = sections.find(
    (section) => section.title === "Creative guidelines",
  );
  return (
    <section
      className="bp-brochure bp-brochure--branded"
      style={themeStyle}
      aria-label={
        summary
          ? "Complete Brand Kit identity summary"
          : "Saved Brand Kit brochure"
      }
    >
      <header className="bp-brochure-cover">
        <span className="xp-kicker">
          {summary
            ? "COMPLETE IDENTITY / CURRENT DRAFT"
            : `BRAND IDENTITY / SAVED VERSION ${kit.version || 1}`}
        </span>
        {logo && (
          <img
            className="bp-brochure-cover-logo"
            src={urls[logo.id]}
            alt={`${kit.name} logo`}
          />
        )}
        <h2
          style={{
            fontFamily:
              coverFont?.status === "loaded"
                ? `"${coverFont.family}",serif`
                : undefined,
            fontWeight: coverFont?.weight,
            fontSynthesis: "none",
          }}
        >
          {kit.name}
        </h2>
        {kit.voice?.tagline && (
          <p className="bp-brochure-tagline">{kit.voice.tagline}</p>
        )}
        <p>
          {kit.description ||
            "Your saved brand identity and creative guidance."}
        </p>
        {!summary && (
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
        )}
        {!summary && dirty && (
          <p role="status">
            Save your changes before exporting. This brochure shows the last
            saved version.
          </p>
        )}
        {busy && <p role="status">Preparing your brochure locally...</p>}
        {error && <p role="alert">{error}</p>}
      </header>
      {focusGuidelines && campaignGuidelines && (
        <section className="bp-brochure-section bp-brochure-section--guidelines">
          <h3>Creative guidelines for advertisements</h3>
          <p className="bp-brochure-draft-caption">
            Your campaign instructions from the left editor, reflected in this
            draft.
          </p>
          {campaignGuidelines.rows.length ? (
            <dl>
              {campaignGuidelines.rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>
              No campaign guidelines specified yet. Add your direction in the
              left editor.
            </p>
          )}
        </section>
      )}
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
        {Object.values(fonts).some((f) => f.status === "unavailable") && (
          <button
            type="button"
            className="xp-secondary"
            onClick={() => setFontAttempt((value) => value + 1)}
          >
            Reload local font previews
          </button>
        )}
        <div className="bp-brochure-type-grid">
          {(kit.typography || []).map((t, i) => {
            const font = fonts[brandFontKey(t)];
            return (
              <div className="bp-type-specimen" key={i}>
                <small>
                  {t.role} / {t.family} / {t.weight || "400"}
                </small>
                <p
                  style={{
                    fontFamily:
                      font?.status === "loaded"
                        ? `"${font.family}",sans-serif`
                        : "sans-serif",
                    fontWeight: font?.weight || 400,
                    fontStyle: font?.style || "normal",
                    fontSynthesis: "none",
                  }}
                >
                  Aa Bb Cc
                </p>
                <p
                  className="bp-type-name"
                  style={{
                    fontFamily:
                      font?.status === "loaded"
                        ? `"${font.family}",sans-serif`
                        : "sans-serif",
                    fontWeight: font?.weight || 400,
                    fontSynthesis: "none",
                  }}
                >
                  {kit.voice?.tagline || kit.name}
                </p>
                <small>{font?.note || "Loading the configured font..."}</small>
              </div>
            );
          })}
        </div>
      </section>
      {sections
        .filter(
          (section) =>
            !focusGuidelines || section.title !== "Creative guidelines",
        )
        .map((section) => (
          <section
            className={`bp-brochure-section bp-brochure-section--${section.title === "Brand profile" ? "profile" : section.title === "Brand voice" ? "voice" : "guidelines"}`}
            key={section.title}
          >
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
                  ? a.role === "brand_model"
                    ? "Selected source; likeness permission is reviewed separately"
                    : "Approved source"
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
