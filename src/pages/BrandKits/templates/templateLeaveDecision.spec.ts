import {test} from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {templateLeaveDecision} from './templateLeaveDecision';
test('clean navigation is quiet and unchanged routes never prompt',()=>{
 assert.equal(templateLeaveDecision(false,'/review','/library'),'navigate');
 assert.equal(templateLeaveDecision(true,'/review','/review'),'stay');
});
test('unsaved navigation uses an in-app decision, not native JavaScript confirmation',()=>{
 assert.equal(templateLeaveDecision(true,'/review','/library'),'confirm');
 const source=readFileSync('src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8');
 assert.doesNotMatch(source,/window\.confirm/);assert.match(source,/<TemplateLeaveDialog/);
 assert.match(source,/e\.metaKey\|\|e\.ctrlKey/);
});
test('preview measures before paint instead of mounting at fallback dimensions',()=>{
 const source=readFileSync('src/pages/BrandKits/templates/BrandTemplateScenePreview.tsx','utf8');
 assert.match(source,/useLayoutEffect\(\(\) =>/);assert.match(source,/getBoundingClientRect/);
 assert.doesNotMatch(source,/useState\(260\)|useState\(560\)/);
 const css=readFileSync('src/pages/BrandKits/templates/brandTemplates.css','utf8');
 assert.doesNotMatch(css,/bt-root \.xp-main\{gap:20px!important/);
 assert.match(css,/nxclip-production\.bt-root\.bt-review-page>.xp-main/);
});
