import React, { useMemo } from "react";
import { cn } from "../../lib/utils";
import { JustifiedEntry, JustifiedLayoutOptions, buildJustifiedRows } from "./justifiedLayout";
import { getMeasuredRatio, reportMediaRatio, useMediaRatioVersion } from "./mediaRatioStore";
import { useElementWidth } from "./useElementWidth";

/**
 * Width assumed for the very first render, before the grid has been measured.
 * The layout effect corrects it before paint; this only guarantees that tiles
 * are laid out even if measurement never reports a width.
 */
const ASSUMED_WIDTH_PX = 960;

/** Pairs an item with what we know about its shape through the row solver. */
interface Sized<T> {
  value: T;
  resolvedRatio: number | null;
  ratioKey?: string;
}

export interface JustifiedTile<T> {
  item: T;
  /** Ratio used for layout — 1 when the item's true ratio is unknown. */
  ratio: number;
  /**
   * The item's true ratio (measured from the loaded image, else declared by the
   * API), or null while still unknown — in which case the slot is a square and
   * the tile should letterbox rather than crop.
   */
  resolvedRatio: number | null;
  /**
   * Report the loaded image's natural size. Tiles should call this from the
   * image's load handler so items stored without a ratio still lay out correctly.
   */
  reportRatio: (naturalWidth: number, naturalHeight: number) => void;
  /** Height of this row, so tiles with a caption can size their media frame. */
  height: number;
  index: number;
}

export interface JustifiedGalleryProps<T> {
  items: T[];
  /** Numeric width/height of the item's media, or null when unknown. */
  getRatio: (item: T) => number | null;
  getKey: (item: T, index: number) => React.Key;
  /**
   * Stable identity of the item's media, used to remember a ratio measured from
   * the loaded image. Must not depend on list position. Omit to opt out of
   * measurement, in which case items without a declared ratio stay square.
   */
  getRatioKey?: (item: T) => string | undefined;
  renderItem: (tile: JustifiedTile<T>) => React.ReactNode;
  /** Gutter between tiles, in px. */
  gap?: number;
  /** Define as a module constant so the layout is not recomputed every render. */
  options?: JustifiedLayoutOptions;
  /**
   * When true (default) each tile fills the row height exactly, which suits
   * cards whose text is overlaid on the media. Set false for cards with a
   * caption below the media: the row then sizes to content and the tile uses
   * `height` for its media frame only.
   */
  stretchTiles?: boolean;
  /**
   * When true, trust the declared API ratio over a measured one. Image Studio
   * generations always store 1:1 / 16:9 / 9:16, and a slightly-off measured
   * pixel ratio was shrinking fresh 9:16 tiles next to older ones.
   */
  preferDeclaredRatio?: boolean;
  className?: string;
}

/**
 * Renders items in justified rows: every row spans the full container width and
 * its tiles share a height, so tiles keep their true aspect ratio, start large
 * in a small gallery, and shrink as it fills up — with no gaps left over.
 */
export function JustifiedGallery<T,>({
  items,
  getRatio,
  getKey,
  getRatioKey,
  renderItem,
  gap = 16,
  options,
  stretchTiles = true,
  preferDeclaredRatio = false,
  className,
}: JustifiedGalleryProps<T>) {
  const { ref, width: measuredWidth } = useElementWidth<HTMLDivElement>();
  const containerWidth = measuredWidth || ASSUMED_WIDTH_PX;
  const ratioVersion = useMediaRatioVersion();

  const rows = useMemo(() => {
    const entries: Array<JustifiedEntry<Sized<T>>> = items.map((item) => {
      const ratioKey = getRatioKey?.(item);
      const declared = getRatio(item);
      const measured = getMeasuredRatio(ratioKey);
      // Measured pixels win by default (uploads often lack a stored ratio). Studio
      // prefers the declared token so every 9:16 lands at the same shape.
      const resolvedRatio = preferDeclaredRatio
        ? (declared ?? measured ?? null)
        : (measured ?? declared ?? null);
      return {
        item: { value: item, resolvedRatio, ratioKey },
        ratio: resolvedRatio ?? 1,
      };
    });
    return buildJustifiedRows(entries, containerWidth, gap, options);
    // getRatio / getRatioKey are called during render; their identity should not
    // force a relayout when a parent recreates an inline arrow every render.
    // ratioVersion is the signal that a newly loaded image changed an answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, containerWidth, gap, options, ratioVersion, preferDeclaredRatio]);

  let index = -1;

  return (
    <div ref={ref} className={cn("w-full flex flex-col", className)} style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={cn("flex", row.centered && "justify-center", !stretchTiles && "items-start")}
          style={{ gap, height: stretchTiles ? row.height : undefined }}
        >
          {row.entries.map(({ item, ratio }) => {
            index += 1;
            return (
              <div
                key={getKey(item.value, index)}
                className={cn("min-w-0", stretchTiles && "h-full")}
                // Growing by ratio lets flex absorb sub-pixel rounding, so the
                // row lands exactly on the container edge.
                style={
                  row.centered
                    ? { width: ratio * row.height, flexGrow: 0, flexShrink: 0 }
                    : { flexGrow: ratio, flexBasis: 0 }
                }
              >
                {renderItem({
                  item: item.value,
                  ratio,
                  resolvedRatio: item.resolvedRatio,
                  reportRatio: (naturalWidth, naturalHeight) =>
                    reportMediaRatio(item.ratioKey, naturalWidth, naturalHeight),
                  height: row.height,
                  index,
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
