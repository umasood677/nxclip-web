/** Social post body: caption/description plus hashtags that are not already in the text. */
export function composeSocialCaption(input: {
  caption?: string | null;
  description?: string | null;
  title?: string | null;
  hashtags?: string[] | null;
}): string {
  const body = String(input.caption || input.description || input.title || "").trim();
  const tags = (input.hashtags ?? [])
    .map((tag) => {
      const bare = String(tag || "")
        .replace(/^#+/, "")
        .trim();
      return bare ? `#${bare}` : "";
    })
    .filter(Boolean);
  if (!tags.length) return body;
  const lower = body.toLowerCase();
  const missing = tags.filter((tag) => !lower.includes(tag.toLowerCase()));
  if (!missing.length) return body;
  return body ? `${body}\n\n${missing.join(" ")}` : missing.join(" ");
}
