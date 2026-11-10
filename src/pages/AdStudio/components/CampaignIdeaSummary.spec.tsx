import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {campaignIdeaSections,CampaignIdeaSummary} from './CampaignIdeaSummary';
test('campaign labels and paragraph wording survive a compact presentation',()=>{
 const text='PRODUCT: Matte Red\n\nCAMPAIGN OBJECTIVE:\nA confident presence.\n\nKeep the model and product together.';
 assert.deepEqual(campaignIdeaSections(text),[{label:'product',text:'Matte Red'},{label:'campaign objective',text:'A confident presence.'},{label:'',text:'Keep the model and product together.'}]);
 const html=renderToStaticMarkup(<CampaignIdeaSummary text={text}/>);assert.match(html,/Matte Red/);assert.match(html,/A confident presence\./);assert.doesNotMatch(html,/<details/);
});
test('long campaign ideas have a compact summary and fully retained expandable text',()=>{
 const text='CAMPAIGN OBJECTIVE:\n'+'Creative direction. '.repeat(50);
 const html=renderToStaticMarkup(<CampaignIdeaSummary text={text}/>);assert.match(html,/<details>/);assert.match(html,/View campaign brief/);assert.match(html,/Creative direction\. Creative direction/);
});
