import { AD_FORMATS, type AdSceneGraph } from "../types";
import { adaptCanvasFormat } from "../lib/sceneGraph";
import { sanitizeSceneGraphForClient } from "../canvas/sanitizeSceneGraph";
import type { WorkspaceCreative } from "../lib/projectWorkspace";

export type PlacementId = (typeof AD_FORMATS)[number]["id"];
export function placementPreview(
  creative: WorkspaceCreative,
  projectId: string,
  formatId: string,
): AdSceneGraph {
  if (creative.projectId !== projectId)
    throw Error("Choose a creative from this project.");
  const format = AD_FORMATS.find((item) => item.id === formatId);
  if (!format) throw Error("Choose a supported placement.");
  const source = sanitizeSceneGraphForClient(creative.sceneGraph);
  if (
    !source ||
    !Number.isFinite(source.canvas.width) ||
    !Number.isFinite(source.canvas.height) ||
    source.canvas.width <= 0 ||
    source.canvas.height <= 0
  )
    throw Error("The saved creative has no usable scene.");
  // The existing proportional reflow is deterministic; this does not generate pixels.
  return adaptCanvasFormat(
    structuredClone(source),
    format.width,
    format.height,
  );
}
export interface PlacementWriter {
  createCreative(
    projectId: string,
    body: { name: string; sceneGraph: Record<string, unknown> },
  ): Promise<WorkspaceCreative>;
}
export async function savePlacement(
  api: PlacementWriter,
  creative: WorkspaceCreative,
  projectId: string,
  formatId: string,
  reviewed: boolean,
) {
  if (!reviewed) throw Error("Review the adapted layout before saving a copy.");
  const graph = placementPreview(creative, projectId, formatId);
  const format = AD_FORMATS.find((item) => item.id === formatId)!;
  const name = `${creative.name} / ${format.label}`.slice(0, 160);
  const saved = await api.createCreative(projectId, {
    name,
    sceneGraph: graph as unknown as Record<string, unknown>,
  });
  if (
    !saved.id ||
    saved.id === creative.id ||
    saved.projectId !== projectId ||
    saved.sceneGraph?.canvas.width !== graph.canvas.width ||
    saved.sceneGraph?.canvas.height !== graph.canvas.height
  )
    throw Error(
      "The saved placement could not be verified. Reopen the project gallery before retrying.",
    );
  return saved;
}
