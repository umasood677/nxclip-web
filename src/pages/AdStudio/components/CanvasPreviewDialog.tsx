import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { AdCanvas } from './AdCanvas';
import type { AdSceneGraph } from '../types';
import type { BrandAssetUrlMap } from '../canvas/brandAssetUrls';

export function previewZoom(width: number, height: number, canvasWidth: number, canvasHeight: number) {
  return Math.max(.01, Math.min(Math.max(1, width - 32) / canvasWidth, Math.max(1, height - 32) / canvasHeight));
}

/** The production renderer, with no selection, guides, or editing gestures. */
export function CanvasPreviewArtwork({ graph, zoom, assetUrls, storageKeyUrls }: {
  graph: AdSceneGraph; zoom: number; assetUrls?: BrandAssetUrlMap; storageKeyUrls?: BrandAssetUrlMap;
}) {
  return <AdCanvas graph={graph} zoom={zoom} selectedLayerId={null} onSelectLayer={() => {}}
    onMoveLayer={() => {}} interactionLocked showSafeArea={false} assetUrls={assetUrls} storageKeyUrls={storageKeyUrls}
    className="!border-0 !bg-transparent !p-0 !rounded-none h-full w-full" />;
}

export function CanvasPreviewDialog({ open, onOpenChange, graph, name, assetUrls, storageKeyUrls }: {
  open: boolean; onOpenChange: (open: boolean) => void; graph: AdSceneGraph; name: string;
  assetUrls?: BrandAssetUrlMap; storageKeyUrls?: BrandAssetUrlMap;
}) {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(.1);
  useEffect(() => {
    if (!open || !stage) return;
    const fit = () => setZoom(previewZoom(stage.clientWidth, stage.clientHeight, graph.canvas.width, graph.canvas.height));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [open, stage, graph.canvas.width, graph.canvas.height]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="!w-[96vw] !max-w-none !h-[94dvh] !grid-rows-[auto_minmax(0,1fr)] !bg-[#101116] !p-4 sm:!p-6">
      <header className="pr-10"><DialogTitle>Preview</DialogTitle>
        <DialogDescription className="mt-2">{name} · {graph.canvas.width} × {graph.canvas.height}</DialogDescription></header>
      <div ref={setStage} className="min-h-0 overflow-hidden rounded-lg bg-[#08090c]" aria-label="Clean advertisement preview">
        <CanvasPreviewArtwork graph={graph} zoom={zoom} assetUrls={assetUrls} storageKeyUrls={storageKeyUrls}/>
      </div>
    </DialogContent>
  </Dialog>;
}
