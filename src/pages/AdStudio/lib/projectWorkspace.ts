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
  status?: 'draft' | 'ready' | 'archived';
  parentCreativeId?:string|null; variationType?:string|null;
  selectedCharacterIds?: string[];
  imageCompositionMode?:'source-preserving-v1'|'reference-guided-template-v1';
  templateReferenceManifest?:import('../../BrandKits/templates/templateReferenceInput').TemplateReferenceMetadata[];
  imageRenderMode?: 'background' | 'template-proposal';
  proposalDirection?: string;
  documentPurpose?: 'template-draft'|'concept-preview'|'campaign-ad';
  conceptPreview?: { conceptId: string; requestId: string; generated: boolean };
  templateContext?: {brandKitId:string;draftKind:'ai'|'native';brandTemplateId?:string};
  conceptSnapshot?: Record<string,unknown>|null;
  brandSnapshot?: Record<string,unknown>|null;
  metadata?: Record<string,unknown>|null;
};
export const projectWorkspacePath = (id: string) => "/create/ad/projects/" + encodeURIComponent(id);
export const creativeEditorPath = (id: string) => "/create/ad/" + encodeURIComponent(id);

/**
 * Campaign narrative is context for a creative, not automatically its display
 * headline.  Only an explicit headline (or a labelled HEADLINE line) may be
 * copied into an editable text layer.
 */
function labelledCampaignValue(brief: WorkspaceBrief | AdBriefFormState, label: string) {
  const matcher = new RegExp(
    `^\\s*${label.replace(/\s+/g, "\\s+")}\\s*:\\s*["“]?(.+?)["”]?\\s*$`,
    "im",
  );
  for (const value of [brief.campaignIdea, brief.creativeDirection, brief.coreMessage]) {
    if (typeof value !== "string") continue;
    const labelled = value.match(matcher)?.[1]?.trim();
    if (labelled) return labelled;
  }
  return "";
}

function conciseCampaignCopy(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const copy = value.trim();
  // A campaign narrative was historically persisted in `headline`. Never
  // render a multi-section brief as one text layer.
  if (!copy || copy.length > maxLength || /\n\s*\n|\b(?:campaign|creative)\s+(?:name|objective|idea|direction)\s*:/i.test(copy)) return "";
  return copy;
}

function displayAdvertisingSubject(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/^(?:uat|test|campaign)\s*(?:\d+|[a-z0-9_-]+)?\s*[—–:-]\s*/i, "")
    .trim();
}

export function campaignHeadline(brief: WorkspaceBrief | AdBriefFormState): string {
  return labelledCampaignValue(brief, "headline") || conciseCampaignCopy(brief.headline, 120);
}

export function campaignSupportingCopy(brief: WorkspaceBrief | AdBriefFormState): string {
  return labelledCampaignValue(brief, "supporting copy") || conciseCampaignCopy(brief.supportingCopy, 240);
}

export function campaignCta(brief: WorkspaceBrief | AdBriefFormState): string {
  const labelled = labelledCampaignValue(brief, "cta");
  const explicit = conciseCampaignCopy(brief.cta, 64);
  // Prefer the campaign's labelled CTA over a form default such as Learn more.
  return labelled || explicit;
}

