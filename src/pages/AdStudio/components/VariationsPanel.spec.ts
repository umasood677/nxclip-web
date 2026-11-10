import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignAiVariationPath,isCampaignAiVariation} from './VariationsPanel';

test('only provider-backed campaign children are presented as AI variations',()=>{
 assert.equal(isCampaignAiVariation({variationType:'ai-generate'}),true);
 assert.equal(isCampaignAiVariation({variationType:'ai-refine'}),true);
 assert.equal(isCampaignAiVariation({variationType:'headline'}),false);
 assert.equal(isCampaignAiVariation({variationType:'cta'}),false);
 assert.equal(isCampaignAiVariation({variationType:'color'}),false);
});

test('Canvas variation action opens the full-page campaign review workflow',()=>{
 assert.equal(campaignAiVariationPath('project id','creative/id'),'/create/ad/projects/project%20id?review=creative%2Fid&reviewTab=refine');
});
