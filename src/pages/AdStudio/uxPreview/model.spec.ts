import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { INITIAL, CONCEPTS, FORMATS, SCREENS, reducer, restore, graphFor, screenFrom } from "./model";
test("all three journeys retain campaign context and use one state contract",()=>{
 for(const journey of ["prompt","example","template"] as const){
  const s=reducer({...INITIAL,direction:"Owner's direction",brand:"neutral"},{type:"start",journey});
  assert.equal(s.journey,journey);assert.equal(s.direction,"Owner's direction");assert.equal(s.brand,"neutral");
 }
});
test("concept selection changes direction and preserves brief/brand/format",()=>{
 const s=reducer({...INITIAL,format:"story",prompt:"A precise brief"},{type:"concept",id:"editorial"});
 assert.equal(s.headline,CONCEPTS[1].headline);assert.equal(s.format,"story");assert.equal(s.prompt,"A precise brief");
});
test("save/reopen restores the selected local creative without real IDs",()=>{
 const edited=reducer(INITIAL,{type:"update",patch:{headline:"Edited headline",cta:"Explore",format:"square"}});
 const saved=reducer(edited,{type:"save"});const changed=reducer(saved,{type:"concept",id:"collection"});
 const opened=reducer(changed,{type:"open",id:saved.saved[0].id});
 assert.equal(opened.headline,"Edited headline");assert.equal(opened.format,"square");assert.equal(opened.cta,"Explore");
 assert.match(saved.saved[0].id,/^demo-/);assert.equal(INITIAL.saved.length,0);
});
test("session restore survives reload but rejects corrupt/versioned/invalid state",()=>{
 const s=reducer({...INITIAL,direction:"Preserve me"},{type:"save"});
 assert.equal(restore(JSON.stringify(s)).saved.length,1);assert.equal(restore(JSON.stringify(s)).direction,"Preserve me");
 for(const raw of ["{",null,'{"version":99}',JSON.stringify({...INITIAL,concept:"private-id"}),JSON.stringify({...INITIAL,format:"invalid"})]) assert.equal(restore(raw).concept,"cinematic");
});
test("multiple deterministic saves remain distinct and never mutate fixtures",()=>{
 const one=reducer(INITIAL,{type:"save"}),two=reducer(one,{type:"save"});assert.equal(new Set(two.saved.map(s=>s.id)).size,2);assert.equal(INITIAL.saved.length,0);
});
test("all directions/formats generate compatible editable scene graphs",()=>{
 for(const c of CONCEPTS)for(const format of Object.keys(FORMATS) as (keyof typeof FORMATS)[]){
  const graph=graphFor({...INITIAL,format},c.id);
  assert.equal(graph.schemaVersion,"1.0");assert.equal(graph.layers.filter(l=>l.type==="text").length,3);
  assert.equal(graph.canvas.height,FORMATS[format].height);
  for(const l of graph.layers){assert.ok(l.x>=0&&l.y>=0&&l.width>0&&l.height>0);assert.ok(l.y+l.height<=graph.canvas.height);assert.equal("storageKey" in l,false);}
 }
});
test("collection uses the same illustrated product and never verified variants",()=>{
 const svg=fs.readFileSync("public/ad-studio/ux-preview/collection.svg","utf8");
 assert.equal((svg.match(/href="#product"/g)||[]).length,3);assert.match(CONCEPTS[3].description,/same illustrative product/);
});
test("all M2A and consolidated M2B screens are explicit and invalid routes fall back",()=>{
 assert.equal(SCREENS.length,40);for(const s of SCREENS)assert.equal(screenFrom(s),s);assert.equal(screenFrom("private-project"),"home");
});
test("prototype module cannot import backend clients or execute network/write transports",()=>{
 const component=fs.readFileSync("src/pages/AdStudio/uxPreview/AdStudioUXPreview.tsx","utf8");
 const model=fs.readFileSync("src/pages/AdStudio/uxPreview/model.ts","utf8");
 for(const source of [component,model])assert.doesNotMatch(source,/\bfetch\s*\(|\baxios\b|apiClient|firebase|XMLHttpRequest|WebSocket|sendBeacon|localStorage|adStudioApi|brandApi/);
 assert.match(component,/sessionStorage\.setItem\(STORAGE_KEY/);assert.match(component,/simulate|Simulated/);
});
test("development-only exact preview route preserves production route declarations",()=>{
 const before=fs.readFileSync(".tmp/ad-studio-ux-preview/before/App.tsx","utf8");
 const after=fs.readFileSync("src/App.tsx","utf8");
 for(const m of before.matchAll(/path="([^"]+)"/g))assert.ok(after.includes(m[0]),m[1]);
 assert.match(after,/import\.meta\.env\.DEV && <Route path="\/create\/ad\/ux-preview"/);
});
test("public artwork is original vector, not a private asset or external image dependency",()=>{
 for(const c of CONCEPTS){const svg=fs.readFileSync("public/ad-studio/ux-preview/"+c.id+".svg","utf8");assert.match(svg,/Original illustrative lipstick mockup/);assert.doesNotMatch(svg,/<image|https?:\/\/(?!www\.w3\.org)|brands\/|token=|signed/i);}
});
