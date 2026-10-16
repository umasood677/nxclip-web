import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileJson, Loader2, Pencil, Plus, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";
import { brandInitials } from "../lib/conceptVisual";

export type SharedBrandKitPickerProps = {
  brands: BrandKitSummary[];
  selectedId: string;
  loading?: boolean;
  error?: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit?: (kit: BrandKitSummary) => void;
  onImport?: () => void;
  onRetry?: () => void;
  className?: string;
  /** Compact mode for tight layouts */
  compact?: boolean;
};

function PaletteDots({
  colors,
}: {
  colors: Array<{ hex: string }>;
}) {
  const slice = colors.map((c) => c.hex).filter(Boolean).slice(0, 4);
  if (!slice.length) {
    return <span className="text-[10px] text-muted-foreground">No palette</span>;
  }
  return (
    <div className="flex gap-1" aria-hidden>
      {slice.map((hex) => (
        <span
          key={hex}
          className="h-3.5 w-3.5 rounded-full border border-border/80"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

/** Shared Brand Kit picker for Ad Studio and future studios. */
export function BrandKitPicker({
  brands,
  selectedId,
  loading,
  error,
  onSelect,
  onCreate,
  onEdit,
  onImport,
  onRetry,
  className,
}: SharedBrandKitPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => {
      const ctx = normalizeBrandContext(b);
      const hay = [b.name, ctx?.industry, ctx?.tagline, b.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [brands, query]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Brand Kit</span>
        <div className="flex items-center gap-2">
          <Link
            to="/brands"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Manage
          </Link>
          {onImport ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onImport}
            >
              <FileJson size={12} className="mr-1" /> Import
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onCreate}
          >
            <Plus size={12} className="mr-1" /> Create
          </Button>
        </div>
      </div>

      {brands.length > 4 ? (
        <div className="relative max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kits…"
            className="h-8 pl-8 text-xs"
            aria-label="Search Brand Kits"
          />
        </div>
      ) : null}

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="listbox"
        aria-label="Brand Kit selection"
      >
        <button
          type="button"
          role="option"
          aria-selected={!selectedId}
          onClick={() => onSelect("")}
          className={cn(
            "shrink-0 w-[148px] rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            !selectedId
              ? "border-primary bg-primary/10 shadow-soft"
              : "border-border hover:border-primary/35 bg-card/50",
          )}
        >
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold mb-2">
            N
          </div>
          <div className="text-sm font-medium">Neutral</div>
          <div className="text-[11px] text-muted-foreground">No brand</div>
        </button>

        {loading && (
          <div className="shrink-0 flex items-center gap-2 px-3 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Loading Brand Kits…
          </div>
        )}

        {filtered.map((kit) => {
          const selected = selectedId === kit.id;
          const ctx = normalizeBrandContext(kit);
          const logo = ctx?.assets.logoUrl;
          return (
            <div
              key={kit.id}
              className={cn(
                "relative shrink-0 w-[168px] rounded-xl border p-3 transition-colors",
                selected
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border hover:border-primary/35 bg-card/50",
              )}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(kit.id)}
                className="w-full text-left focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      className="h-9 w-9 rounded-lg object-contain bg-background border border-border"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-[11px] font-semibold">
                      {brandInitials(kit.name)}
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium truncate">{kit.name}</div>
                {ctx?.industry ? (
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {ctx.industry}
                  </div>
                ) : null}
                <div className="mt-1.5">
                  <PaletteDots colors={ctx?.colors.all ?? []} />
                </div>
              </button>
              {onEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-1.5 right-1.5 h-7 w-7 p-0"
                  aria-label={`Edit ${kit.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(kit);
                  }}
                >
                  <Pencil size={12} />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-xs text-destructive">
          {error}{" "}
          {onRetry ? (
            <button type="button" className="underline" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
      {!loading && !error && !brands.length ? (
        <p className="text-xs text-muted-foreground">
          No Brand Kits yet — create one or import JSON.
        </p>
      ) : null}
      {!loading && !error && brands.length && !filtered.length ? (
        <p className="text-xs text-muted-foreground">No kits match “{query}”.</p>
      ) : null}
    </div>
  );
}
