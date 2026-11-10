import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {CampaignAdReview} from './CampaignAdReview';
import {ProjectCreativeGallery} from './ProjectCreativeGallery';
import type {WorkspaceCreative} from '../lib/projectWorkspace';
const creative:WorkspaceCreative={id:'ad',projectId:'campaign',name:'Saved campaign ad',sceneGraph:{schemaVersion:'1.0',canvas:{width:1080,height:1350},layers:[]}};
test('saved-ad review exposes campaign-aware AI variation, format adaptation and export without creating anything',()=>{
 const before=JSON.stringify(creative),html=renderToStaticMarkup(<CampaignAdReview project={{id:'campaign',name:'Campaign'}} creative={creative} assetUrls={{}} onEdit={()=>{throw Error('must not navigate during rendering');}} onSaved={()=>{throw Error('must not save during rendering');}}/>);
 for(const label of ['Review ad','Create AI variation','Adapt formats','Export','Customize in Canvas','Continue to export'])assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/Variations/);
 assert.equal(JSON.stringify(creative),before);
});
test('campaign cards fill the original aspect ratio and lead to review with Canvas retained as an action',()=>{
 const html=renderToStaticMarkup(<ProjectCreativeGallery creatives={[creative]} assetUrls={{}} onOpen={()=>{}} onPreview={()=>{}} onExport={()=>{}} onCreate={()=>{}}/>);
 assert.match(html,/campaign-creative-grid/);assert.match(html,/aspect-ratio:1080\/1350/);assert.match(html,/Review ad/);assert.doesNotMatch(html,/min-height:260px|max-height:230px/);
});
