import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../lib/brandKitTypes";

type Props = {
  kit: BrandKitSummary;
  selected?: boolean;
  onToggleSelect?: (kit: BrandKitSummary) => void;
  onDuplicate: (kit: BrandKitSummary) => void;
  onArchive: (kit: BrandKitSummary) => void;
  onDelete: (kit: BrandKitSummary) => void;
  onExport: (kit: BrandKitSummary) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function BrandKitCard({
  kit,
  selected = false,
  onToggleSelect,
  onDuplicate,
  onArchive,
  onDelete,
  onExport,
}: Props) {
  const navigate = useNavigate();
  const assetUrls = useAuthenticatedBrandAssetUrls(kit);
  const primary = kit.colors?.find((c) => c.role === "primary")?.hex;
  const secondary = kit.colors?.find((c) => c.role === "secondary")?.hex;
  const accent = kit.colors?.find((c) => c.role === "accent")?.hex;
  const palette = [primary, secondary, accent].filter(Boolean) as string[];
  const industry = kit.voice?.industry;
  const tagline = kit.voice?.tagline;
  const logo = kit.assets?.find(
    (a) => a.role === "logo_primary" && a.status === "ready" && a.readUrl,
  );
  const product = kit.assets?.find(
    (asset) => asset.role === "product_image" && asset.status === "ready",
  );
  const brandAccent = /^#[0-9a-f]{6}$/i.test(primary || "")
    ? primary
    : "#c4a574";
  const archived = kit.status === "archived";

  return (
    <article
      className={cn(
        "bk-brand-card group relative flex flex-col overflow-hidden rounded-2xl border border-border glass transition-colors",
        archived && "opacity-70",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <Link
        to={`/brands/${kit.id}`}
        className="bk-brand-cover"
        aria-label={`Open ${kit.name} brand identity`}
        style={{ "--bk-brand-accent": brandAccent } as React.CSSProperties}
      >
        <div className="bk-brand-cover__halo" aria-hidden="true" />
        <div className="bk-brand-cover__identity">
          <span className="bk-brand-eyebrow">BRAND IDENTITY</span>
          <strong>{kit.name}</strong>
          <p>{tagline || industry || "Your creative signature"}</p>
          <span className="bk-brand-cover__palette" aria-label="Brand palette">
            {palette.map((hex, i) => (
              <i key={`${hex}-${i}`} style={{ backgroundColor: hex }} />
            ))}
          </span>
        </div>
        {product && assetUrls[product.id] ? (
          <img
            className="bk-brand-cover__product"
            src={assetUrls[product.id]}
            alt={`${kit.name} original product photograph`}
          />
        ) : logo && assetUrls[logo.id] ? (
          <img
            className="bk-brand-cover__logo"
            src={assetUrls[logo.id]}
            alt={`${kit.name} uploaded logo`}
          />
        ) : (
          <span className="bk-brand-cover__monogram" aria-hidden="true">
            {initials(kit.name)}
          </span>
        )}
        <span className="bk-brand-cover__caption">
          {product && assetUrls[product.id]
            ? "Original product asset"
            : logo && assetUrls[logo.id]
              ? "Uploaded brand identity"
              : "Palette study · no uploaded image"}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border text-sm font-semibold"
            style={{
              backgroundColor: primary || "var(--muted)",
              color: secondary || "#fff",
            }}
          >
            {logo && assetUrls[logo.id] ? (
              <img
                src={assetUrls[logo.id]}
                alt=""
                className="h-full w-full object-contain bg-background p-1"
              />
            ) : (
              initials(kit.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {onToggleSelect ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(kit)}
                    aria-label={`Select ${kit.name}`}
                    className="shrink-0"
                  />
                ) : null}
                <Link
                  to={`/brands/${kit.id}`}
                  className="truncate font-display text-base font-semibold text-foreground hover:underline"
                >
                  {kit.name}
                </Link>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Actions for ${kit.name}`}
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => navigate(`/brands/${kit.id}`)}
                  >
                    <Pencil size={14} className="mr-2" />
                    Open Brand Kit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(kit)}>
                    <Copy size={14} className="mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport(kit)}>
                    <Download size={14} className="mr-2" /> Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!archived ? (
                    <DropdownMenuItem onClick={() => onArchive(kit)}>
                      <Archive size={14} className="mr-2" /> Archive
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(kit)}
                  >
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {industry ? (
                <Badge variant="secondary" className="text-[10px]">
                  {industry}
                </Badge>
              ) : null}
              {archived ? (
                <Badge variant="outline" className="text-[10px]">
                  Archived
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <p className="bk-brand-description text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
          {kit.description?.trim() ||
            tagline ||
            kit.guidelines?.trim() ||
            "No description yet"}
        </p>

        <div className="flex items-center gap-1.5">
          {palette.length ? (
            palette.map((hex) => (
              <span
                key={hex}
                className="h-7 w-7 rounded-md border border-border shadow-sm"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground">
              No palette
            </span>
          )}
          {(kit.colors?.length ?? 0) > 3 ? (
            <span className="text-[11px] text-muted-foreground">
              +{(kit.colors?.length ?? 0) - 3}
            </span>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Assets ({kit.assets?.filter((a) => !a.status || a.status === "ready")
            .length || 0}) · Typography ({kit.typography?.length || 0})
        </p>
        <div className="mt-auto flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            asChild
          >
            <Link to={`/brands/${kit.id}`}>
              <Pencil size={12} className="mr-1" /> Open Brand Kit
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
