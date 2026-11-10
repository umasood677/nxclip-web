import React from 'react';

export function campaignIdeaSections(text:string){
 return text.trim().split(/\n\s*\n/).map(block=>block.trim()).filter(Boolean).map(block=>{
  const match=block.match(/^([A-Z][A-Z &/-]{2,40}):\s*([\s\S]*)$/);
  return match?{label:match[1].toLowerCase(),text:match[2].replace(/\n+/g,' ')}:{label:'',text:block.replace(/\n+/g,' ')};
 });
}
export function CampaignIdeaSummary({text}:{text:string}){
 const blocks=campaignIdeaSections(text);
 const content=<div className="campaign-idea-summary__content">{blocks.map((block,i)=><div key={i} className={block.label?'campaign-idea-summary__field':'campaign-idea-summary__paragraph'}>{block.label&&<h3>{block.label}</h3>}<p>{block.text}</p></div>)}</div>;
 return <div className="campaign-idea-summary">{text.length>650?<details><summary><span>{text.replace(/\s+/g,' ').slice(0,210)}…</span><strong>View campaign brief</strong></summary>{content}</details>:content}</div>;
}
