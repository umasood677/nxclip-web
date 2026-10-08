function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function messageText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
    .map(item => item.trim()).filter(Boolean).join(" · ");
  return "";
}

/** API calls reject with JSON objects as well as Error instances. */
export function describeImageEditError(error: unknown): string {
  const outer = record(error);
  const payload = record(record(outer?.response)?.data) ?? outer;
  const message = messageText(payload?.message) || messageText(payload?.error) ||
    messageText(outer?.message) || messageText(error) || "Please try again.";
  const reference = messageText(payload?.correlationId);
  return reference ? `${message}\nReference: ${reference}` : message;
}
