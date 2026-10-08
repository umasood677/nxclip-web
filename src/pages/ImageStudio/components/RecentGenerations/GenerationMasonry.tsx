import { useElementWidth, parseAspectRatio, getMeasuredRatio, reportMediaRatio } from "../../../../components/JustifiedGallery";
import { useMediaRatioVersion } from "../../../../components/JustifiedGallery/mediaRatioStore";
import { GenerationCard } from "./GenerationCard";
import type { RecentGenerationsGalleryProps } from "./index";
import { buildHistoryMasonry } from "./historyMasonryLayout";

export function GenerationMasonry({ items, onReuse, onDownload, onOpen }: RecentGenerationsGalleryProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  useMediaRatioVersion();
  const media = items.map((item, index) => {
    const key = `${item.id || `item-${index}`}-${item.mediaRevision || item.storageKey || item.timestamp}`;
    return { item, key, ratio: parseAspectRatio(item.aspectRatio) ?? getMeasuredRatio(key) ?? null };
  });
  const layout = buildHistoryMasonry(media.map(entry => entry.ratio ?? 1), width || 320);
  return (
    <div ref={ref} className="relative w-full" style={{ height: layout.height }}>
      {media.map(({ item, key, ratio }, index) => (
        <div key={key} className="absolute" style={layout.tiles[index]}>
          <GenerationCard
            item={item}
            aspectRatio={ratio ?? undefined}
            onMediaLoad={(w, h) => reportMediaRatio(key, w, h)}
            onReuse={onReuse}
            onDownload={onDownload}
            onOpen={onOpen}
          />
        </div>
      ))}
    </div>
  );
}
