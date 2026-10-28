import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { WorkingBriefPanel } from "./WorkingBriefPanel";
import { exampleBriefForm } from "../lib/projectWorkspace";
import { ZOE_ARTISAN_HOME_CATALOG } from "../lib/brandHomeCatalog";
const {renderToStaticMarkup}=createRequire(process.cwd()+"/package.json")("react-dom/server") as {renderToStaticMarkup:(node:React.ReactNode)=>string};
test("working brief exposes selected example, original idea and editable objective/direction before generation",()=>{
 const example=ZOE_ARTISAN_HOME_CATALOG.examples.find(e=>e.id==="multiple-shades")!;
 const form=exampleBriefForm({id:"private-project",name:"Collection",brandKitId:null,brief:{campaignIdea:"My original campaign direction"}},example);
 const html=renderToStaticMarkup(<WorkingBriefPanel form={form} onChange={()=>undefined} />);
 for(const text of ["Multiple Shades","My original campaign direction","Example objective","Creative direction","Advertising message","Product category","Target audience","verified variant mapping"])assert.ok(html.includes(text),text);
 assert.match(html,/textarea/);assert.match(html,/input/);assert.doesNotMatch(html,/private-project/);
});
test("unselected legacy briefs preserve the existing composer",()=>{
 const form=exampleBriefForm({id:"p",name:"P",brief:{}},ZOE_ARTISAN_HOME_CATALOG.examples[0]);
 delete form.exampleBriefId;
 assert.equal(renderToStaticMarkup(<WorkingBriefPanel form={form} onChange={()=>undefined} />),"");
});
