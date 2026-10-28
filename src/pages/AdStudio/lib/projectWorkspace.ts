import { DEFAULT_AD_BRIEF, type AdBriefFormState } from "./adStudioLabels";
import type { FeaturedExample } from "./exampleCreatives";
import type { AdConcept, AdSceneGraph } from "../types";

export type WorkspaceBrief = Partial<AdBriefFormState> & { campaignIdea?: string; [key: string]: unknown };
export type WorkspaceProject = {
  id: string; name: string; updatedAt?: string; brandKitId?: string | null; brandKitName?: string | null;
  status?: string; outputFormat?: string | null; brief?: WorkspaceBrief;
};
export type WorkspaceCreative = {
  id: string; projectId: string; name: string; updatedAt?: string;
  currentVersion?: number; sceneGraph?: AdSceneGraph | null;
};
export const projectWorkspacePath = (id: string) => "/create/ad/projects/" + encodeURIComponent(id);
export const creativeEditorPath = (id: string) => "/create/ad/" + encodeURIComponent(id);

export function projectBriefForm(project: WorkspaceProject): AdBriefFormState {
  return { ...DEFAULT_AD_BRIEF, ...project.brief, name: project.name,
    brandKitId: project.brandKitId ?? "", brandPreview: null,
    outputFormat: project.outputFormat || project.brief?.outputFormat || DEFAULT_AD_BRIEF.outputFormat };
}
export function workspaceBrief(project: WorkspaceProject, form: AdBriefFormState, options: Pick<BriefSaveOptions,"allowCampaignIdeaEdit"> = {}) {
  return { ...project.brief, productOrService: form.productOrService,
    advertisingObjective: form.advertisingObjective, targetAudience: form.targetAudience,
    coreMessage: form.coreMessage, desiredTone: form.desiredTone, platform: form.platform,
    outputFormat: form.outputFormat, cta: form.cta,
    campaignIdea: options.allowCampaignIdeaEdit && form.campaignIdea !== undefined ? form.campaignIdea : project.brief?.campaignIdea ?? project.brief?.coreMessage,
    exampleBriefId: form.exampleBriefId,
    exampleBriefTitle: form.exampleBriefTitle,
    exampleObjective: form.exampleObjective,
    productCategory: form.productCategory,
    creativeDirection: form.creativeDirection,
    productFocus: form.productFocus,
  };
}
export function newWorkspaceProject(name: string, campaignIdea: string, brandKitId = "") {
  if (!name.trim() || name.trim().length > 160) throw Error("Enter a project name (up to 160 characters).");
  if (!campaignIdea.trim() || campaignIdea.length > 4000) throw Error("Enter a Campaign Idea (up to 4,000 characters).");
  return { name: name.trim(), ...(brandKitId ? { brandKitId } : {}),
    brief: { productOrService: name.trim(), advertisingObjective: DEFAULT_AD_BRIEF.advertisingObjective,
      targetAudience: "Your intended audience", coreMessage: campaignIdea.trim().slice(0, 500),
      desiredTone: DEFAULT_AD_BRIEF.desiredTone, platform: DEFAULT_AD_BRIEF.platform,
      outputFormat: DEFAULT_AD_BRIEF.outputFormat, cta: DEFAULT_AD_BRIEF.cta, campaignIdea } };
}
export interface WorkspaceReader {
  getProject: (id: string) => Promise<WorkspaceProject>;
  listCreatives: (id: string) => Promise<{ items: WorkspaceCreative[] }>;
}
export async function loadWorkspace(api: WorkspaceReader, id: string) {
  const [project, result] = await Promise.all([api.getProject(id), api.listCreatives(id)]);
  if (project.id !== id || result.items.some(c => c.projectId !== id))
    throw Error("The project could not be loaded safely. Please retry.");
  return { project, creatives: result.items };
}
export interface WorkspaceCreator {
  createFromTemplate: (id: string, body: {
    templateId: string; format?: string; name?: string;
    primaryHeadline?: string; supportingCopy?: string; cta?: string;
  }) => Promise<WorkspaceCreative>;
  createFromConcept: (id: string, body: { conceptId: string }) => Promise<WorkspaceCreative>;
}
export async function createProjectTemplate(api: WorkspaceCreator, project: WorkspaceProject, templateId: string, format: string) {
  const creative = await api.createFromTemplate(project.id, {
    templateId, format, primaryHeadline: project.brief?.coreMessage,
    supportingCopy: project.brief?.productOrService, cta: project.brief?.cta,
  });
  if (!creative.id || creative.projectId !== project.id) throw Error("The creative's project could not be verified.");
  return creative;
}
export async function createProjectConcept(api: WorkspaceCreator, project: WorkspaceProject, conceptId: string, concepts: AdConcept[]) {
  if (!concepts.some(c => c.conceptId === conceptId)) throw Error("Choose a saved concept from this project.");
  const creative = await api.createFromConcept(project.id, { conceptId });
  if (!creative.id || creative.projectId !== project.id) throw Error("The creative's project could not be verified.");
  return creative;
}

