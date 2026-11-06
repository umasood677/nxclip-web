import type {BrandKitSummary} from '../lib/brandKitTypes';
import type {TemplateProductConfiguration} from './templateProductSettings';

// Fallbacks are shade guides, not measured colors or permission to recolor a photograph.
const shades = [
 {name:'maroon',pattern:/\bmaroon\b/i,hex:'#800000'},
 {name:'burgundy',pattern:/\b(?:burgundy|wine)\b/i,hex:'#800020'},
 {name:'brown',pattern:/\b(?:chocolate|brown)\b/i,hex:'#5c3317'},
 {name:'red',pattern:/\b(?:red|crimson|scarlet)\b/i,hex:'#b32032'},
 {name:'pink',pattern:/\b(?:pink|rose)\b/i,hex:'#c76b85'},
 {name:'purple',pattern:/\b(?:purple|plum|violet)\b/i,hex:'#703050'},
 {name:'nude',pattern:/\b(?:nude|beige)\b/i,hex:'#c49a80'},
 {name:'orange',pattern:/\b(?:orange|coral)\b/i,hex:'#e56b4a'},
] as const;
const hexPattern=/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i;
const normalizeHex=(value:string)=>value.length===4?'#'+[...value.slice(1)].map(c=>c+c).join(''):value;
const words=(value:string)=>value.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2&&!['matte','shade','color','colour','brand','product'].includes(w));
export function namedProductShade(text:string){return shades.find(s=>s.pattern.test(text.replace(/\brose[ -]gold\b/gi,'')));}

/** Only product-scoped clauses count; scenery, wardrobe, lips and copy colors do not. */
export function productColorInstruction(idea:string,label='',single=true):string{
 const labelWords=words(label).filter(w=>!['lipstick','photo','photograph','image','original','luxury','set'].includes(w));
 const clauses=idea.split(/[.!?\n;,]+|\bagainst\b/i);
 const matches=clauses.filter(clause=>{
  if(/\b(?:background|backdrop|environment|lighting|headline|typography|cta|wardrobe|packaging|casing|accents?|lips)\b/i.test(clause))return false;
  if(shades.filter(s=>s.pattern.test(clause.replace(/\brose[ -]gold\b/gi,''))).length>1)return false;
  const product=/\b(?:lipsticks?|products?|shade|color|colour)\b/i.test(clause);
  const target=single||labelWords.length>0&&labelWords.some(w=>new RegExp('\\b'+w+'\\b','i').test(clause));
  return product&&target&&(hexPattern.test(clause)||!!namedProductShade(clause));
 });
 // Ambiguous multi-shade prose must not assign one shade to every slot.
 const relevant=matches.filter(c=>single||labelWords.some(w=>new RegExp('\\b'+w+'\\b','i').test(c)));
 return relevant.length===1?relevant[0]:'';
}

export function resolveProductShade(kit:BrandKitSummary,label:string,idea='',single=true):{color?:string;source:string}{
 const asset=kit.assets?.find(a=>a.role==='product_image'&&(a.label===label||a.fileName===label));
 const identity=label+' '+(asset?.fileName||'');
 const details=productColorInstruction(asset?.description||'');
 const identityShade=namedProductShade(identity)||namedProductShade(details);
 const instruction=productColorInstruction(idea,label,single),ideaShade=namedProductShade(instruction);
 // A contradictory brief cannot change the identity of an explicitly selected product.
 const compatible=!identityShade||!ideaShade||identityShade.name===ideaShade.name;
 const explicit=compatible&&instruction.match(hexPattern)?.[0];
 if(explicit)return {color:normalizeHex(explicit),source:'Creative idea'};
 const metadataHex=details.match(hexPattern)?.[0];
 if(metadataHex)return {color:normalizeHex(metadataHex),source:'Brand Kit product details'};
 const tokens=new Set(words(identity));
 const palette=(kit.colors||[]).filter(c=>c.name&&/^#[0-9a-f]{6}$/i.test(c.hex)).map(c=>({color:c.hex,score:words(c.name!).filter(w=>tokens.has(w)).length})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
 if(palette[0])return {color:palette[0].color,source:'Brand Kit palette'};
 const shade=identityShade||(compatible?ideaShade:undefined);
 if(shade){
  const named=(kit.colors||[]).find(c=>c.name&&namedProductShade(c.name)?.name===shade.name);
  return {color:named?.hex||shade.hex,source:named?'Brand Kit palette':shade.name+' shade guide'};
 }
 return {source:'Choose shade guide'};
}

export function productShadeConflict(label:string,idea:string,single=true):string|undefined{
 const selected=namedProductShade(label),requested=namedProductShade(productColorInstruction(idea,label,single));
 if(selected&&requested&&selected.name!==requested.name)return `Creative idea requests ${requested.name}; selected product is ${selected.name}. Update the idea or choose the matching product.`;
}

export const productShadeKey=(index:number,slot:TemplateProductConfiguration['slots'][number])=>index+':'+(slot.assetId||slot.label);
export function applyTemplateProductShades(kit:BrandKitSummary,value:TemplateProductConfiguration,idea:string,overrides:Record<string,string>={}):TemplateProductConfiguration{
 return {...value,slots:value.slots.map((slot,index)=>({...slot,color:overrides[productShadeKey(index,slot)]||resolveProductShade(kit,slot.label,idea,value.slots.length===1).color}))};
}
