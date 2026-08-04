import { useCallback, useLayoutEffect, useState } from "react";

export interface ElementWidth<T extends HTMLElement> {
  /** Attach to the element to measure. */
  ref: (node: T | null) => void;
  width: number;
}

/**
 * Content-box width of an element, tracked across resizes.
 *
 * Uses a callback ref rather than a ref object so the measurement re-runs when
 * the element actually mounts. That matters for galleries, which render an
 * empty or loading state first and only mount the measured grid once items
 * arrive — a ref object never changes identity, so the effect would never see
 * the late node and the gallery would stay blank.
 *
 * Measured in a layout effect so the first paint already has a real width.
 */
export function useElementWidth<T extends HTMLElement>(): ElementWidth<T> {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback((next: T | null) => setNode(next), []);

  useLayoutEffect(() => {
    if (!node) return;

    const measure = () => {
      const next = node.getBoundingClientRect().width;
      // Ignore sub-pixel jitter, and keep the last real width if the element is
      // measured while hidden, so the gallery never collapses to nothing.
      setWidth((prev) => {
        if (next <= 0) return prev;
        return Math.abs(prev - next) < 0.5 ? prev : next;
      });
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref, width };
}