export function exampleBriefContext(example: FeaturedExample) {
  return { exampleBriefId: example.id, exampleBriefTitle: example.title,
    exampleObjective: example.exampleObjective ?? example.briefDefaults.coreMessage ?? example.headline,
    productCategory: example.productCategory ?? example.category,
    creativeDirection: example.creativeDirection ?? example.briefDefaults.desiredTone ?? "",
    productFocus: example.productFocus ?? "product" };
}
export function exampleBriefForm(project: WorkspaceProject, example: FeaturedExample): AdBriefFormState {
  return { ...projectBriefForm(project), ...example.briefDefaults, ...exampleBriefContext(example),
    name: project.name, brandKitId: project.brandKitId ?? "", brandPreview: null,
    campaignIdea: project.brief?.campaignIdea ?? project.brief?.coreMessage };
}
export interface WorkspaceBriefWriter { updateProject:(id:string, body:Record<string,unknown>)=>Promise<WorkspaceProject>; }
export type BriefSaveOptions = { allowBrandChange?: boolean; allowCampaignIdeaEdit?: boolean };
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export async function saveWorkspaceBrief(api: WorkspaceBriefWriter, project: WorkspaceProject, form: AdBriefFormState, options: BriefSaveOptions = {}) {
  const name = form.name.trim();
  if (!name || name.length > 160) throw Error('Enter a project name (up to 160 characters).');
  if(options.allowCampaignIdeaEdit && form.campaignIdea !== undefined && (!form.campaignIdea.trim() || form.campaignIdea.length>4000)) throw Error('Enter a Campaign Idea of up to 4,000 characters.');
  const brief = workspaceBrief(project, form, options);
  // Existing metadata may contain legacy keys rejected by the public DTO.
  // Preserve those on the server; never resubmit them as new writable properties.
  const writable = new Set(['campaignIdea','exampleBriefId','exampleBriefTitle','exampleObjective','productCategory','creativeDirection','productFocus','productOrService','advertisingObjective','targetAudience','coreMessage','desiredTone','platform','outputFormat','offerDetails','promotionalPrice','cta','landingPageUrl','negativeInstructions','productImageAssetId','referenceImageAssetId','preferredColors','preferredModelProfile']);
  const body: Record<string, unknown> = { brief: Object.fromEntries(Object.entries(brief).filter(([key]) => writable.has(key))), ...(name !== project.name ? { name } : {}) };
  const brand = options.allowBrandChange ? form.brandKitId : project.brandKitId;
  if (options.allowBrandChange && (brand ?? '') !== (project.brandKitId ?? '')) Object.assign(body, brand ? { brandKitId: brand } : { clearBrandKit: true });
  const saved = await api.updateProject(project.id, body);
  if (saved.id !== project.id || (saved.brandKitId ?? '') !== (brand ?? '')) throw Error('Project context changed. Reload before continuing.');
  if (saved.name !== name) throw Error('The project name was not saved. Keep your draft and retry.');
  const trimmed = new Set(['productOrService','targetAudience','coreMessage','desiredTone','offerDetails','promotionalPrice','cta','landingPageUrl','negativeInstructions']);
  for (const [key, value] of Object.entries(brief)) {
    if (value === undefined) continue;
    const expected = typeof value === 'string' && trimmed.has(key) ? (value.trim() || (['productOrService','targetAudience','coreMessage','desiredTone'].includes(key) ? '' : undefined)) : value;
    if (JSON.stringify(canonical(saved.brief?.[key])) !== JSON.stringify(canonical(expected)))
      throw Error('The running service could not retain this working brief. Keep your draft and activate the compatible Content build before generating.');
  }
  return saved;
}
export async function generateProjectConcepts<T>(api: WorkspaceBriefWriter & { generateConcepts:(id:string, body:Record<string,unknown>)=>Promise<T> }, project: WorkspaceProject, form: AdBriefFormState, options: BriefSaveOptions = {}) {
  const saved = await saveWorkspaceBrief(api, project, form, options);
  const result = await api.generateConcepts(saved.id, { conceptCount: 4 });
  return { project: saved, result };
}
export async function selectProjectExample(api: WorkspaceBriefWriter, project: WorkspaceProject, example: FeaturedExample) {
  const form = exampleBriefForm(project, example);
  return { project: await saveWorkspaceBrief(api, project, form), form };
}

