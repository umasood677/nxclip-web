import {test} from "node:test";
import assert from "node:assert/strict";
import {focusedBrandDraftValue,brandDraftFieldKey,brochureFieldKey,brochurePreviewRows} from "./brandDraftFocus";
test("voice and guidelines editors map to their saved brochure labels",()=>{
 assert.equal(brochureFieldKey("Brand voice","Audience"),brandDraftFieldKey("voice","targetAudience"));
 assert.equal(brochureFieldKey("Brand voice","Preferred language"),brandDraftFieldKey("voice","doSay"));
 assert.equal(brochureFieldKey("Brand voice","Avoid"),brandDraftFieldKey("voice","dontSay"));
 assert.equal(brochureFieldKey("Creative guidelines","Usage rules"),brandDraftFieldKey("creative","freeformGuidelines"));
 assert.equal(brochureFieldKey("Creative guidelines","photography direction"),brandDraftFieldKey("creative","photographyDirection"));
});
test("focusing an empty field adds only a temporary matching preview row",()=>{
 const rows:[string,string][]=[["lighting","Soft light"]];const before=JSON.stringify(rows);
 const focus={key:"creative:composition",label:"Composition & focal point"};
 const result=brochurePreviewRows("Creative guidelines",rows,focus);
 assert.deepEqual(result[1],{key:focus.key,label:focus.label,value:"Not set yet"});
 assert.equal(brochurePreviewRows("Creative guidelines",rows).length,1);
 assert.equal(brochurePreviewRows("Brand voice",[],focus).length,0);
 assert.equal(JSON.stringify(rows),before);
});
test("focused saved values are not duplicated, and palette/type keys remain distinct",()=>{
 assert.equal(brochurePreviewRows("Brand voice",[["Tone","Calm"]],{key:"voice:tone",label:"Communication tone"}).length,1);
 assert.notEqual(brandDraftFieldKey("palette","heading"),brandDraftFieldKey("typography","heading"));
});

test("focused summary reads current draft values rather than cached or saved text",()=>{
 const kit={id:"kit",name:"Brand",voice:{tone:"Calm",doSay:["Clear","Precise"],creative:{lighting:"Soft"}},colors:[{role:"primary",hex:"#123456"}],typography:[{role:"heading",family:"Geist",weight:"600"}],guidelines:"Original rules"};
 assert.equal(focusedBrandDraftValue(kit,{key:"voice:tone",label:"Tone"}),"Calm");
 assert.equal(focusedBrandDraftValue({...kit,voice:{...kit.voice,tone:"Bold"}},{key:"voice:tone",label:"Tone"}),"Bold");
 assert.equal(focusedBrandDraftValue(kit,{key:"voice:dosay",label:"Words"}),"Clear; Precise");
 assert.equal(focusedBrandDraftValue(kit,{key:"palette:primary",label:"Color"}),"#123456");
 assert.equal(focusedBrandDraftValue(kit,{key:"typography:heading",label:"Font"}),"Geist · 600");
 assert.equal(focusedBrandDraftValue(kit,{key:"creative:freeformguidelines",label:"Rules"}),"Original rules");
});
