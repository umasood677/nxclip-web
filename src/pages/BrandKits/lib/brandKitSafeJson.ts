import { PORTABLE_LIMITS } from "./brandKitPortable";

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type SafeJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function measureDepth(value: unknown, depth = 0): number {
  if (depth > PORTABLE_LIMITS.maxDepth) return depth;
  if (value === null || typeof value !== "object") return depth;
  if (Array.isArray(value)) {
    return value.reduce((max, item) => Math.max(max, measureDepth(item, depth + 1)), depth);
  }
  return Object.values(value as Record<string, unknown>).reduce(
    (max, item) => Math.max(max, measureDepth(item, depth + 1)),
    depth,
  );
}

/** Strip forbidden keys while cloning; rejects if pollution keys present. */
export function sanitizeJsonValue(
  value: unknown,
  path = "$",
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (value === null || typeof value !== "object") {
    return { ok: true, value };
  }
  if (Array.isArray(value)) {
    if (value.length > PORTABLE_LIMITS.maxArrayItems * 4) {
      return { ok: false, error: `Array too large at ${path}` };
    }
    const next: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      const child = sanitizeJsonValue(value[i], `${path}[${i}]`);
      if (!child.ok) return child;
      next.push(child.value);
    }
    return { ok: true, value: next };
  }
  const obj = value as Record<string, unknown>;
  const next: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return {
        ok: false,
        error: `Unsafe property "${key}" rejected at ${path}`,
      };
    }
    const child = sanitizeJsonValue(obj[key], `${path}.${key}`);
    if (!child.ok) return child;
    next[key] = child.value;
  }
  return { ok: true, value: next };
}

export function parseBrandKitJsonText(raw: string): SafeJsonResult {
  if (raw.length > PORTABLE_LIMITS.maxBytes) {
    return {
      ok: false,
      error: `JSON exceeds ${PORTABLE_LIMITS.maxBytes} byte limit`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Malformed JSON" };
  }
  if (measureDepth(parsed) > PORTABLE_LIMITS.maxDepth) {
    return {
      ok: false,
      error: `JSON nesting exceeds depth ${PORTABLE_LIMITS.maxDepth}`,
    };
  }
  return sanitizeJsonValue(parsed);
}

export async function readJsonFile(file: File): Promise<SafeJsonResult> {
  if (file.size > PORTABLE_LIMITS.maxBytes) {
    return {
      ok: false,
      error: `File exceeds ${PORTABLE_LIMITS.maxBytes} byte limit`,
    };
  }
  const text = await file.text();
  return parseBrandKitJsonText(text);
}
