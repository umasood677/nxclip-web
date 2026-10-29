import React, { useEffect, useRef, useState } from "react";
import { SceneStage } from "../../AdStudio/canvas/SceneStage";
type Props = React.ComponentProps<typeof SceneStage>;
/** Fit the existing renderer to its card; retain the scene's exact aspect ratio. */
export function BrandTemplateScenePreview(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(260);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} className="bt-scene-preview">
      <SceneStage {...props} maxWidth={width} />
    </div>
  );
}
