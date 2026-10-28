import React, { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";

type Props = {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  badge?: string | number;
};

/** Compact accordion section for Ad Studio side columns. */
export function CollapsiblePanel({
  title,
  icon,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  badge,
}: Props) {
  const autoId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setUncontrolled(next);
  };
  const panelId = `${autoId}-panel`;
  const headerId = `${autoId}-header`;

  return (
    <div
      className={cn(
        "w0a-collapse rounded-lg border border-[var(--w0a-border)] bg-[var(--w0a-panel-2)]/60 overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        id={headerId}
        className="w0a-collapse__trigger flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w0a-accent)]"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {icon ? (
          <span className="text-[var(--w0a-muted)] shrink-0" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--w0a-muted)] truncate">
          {title}
        </span>
        {badge != null && badge !== "" ? (
          <span className="text-[10px] font-mono tabular-nums text-[var(--w0a-accent)] shrink-0">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[var(--w0a-muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        className={cn(
          "w0a-collapse__body border-t border-[var(--w0a-border)] px-2.5 py-2.5",
          !open && "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
