/** Persist selected concepts per project in the browser (no new DB column). */

const PREFIX = "nxclip.adStudio.selectedConcept.";

export function readSelectedConceptId(projectId: string): string | null {
  return readSelectedConceptIds(projectId)[0] ?? null;
}

export function writeSelectedConceptId(
  projectId: string,
  conceptId: string | null,
): void {
  writeSelectedConceptIds(projectId, conceptId ? [conceptId] : []);
}

export function readSelectedConceptIds(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(PREFIX + projectId);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
    }
    return typeof parsed === "string" && parsed.trim() ? [parsed.trim()] : [raw.trim()].filter(Boolean);
  } catch {
    return [];
  }
}

export function writeSelectedConceptIds(projectId: string, conceptIds: readonly string[]): void {
  try {
    const key = PREFIX + projectId;
    const ids = [...new Set(conceptIds.filter((id) => id.trim().length > 0))];
    if (!ids.length) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Selection remains available in the current URL if browser storage is unavailable.
  }
}
