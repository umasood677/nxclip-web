import React from "react";
import type {WorkspaceCreative} from "../../AdStudio/lib/projectWorkspace";
import {TemplatePreviewLoading} from "./TemplatePreviewLoading";
/** Generation has no review controls until the saved image and record are ready. */
export function TemplateRenderReview({active=true,phase="Preparing your design…",children}: {
 source?:WorkspaceCreative|null;name?:string;format?:string;active?:boolean;phase?:string;children?:React.ReactNode;
}){
 return <section className="xp-panel bt-generation-stage" aria-label="Template generation" aria-busy={active}>
  <TemplatePreviewLoading label={phase} active={active}/>
  {children&&<div className="bt-generation-recovery">{children}</div>}
 </section>;
}
