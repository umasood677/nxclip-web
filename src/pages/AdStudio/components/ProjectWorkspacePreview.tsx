import { BrandTemplateScenePreview } from "../../BrandKits/templates/BrandTemplateScenePreview";
import { composeTemplatePreview } from "../canvas/composeTemplateScene";
import { PROJECT_WORKSPACE_COPY, type AdSceneOutputFormatId } from "../canvas/templateCatalog";

export function ProjectWorkspacePreview({ format, thumbnail = false }: { format: AdSceneOutputFormatId; thumbnail?: boolean }) {
  const { sceneGraph } = composeTemplatePreview({
    outputFormat: format,
    concept: {
      conceptId: "project-workspace",
      templateId: "project-workspace",
      title: "Project workspace",
      ...PROJECT_WORKSPACE_COPY,
      creativeDirection: "",
      visualPrompt: "",
      composition: "",
      colorRecommendations: [],
      typographyRecommendations: [],
      platformSuitability: [],
    },
  });
  return <BrandTemplateScenePreview graph={sceneGraph} label="Project workspace template preview" size="card" fillCard={!thumbnail} fitHeight={thumbnail} />;
}
