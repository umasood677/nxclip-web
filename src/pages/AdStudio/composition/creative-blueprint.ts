// GENERATED from W8 libs/contracts; edit canonical backend source and re-export.
/** W8.1 portable contracts. No service, provider, editor or billing side effects. */
export const CREATIVE_BLUEPRINT_VERSION = '1.0.0' as const;
export const W8_COMPOSITION_ENABLED_DEFAULT = false;
export const CREATIVE_CAPABILITIES = [
  'generateImage',
  'referenceGuidedImage',
  'editImage',
  'segmentForeground',
  'sourcePixelComposite',
  'inpaintImage',
  'evaluateQuality',
] as const;
export type CreativeCapability = (typeof CREATIVE_CAPABILITIES)[number];
export type VerificationClass = 'automatic' | 'aiAssistedUncertain' | 'humanReviewRequired';
export type QualityCheckId =
  | 'productIdentity'
  | 'packagingGeometry'
  | 'logoLabelIntegrity'
  | 'modelConsistency'
  | 'brandColor'
  | 'brandTypography'
  | 'compositionFocalPoint'
  | 'safeAreas'
  | 'textLegibility';
export interface BlueprintRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface BlueprintReference {
  id: string;
  availability: 'committed' | 'w7Only' | 'missing';
  approval: 'approvedVisualBaseline' | 'pendingMapping';
  /** Evidence locator only. Never a runtime URL or object-storage read grant. */
  locator: string | null;
  sha256: string | null;
  approvalEvidence: string | null;
  provenance: string | null;
  allowedUses: Array<'internalDesignReview' | 'compositionGuidance'>;
}
export interface BlueprintAssetRequirement {
  slotId: string;
  role: string;
  minCount: number;
  maxCount: number;
  distinctBy: 'assetId' | 'productId';
  acceptedMime: string[];
  minimumWidth: number;
  minimumHeight: number;
}
export interface BlueprintQualityCheck {
  id: QualityCheckId;
  verification: VerificationClass;
  severity: 'hard' | 'review';
  evaluator:
    | 'sourceHash'
    | 'geometryComparison'
    | 'visualComparison'
    | 'brandTokens'
    | 'fontResolution'
    | 'layoutBounds'
    | 'contrastAndGlyphs';
  acceptance: string;
}
export interface CreativeBlueprintV1 {
  schemaVersion: typeof CREATIVE_BLUEPRINT_VERSION;
  blueprintId: string;
  revision: number;
  entryPoint: { kind: 'template' | 'exampleBrief'; id: string; version: string };
  catalog: { templateId: string; templateVersion: string; catalogVersion: string };
  creative: { objective: string; audience: string; productOrService: string; coreMessage: string };
  references: BlueprintReference[];
  requirements: BlueprintAssetRequirement[];
  artDirection: {
    expectedComposition: string;
    background: string;
    lighting: string;
    mood: string;
    camera: string;
    avoid: string[];
  };
  composition: {
    /** Baseline catalog geometry; reference discrepancies are explicit, not corrections. */
    regions: BlueprintRegion[];
    safeArea: BlueprintRegion;
    focalPoint: { x: number; y: number };
    visualReferenceDifference: string | null;
  };
  branding: {
    source: 'userBrandKitOrExplicitUnbranded';
    preserveLogo: true;
    neverUseDemoBrand: true;
  };
  typography: {
    headline: string;
    supporting: string;
    cta: string;
    fontSource: 'brandKitOrUserSelection';
    minimumFontPx: number;
    minimumContrast: number;
    renderAsEditableLayers: true;
  };
  identity: {
    mode: 'sourcePixels';
    generativeIdentityGuaranteed: false;
    protectedFeatures: string[];
    allowedTransforms: Array<'translate' | 'uniformScale' | 'crop' | 'rotate'>;
    novelPose: 'unsupported';
    humanReviewRequired: true;
  };
  editableLayers: Array<{
    id: string;
    kind: 'image' | 'text' | 'shape' | 'logo';
    required: boolean;
  }>;
  output: {
    formatId: string;
    width: number;
    height: number;
    aspectRatio: string;
    exports: Array<'png' | 'jpeg'>;
    maxLayers: number;
    sceneGraphVersion: '1.0';
  };
  qualityChecks: BlueprintQualityCheck[];
  providerRequirements: Array<{ capability: CreativeCapability; reason: string }>;
}
export interface BlueprintValidationIssue {
  path: string;
  message: string;
}
export type BlueprintValidationResult =
  | { valid: true; blueprint: CreativeBlueprintV1; issues: [] }
  | { valid: false; issues: BlueprintValidationIssue[] };
/** Future trusted server adapter must supply owned-asset evidence, not client attestation. */
export interface CompositionPreflightAsset {
  assetId: string;
  slotId: string;
  role: string;
  productId?: string;
  ownerVerified: boolean;
  mimeType: string;
  width: number;
  height: number;
  sourceSha256: string;
}
export interface CompositionPreflightFinding {
  code: string;
  path: string;
  message: string;
}
export interface CompositionPreflightResultV1 {
  schemaVersion: '1.0.0';
  mode: 'nonBillablePreflight';
  featureEnabled: boolean;
  /** Input readiness only; never authority to execute or debit. */
  readyForCompositionPlanning: boolean;
  executionAuthorized: false;
  requiredAssets: Array<{ slotId: string; minCount: number; maxCount: number }>;
  missingAssets: Array<{ slotId: string; count: number }>;
  requiredCapabilities: CreativeCapability[];
  unsupportedCapabilities: CreativeCapability[];
  estimatedSteps: Array<{
    operation:
      | 'understandAssets'
      | 'planScene'
      | 'generateImage'
      | 'segmentForeground'
      | 'integrateSourcePixels'
      | 'validateQuality';
    minCount: number;
    maxCount: number;
    execution: 'notExecuted';
  }>;
  /** Adapter USD constants are not user credit prices. */
  credits: { status: 'unavailable'; range: null; reason: string };
  qualityChecks: Array<{
    id: QualityCheckId;
    verification: VerificationClass;
    status: 'notEvaluated';
  }>;
  warnings: CompositionPreflightFinding[];
  blockers: CompositionPreflightFinding[];
}
