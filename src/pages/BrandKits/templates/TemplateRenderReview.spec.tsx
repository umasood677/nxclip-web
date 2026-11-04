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
test("rendering uses the final review structure and disables all template details/actions", () => {
  const Review = load(),
    html = renderToStaticMarkup(
      <Review name="Saved Brand" format="portrait_1080x1350" />,
    );
  assert.match(html, /Template preview/);
  assert.match(html, /Template details/);
  assert.match(html, /fieldset disabled/);
  for (const label of [
    "Template name",
    "Customize headline",
    "Supporting copy",
    "CTA",
    "Composition",
    "Format",
    "Approve",
    "Reject",
    "Save",
  ])
    assert.ok(html.includes(label), label);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(
    html,
    /Review template →|Check AI generation readiness|I approve/,
  );
});
test("uncertain/error states stop animation while retaining the same disabled review controls", () => {
  const Review = load(),
    html = renderToStaticMarkup(
      <Review active={false} phase="Your template needs attention" />,
    );
  assert.match(html, /aria-busy="false"/);
  assert.doesNotMatch(html, /class="bt-render-stage is-rendering"/);
  assert.match(html, /Your template needs attention/);
  assert.match(html, /fieldset disabled/);
});

test('record and media loading share one stage and stable final panel classes',()=>{
 const Review=load(),html=renderToStaticMarkup(<Review/>);
 assert.match(html,/class="xp-split bt-review"/);
 assert.match(html,/class="bt-review-art"/);assert.match(html,/Loading preview/);
 assert.doesNotMatch(html,/bt-render-stage|bt-render-details|Preparing composition|value="Brand Template"/);
 const media=readFileSync('src/pages/BrandKits/templates/TemplateReviewMedia.tsx','utf8');
 assert.match(media,/<TemplatePreviewLoading\/>/);
 const shared=readFileSync('src/pages/BrandKits/templates/TemplatePreviewLoading.tsx','utf8');
 assert.match(shared,/bt-review-media-state/);assert.match(shared,/<Skeleton/);
});
