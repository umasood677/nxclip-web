import React from "react";

type Props = {
  label?: string;
};

/** Classy Ad Studio boot loader — composition frames + brand accent pulse. */
export function AdStudioLoader({ label = "Opening Ad Studio" }: Props) {
  return (
    <div
      className="ad-studio-w0a ad-studio-loader"
      style={{ minHeight: "50vh", display: "grid", placeContent: "center" }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="ad-studio-loader__stage" aria-hidden>
        <span className="ad-studio-loader__frame ad-studio-loader__frame--a" />
        <span className="ad-studio-loader__frame ad-studio-loader__frame--b" />
        <span className="ad-studio-loader__frame ad-studio-loader__frame--c" />
        <span className="ad-studio-loader__orb" />
      </div>
      <div className="ad-studio-loader__bar" aria-hidden>
        <span />
      </div>
    </div>
  );
}
