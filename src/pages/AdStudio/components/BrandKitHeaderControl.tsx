import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

export function brandMenuPosition(
  anchor: { top: number; bottom: number; left: number },
  viewport: { width: number; height: number },
  menu: { width: number; height: number },
): React.CSSProperties {
  const below = viewport.height - anchor.bottom - 88,
    above = anchor.top - 16;
  const up = below < Math.min(menu.height, 360) && above > below;
  const width = Math.min(320, Math.max(240, menu.width));
  const left =
    Math.max(16, Math.min(anchor.left, viewport.width - width - 16)) -
    anchor.left;
  return {
    left,
    right: "auto",
    top: up ? "auto" : "calc(100% + 8px)",
    bottom: up ? "calc(100% + 8px)" : "auto",
    maxHeight: Math.max(80, Math.min(360, up ? above : below)),
  };
}

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const selected = brands.find((b) => b.id === selectedId) ?? null;
  const ctx = normalizeBrandContext(selected);
  const primary = ctx?.colors.primary;
  const label = selected?.name?.trim() || "Default Brand";
  const hasKits = brands.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);


    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const root = rootRef.current,
        menu = menuRef.current;
      if (!root || !menu) return;
      const anchor = root.getBoundingClientRect();
      setMenuStyle(
        brandMenuPosition(
          anchor,
          { width: window.innerWidth, height: window.innerHeight },
          {
            height: menu.scrollHeight,
            width: menu.getBoundingClientRect().width,
          },
        ),
      );
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, brands.length]);

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
              ? "Default Brand — click to select a Brand Kit"
              : "Default Brand — no Brand Kit selected"
        }
        title={
          selectedId
            ? `${label} · change Brand Kit`
            : hasKits
              ? "Default Brand · select a Brand Kit"
              : "Default Brand — no inherited assets"
        }
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        <span
          className="w0a-brand-chip__swatch"
          style={primary ? { background: primary } : undefined}
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
          ref={menuRef}
          style={menuStyle}
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
            <span
              className="w0a-brand-chip__swatch w0a-brand-chip__swatch--ghost"
              aria-hidden
            >
              <Palette size={11} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[12px] font-medium truncate">
                Default Brand
              </span>
              <span className="block text-[10px] text-[var(--w0a-muted)] truncate">
                Default templates &amp; example briefs
              </span>
            </span>
            {!selectedId ? (
              <Check size={12} className="text-[var(--w0a-accent)]" />
            ) : null}
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
                  <span className="block text-[12px] font-medium truncate">
                    {b.name}
                  </span>
                  <span className="block text-[10px] text-[var(--w0a-muted)] truncate">
                    {c?.industry || c?.tagline || "Brand Kit"}
                  </span>
                </span>
                {active ? (
                  <Check size={12} className="text-[var(--w0a-accent)]" />
                ) : null}
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
