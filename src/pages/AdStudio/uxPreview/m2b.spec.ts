import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncPreviewPatch, INITIAL, FORMATS, SCREENS, reducer, restore, graphFor } from "./model";
import { CREATOR_CATEGORY_NICHES } from "../../../lib/creatorNiches";
import { TAXONOMY, PROFILES, emptyDraft, demoKit, changeCategory, identitySuggestion, generateBrandTemplates, initialBrandLibrary, templateAction, applyBrandToCampaign, restoreBrandLibrary } from "./brandPrototypeModel";
import { initialExperience, commitEditor, stepHistory, saveVersion, restoreVersion, generateVariations, makeProposal, restoreExperience } from "./roadmapModel";
test("canonical taxonomy includes every frontend category and exact backend seed niches",()=>{
 for(const c of CREATOR_CATEGORY_NICHES){const actual=TAXONOMY.find(t=>t.id===c.category)!;assert.ok(actual);for(const n of c.suggestions)assert.ok(actual.niches.some(x=>x.label===n));}
 const snapshot=JSON.parse(fs.readFileSync("src/pages/AdStudio/uxPreview/taxonomy.snapshot.json","utf8"));
 for(const c of snapshot.categories)for(const n of c.niches)assert.ok(TAXONOMY.find(t=>t.id===c.category)?.niches.some(x=>x.id===n.id&&x.label===n.label));
 assert.ok(!TAXONOMY.some(c=>["Corporate","Products"].includes(c.id)));
});
test("category changes reset dependent niche and require renewed user confirmation",()=>{
 const d=changeCategory({...demoKit("products"),taxonomyConfirmed:true},"Gaming");
 assert.equal(d.profile,"gaming");assert.equal(d.niche,"esports-competitive-highlights");assert.equal(d.taxonomyConfirmed,false);assert.equal(d.identityApproved,false);assert.equal(d.assets.length,0);
});
test("all five complete kit → templates → creative → version → campaign → reopen journeys",()=>{
 for(const p of PROFILES){
  let d=changeCategory({...emptyDraft(),name:p.name+" Reviewed"} ,p.category);d={...d,id:"demo-created-"+p.id,niche:p.niche,taxonomyConfirmed:true,assets:[{id:"demo-source-"+p.id,role:p.assets[0],label:"Original illustrative fixture",source:"original-fixture",approved:true}]};
  d=identitySuggestion(d);d={...d,identityApproved:true,guidelinesApproved:true};
  const templates=generateBrandTemplates(d,1);assert.equal(templates.length,4);assert.ok(templates.every(t=>t.brandId===d.id&&t.family.includes(d.goal)));
  let library={...initialBrandLibrary(),kits:[...initialBrandLibrary().kits,d],draft:d,templates,activeKitId:d.id,selectedTemplateId:templates[0].id};
  library=templateAction(library,templates[0].id,"approve");library=templateAction(library,templates[0].id,"save");
  const chosen=library.templates[0];assert.equal(chosen.status,"approved");assert.equal(chosen.saved,true);
  let state={...INITIAL,...applyBrandToCampaign(INITIAL,d,chosen),brandLibrary:library};
  const e=commitEditor(initialExperience(state),{productX:22,headline:"Reviewed "+p.label+" campaign"});
  state={...state,headline:e.editor.headline,experience:saveVersion(e)};
  const saved=reducer(state,{type:"save"});const reopened=reducer(restore(JSON.stringify(saved)),{type:"open",id:saved.saved[0].id});
  assert.equal(reopened.brandContext?.id,d.id);assert.equal(reopened.headline,e.editor.headline);assert.equal(reopened.experience?.editor.productX,22);
  const graph=graphFor(reopened);assert.equal(graph.layers.filter(l=>l.type==="text").length,3);assert.ok(graph.layers.some(l=>l.id==="demo-product"));assert.equal(reopened.experience?.versions.length,1);
 }
});
test("automatic template candidates are blocked until identity, taxonomy, assets and guidelines are approved",()=>{
 const d=demoKit("gaming");
 for(const bad of [{...d,identityApproved:false},{...d,guidelinesApproved:false},{...d,taxonomyConfirmed:false},{...d,assets:[]},{...d,assets:[{...d.assets[0],approved:false}]}])assert.deepEqual(generateBrandTemplates(bad,1),[]);
 assert.equal(generateBrandTemplates(d,1).length,4);
});
test("template lifecycle scopes candidates, preserves approved recipes and requires explicit transitions",()=>{
 const kit=demoKit("gaming");let l={...initialBrandLibrary(),templates:generateBrandTemplates(kit,1)};
 const id=l.templates[0].id;l=templateAction(l,id,"approve");l=templateAction(l,id,"save");l=templateAction(l,id,"duplicate");
 assert.equal(l.templates.length,5);assert.equal(l.templates[0].status,"approved");assert.equal(l.templates[4].status,"suggested");
 l=templateAction(l,id,"archive");assert.equal(l.templates[0].status,"archived");l=templateAction(l,l.templates[1].id,"reject");assert.equal(l.templates[1].status,"rejected");
 const next=[...l.templates,...generateBrandTemplates(kit,2)];assert.equal(next[0].status,"archived");assert.equal(new Set(next.map(t=>t.id)).size,next.length);
});
test("brand goal/niche, palette and font inputs visibly affect recipe and scene data",()=>{
 const d=demoKit("corporate");const alt={...d,goal:"Promote an event",niche:"career-salary",colors:[{role:"primary",hex:"#943344"},{role:"secondary",hex:"#eeeeee"}],typography:[{role:"heading",family:"montserrat"}]};
 const t=generateBrandTemplates(alt,2)[0];assert.match(t.family,/Career/);assert.match(t.headline,/Join the event/);
 const state={...INITIAL,...applyBrandToCampaign(INITIAL,alt,t)};const graph=graphFor(state);
 assert.equal((graph.layers.find(l=>l.id==="demo-accent") as {fill:string}).fill,"#943344");assert.equal((graph.layers.find(l=>l.id==="demo-headline") as {fontId:string}).fontId,"montserrat");
 assert.equal(initialExperience(state).editor.font,"montserrat");
});
test("undo redo and restored versions preserve exact local snapshots",()=>{
 const original=initialExperience(INITIAL);const edited=commitEditor(original,{productX:20,fontSize:72});
 assert.equal(original.editor.productX,35);assert.equal(stepHistory(edited).editor.productX,35);assert.equal(stepHistory(stepHistory(edited),true).editor.productX,20);
 const versioned=saveVersion(edited),changed=commitEditor(versioned,{productX:55});assert.equal(restoreVersion(changed,versioned.versions[0].id).editor.productX,20);
 assert.equal(restoreVersion(changed,"missing").editor.productX,55);
});
test("bounded version histories retain unique monotonic IDs",()=>{
 let e=initialExperience(INITIAL);for(let i=0;i<25;i++)e=saveVersion(e);assert.equal(e.versions.length,20);assert.equal(new Set(e.versions.map(v=>v.id)).size,20);assert.equal(e.versions.at(-1)?.id,"demo-version-25");
 const s=restore(JSON.stringify({...INITIAL,saved:[{id:"demo-creative-100",concept:"cinematic",headline:"Earlier",cta:"CTA",format:"portrait"}]}));assert.equal(reducer(s,{type:"save"}).saved.at(-1)?.id,"demo-creative-101");
});
test("advanced product layers remain independent and default geometry fits each format",()=>{
 for(const format of Object.keys(FORMATS) as (keyof typeof FORMATS)[]){const s={...INITIAL,format,experience:initialExperience({...INITIAL,format})};const g=graphFor(s),p=g.layers.find(l=>l.id==="demo-product")!;assert.ok(p.y+p.height<=g.canvas.height);assert.notEqual(p.id,g.layers[0].id);assert.equal(g.layers[0].type,"image");}
});
test("variation axes respect source identity and selected DNA position/palette locks",()=>{
 const e={...initialExperience(INITIAL),variationAxes:["style","composition","headline","background","platform"],dnaLocks:["palette","productPosition"]};
 const variants=generateVariations(INITIAL,e);assert.equal(variants.length,5);for(const v of variants){assert.equal(v.editor.productX,e.editor.productX);assert.equal(v.editor.background,e.editor.background);}
 assert.equal(variants.find(v=>v.axis==="platform")?.format,"square");assert.notEqual(variants.find(v=>v.axis==="headline")?.headline,INITIAL.headline);
});
test("review proposals are deterministic and do not apply themselves",()=>{
 const e=initialExperience(INITIAL);const p=makeProposal(INITIAL,e,"strategy");assert.equal(p.kind,"strategy");assert.equal(e.proposal,null);assert.equal(e.editor.headline,INITIAL.headline);
 assert.notEqual(makeProposal(INITIAL,{...e,recommendationRevision:1},"strategy").headline,p.headline);
 const gaming={...INITIAL,...applyBrandToCampaign(INITIAL,demoKit("gaming"))};assert.match(makeProposal(gaming,initialExperience(gaming),"strategy").rationale,/NOVA/);
});
test("restore preserves valid legacy M2A state and rejects invalid new contracts",()=>{
 assert.equal(restore(JSON.stringify(INITIAL)).brandContext,undefined);assert.equal(restoreBrandLibrary({revision:9}).kits.length,5);
 assert.equal(restoreExperience({revision:1,editor:{productX:"invalid"}},INITIAL).editor.productX,35);
});
test("five campaign visuals are different original SVG systems, never private photography",()=>{
 const seen=new Set<string>();for(const p of PROFILES){const file=p.id==="products"?"cinematic.svg":"industry-"+p.id+".svg";const s=fs.readFileSync("public/ad-studio/ux-preview/"+file,"utf8");seen.add(s);assert.doesNotMatch(s,/<image|brands\/|token=|signed=/i);}assert.equal(seen.size,5);
});
test("all forty screens retain the original sixteen M2A route values",()=>{
 for(const id of ["home","brief","templates","template","assets","progress","concepts","detail","compare","preview","edit","variations","workspace","formats","export","performance"])assert.ok(SCREENS.includes(id as typeof SCREENS[number]));assert.equal(SCREENS.length,40);
});
test("all new prototype modules exclude network, production state clients and real upload transports",()=>{
 for(const file of ["BrandPrototypeScreens.tsx","brandPrototypeModel.ts","RoadmapScreens.tsx","roadmapModel.ts","AdvancedCanvasPrototype.tsx","MotionPrototype.tsx"]){const s=fs.readFileSync("src/pages/AdStudio/uxPreview/"+file,"utf8");assert.doesNotMatch(s,/\bfetch\s*\(|\baxios\b|apiClient|firebase|XMLHttpRequest|WebSocket|sendBeacon|putToUploadUrl|brandApi|adStudioApi/);}
});

test("explicit brand reset cannot inherit previous editor identity; simple edits still synchronize",()=>{const a=demoKit(PROFILES[0].id),b=demoKit(PROFILES[1].id);const state={...INITIAL,...applyBrandToCampaign(INITIAL,a)};state.experience=initialExperience(state);const patch=syncPreviewPatch(state,applyBrandToCampaign(state,b));assert.equal(patch.experience,undefined);const next=reducer(state,{type:"update",patch});const layer=graphFor(next).layers.find(l=>l.id==="demo-brand");assert.ok(layer&&"text" in layer);assert.equal(layer.text,b.name);const edited=syncPreviewPatch(state,{headline:"New copy"});assert.equal(edited.experience?.editor.headline,"New copy");});

test("style variation changes visible treatment while respecting palette and typography locks",()=>{const e=initialExperience(INITIAL);e.variationAxes=["style"];const v=generateVariations(INITIAL,e)[0];assert.notEqual(v.editor.background,e.editor.background);assert.notEqual(v.editor.font,e.editor.font);e.dnaLocks=["palette","typography"];const locked=generateVariations(INITIAL,e)[0];assert.equal(locked.editor.background,e.editor.background);assert.equal(locked.editor.font,e.editor.font);});
