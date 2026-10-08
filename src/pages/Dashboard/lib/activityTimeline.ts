export interface ActivityDay {
  date: string;
  name: string;
  posts: number;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Local calendar days, oldest first and ending today, including days without posts. */
export function buildActivityTimeline(
  timestamps: Array<string | null | undefined>,
  days: number,
  locale: string,
  now = new Date(),
): ActivityDay[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const timeline = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    // Calendar arithmetic keeps the range correct across daylight-saving changes.
    date.setDate(date.getDate() - (days - 1 - index));
    return { date: dateKey(date), name: formatter.format(date), posts: 0 };
  });
  const buckets = new Map(timeline.map(day => [day.date, day]));
  for (const stamp of timestamps) {
    if (!stamp) continue;
    const date = new Date(stamp);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const bucket = buckets.get(dateKey(date));
    if (bucket) bucket.posts += 1;
  }
  return timeline;
}
