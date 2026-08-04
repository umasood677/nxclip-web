/**
 * Justified gallery layout (Google Photos / Flow style).
 *
 * Items are packed into rows whose widths add up to exactly the container
 * width, so no horizontal space is ever left over, and each tile keeps its true
 * aspect ratio.
 *
 * Every row is solved towards a single target height and held inside a narrow
 * band around it. That uniformity is what makes the gallery read as a grid:
 * media of the same shape gets the same size wherever it appears. The target
 * itself scales with item count, so a small gallery shows large tiles and they
 * shrink as it fills up.
 *
 * Note that one row height drives both dimensions of every tile in the row, so
 * within a row a 16:9 tile is always ~3.2x wider than a 9:16 one. Tune the
 * height band per surface to choose where that trade-off sits.
 */

export interface JustifiedLayoutOptions {
  /** Narrowest tile we allow before dropping to fewer columns. */
  minTileEdge?: number;
  /** Floor for the target height; the main lever for how large tall media gets. */
  minRowHeight?: number;
  /** Ceiling for the target height; the main lever for how wide wide media gets. */
  maxRowHeight?: number;
  /**
   * Hard cap on tiles per row.
   *
   * This is a safety bound, not a goal: the layout uses the fewest tiles that get
   * a row near the target height. Setting it too low forces runs of tall media to
   * overshoot the target, which is what makes one row tower over its neighbours.
   */
  maxColumns?: number;
}

const DEFAULTS = {
  minTileEdge: 210,
  minRowHeight: 360,
  maxRowHeight: 470,
  maxColumns: 6,
} satisfies Required<JustifiedLayoutOptions>;

/**
 * Ceiling for the trailing row, as a multiple of the target height.
 *
 * Full rows stay near the target by construction; only the last row can be left
 * with too few tiles to fill the width, and stretching it would leave it
 * towering over everything above.
 */
const LAST_ROW_MAX_FACTOR = 1.14;

/**
 * Extra weight on rows that come out *shorter* than the target.
 *
 * A short row shrinks every tile in it, and tall media suffers most: a 9:16 tile
 * loses width twice as fast as its height. Penalising short rows harder than
 * tall ones biases breaks towards fewer, larger tiles per row.
 */
const SHORT_ROW_WEIGHT = 1.85;

/**
 * Tolerance before a row is treated as out of band, in log units (~14%).
 */
const ROW_HEIGHT_TOLERANCE = Math.log(1.14);

/**
 * How sharply cost rises once a row leaves the tolerance band.
 *
 * Uniform row heights are the whole point: they are what make two 9:16 posts the
 * same size wherever they land. Making out-of-band rows very expensive means the
 * layout only accepts one when the aspect ratios leave no alternative.
 */
const OUT_OF_BAND_STIFFNESS = 24;

export interface JustifiedEntry<T> {
  item: T;
  /** width / height. Callers pass 1 for unknown media. */
  ratio: number;
}

