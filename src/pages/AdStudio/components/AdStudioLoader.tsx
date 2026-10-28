import React from "react";

type Props = {
  label?: string;
};

/** Classy Ad Studio boot loader — composition frames + brand accent pulse. */
export function AdStudioLoader({ label = "Opening Ad Studio" }: Props) {
  return (
    <div
      className="ad-studio-w0a ad-studio-loader"
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
      <p className="ad-studio-loader__brand">Ad Studio</p>
      <p className="ad-studio-loader__label">{label}</p>
      <div className="ad-studio-loader__bar" aria-hidden>
        <span />
      </div>
    </div>
  );
}
