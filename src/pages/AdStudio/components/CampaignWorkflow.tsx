import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { projectWorkspacePath, type WorkspaceCreative } from "../lib/projectWorkspace";
import { readSelectedConceptIds } from "../lib/selectedConceptStorage";
import type { useAdProjectWorkspace } from "../production/useAdProjectWorkspace";

const stages = [
  ["strategy", "Campaign Brief"],
  ["directions", "Creative Directions"],
  ["production-review", "Production Review"],
  ["compare", "Compare & Approve"],
] as const;

export function campaignSelection(projectId: string, query: URLSearchParams) {
  const selection = query.getAll("direction");
  return selection.length ? selection : readSelectedConceptIds(projectId);
}

export function creativeHasArtwork(creative: WorkspaceCreative) {
  return Boolean(creative.sceneGraph?.layers.some(layer =>
    layer.type === "image" && typeof layer.assetId === "string" && layer.assetId.length > 0));
}

export function CampaignWorkflow({ controller, query, stage, onNavigate }: {
  controller: Pick<ReturnType<typeof useAdProjectWorkspace>, "project" | "concepts" | "creatives" | "form" | "savedForm">;
  query: URLSearchParams;
  stage: string;
  onNavigate?: () => void;
}) {
  const { project, concepts, creatives, form, savedForm } = controller;
  if (!project) return null;
  const selected = campaignSelection(project.id, query);
  const artwork = creatives.filter(creative => creative.documentPurpose !== "concept-preview" && creativeHasArtwork(creative));
  const completed = {
    strategy: project.brief?.planningApproved === true && savedForm === JSON.stringify(form),
    directions: concepts.some(concept => selected.includes(concept.conceptId)),
    "production-review": artwork.length > 0,
    compare: artwork.some(creative => creative.status === "ready"),
  };
  const nextStage = stages.find(([key]) => !completed[key])?.[0];
  return (
    <nav aria-label="Campaign workflow">
      <ol className="campaign-workflow-steps">
        {stages.map(([key, label], index) => {
          const status = completed[key] ? "completed" : key === nextStage ? "in-progress" : "remaining";
          const params = new URLSearchParams(query);
          params.delete("review");
          params.delete("reviewTab");
          params.set("view", key);
          params.delete("direction");
          selected.forEach(id => params.append("direction", id));
          return (
            <li key={key}>
              <Link to={projectWorkspacePath(project.id) + "?" + params} onClick={onNavigate}
                aria-current={key === stage ? "step" : undefined} data-status={status}>
                <span className="campaign-workflow-steps__number" aria-hidden="true">{status === "completed" ? <Check size={15} /> : index + 1}</span>
                <span><strong>{label}</strong><small>{status === "completed" ? "Completed" : status === "in-progress" ? "In progress" : "Remaining"}</small></span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
