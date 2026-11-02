import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {BrandTemplateGallery} from './BrandTemplateGallery';
import {BrandTemplateTile} from './BrandTemplateTile';
import {readFileSync} from 'node:fs';

test('saved and draft templates use the Default Templates grid and preserve original card order',()=>{
 const tile=(id:string,width:number,height:number)=><BrandTemplateTile key={id} name={id} graph={{schemaVersion:'1.0',canvas:{width,height},layers:[]}} assetUrls={{}} kind="Editable layout" status="Saved" selected={false} busy={false} onToggle={()=>{}} onDelete={()=>{}} onPreview={()=>{}}/>;
 const html=renderToStaticMarkup(<BrandTemplateGallery label="My Brand Templates">{[tile('Portrait',1080,1350)]}{[tile('Landscape',1920,1080),tile('Story',1080,1920)]}</BrandTemplateGallery>);
 assert.match(html,/aria-label="My Brand Templates"/);assert.match(html,/w0a-grid w0a-grid-3 bt-template-gallery/);
 assert.equal((html.match(/class="w0a-card bt-library-tile"/g)||[]).length,3);
 assert.ok(html.indexOf('Portrait')<html.indexOf('Landscape'));assert.ok(html.indexOf('Landscape')<html.indexOf('Story'));
 assert.match(html,/data-canvas-w="1920" data-canvas-h="1080"/);assert.doesNotMatch(html,/flex-grow|flex-basis|height:280px/);
});
test('both Brand Template surfaces use equal-width Default-style cards without Content Library layout',()=>{
 const root=process.cwd()+'/src/pages/BrandKits/',gallery=readFileSync(root+'templates/BrandTemplateGallery.tsx','utf8'),css=readFileSync(root+'templates/brandTemplates.css','utf8');
 assert.doesNotMatch(gallery,/JustifiedGallery|buildJustifiedRows|TEMPLATE_GALLERY_LAYOUT/);
 assert.match(css,/\.bt-template-gallery\{display:grid;width:100%;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:16px;align-items:start/);
 assert.match(css,/@media\(max-width:1100px\)\{\.bt-root \.bt-template-gallery/);
 assert.match(css,/\.bt-library-tile\{width:100%;height:auto;min-height:0;align-self:flex-start/);
});
test('overview offers one Generate Template action using the shared primary style',()=>{
 const root=process.cwd()+'/src/pages/BrandKits/overview/',overview=readFileSync(root+'BrandKitOverview.tsx','utf8'),templates=readFileSync(root+'BrandOverviewTemplates.tsx','utf8');
 assert.match(overview,/className="bo-button xp-primary" to=\{paths.generate\}/);
 assert.equal((overview.match(/> Generate Template</g)||[]).length,1);
 assert.doesNotMatch(templates,/Generate Template|paths.generate/);assert.match(templates,/View All/);
});
