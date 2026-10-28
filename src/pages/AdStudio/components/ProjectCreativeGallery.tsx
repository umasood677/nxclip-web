import React from "react";
import { MoreHorizontal, Download } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/common/EmptyState";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../../components/ui/dropdown-menu";
import { SceneThumb } from "./SceneThumb";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
export function ProjectCreativeGallery({
  creatives,
  assetUrls,
  storageKeyUrls,
  onOpen,
  onExport,
  onCreate,
  onPreview,
  presentation = "existing",
}: {
  creatives: WorkspaceCreative[];
  assetUrls: Record<string, string>;
  storageKeyUrls?: Readonly<Record<string,string>>;
  onOpen: (id: string) => void;
  onExport: (creative: WorkspaceCreative) => void;
  onCreate: () => void;
  onPreview?: (id: string) => void;
  presentation?: "existing" | "m2b";
}) {
  return (
    <section aria-labelledby="project-creatives-heading">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 id="project-creatives-heading" className="text-lg font-semibold">
          Project creatives
        </h2>
        <span className="text-xs text-muted-foreground">
          All saved static ads
        </span>
      </div>
      {!creatives.length ? (
        <EmptyState
          variant="generic"
          title="Your campaign starts here."
          description="Create your first advertisement using a template, Example Brief, or available creative starting point."
          actionLabel="Create Ad"
          onAction={() => onCreate()}
        />
      ) : (
        <div
          className={
            presentation === "m2b"
              ? "xp-gallery"
              : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          }
        >
          {creatives.map((creative) => (
            <article
              key={creative.id}
              className={
                presentation === "m2b"
                  ? "xp-creative"
                  : "ad-project-workspace__creative"
              }
            >
              <button
                className="ad-project-workspace__preview"
                onClick={() => {
                  (onPreview || onOpen)(creative.id);
                }}
                aria-label={(onPreview ? "Preview " : "Edit ") + creative.name}
              >
                <SceneThumb
                  graph={creative.sceneGraph}
                  maxWidth={260}
                  maxHeight={230}
                  assetUrls={assetUrls}
                  storageKeyUrls={storageKeyUrls}
                  label={creative.name}
                />
              </button>
              <div
                className={
                  presentation === "m2b"
                    ? "xp-card-copy space-y-3"
                    : "p-4 space-y-3"
                }
              >
                <h3 className="font-medium break-words">{creative.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Static ad
                  {creative.sceneGraph?.canvas
                    ? " · " +
                      creative.sceneGraph.canvas.width +
                      " × " +
                      creative.sceneGraph.canvas.height
                    : ""}
                </p>
                {creative.updatedAt &&
                Number.isFinite(Date.parse(creative.updatedAt)) ? (
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(creative.updatedAt).toLocaleDateString()}
                  </p>
                ) : null}
                <div className="flex justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpen(creative.id);
                    }}
                  >
                    Edit creative
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={"More actions for " + creative.name}
                      >
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onExport(creative)}>
                        <Download size={14} className="mr-2" />
                        Export PNG / JPEG
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
