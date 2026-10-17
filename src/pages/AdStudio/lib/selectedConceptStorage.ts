/** Persist selected concept per project in the browser (UX-1 — no new DB column). */

const PREFIX = "nxclip.adStudio.selectedConcept.";

export function readSelectedConceptId(projectId: string): string | null {
  try {
    const raw = localStorage.getItem(PREFIX + projectId);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function writeSelectedConceptId(
  projectId: string,
  conceptId: string | null,
): void {
  try {
    const key = PREFIX + projectId;
    if (!conceptId) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, conceptId);
  } catch {
    // ignore quota / private mode
  }
}
