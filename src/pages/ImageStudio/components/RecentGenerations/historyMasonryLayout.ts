export function buildHistoryMasonry(ratios: number[], containerWidth: number, gap = 16) {
  if (containerWidth <= 0 || ratios.length === 0) return { tiles: [], height: 0 };
  // Column count depends on available width, not item count: sparse history
  // must not stretch a lone landscape image across the whole desktop.
  // Portraits use one track; landscapes use two. At desktop widths their
  // visible areas are comparable without cropping or making wide cards huge.
  const columns = containerWidth < 520 ? 1 : Math.ceil((containerWidth + gap) / (272 + gap));
  const trackWidth = (containerWidth - gap * (columns - 1)) / columns;
  const occupied = Array.from({ length: columns }, () => [] as Array<{ top: number; bottom: number }>);
  const tiles = ratios.map(rawRatio => {
    const ratio = Number.isFinite(rawRatio) && rawRatio > 0 ? rawRatio : 1;
    const span = ratio > 1.25 ? Math.min(2, columns) : 1;
    const width = trackWidth * span + gap * (span - 1);
    const height = width / ratio;
    let column = 0;
    let top = Infinity;
    for (let start = 0; start <= columns - span; start += 1) {
      const intervals = occupied.slice(start, start + span).flat().sort((a, b) => a.top - b.top);
      let candidate = 0;
      for (const interval of intervals) {
        if (candidate + height + gap <= interval.top + 0.001) break;
        if (candidate < interval.bottom + gap) candidate = interval.bottom + gap;
      }
      if (candidate < top) {
        top = candidate;
        column = start;
      }
    }
    const interval = { top, bottom: top + height };
    for (let i = column; i < column + span; i += 1) occupied[i].push(interval);
    return { left: column * (trackWidth + gap), top, width, height };
  });
  return { tiles, height: Math.max(...tiles.map(tile => tile.top + tile.height)) };
}
