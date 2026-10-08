import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../lib/utils";

/** Row-flow masonry preserves chronological reading order without fixed-height rows. */
export function PublishedContentGrid({ children, className }: { children: ReactNode; className?: string }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    const measure = (card: HTMLElement) => {
      const spacing = parseFloat(getComputedStyle(card).marginBottom) || 0;
      // One-pixel rows let each following tile occupy the earliest free column.
      const span = Math.max(1, Math.ceil(card.getBoundingClientRect().height + spacing));
      const rowEnd = `span ${span}`;
      if (card.style.gridRowEnd !== rowEnd) card.style.gridRowEnd = rowEnd;
    };
    cards.forEach(measure);
    const observer = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => {
        if (target instanceof HTMLElement) measure(target);
      });
    });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [children]);

  return <div ref={gridRef} className={cn("ui-dashboard-top-content-grid", className)}>{children}</div>;
}
