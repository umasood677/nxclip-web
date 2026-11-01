import type {AdSceneGraph,AdSceneLayer} from '../../AdStudio/types';
export interface TemplateProductConfiguration {schemaVersion:1;slots:Array<{label:string;color?:string;assetId?:string}>;modelProfileId?:string;}
export function resizeProductSlots(c:TemplateProductConfiguration,count:number):TemplateProductConfiguration{if(!Number.isInteger(count)||count<1||count>4)throw Error('Choose one to four products.');return {...c,slots:Array.from({length:count},(_,i)=>c.slots[i]||{label:'Shade '+(i+1),color:'#9e2440'})};}
export function bindProductLayer(graph:AdSceneGraph,id:string,assetId:string){
 const next=structuredClone(graph),i=next.layers.findIndex(l=>l.id===id),old=next.layers[i];if(!old||old.locked)throw Error('Select an unlocked product slot.');
 const match=id.match(/(?:template-product-slot-|template:slotHint:)(\d+)$/);
 const layer:AdSceneLayer={id:match?'template-product-slot-'+match[1]:old.id,type:old.type==='logo'?'logo':'image',name:old.name,x:old.x,y:old.y,width:old.width,height:old.height,zIndex:old.zIndex,rotation:old.rotation,opacity:old.opacity,visible:old.visible,assetId,objectFit:'contain'};
 next.layers[i]=layer;for(const l of next.layers)if(l.type==='group'&&'children'in l&&Array.isArray(l.children))l.children=l.children.map(v=>v===old.id?layer.id:v);return {graph:next,selectedId:layer.id};
}
export function sourceSlot(layer:AdSceneLayer|undefined){return !!layer&&(layer.id.startsWith('template-product-slot-')||layer.id.includes(':slotHint:'));}

/** Non-billable suggestion only. Explicit user settings take precedence. */
export function suggestedProductCount(brief:string){const m=brief.match(/\b([1-4]|one|two|three|four)\s+(?:(?:lipstick|product)\s+)?(?:shades?|products?|variants?|lipsticks?)\b/i);if(!m)return undefined;return ({one:1,two:2,three:3,four:4} as Record<string,number>)[m[1].toLowerCase()]||Number(m[1]);}

export function resizeTemplateSourceGraph(source:AdSceneGraph,count:number):AdSceneGraph{
 if(!Number.isInteger(count)||count<1||count>4)throw Error('Choose one to four products.');
 const graph=structuredClone(source),slots=graph.layers.filter(sourceSlot).sort((a,b)=>Number(a.id.match(/(\d+)$/)?.[1])-Number(b.id.match(/(\d+)$/)?.[1]));
 if(slots.slice(count).some(l=>l.locked))throw Error('Unlock product slots before removing them.');
 const removed=new Set(slots.slice(count).map(l=>l.id));
 graph.layers=graph.layers.filter(l=>!removed.has(l.id)&&!(l.id.startsWith('template-swatch-')&&Number(l.id.split('-').at(-1))>count));
 const model=graph.layers.some(l=>l.id.startsWith('brand-character-')),left=model ? .46 : .06,area=model ? .48 : .88,w=graph.canvas.width,h=graph.canvas.height,cell=w*area/count,artwork=graph.layers.some(l=>l.id.startsWith('ai-background-'));
 for(let i=0;i<count;i++){
  let layer=graph.layers.find(l=>l.id===slots[i]?.id);
  if(!layer){layer={id:'template:slotHint:'+(i+1),type:'shape',name:'Product '+(i+1),shape:'roundedRectangle',fill:'#24242b',text:'Product '+(i+1)+' · Add photograph',textColor:'#ffffff',fontSize:Math.max(12,w*.018),x:0,y:0,width:1,height:1,zIndex:20+i,visible:!artwork};graph.layers.push(layer);}
  if(!layer.locked){layer.x=w*left+i*cell;layer.y=h*.3;layer.width=cell*.88;layer.height=h*.43;}
 }
 const ids=new Set(graph.layers.map(l=>l.id));for(const group of graph.layers)if(group.type==='group'&&'children'in group&&Array.isArray(group.children))group.children=group.children.filter(id=>ids.has(id as string));
 return graph;
}