export function projectBriefForm(project: WorkspaceProject): AdBriefFormState {
  const merged = { ...DEFAULT_AD_BRIEF, ...project.brief };
  // Prefer explicitly saved concise campaign copy.  The merged form includes
  // defaults, so reading it first can incorrectly replace a saved field with
  // an older labelled line in the original idea on reopen.
  const savedHeadline = conciseCampaignCopy(project.brief?.headline, 120);
  const hasSavedSupportingCopy = Object.prototype.hasOwnProperty.call(project.brief ?? {}, "supportingCopy");
  const savedSupportingCopy = conciseCampaignCopy(project.brief?.supportingCopy, 240);
  const savedCta = conciseCampaignCopy(project.brief?.cta, 64);
  return { ...merged,
    // Copy is campaign data, not a planning-authorization side effect.  Keep
    // explicit concise fields on every reopen; only discard legacy narrative
    // blobs that cannot be rendered as editable copy.
    headline: savedHeadline || campaignHeadline(merged),
    supportingCopy: hasSavedSupportingCopy ? savedSupportingCopy : campaignSupportingCopy(merged),
    cta: savedCta || campaignCta(merged) || DEFAULT_AD_BRIEF.cta,
    productOrService: displayAdvertisingSubject(merged.productOrService) || merged.productOrService,
    name: project.name,
    brandKitId: project.brandKitId ?? "", brandPreview: null,
    outputFormat: project.outputFormat || project.brief?.outputFormat || DEFAULT_AD_BRIEF.outputFormat };
}
export function workspaceBrief(project: WorkspaceProject, form: AdBriefFormState, options: Pick<BriefSaveOptions,"allowCampaignIdeaEdit" | "approvePlanning"> = {}) {
  return { ...project.brief, planningApproved: options.approvePlanning ?? project.brief?.planningApproved, planningAssumptions: form.planningAssumptions, headline:form.headline,supportingCopy:form.supportingCopy, productOrService: form.productOrService,
    advertisingObjective: form.advertisingObjective, targetAudience: form.targetAudience,
    coreMessage: form.coreMessage, desiredTone: form.desiredTone, platform: form.platform,
    outputFormat: form.outputFormat, cta: form.cta,
    campaignIdea: options.allowCampaignIdeaEdit && form.campaignIdea !== undefined ? form.campaignIdea : project.brief?.campaignIdea ?? project.brief?.coreMessage,
    exampleVisualDirection: form.exampleVisualDirection,
    exampleImage: form.exampleImage,
    exampleVersion: form.exampleVersion,
    defaultTemplateId: form.defaultTemplateId,
    startingCreativeId: form.startingCreativeId,
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
  listCreatives: (id: string) => Promise<{ items: WorkspaceCreative[];templateDraftCount?:number }>;
}
export async function loadWorkspace(api: WorkspaceReader, id: string) {
  const [project, result] = await Promise.all([api.getProject(id), api.listCreatives(id)]);
  if (project.id !== id || result.items.some(c => c.projectId !== id))
    throw Error("The project could not be loaded safely. Please retry.");
  return { project, creatives: result.items.filter(c=>!isTemplateDraftCreative(c)),templateDraftCount:Math.max(result.templateDraftCount || 0,result.items.filter(isTemplateDraftCreative).length) };
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
    templateId, format, primaryHeadline: campaignHeadline(project.brief ?? {}),
    supportingCopy: campaignSupportingCopy(project.brief ?? {}) || project.brief?.productOrService,
    cta: campaignCta(project.brief ?? {}),
  });
  if (!creative.id || creative.projectId !== project.id) throw Error("The creative's project could not be verified.");
  return creative;
}
/**
 * A saved template is a starting point for one campaign creative. Reopening the
 * same template and format must not silently create another campaign creative.
 */
export function existingProjectTemplateCreative(items: WorkspaceCreative[], templateId: string, format: string) {
  return items
    .filter((creative) => {
      if (isTemplateDraftCreative(creative)) return false;
      const snapshot = creative.conceptSnapshot ?? {};
      const storedTemplateId = typeof snapshot.templateId === 'string'
        ? snapshot.templateId
        : typeof snapshot.brandTemplateId === 'string' ? snapshot.brandTemplateId : undefined;
      const storedFormat = typeof creative.metadata?.format === 'string'
        ? creative.metadata.format
        : typeof snapshot.format === 'string' ? snapshot.format : undefined;
      // A template can originate from the default catalog, the saved Brand
      // Template library, or a migrated source.  Its provenance must not make
      // opening the same template create another campaign creative.
      return storedTemplateId === templateId && storedFormat === format;
    })
    .sort((left, right) => (Date.parse(right.updatedAt ?? '') || 0) - (Date.parse(left.updatedAt ?? '') || 0))[0] ?? null;
}

export async function openProjectTemplate(
  api: WorkspaceReader & WorkspaceCreator,
  project: WorkspaceProject,
  templateId: string,
  format: string,
) {
  const existing = existingProjectTemplateCreative((await api.listCreatives(project.id)).items, templateId, format);
  if (existing) return { creative: existing, existing: true };
  return { creative: await createProjectTemplate(api, project, templateId, format), existing: false };
}
export async function createProjectConcept(api: WorkspaceCreator, project: WorkspaceProject, conceptId: string, concepts: AdConcept[]) {
  if (!concepts.some(c => c.conceptId === conceptId)) throw Error("Choose a saved concept from this project.");
  const creative = await api.createFromConcept(project.id, { conceptId });
  if (!creative.id || creative.projectId !== project.id) throw Error("The creative's project could not be verified.");
  return creative;
}

