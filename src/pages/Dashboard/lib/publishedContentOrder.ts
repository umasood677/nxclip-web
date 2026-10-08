interface PublicationDates {
  publishedAt?: string;
  createdAt?: string;
}

function publicationTime(item: PublicationDates): number {
  for (const value of [item.publishedAt, item.createdAt]) {
    const timestamp = Date.parse(value || "");
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

export function newestPublishedFirst(a: PublicationDates, b: PublicationDates): number {
  return publicationTime(b) - publicationTime(a);
}