export interface JustifiedRow<T> {
  entries: Array<JustifiedEntry<T>>;
  height: number;
  /**
   * True when the trailing row could not fill the width without exceeding the
   * height band, so it should be centred rather than stretched.
   */
  centered: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * How many tiles per row we aim for at this item count and width. Used only to
 * size the target height — the density ramp is what makes a nearly empty gallery
 * show large tiles and a full one show smaller ones.
 */
export function idealColumnCount(
  count: number,
  containerWidth: number,
  options: JustifiedLayoutOptions = {},
): number {
  const { minTileEdge, maxColumns } = { ...DEFAULTS, ...options };
  const densest = Math.min(5, maxColumns);
  const byCount = count <= 1 ? 1 : count <= 2 ? 2 : count <= 6 ? 3 : count <= 12 ? 4 : densest;
  const byWidth = Math.floor(containerWidth / minTileEdge);
  return Math.max(1, Math.min(byCount, maxColumns, Math.max(1, byWidth)));
}

/**
 * Target row height for the whole gallery.
 *
 * Derived from the column width divided by the average aspect ratio, so a
 * portrait-heavy gallery gets taller rows (keeping tall media usable) while a
 * landscape-heavy one gets shorter rows (keeping wide media from dominating).
 */
export function targetRowHeight(
  ratios: number[],
  containerWidth: number,
  gap: number,
  options: JustifiedLayoutOptions = {},
): number {
  const { minRowHeight, maxRowHeight } = { ...DEFAULTS, ...options };
  if (!ratios.length || containerWidth <= 0) return minRowHeight;
  const columns = idealColumnCount(ratios.length, containerWidth, options);
  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const averageRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;

  // A narrow container cannot deliver a tall target without rows collapsing to
  // one tile, so scale the bounds to what actually fits. Without this, a phone
  // viewport thrashes between very tall and very short rows.
  const reachableMin = Math.min(minRowHeight, containerWidth / 2.2);
  const reachableMax = Math.max(reachableMin, Math.min(maxRowHeight, containerWidth / 1.1));

  return clamp(columnWidth / averageRatio, reachableMin, reachableMax);
}

export function buildJustifiedRows<T>(
  entries: Array<JustifiedEntry<T>>,
  containerWidth: number,
  gap: number,
  options: JustifiedLayoutOptions = {},
): Array<JustifiedRow<T>> {
  if (!entries.length || containerWidth <= 0) return [];

  const { maxColumns, minTileEdge } = { ...DEFAULTS, ...options };
  const target = targetRowHeight(
    entries.map((e) => e.ratio),
    containerWidth,
    gap,
    options,
  );
  const lastRowMax = target * LAST_ROW_MAX_FACTOR;

  const rowHeight = (count: number, ratioSum: number) =>
    (containerWidth - gap * Math.max(0, count - 1)) / ratioSum;

  // Cumulative ratios let any candidate row be priced in constant time.
  const prefix = new Float64Array(entries.length + 1);
  for (let i = 0; i < entries.length; i += 1) {
    prefix[i + 1] = prefix[i] + entries[i].ratio;
  }

  const heightOf = (start: number, end: number) =>
    rowHeight(end - start, prefix[end] - prefix[start]);

  /**
   * True when any tile in the candidate row would render narrower than the
   * minimum edge. Tall media (9:16) loses width fastest in a short row, so
   * without this check a portrait can be crushed beside landscapes.
   */
  const violatesMinEdge = (start: number, end: number) => {
    const height = heightOf(start, end);
    for (let i = start; i < end; i += 1) {
      if (entries[i].ratio * height < minTileEdge) return true;
    }
    return false;
  };

  /**
   * How far a candidate row's height sits from the target. Scale-free, so the
   * cost of a row does not depend on the gallery's absolute size, and weighted so
   * that falling short of the target hurts more than overshooting it.
   */
  const penalty = (start: number, end: number) => {
    const deviation = Math.log(heightOf(start, end) / target);
    const weight = deviation < 0 ? SHORT_ROW_WEIGHT : 1;
    const excess = Math.max(0, Math.abs(deviation) - ROW_HEIGHT_TOLERANCE);
    return weight * (deviation * deviation + OUT_OF_BAND_STIFFNESS * excess * excess);
  };

  // Choose row breaks by shortest path rather than greedily. A greedy pass
  // commits to a row before seeing what follows, which strands a badly sized row
  // (a tall tile squeezed next to two wide ones) that no later choice can undo.
  // Minimising total deviation instead keeps every row near the target, which is
  // what makes same-shaped media render at the same size throughout.
  const bestCost = new Float64Array(entries.length + 1).fill(Infinity);
  const bestStart = new Int32Array(entries.length + 1).fill(-1);
  bestCost[0] = 0;

  for (let end = 1; end <= entries.length; end += 1) {
    const earliest = Math.max(0, end - maxColumns);
    for (let start = earliest; start < end; start += 1) {
      if (!Number.isFinite(bestCost[start])) continue;
      // Skip packs that would crush a tile below the readable minimum width.
      // A single-tile row is always allowed so a lone portrait can still render
      // (it may be centred and height-capped instead).
      if (end - start > 1 && violatesMinEdge(start, end)) continue;
      const cost = bestCost[start] + penalty(start, end);
      if (cost < bestCost[end]) {
        bestCost[end] = cost;
        bestStart[end] = start;
      }
    }
  }

  // Reconstruct breaks; if a segment has no valid path (should not happen when
  // singleton rows are always allowed), emit singletons so the gallery still paints.
  const breaks: number[] = [];
  for (let end = entries.length; end > 0; ) {
    const prev = bestStart[end];
    if (prev < 0 || !Number.isFinite(bestCost[end])) {
      breaks.push(end);
      end -= 1;
      continue;
    }
    breaks.push(end);
    end = prev;
  }
  breaks.reverse();

  const rows: Array<JustifiedRow<T>> = [];
  let start = 0;
  for (const end of breaks) {
    const natural = heightOf(start, end);
    const isLast = end === entries.length;
    // Only the final row can be left unable to fill the width: everything
    // before it was chosen to. Cap it rather than let it dwarf the rows above.
    // Also keep every tile at least minTileEdge wide when capping the last row.
    let capped = isLast ? Math.min(natural, lastRowMax) : natural;
    if (isLast && capped < natural) {
      let minHeightForEdge = 0;
      for (let i = start; i < end; i += 1) {
        minHeightForEdge = Math.max(minHeightForEdge, minTileEdge / entries[i].ratio);
      }
      // Prefer readable tile width over a perfectly short trailing row.
      capped = Math.min(natural, Math.max(capped, Math.min(minHeightForEdge, lastRowMax * 1.25)));
    }
    rows.push({
      entries: entries.slice(start, end),
      height: capped,
      centered: capped < natural,
    });
    start = end;
  }

  return rows;
}
