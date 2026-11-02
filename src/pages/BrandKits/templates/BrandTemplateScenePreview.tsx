import React, { useEffect, useRef, useState } from "react";
import {reviewImageUrls,preloadReviewImages} from "./reviewMediaLoading";
import {LoaderCircle,ImageOff} from "lucide-react";
import { SceneStage } from "../../AdStudio/canvas/SceneStage";
type Props = React.ComponentProps<typeof SceneStage> & {fillCard?:boolean;fitHeight?:boolean;readablePlaceholder?:boolean};
/** Fit the existing renderer to its card; retain the scene's exact aspect ratio. */
export function BrandTemplateScenePreview({fillCard=false,fitHeight=false,readablePlaceholder=false,...props}: Props) {
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(260),[height,setHeight]=useState(560);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
      if(fitHeight&&entries[0]?.contentRect.height)setHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitHeight]);
  const sources=props.graph?reviewImageUrls(props.graph,props.assetUrls||{}):null;
  const missing=props.graph?.layers.some(l=>l.visible!==false&&(l.type==="image"||l.type==="logo")&&!("assetId" in l&&l.assetId));
  const mediaKey=JSON.stringify([sources,!!missing]),[ready,setReady]=useState(""),[failed,setFailed]=useState("");
  useEffect(()=>{if(!readablePlaceholder)return;let active=true;const timer=setTimeout(()=>{if(active)setFailed(mediaKey);},12000);const [currentSources,unbound]=JSON.parse(mediaKey) as [string[]|null,boolean];if(currentSources&&!unbound)void preloadReviewImages(currentSources).then(()=>{if(active){clearTimeout(timer);setReady(mediaKey);}}).catch(()=>{if(active){clearTimeout(timer);setFailed(mediaKey);}});return()=>{active=false;clearTimeout(timer);};},[mediaKey,readablePlaceholder]);
  const waiting=readablePlaceholder&&(missing||sources===null||(sources.length>0&&ready!==mediaKey));
  return (
    <div ref={host} className="bt-scene-preview">
      {waiting?<div className="bt-thumbnail-state" style={{aspectRatio:props.graph?props.graph.canvas.width+"/"+props.graph.canvas.height:"4/5"}} role="status">
{missing||failed===mediaKey?<><ImageOff size={24}/><span>{missing?"Add an image in Canvas":"Preview unavailable"}</span></>:<><LoaderCircle size={24} className="bt-thumbnail-spinner"/><span>Loading preview…</span></>}
</div>:<SceneStage {...props} maxWidth={width} maxHeight={fillCard && props.graph?.canvas.width ? width*props.graph.canvas.height/props.graph.canvas.width : fitHeight?height:props.maxHeight} />}
    </div>
  );
}
