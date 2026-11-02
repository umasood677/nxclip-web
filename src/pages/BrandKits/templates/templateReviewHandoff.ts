import type {BrandTemplate} from './brandTemplateModel';import type {BrandKitSummary} from '../lib/brandKitTypes';
export function templateReviewHandoff(state:unknown,brandId:string,templateId?:string):{kit:BrandKitSummary;record:BrandTemplate}|null{
 const value=(state as {templateReview?:{kit?:BrandKitSummary;record?:BrandTemplate}}|null)?.templateReview;
 if(!templateId||!value?.kit||!value.record||value.kit.id!==brandId||value.record.brandKitId!==brandId||value.record.id!==templateId||!value.record.sceneGraph||!Number.isInteger(value.record.revision)||value.record.revision<1)return null;
 return {kit:value.kit,record:value.record};
}
