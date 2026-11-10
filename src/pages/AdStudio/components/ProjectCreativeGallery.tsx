import React, { useState } from "react";
import { MoreHorizontal, Download, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/common/EmptyState";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";
import {BrandTemplateScenePreview} from '../../BrandKits/templates/BrandTemplateScenePreview';
import type { WorkspaceCreative } from "../lib/projectWorkspace";

export const discardCreativeDescription = (name: string) =>
  `“${name}” will be removed from this project. The project and its saved Brand Template stay unchanged.`;

export function ProjectCreativeGallery({
  creatives,
  assetUrls,
  storageKeyUrls,
  onOpen,
  onExport,
  onCreate,
  onPreview,
  onDiscard,
  presentation = "existing",
}: {
  creatives: WorkspaceCreative[];
  assetUrls: Record<string, string>;
  storageKeyUrls?: Readonly<Record<string,string>>;
  onOpen: (id: string) => void;
  onExport: (creative: WorkspaceCreative) => void;
  onCreate: () => void;
  onPreview?: (id: string) => void;
  /** Removes only this campaign creative. Its project and saved source template remain intact. */
  onDiscard?: (creative: WorkspaceCreative) => Promise<void> | void;
  presentation?: "existing" | "m2b";
}) {
  const [discardTarget, setDiscardTarget] = useState<WorkspaceCreative | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const discard = async () => {
    if (!discardTarget || !onDiscard) return;
    setDiscarding(true);
    try {
      await onDiscard(discardTarget);
      setDiscardTarget(null);
    } finally {
      setDiscarding(false);
    }
  };
  return (
    <section className="ad-studio-w0a campaign-creative-gallery" aria-labelledby="project-creatives-heading">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 id="project-creatives-heading" className="text-lg font-semibold">
          Project creatives
        </h2>
        <span className="text-xs text-muted-foreground">
          {creatives.length} saved ad {creatives.length===1?'draft':'drafts'}
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
        <div className="w0a-grid w0a-grid-4 campaign-creative-grid">
          {creatives.map((creative) => (
            <article
              key={creative.id}
              className="w0a-card campaign-creative-card"
            >
              <button
                className="w0a-brand-preview saved-template-art campaign-creative-art"
                style={creative.sceneGraph?{aspectRatio:`${creative.sceneGraph.canvas.width}/${creative.sceneGraph.canvas.height}`}:undefined}
                onClick={() => {
                  (onPreview || onOpen)(creative.id);
                }}
                aria-label={(onPreview ? "Preview " : "Edit ") + creative.name}
              >
                <BrandTemplateScenePreview
                  graph={creative.sceneGraph}
                  fillCard
                  readablePlaceholder
                  assetUrls={assetUrls}
                  storageKeyUrls={storageKeyUrls}
                  label={creative.name}
                />
              </button>
              <div className="w0a-card-body space-y-2">
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
                  <button
                    className="w0a-btn"
                    onClick={() => {
                      (onPreview||onOpen)(creative.id);
                    }}
                  >
                    {onPreview?'Review ad':'Open in Canvas'}
                  </button>
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
                      <DropdownMenuItem onClick={()=>onOpen(creative.id)}>Open in Canvas</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport(creative)}>
                        <Download size={14} className="mr-2" />
                        Export PNG / JPEG
                      </DropdownMenuItem>
                      {onDiscard ? (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDiscardTarget(creative)}
                        >
                          <Trash2 size={14} className="mr-2" />
                          Discard ad
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={discardTarget !== null}
        onOpenChange={(open) => {
          if (!open && !discarding) setDiscardTarget(null);
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={!discarding}>
          <DialogTitle>Discard this campaign ad?</DialogTitle>
          <DialogDescription>{discardTarget ? discardCreativeDescription(discardTarget.name) : ""}</DialogDescription>
          <div className="xp-actions">
            <Button type="button" variant="outline" disabled={discarding} onClick={() => setDiscardTarget(null)}>
              Keep ad
            </Button>
            <Button type="button" variant="destructive" disabled={discarding} onClick={() => void discard()}>
              <Trash2 size={15} className="mr-2" />
              {discarding ? "Discarding…" : "Discard ad"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
