/**
 * UX-2A.2 M4 — Scene graph authority rules (Still Ad Studio).
 *
 * Authority order (highest wins):
 * 1. Server-persisted AdSceneGraph on the creative (create/update/restore APIs).
 * 2. Server TemplateEngine output when AD_STUDIO_TEMPLATES_V1_ENABLED=true
 *    during createCreativeFromConcept (binder + engine; flag OFF in production).
 * 3. Legacy buildSceneGraphFromConcept when templates V1 is OFF.
 *
 * FE composeTemplateScene / templateCatalog:
 * - Gallery/live-preview only when VITE_AD_STUDIO_TEMPLATES_V1 is ON.
 * - Must NOT override a valid server sceneGraph on a concept or creative.
 * - Catalog version must match AD_STUDIO_TEMPLATE_CATALOG_VERSION (1.0.0)
 *   for intentional parity; drift is a known M4 limitation until shared package.
 *
 * Fallback conditions (explicit, never silent):
 * - Templates V1 ON + missing Brand Kit → createFromConcept fails with 400.
 * - Templates V1 ON + blocked/incomplete engine → 400 with missing-slot errors.
 * - Templates V1 OFF → heuristic concept-to-scene (legacy Still Ad Studio).
 * - FE preview without server graph → composeTemplateScene approximation only;
 *   opening the editor always loads the server creative graph.
 */

export const AD_STUDIO_TEMPLATE_CATALOG_VERSION_FE = "1.0.0" as const;

export function assertServerGraphPreferred(input: {
  serverGraph?: unknown;
  feComposedGraph?: unknown;
}): "server" | "fe-fallback" | "none" {
  if (input.serverGraph && typeof input.serverGraph === "object") return "server";
  if (input.feComposedGraph && typeof input.feComposedGraph === "object") {
    return "fe-fallback";
  }
  return "none";
}
