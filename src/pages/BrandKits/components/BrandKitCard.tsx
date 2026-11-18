import { useAuthenticatedBrandAssetState } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Images,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../lib/brandKitTypes";
import { ASSET_SLOTS } from "../lib/assetSlots";

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
  const previewKit = useMemo(() => ({
    ...kit,
    assets: kit.assets?.map(asset =>
      !asset.readUrl && asset.status === "ready" && asset.mimeType?.startsWith("image/")
        ? { ...asset, readUrl: `/brands/${encodeURIComponent(kit.id)}/assets/${encodeURIComponent(asset.id)}/media` }
        : asset),
  }), [kit]);
  const { urls: assetUrls, loading: assetsLoading } = useAuthenticatedBrandAssetState(previewKit);
  const assets = (kit.assets ?? []).filter(asset => !asset.status || asset.status === "ready");
  const [assetPreview, setAssetPreview] = useState<"hover" | "manual">();
  const previewTriggerId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const slider = useRef<HTMLUListElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function enterPreview(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || !assets.length) return;
    clearTimeout(timer.current);
    if (!assetPreview) timer.current = setTimeout(() => setAssetPreview("hover"), 250);
  }
  function slide(direction: -1 | 1) {
    const track = slider.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function leavePreview(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAssetPreview(current => current === "hover" ? undefined : current);
    }, 180);
  }
  const primary = kit.colors?.find((c) => c.role === "primary")?.hex;
  const palette = kit.colors ?? [];
  const fonts = [...new Set(kit.typography?.map(font => font.family).filter(Boolean) ?? [])];
  const details = [
    { label: "Typography", value: fonts.slice(0, 2).join(", ") },
    { label: "Audience", value: kit.voice?.targetAudience },
    { label: "Tone of voice", value: kit.voice?.tone },
  ].filter(detail => detail.value?.trim());
  const industry = kit.voice?.industry;
  const tagline = kit.voice?.tagline;
  const logo = assets.find(asset => asset.role === "logo_primary" && assetUrls[asset.id]);
  const product = assets.find(asset => asset.role === "product_image" && assetUrls[asset.id]);
  const cover = product ?? logo ?? assets.find(asset =>
    asset.mimeType?.startsWith("image/") && assetUrls[asset.id]);
  const brandAccent = /^#[0-9a-f]{6}$/i.test(primary || "")
    ? primary
    : "#c4a574";
  const archived = kit.status === "archived";
  const summary = kit.description?.trim() || tagline?.trim();
  const overview = `/brands/${encodeURIComponent(kit.id)}/overview`;
  const productUrl = product && assetUrls[product.id];
  const logoUrl = logo && assetUrls[logo.id];

  return (
    <article
      onPointerEnter={enterPreview}
      onPointerLeave={leavePreview}
      className={cn(
        "bk-brand-card group relative flex flex-col overflow-hidden rounded-2xl border border-border glass transition-colors",
        archived && "opacity-70",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <Link
        to={overview}
        className="bk-brand-cover"
        aria-label={`Open ${kit.name} brand identity`}
        style={{ "--bk-brand-accent": brandAccent } as React.CSSProperties}
      >
        <div className="bk-brand-cover__halo" aria-hidden="true" />
        <div className="bk-brand-cover__identity">
          <strong>{kit.name}</strong>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {industry && <Badge variant="secondary">{industry}</Badge>}
            {archived && <Badge variant="outline">Archived</Badge>}
          </div>
        </div>
        {cover ? (
          <img
            className={cover === logo ? "bk-brand-cover__logo" : "bk-brand-cover__product"}
            src={assetUrls[cover.id]}
            alt={cover.label || cover.fileName || `${kit.name} brand asset`}
          />
        ) : (
          <span className="bk-brand-cover__monogram" aria-hidden="true">
            {initials(kit.name)}
          </span>
        )}
      </Link>
      <div className="flex flex-col gap-3 p-3">
        {summary && <p className="bk-brand-description text-xs text-muted-foreground" title={summary}>{summary}</p>}
        {palette.length > 0 && <section aria-label="Brand colors" className="space-y-2">
          <h3 className="text-xs font-semibold">Brand colors</h3>
          <ul className="bk-brand-swatches">
            {palette.slice(0, 8).map((color, index) => {
              const label = color.name || color.role || color.hex;
              return <li key={`${color.hex}-${index}`} title={`${label} · ${color.hex}`}>
                <span className="bk-brand-swatch" style={{ backgroundColor: color.hex }} />
                <span className="block truncate text-[11px] capitalize">{label}</span>
                <span className="block text-[10px] text-muted-foreground">{color.hex}</span>
              </li>;
            })}
          </ul>
          {palette.length > 8 && <Link to={`${overview}#brand-identity`} className="text-xs text-muted-foreground hover:underline">View all {palette.length} colors</Link>}
        </section>}
        {details.length > 0 && <dl className="grid gap-1.5 text-xs">
          {details.map(({ label, value }) => <div key={label} className="flex min-w-0 justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="truncate text-right" title={value}>{value}</dd>
          </div>)}
        </dl>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {productUrl && logoUrl && <img className="bk-brand-logo-thumb" src={logoUrl} alt={`${kit.name} logo`} />}
          {assets.length ? (
            <Popover
              open={!!assetPreview}
              triggerId={previewTriggerId}
              onOpenChange={(open, details) => {
                clearTimeout(timer.current);
                setAssetPreview(open || (assetPreview === "hover" && details.reason === "trigger-press") ? "manual" : undefined);
              }}
            >
              <PopoverTrigger asChild id={previewTriggerId}>
                <Button size="sm" variant="ghost" className="h-7 px-1.5" aria-label={`Preview ${kit.name} assets`}>
                  <Images size={14} aria-hidden="true" /> Assets ({assets.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(27rem,calc(100vw-2rem))] p-3"
                aria-label={`${kit.name} assets`}
                initialFocus={assetPreview === "manual"}
                onPointerEnter={enterPreview}
                onPointerLeave={leavePreview}
                onFocusCapture={() => setAssetPreview(current => current === "hover" ? "manual" : current)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <strong className="text-sm">Brand assets</strong>
                  <div className="flex items-center gap-1">
                    <Link to={`${overview}#brand-assets`} className="mr-1 text-xs text-muted-foreground hover:underline">View all</Link>
                    {assets.length > 2 && <>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Previous assets" onClick={() => slide(-1)}><ChevronLeft /></Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Next assets" onClick={() => slide(1)}><ChevronRight /></Button>
                    </>}
                  </div>
                </div>
                <ul ref={slider} className="bk-asset-slider" tabIndex={0} aria-label="Brand asset thumbnails">
                  {assets.map(asset => {
                    const role = ASSET_SLOTS.find(slot => slot.role === asset.role)?.label ?? "Brand asset";
                    const label = asset.label || asset.fileName || role;
                    const url = assetUrls[asset.id];
                    return <li key={asset.id} className="min-w-0 rounded-md bg-muted/35 p-1.5">
                      <span className="grid aspect-square w-full place-items-center overflow-hidden rounded border border-border bg-background">
                        {url && (!asset.mimeType || asset.mimeType.startsWith("image/"))
                          ? <img src={url} alt="" loading="lazy" className="size-full object-contain" />
                          : assetsLoading && asset.mimeType?.startsWith("image/")
                            ? <Skeleton className="size-full" />
                            : <Images size={14} aria-hidden="true" className="text-muted-foreground" />}
                      </span>
                      <span className="mt-1 block min-w-0">
                        <span className="block truncate text-xs font-medium" title={label}>{label}</span>
                        {label !== role && <span className="block truncate text-[11px] text-muted-foreground">{role}</span>}
                      </span>
                    </li>;
                  })}
                </ul>
              </PopoverContent>
            </Popover>
          ) : <span>Assets (0)</span>}
          {!!kit.products?.length && <span>Products ({kit.products.length})</span>}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2">
          {onToggleSelect && <input type="checkbox" checked={selected}
            onChange={() => onToggleSelect(kit)} aria-label={`Select ${kit.name}`} className="shrink-0" />}
          <Button size="sm" variant="outline" className="ml-auto" asChild>
            <Link to={overview}>Open Brand Kit</Link>
          </Button>
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
      </div>
    </article>
  );
}
