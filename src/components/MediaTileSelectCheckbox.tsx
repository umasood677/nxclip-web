import { Check } from "lucide-react";
import { cn } from "../lib/utils";

export interface MediaTileSelectCheckboxProps {
  checked: boolean;
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
  visible?: boolean;
  className?: string;
  /** When set and checked, shows index label (e.g. ref picker "1") instead of a check icon */
  badge?: string | number;
  ariaLabel?: string;
}

/** Ring / border treatment for selected media tiles (library, refs, variations). */
export function mediaTileSelectionRing(selected: boolean): string {
  return selected
    ? "border-white/30 ring-2 ring-white/15 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
    : "";
}

const baseBox = (
  checked: boolean,
  compact: boolean,
  visible: boolean,
  className?: string,
) =>
  cn(
    "flex items-center justify-center backdrop-blur-md transition-all duration-200",
    "shadow-[0_2px_8px_rgba(0,0,0,0.45)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black/30",
    compact
      ? "h-[20px] w-[20px] rounded-[4px] border-[1.5px]"
      : "h-[22px] w-[22px] rounded-[5px] border-2",
    checked
      ? "border-white/90 bg-zinc-950/90 text-white"
      : "border-white/70 bg-black/55 hover:bg-black/70 hover:border-white/90",
    !visible && "opacity-0 pointer-events-none scale-95",
    visible && "opacity-100 scale-100",
    checked && visible && "scale-105",
    className,
  );

/** Dark glass checkbox for image / video tiles (Content Library, ref pickers, etc.). */
export function MediaTileSelectCheckbox({
  checked,
  onClick,
  compact = false,
  visible = true,
  className,
  badge,
  ariaLabel,
}: MediaTileSelectCheckboxProps) {
  const label =
    ariaLabel ?? (checked ? "Deselect" : "Select");

  const content =
    checked && badge != null ? (
      <span className="text-[9px] font-bold leading-none tabular-nums">{badge}</span>
    ) : checked ? (
      <Check
        className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")}
        strokeWidth={2.75}
        aria-hidden
      />
    ) : null;

  if (onClick) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={onClick}
        className={baseBox(checked, compact, visible, className)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={baseBox(checked, compact, visible, className)}
    >
      {content}
    </div>
  );
}

/** Table / form rows on dark UI (DevSuite, admin lists). */
export function SelectCheckbox({
  checked,
  onClick,
  className,
  ariaLabel,
}: {
  checked: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const label = ariaLabel ?? (checked ? "Deselect" : "Select");
  const box = cn(
    "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all duration-200",
    checked
      ? "bg-zinc-950/95 border-white/80 text-white"
      : "border-white/25 bg-black/40 hover:border-white/50 hover:bg-black/55",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={onClick}
        className={box}
      >
        {checked ? <Check size={10} strokeWidth={3} aria-hidden /> : null}
      </button>
    );
  }

  return (
    <div role="checkbox" aria-checked={checked} className={box}>
      {checked ? <Check size={10} strokeWidth={3} aria-hidden /> : null}
    </div>
  );
}
