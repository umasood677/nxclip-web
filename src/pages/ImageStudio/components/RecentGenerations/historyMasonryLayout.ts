export function buildHistoryMasonry(ratios: number[], containerWidth: number, gap = 16) {
  if (containerWidth <= 0 || ratios.length === 0) return { tiles: [], height: 0 };
  // Column count depends on available width, not item count: sparse history
  // must not stretch a lone landscape image across the whole desktop.
  const columns = Math.max(1, Math.ceil((containerWidth + gap) / (420 + gap)));
  const width = (containerWidth - gap * (columns - 1)) / columns;
  const bottoms = Array<number>(columns).fill(0);
  const tiles = ratios.map(rawRatio => {
    const ratio = Number.isFinite(rawRatio) && rawRatio > 0 ? rawRatio : 1;
    const column = bottoms.indexOf(Math.min(...bottoms));
    const top = bottoms[column];
    const height = width / ratio;
    bottoms[column] = top + height + gap;
    return { left: column * (width + gap), top, width, height };
  });
  return { tiles, height: Math.max(...bottoms) - gap };
}