export function exampleBriefContext(example: FeaturedExample) {
  if (example.catalogVersion) return {
    exampleBriefId: example.id, exampleBriefTitle: example.title,
    exampleVersion: example.catalogVersion, exampleImage: example.previewImage,
    exampleVisualDirection: example.creativeDirection,
    exampleObjective: "", productCategory: "", productFocus: "",
    defaultTemplateId: "", startingCreativeId: null,
  };
  return { exampleBriefId: example.id, exampleBriefTitle: example.title,
    exampleObjective: example.exampleObjective ?? example.briefDefaults.coreMessage ?? example.headline,
    productCategory: example.productCategory ?? example.category,
    creativeDirection: example.creativeDirection ?? example.briefDefaults.desiredTone ?? "",
    productFocus: example.productFocus ?? "product" };
}
export function exampleBriefForm(project: WorkspaceProject, example: FeaturedExample): AdBriefFormState {
  if (example.catalogVersion) return { ...projectBriefForm(project), ...exampleBriefContext(example) };
  return { ...projectBriefForm(project), ...example.briefDefaults, ...exampleBriefContext(example),headline:example.headline,supportingCopy:example.supporting,cta:example.cta,
    name: project.name, brandKitId: project.brandKitId ?? "", brandPreview: null,
    campaignIdea: project.brief?.campaignIdea ?? project.brief?.coreMessage };
}
export function selectTemplateSource(
  api: WorkspaceBriefWriter, project: WorkspaceProject,
  selection: { defaultTemplateId?: string; startingCreativeId?: string; format: string },
) {
  const form = {
    ...projectBriefForm(project), outputFormat: selection.format,
    exampleBriefId: "", exampleBriefTitle: "", exampleImage: "", exampleVersion: "", exampleVisualDirection: "",
    exampleObjective: "", productCategory: "", productFocus: "",
    defaultTemplateId: selection.defaultTemplateId ?? "", startingCreativeId: selection.startingCreativeId ?? null,
  };
  return saveWorkspaceBrief(api, project, form, {
    approvePlanning: project.brief?.planningApproved && form.outputFormat === project.brief.outputFormat ? true : undefined,
  });
}

export interface WorkspaceBriefWriter { updateProject:(id:string, body:Record<string,unknown>)=>Promise<WorkspaceProject>; }
export type BriefSaveOptions = { allowBrandChange?: boolean; allowCampaignIdeaEdit?: boolean; approvePlanning?: boolean };
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
  const writable = new Set(['exampleVisualDirection','exampleImage','exampleVersion','defaultTemplateId','startingCreativeId','planningApproved','planningAssumptions','headline','supportingCopy','campaignIdea','exampleBriefId','exampleBriefTitle','exampleObjective','productCategory','creativeDirection','productFocus','productOrService','advertisingObjective','targetAudience','coreMessage','desiredTone','platform','outputFormat','offerDetails','promotionalPrice','cta','landingPageUrl','negativeInstructions','productImageAssetId','referenceImageAssetId','preferredColors','preferredModelProfile']);
  const body: Record<string, unknown> = { brief: Object.fromEntries(Object.entries(brief).filter(([key]) => writable.has(key))), ...(name !== project.name ? { name } : {}) };
  const brand = options.allowBrandChange ? form.brandKitId : project.brandKitId;
  if (options.allowBrandChange && (brand ?? '') !== (project.brandKitId ?? '')) Object.assign(body, brand ? { brandKitId: brand } : { clearBrandKit: true });
  const saved = await api.updateProject(project.id, body);
  if (saved.id !== project.id || (saved.brandKitId ?? '') !== (brand ?? '')) throw Error('Project context changed. Reload before continuing.');
  if (saved.name !== name) throw Error('The project name was not saved. Keep your draft and retry.');
  const trimAndKeepEmpty = new Set(['supportingCopy','productOrService','targetAudience','coreMessage','desiredTone']);
  const trimAndOmitEmpty = new Set(['headline','offerDetails','promotionalPrice','cta','landingPageUrl','negativeInstructions']);
  for (const [key, value] of Object.entries(brief)) {
    if (value === undefined) continue;
    let expected = value;
    if (typeof value === 'string' && trimAndKeepEmpty.has(key)) expected = value.trim();
    if (typeof value === 'string' && trimAndOmitEmpty.has(key)) expected = value.trim() || undefined;
    if (JSON.stringify(canonical(saved.brief?.[key])) !== JSON.stringify(canonical(expected)))
      throw Error(`The service could not retain the working brief field ${key}. Your draft is still open. Reload the saved project to check it before continuing.`);
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
  const saved = await saveWorkspaceBrief(api, project, form, { approvePlanning: example.catalogVersion && project.brief?.planningApproved ? true : undefined });
  return { project: saved, form: projectBriefForm(saved) };
}


export const isTemplateDraftCreative = (creative: WorkspaceCreative) => creative.documentPurpose==='template-draft' || creative.conceptSnapshot?.purpose==='brand-template-source';
export function editorReturnPath(creative: Pick<WorkspaceCreative,'id'|'projectId'|'templateContext'|'documentPurpose'|'conceptSnapshot'>){
  if(isTemplateDraftCreative(creative as WorkspaceCreative) && creative.templateContext)return '/brands/'+encodeURIComponent(creative.templateContext.brandKitId)+'/templates?tab=brand&mode='+creative.templateContext.draftKind+'&source='+encodeURIComponent(creative.id)+'&review=1';
  const legacy=creative as WorkspaceCreative;
  if(isTemplateDraftCreative(legacy) && typeof legacy.brandSnapshot?.brandKitId==='string')return '/brands/'+encodeURIComponent(legacy.brandSnapshot.brandKitId)+'/templates?tab=brand&mode=ai&source='+encodeURIComponent(creative.id)+'&review=1';
  return projectWorkspacePath(creative.projectId);
}
