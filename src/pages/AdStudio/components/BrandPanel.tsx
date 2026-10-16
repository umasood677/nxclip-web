import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  assetsByRolePrefix,
  colorByRole,
  fontByRole,
  type BrandSnapshotView,
} from "../lib/brandSnapshot";

type Props = {
  snapshot: BrandSnapshotView | null;
  hasSelection: boolean;
  onApplyColor: (hex: string, target: "fill" | "text" | "canvas") => void;
  onApplyFont: (family: string) => void;
};

export function BrandPanel({
  snapshot,
  hasSelection,
  onApplyColor,
  onApplyFont,
}: Props) {
  if (!snapshot) {
    return (
      <div className="space-y-2 p-1 text-sm text-muted-foreground">
        <p>No Brand Kit snapshot on this creative (Neutral / legacy).</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/brands">Manage Brand Kits</Link>
        </Button>
      </div>
    );
  }

  const voice = snapshot.voice ?? {};
  const tone = typeof voice.tone === "string" ? voice.tone : null;
  const tagline = typeof voice.tagline === "string" ? voice.tagline : null;
  const preferredCta =
    typeof voice.preferredCta === "string" ? voice.preferredCta : null;
  const logos = assetsByRolePrefix(snapshot, "logo");
  const products = assetsByRolePrefix(snapshot, "product");
  const models = assetsByRolePrefix(snapshot, "brand_model");
  const primary = colorByRole(snapshot, "primary");
  const heading = fontByRole(snapshot, "heading");
  const body = fontByRole(snapshot, "body");

  return (
    <div className="space-y-4 p-1">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{snapshot.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            Snapshot
          </Badge>
        </div>
        {tagline ? (
          <p className="text-xs text-muted-foreground mt-1">{tagline}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground mt-1">
          Applying brand values only updates the selected layer when you click —
          manual edits are never auto-overwritten.
        </p>
      </div>

      {snapshot.colors.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1.5">Palette</div>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.colors.map((c) => (
              <button
                key={`${c.role}-${c.hex}`}
                type="button"
                title={`${c.role ?? "color"} ${c.hex} — apply to selection`}
                disabled={!hasSelection && c.role !== "background"}
                className="group flex flex-col items-center gap-0.5 disabled:opacity-40"
                onClick={() =>
                  onApplyColor(
                    c.hex,
                    c.role === "background"
                      ? "canvas"
                      : hasSelection
                        ? "fill"
                        : "canvas",
                  )
                }
              >
                <span
                  className="h-7 w-7 rounded-md border border-border shadow-soft group-hover:ring-2 group-hover:ring-primary"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[9px] text-muted-foreground max-w-[3.5rem] truncate">
                  {c.role ?? c.name ?? c.hex}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {primary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={!hasSelection}
                onClick={() => onApplyColor(primary, "text")}
              >
                Text ← primary
              </Button>
            ) : null}
            {primary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => onApplyColor(primary, "canvas")}
              >
                Canvas ← primary
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {snapshot.typography.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1.5">Typography</div>
          <div className="space-y-1">
            {snapshot.typography.map((t) => (
              <button
                key={`${t.role}-${t.family}`}
                type="button"
                disabled={!hasSelection}
                className="w-full text-left rounded-md border border-border px-2 py-1.5 text-xs hover:border-primary/40 disabled:opacity-40"
                onClick={() => onApplyFont(t.family)}
              >
                <span className="font-medium">{t.role ?? "font"}</span>
                <span className="text-muted-foreground"> · {t.family}</span>
              </button>
            ))}
          </div>
          {(heading || body) && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Tip: select a text layer, then click a font role.
            </p>
          )}
        </div>
      )}

      <div>
        <div className="text-xs font-medium mb-1.5">Assets (metadata)</div>
        {!logos.length && !products.length && !models.length ? (
          <p className="text-[11px] text-muted-foreground">
            No asset roles in snapshot. Logos already placed in the scene remain
            editable as layers.
          </p>
        ) : (
          <ul className="space-y-1 text-[11px]">
            {[...logos, ...products, ...models].map((a) => (
              <li
                key={`${a.role}-${a.label ?? a.fileName}`}
                className="rounded-md border border-border px-2 py-1.5"
              >
                <span className="font-medium">{a.role}</span>
                {a.label ? ` · ${a.label}` : ""}
                {a.usageGuidance ? (
                  <div className="text-muted-foreground mt-0.5">
                    {a.usageGuidance}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(tone || preferredCta || snapshot.guidelines || voice.copyGuidance) && (
        <div>
          <div className="text-xs font-medium mb-1.5">Voice & guidelines</div>
          <div className="rounded-md border border-border bg-muted/30 px-2 py-2 text-[11px] space-y-1">
            {tone ? <div>Tone: {tone}</div> : null}
            {preferredCta ? <div>Preferred CTA: {preferredCta}</div> : null}
            {typeof voice.copyGuidance === "string" ? (
              <div>{voice.copyGuidance}</div>
            ) : null}
            {snapshot.guidelines ? <div>{snapshot.guidelines}</div> : null}
          </div>
        </div>
      )}

      {snapshot.brandKitId ? (
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-0">
          <Link to={`/brands/${snapshot.brandKitId}`}>Open Brand Kit Studio</Link>
        </Button>
      ) : null}
    </div>
  );
}
