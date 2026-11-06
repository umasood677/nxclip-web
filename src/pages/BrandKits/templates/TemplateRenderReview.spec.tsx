import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
function load() {
  const source = readFileSync(
      "src/pages/BrandKits/templates/TemplateRenderReview.tsx",
      "utf8",
    ),
    exports: Record<string, unknown> = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (id: string) => {
        if (id === "react") return React;
        if (id === "lucide-react") return { Sparkles: () => null,Check:()=>null,X:()=>null,Palette:()=>null,Copy:()=>null,Archive:()=>null };
        if(id==='./TemplatePreviewLoading')return {TemplatePreviewLoading:({label='Loading preview'}:{label?:string})=><div className="bt-review-media-state" role="status">{label}</div>};
        if (id.endsWith("/types"))
          return {
            AD_FORMATS: [{ id: "portrait_1080x1350", label: "Portrait 4:5" }],
          };
        if (id.endsWith(".css")) return {};
        throw Error(id);
      },
    },
  );
  return exports.TemplateRenderReview as React.ComponentType<{
    active?: boolean;
    phase?: string;
    name?: string;
    format?: string;
  }>;
}
test("baking shows animation only, without empty details or approval controls",()=>{
 const Review=load(),html=renderToStaticMarkup(<Review name="Saved Brand" format="portrait_1080x1350"/>);
 assert.match(html,/Template generation/);assert.match(html,/role="status"/);assert.match(html,/aria-busy="true"/);
 assert.doesNotMatch(html,/Template details|Customize headline|Supporting copy|<input|<textarea|<select|Approve|Customize in Canvas/);
});

test("uncertain state does not pretend a blank review is ready",()=>{
 const Review=load(),html=renderToStaticMarkup(<Review active={false} phase="Check your saved generation"/>);
 assert.match(html,/aria-busy="false"/);assert.match(html,/Check your saved generation/);assert.doesNotMatch(html,/fieldset|Template details/);
});

test('record and media loading share animation while review waits for ready media',()=>{
 const source=readFileSync('src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8');
 assert.ok(source.includes('display:reviewPhase==="ready"?undefined:"none"'));
 const media=readFileSync('src/pages/BrandKits/templates/TemplateReviewMedia.tsx','utf8');assert.ok(media.includes('<TemplatePreviewLoading/>'));
});
