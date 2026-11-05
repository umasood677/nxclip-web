import type {WorkspaceCreative} from '../../AdStudio/lib/projectWorkspace';
import type {BrandKitSummary} from '../lib/brandKitTypes';
export type TemplateReferenceSelection={assetId:string;purpose:'MODEL_IDENTITY'|'PRODUCT_IDENTITY'|'STYLE_REFERENCE';profileId?:string;expectedSha256?:string};
export type TemplateReferenceMetadata=Omit<TemplateReferenceSelection,'profileId'|'expectedSha256'>&{sha256:string;provenance:{brandKitId:string;brandVersion:number;profileId?:string}};
export function templateReferenceInput(source:WorkspaceCreative,brand:BrandKitSummary|null|undefined,profiles:readonly string[],styleIds:readonly string[],operation:string){
  const retained=source.templateReferenceManifest;
  const references:TemplateReferenceSelection[]=retained?.length?retained.map(r=>({assetId:r.assetId,purpose:r.purpose,profileId:r.provenance.profileId,expectedSha256:r.sha256})):
    [...new Set(source.sceneGraph?.layers.flatMap(l=>'assetId'in l&&l.assetId&&brand?.assets.some(a=>a.id===l.assetId&&a.role==='product_image')?[l.assetId]:[])||[])].map(assetId=>({assetId,purpose:'PRODUCT_IDENTITY'}));
  if(!retained?.length){for(const profileId of profiles){const assetId=brand?.voice?.studio?.characters?.find(p=>p.id===profileId)?.referenceAssetIds[0];if(!assetId)return {references,issue:'Choose an authorized model reference.'};references.push({assetId,purpose:'MODEL_IDENTITY',profileId});}references.push(...styleIds.map(assetId=>({assetId,purpose:'STYLE_REFERENCE' as const})));}
  if(retained?.length){const models=references.filter(r=>r.purpose==='MODEL_IDENTITY').map(r=>r.profileId!);if(profiles.some(id=>!models.includes(id))||models.some(id=>!profiles.includes(id)))return {references,issue:'Regeneration retains its original models. Start a new template to choose different references.'};}
  const count=references.length+(operation==='generate'?0:1);
  const issue=count>4?'Use at most four references, including the previous scene for refinement. Regenerate to use four identity/style references.':new Set(references.map(r=>r.assetId)).size!==references.length?'Choose distinct reference images.':!references.some(r=>r.purpose==='PRODUCT_IDENTITY')?'Choose an approved product reference.':null;
  return {references,issue};
}

export function templateRegenerationInstruction(source:WorkspaceCreative){
 const visual=(source.proposalDirection||'').split('\n').filter(line=>!/^\s*(Headline|Supporting copy|CTA|Tagline)\s*:/i.test(line)).join('\n');
 const roles=[['Headline','Headline'],['Supporting copy','Supporting copy'],['CTA','CTA button'],['Tagline','Brand tagline']];
 return [visual,...roles.map(([label,name])=>{const layer=source.sceneGraph?.layers.find(l=>l.name===name&&'text'in l);return label+': '+(layer&&'text'in layer?layer.text:'');})].join('\n').slice(0,4000);
}
