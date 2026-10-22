import blueprints from "./creative-blueprints.v1.json";
import { validateCreativeBlueprint } from "./creative-blueprint.validation";
import type { CreativeBlueprintV1 } from "./creative-blueprint";
export { preflightCreativeComposition } from "./creative-composition.preflight";
export { W8_COMPOSITION_ENABLED_DEFAULT } from "./creative-blueprint";

/** Not imported into existing UI. Reads only generated W8 metadata, never external W7 files. */
export function resolveCreativeBlueprintPreview(entryPoint: {
  kind: "template" | "exampleBrief";
  id: string;
}): CreativeBlueprintV1 {
  const fixture = blueprints.find(
    (b) =>
      b.entryPoint.kind === entryPoint.kind &&
      b.entryPoint.id === entryPoint.id,
  );
  if (!fixture) throw new Error("Unknown W8 blueprint fixture");
  const validation = validateCreativeBlueprint(structuredClone(fixture));
  if (!validation.valid)
    throw new Error(
      "Invalid generated blueprint: " + JSON.stringify(validation.issues),
    );
  return validation.blueprint;
}
