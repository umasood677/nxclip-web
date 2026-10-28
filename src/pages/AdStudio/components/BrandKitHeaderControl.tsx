import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Palette } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";

type Props = {
  brands: BrandKitSummary[];
  selectedId: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  className?: string;
};

/** Compact Brand Kit control for Ad Studio top header. */
export function BrandKitHeaderControl({
  brands,
  selectedId,
  loading,
  onSelect,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = brands.find((b) => b.id === selectedId) ?? null;
  const ctx = normalizeBrandContext(selected);
  const primary = ctx?.colors.primary;
  const label = selected?.name?.trim() || "Neutral";
  const hasKits = brands.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("w0a-brand-chip relative", className)}>
      <button
        type="button"
        className={cn(
          "w0a-brand-chip__btn",
          !selectedId && "w0a-brand-chip__btn--neutral",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          selectedId
            ? `Brand Kit ${label}`
            : hasKits
              ? "Neutral Brand Kit — click to select"
              : "No Brand Kit — Neutral templates"
        }
        title={
          selectedId
            ? `${label} · change Brand Kit`
            : hasKits
              ? "Neutral · select a Brand Kit"
              : "No Brand Kit yet — Neutral templates & briefs"
        }
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        <span
          className="w0a-brand-chip__swatch"
          style={
            primary
              ? { background: primary }
              : undefined
          }
          aria-hidden
        >
          {!primary ? <Palette size={12} /> : null}
        </span>
        <span className="w0a-brand-chip__label truncate max-w-[7.5rem]">
          {loading ? "…" : label}
        </span>
        <ChevronDown size={12} className="opacity-70 shrink-0" aria-hidden />
      </button>

      {open ? (
        <div
          className="w0a-brand-chip__menu"
          role="listbox"
          aria-label="Select Brand Kit"
        >
          <button
            type="button"
            role="option"
            aria-selected={!selectedId}
            className={cn("w0a-brand-chip__option", !selectedId && "active")}
            onClick={() => {
              onSelect("");
              setOpen(false);
            }}
          >
            <span className="w0a-brand-chip__swatch w0a-brand-chip__swatch--ghost" aria-hidden>
              <Palette size={11} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[12px] font-medium truncate">Neutral</span>
              <span className="block text-[10px] text-[var(--w0a-muted)] truncate">
                Default templates &amp; example briefs
              </span>
            </span>
            {!selectedId ? <Check size={12} className="text-[var(--w0a-accent)]" /> : null}
          </button>

          {brands.map((b) => {
            const c = normalizeBrandContext(b);
            const hex = c?.colors.primary;
            const active = b.id === selectedId;
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn("w0a-brand-chip__option", active && "active")}
                onClick={() => {
                  onSelect(b.id);
                  setOpen(false);
                }}
              >
                <span
                  className="w0a-brand-chip__swatch"
                  style={hex ? { background: hex } : undefined}
                  aria-hidden
                />
                <span className="flex-1 text-left min-w-0">
                  <span className="block text-[12px] font-medium truncate">{b.name}</span>
                  <span className="block text-[10px] text-[var(--w0a-muted)] truncate">
                    {c?.industry || c?.tagline || "Brand Kit"}
                  </span>
                </span>
                {active ? <Check size={12} className="text-[var(--w0a-accent)]" /> : null}
              </button>
            );
          })}

          {!hasKits ? (
            <p className="px-3 py-2 text-[11px] text-[var(--w0a-muted)]">
              No Brand Kits yet. Create one in Brand Kit Studio.
            </p>
          ) : null}

          <Link
            to="/brands"
            className="w0a-brand-chip__manage"
            onClick={() => setOpen(false)}
          >
            Manage Brand Kits →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
