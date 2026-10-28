import {generateProjectConcepts} from "./projectWorkspace";
import { test } from "node:test";
import assert from "node:assert/strict";
import { newWorkspaceProject, projectBriefForm, workspaceBrief, loadWorkspace, createProjectTemplate, createProjectConcept, projectWorkspacePath, creativeEditorPath, type WorkspaceProject, type WorkspaceCreative } from "./projectWorkspace";
const project: WorkspaceProject = { id: "project-a", name: "Collection", brandKitId: "kit-b", brief: { campaignIdea: "  My idea\nexactly.  ", coreMessage: "Copy" } };
test("project creation preserves Campaign Idea wording and keeps Brand Kit optional", () => {
  const body = newWorkspaceProject(" New project ", "  My words.  ");
  assert.equal(body.name, "New project"); assert.equal(body.brief.campaignIdea,"  My words.  ");
  assert.equal("brandKitId" in body, false);
  assert.equal(newWorkspaceProject("Brand project","Idea","kit-b").brandKitId,"kit-b");
});
test("project creation validates name, Campaign Idea and length", () => {
  assert.throws(() => newWorkspaceProject("","Idea")); assert.throws(() => newWorkspaceProject("Name"," "));
  assert.throws(() => newWorkspaceProject("Name","x".repeat(4001)));
});
test("unbranded reopen clears prior context instead of falling back to local selection", () => {
  const form = projectBriefForm({ ...project, brandKitId: null });
  assert.equal(form.brandKitId,""); assert.equal(form.brandPreview,null);
  assert.equal(projectBriefForm(project).brandKitId,"kit-b");
});
test("editing an Example Brief preserves the project's Campaign Idea and extra brief fields", () => {
  const form = { ...projectBriefForm(project), coreMessage: "Example headline" };
  const payload = workspaceBrief(project, form);
  assert.equal(payload.coreMessage,"Example headline"); assert.equal(payload.campaignIdea,project.brief?.campaignIdea);
});
test("direct URL and refresh reload project plus ALL associated creatives by persisted ID", async () => {
  const items: WorkspaceCreative[] = Array.from({length:13},(_,i)=>({id:"c"+i,name:"Creative "+i,projectId:project.id}));
  const calls: string[] = [];
  const api = {getProject:async(id:string)=>{calls.push("project:"+id);return project;},listCreatives:async(id:string)=>{calls.push("creatives:"+id);return {items};}};
  const first = await loadWorkspace(api,project.id), reopened = await loadWorkspace(api,project.id);
  assert.equal(first.creatives.length,13); assert.deepEqual(first,reopened);
  assert.deepEqual(calls,["project:project-a","creatives:project-a","project:project-a","creatives:project-a"]);
});
test("ownership failures remain errors rather than an empty successful workspace", async () => {
  await assert.rejects(loadWorkspace({getProject:async()=>{throw Error("Access denied");},listCreatives:async()=>({items:[]})},project.id),/Access denied/);
});
test("incorrect project references are rejected", async () => {
  await assert.rejects(loadWorkspace({getProject:async()=>project,listCreatives:async()=>({items:[{id:"x",name:"Wrong",projectId:"other"}]})},project.id),/safely/);
});
test("two template creatives use one existing project, without project creation or overwrite", async () => {
  const calls: string[]=[]; let n=0;
  const api={createFromTemplate:async(id:string)=>{calls.push(id);return {id:"new-"+ ++n,name:"Ad",projectId:id};},createFromConcept:async()=>{throw Error("Unexpected");}};
  const a=await createProjectTemplate(api,project,"product-hero","square_1080");
  const b=await createProjectTemplate(api,project,"minimal-editorial","portrait_1080x1350");
  assert.deepEqual(calls,[project.id,project.id]); assert.notEqual(a.id,b.id);
  assert.equal(project.brief?.campaignIdea,"  My idea\nexactly.  ");
});
test("a template result must belong to the selected project", async () => {
  const api={createFromTemplate:async()=>({id:"new",name:"Ad",projectId:"other"}),createFromConcept:async()=>{throw Error("Unexpected");}};
  await assert.rejects(createProjectTemplate(api,project,"product-hero","square_1080"),/verified/);
});
test("saved concept selection must come from the same loaded project", async () => {
  let called=false;
  const api={createFromConcept:async(id:string)=>{called=true;return{id:"new",name:"Ad",projectId:id};},createFromTemplate:async()=>{throw Error("Unexpected");}};
  await assert.rejects(createProjectConcept(api,project,"unknown",[]),/saved concept/); assert.equal(called,false);
});
test("project and editor URLs remain distinct and reload-safe", () => {
  assert.equal(projectWorkspacePath(project.id),"/create/ad/projects/project-a");
  assert.equal(creativeEditorPath("creative-a"),"/create/ad/creative-a");
});
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
test("the actual editor Back to Project uses the persisted association and respects unsaved guard", () => {
  const source=readFileSync(process.cwd()+"/src/pages/AdStudio/AdStudioEditor.tsx","utf8");
  const tree=ts.createSourceFile("editor.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression:ts.Expression|undefined;
  function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==="goProjects") expression=node.initializer;ts.forEachChild(node,visit);}
  visit(tree);assert.ok(expression);
  const code=ts.transpileModule("const fn="+expression.getText(tree)+";fn;",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const calls:string[]=[];
  const back=vm.runInNewContext(code,{projectId:project.id,navigate:(path:string)=>calls.push(path),confirmLeave:()=>true}) as ()=>void;
  back();assert.deepEqual(calls,[projectWorkspacePath(project.id)]);
  const blocked=vm.runInNewContext(code,{projectId:project.id,navigate:(path:string)=>calls.push(path),confirmLeave:()=>false}) as ()=>void;
  blocked();assert.equal(calls.length,1);
});
test("application keeps the original creative route alongside the reload-safe project route", () => {
  const source=readFileSync(process.cwd()+"/src/App.tsx","utf8");
  const tree=ts.createSourceFile("App.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const routes:string[]=[];
  function visit(node:ts.Node){if(ts.isJsxAttribute(node)&&node.name.getText(tree)==="path"&&node.initializer&&ts.isStringLiteral(node.initializer))routes.push(node.initializer.text);ts.forEachChild(node,visit);}
  visit(tree);
  assert.ok(routes.includes("/create/ad/projects/:projectId"));assert.ok(routes.includes("/create/ad/:creativeId"));
});

test("legacy project idea fallback is preserved when an Example Brief edits the ad copy", () => {
  const legacy = { ...project, brief: { coreMessage: "Original campaign thought" } };
  const next = workspaceBrief(legacy, { ...projectBriefForm(legacy), coreMessage: "New headline" });
  assert.equal(next.campaignIdea, "Original campaign thought");
  assert.equal(next.coreMessage, "New headline");
});
import { exampleBriefForm, selectProjectExample, saveWorkspaceBrief } from "./projectWorkspace";
import { ZOE_ARTISAN_HOME_CATALOG } from "./brandHomeCatalog";
const multipleShades = ZOE_ARTISAN_HOME_CATALOG.examples.find(e => e.id === "multiple-shades")!;
test("Multiple Shades establishes explicit editable context without inventing variants", () => {
  assert.ok(multipleShades);
  const form = exampleBriefForm(project, multipleShades);
  assert.equal(form.exampleBriefId,"multiple-shades"); assert.equal(form.productFocus,"shade-collection");
  assert.equal(form.productCategory,"Lipstick"); assert.equal(form.outputFormat,"vertical_1080x1920");
  assert.equal(form.brandKitId,project.brandKitId);assert.equal(form.campaignIdea,project.brief?.campaignIdea);
  assert.notEqual(form.coreMessage,form.campaignIdea);assert.equal("variants" in form,false);
});
test("selection persists via the existing project API and survives a fresh workspace load", async () => {
  let stored = structuredClone(project),calls=0;
  const api={updateProject:async(id:string,body:Record<string,unknown>)=>{calls++;assert.equal(id,project.id);stored={...stored,brief:{...stored.brief,...body.brief as typeof stored.brief}};return structuredClone(stored);}};
  await selectProjectExample(api,project,multipleShades);
  const loaded=await loadWorkspace({getProject:async()=>stored,listCreatives:async()=>({items:[]})},project.id);
  const restored=projectBriefForm(loaded.project);
  assert.equal(calls,1);assert.equal(restored.exampleBriefId,"multiple-shades");assert.equal(restored.exampleObjective,multipleShades.exampleObjective);
  assert.equal(restored.campaignIdea,project.brief?.campaignIdea);
});
test("editing a working brief sends the selected context without changing campaign or brand", async () => {
  const form=exampleBriefForm(project,multipleShades);form.exampleObjective="A creator-edited objective";form.creativeDirection="Quiet luxury";
  let payload:Record<string,unknown>|undefined;
  const saved=await saveWorkspaceBrief({updateProject:async(_id,body)=>{payload=body;return {...project,brief:body.brief as typeof project.brief};}},project,form);
  assert.equal(saved.brief?.exampleObjective,"A creator-edited objective");assert.equal(saved.brief?.creativeDirection,"Quiet luxury");
  assert.equal("brandKitId" in payload!,false);assert.equal(saved.brief?.campaignIdea,project.brief?.campaignIdea);
});
test("unbranded working brief never inherits an example or previous project's brand", () => {
  const form=exampleBriefForm({...project,brandKitId:null},multipleShades);assert.equal(form.brandKitId,"");assert.equal(form.brandPreview,null);
});
test("an older service dropping selected context blocks continuation instead of silently generating", async () => {
  const form=exampleBriefForm(project,multipleShades);
  await assert.rejects(saveWorkspaceBrief({updateProject:async()=>project},project,form),/could not retain/);
});
test("different examples retain different objective and example identity", () => {
  const other=ZOE_ARTISAN_HOME_CATALOG.examples.find(e=>e.id!=="multiple-shades")!;
  const a=exampleBriefForm(project,multipleShades),b=exampleBriefForm(project,other);
  assert.notEqual(a.exampleBriefId,b.exampleBriefId);assert.notEqual(a.exampleObjective,b.exampleObjective);
});

import { generateProjectConcepts } from './projectWorkspace';
function memoryApi(initial:WorkspaceProject) {
  let stored=structuredClone(initial); let generations=0;
  return { get stored(){return stored;},get generations(){return generations;},
    updateProject:async(id:string,body:Record<string,unknown>)=>{
      assert.equal(id,stored.id);stored={...stored,...(body.name?{name:String(body.name)}:{}),...(body.brandKitId?{brandKitId:String(body.brandKitId)}:{}),...(body.clearBrandKit?{brandKitId:null}:{}),brief:{...stored.brief,...(body.brief as typeof stored.brief)}};return structuredClone(stored);
    },generateConcepts:async()=>{generations++;return {concepts:[],generationSource:'heuristic'};}
  };
}
test('shared save persists explicit project-name edits and reopens from server',async()=>{
 const api=memoryApi(project),form=projectBriefForm(project);form.name='Renamed campaign';
 await saveWorkspaceBrief(api,project,form);assert.equal(projectBriefForm(api.stored).name,'Renamed campaign');
});
test('Home and workspace use the same save and retain optional metadata and source associations',async()=>{
 const original={...project,brief:{...project.brief,offerDetails:'Existing offer',productImageAssetId:'owned-product',referenceImageAssetId:'owned-reference',preferredColors:['#101010'],legacyMetadata:{b:2,a:1}}};
 for(const options of [{},{allowBrandChange:true}]){const api=memoryApi(original),form=projectBriefForm(original);form.coreMessage='New consumer copy';await saveWorkspaceBrief(api,original,form,options);assert.deepEqual(api.stored.brief,{...original.brief,...workspaceBrief(original,form)});assert.equal(api.stored.brief?.productImageAssetId,'owned-product');assert.equal(api.stored.brief?.referenceImageAssetId,'owned-reference');}
});
test('shared audience/message/tone fields persist one canonical value across both save origins',async()=>{
 const api=memoryApi(project);let form=projectBriefForm(project);
 form={...form,targetAudience:'Beauty creators',coreMessage:'Express yourself',desiredTone:'Quiet luxury'};
 await saveWorkspaceBrief(api,project,form);form=projectBriefForm(api.stored);assert.equal(form.targetAudience,'Beauty creators');assert.equal(form.coreMessage,'Express yourself');
 form={...form,targetAudience:'Luxury beauty buyers',desiredTone:'Cinematic'};await saveWorkspaceBrief(api,api.stored,form,{allowBrandChange:true});assert.equal(projectBriefForm(api.stored).desiredTone,'Cinematic');assert.equal(projectBriefForm(api.stored).targetAudience,'Luxury beauty buyers');
});
test('locked workspace ignores a form Brand Kit change; unlocked Home uses explicit association',async()=>{
 let api=memoryApi(project);const form=projectBriefForm(project);form.brandKitId='different-owned-kit';await saveWorkspaceBrief(api,project,form);assert.equal(api.stored.brandKitId,project.brandKitId);
 api=memoryApi(project);await saveWorkspaceBrief(api,project,form,{allowBrandChange:true});assert.equal(api.stored.brandKitId,'different-owned-kit');
});
test('save verification blocks generation for dropped name, metadata, or shared-field edits',async()=>{
 for(const missing of ['name','productImageAssetId','coreMessage']){let calls=0;const original={...project,brief:{...project.brief,productImageAssetId:'owned-source'}};const form=projectBriefForm(original);form.name='Requested rename';form.coreMessage='Requested message';
 const api={updateProject:async(_id:string,body:Record<string,unknown>)=>{const response={...original,name:String(body.name),brief:{...(body.brief as Record<string,unknown>)}};if(missing==='name')response.name=original.name;else delete response.brief[missing];return response;},generateConcepts:async()=>{calls++;return {};}};
 await assert.rejects(generateProjectConcepts(api,original,form));assert.equal(calls,0);}
});
test('a rejected save prevents generation for both save-origin options',async()=>{
 for(const options of [{},{allowBrandChange:true}]){let calls=0;const api={updateProject:async()=>{throw Error('Save failed');},generateConcepts:async()=>{calls++;return {};}};await assert.rejects(generateProjectConcepts(api,project,projectBriefForm(project),options),/Save failed/);assert.equal(calls,0);}
});
test('generation follows verified save and preserves existing editable-creative navigation contract',async()=>{
 const api=memoryApi(project);const form=exampleBriefForm(project,multipleShades);const generated=await generateProjectConcepts(api,project,form);assert.equal(api.generations,1);assert.equal(generated.project.brief?.exampleBriefId,'multiple-shades');assert.equal(generated.result.generationSource,'heuristic');
});

test('legacy metadata remains persisted without submitting unknown properties to the strict brief DTO',async()=>{
 const original={...project,brief:{...project.brief,legacyMetadata:{source:'existing'}}};let payload:Record<string,unknown>|undefined;const api=memoryApi(original);const saved=await saveWorkspaceBrief({updateProject:async(id,body)=>{payload=body;return api.updateProject(id,body);}},original,projectBriefForm(original));assert.equal('legacyMetadata' in (payload!.brief as object),false);assert.deepEqual(saved.brief?.legacyMetadata,{source:'existing'});
});

test('approved presentation can explicitly edit Campaign Idea while legacy saves preserve its original context',async()=>{
 const form={...projectBriefForm(project),campaignIdea:'  Explicit new campaign idea.  '};
 assert.equal(workspaceBrief(project,form).campaignIdea,project.brief?.campaignIdea);
 assert.equal(workspaceBrief(project,form,{allowCampaignIdeaEdit:true}).campaignIdea,form.campaignIdea);
 const api=memoryApi(project);
 const updated=await saveWorkspaceBrief(api,project,form,{allowCampaignIdeaEdit:true});assert.equal(updated.brief?.campaignIdea,form.campaignIdea);
 await assert.rejects(()=>saveWorkspaceBrief(api,project,{...form,campaignIdea:'   '},{allowCampaignIdeaEdit:true}),/Campaign Idea/);
});

test("modern save-and-generate consumes an explicitly edited campaign idea only after verified persistence",async()=>{const edited=projectBriefForm(project);edited.campaignIdea="A newly edited campaign idea";const calls:string[]=[];let saved:WorkspaceProject=project;await generateProjectConcepts({updateProject:async(id,body)=>{calls.push("save");saved={...project,...body,brief:{...project.brief,...body.brief as object}} as WorkspaceProject;return saved;},generateConcepts:async()=>{calls.push("generate");assert.equal(saved.brief?.campaignIdea,edited.campaignIdea);return {concepts:[]};}},project,edited,{allowCampaignIdeaEdit:true});assert.deepEqual(calls,["save","generate"]);});
