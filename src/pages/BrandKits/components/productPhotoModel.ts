import type {BrandAssetEntry} from '../lib/brandKitTypes';
export function productPhotoName(fileName:string,assets:BrandAssetEntry[]){
 const base=fileName.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim().slice(0,110)||'Product photograph';
 const names=new Set(assets.map(a=>a.label?.trim().toLocaleLowerCase()).filter(Boolean));let name=base,index=2;
 while(names.has(name.toLocaleLowerCase()))name=base+' '+index++;
 return name;
}
export function productPhotoMetadata(name:string,description='',usageGuidance='',subject='product'){
 const label=name.trim();
 if(!label)throw Error('Enter a '+subject+' image name.');
 if(label.length>120)throw Error('Keep the '+subject+' image name within 120 characters.');
 return {label,description:description.trim()||undefined,usageGuidance:usageGuidance.trim()||undefined};
}

export function photoAspectRatio(width:number,height:number){return Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0?width/height:4/5;}
