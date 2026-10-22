// GENERATED from W8 libs/contracts; edit canonical backend source and re-export.
/** JSON Schema subset used by these portable contracts; no remote schema resolution. */
export interface BlueprintWireSchema {
  type?: string | readonly string[];
  const?: unknown;
  enum?: readonly unknown[];
  properties?: Record<string, BlueprintWireSchema>;
  required?: readonly string[];
  additionalProperties?: false;
  items?: BlueprintWireSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
}
const text: BlueprintWireSchema = { type: 'string', minLength: 1, maxLength: 4000 };
const nullableText: BlueprintWireSchema = {
  type: ['string', 'null'],
  minLength: 1,
  maxLength: 4000,
};
const id: BlueprintWireSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 160,
  pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
};
const unit: BlueprintWireSchema = { type: 'number', minimum: 0, maximum: 1 };
const integer = (minimum: number, maximum: number): BlueprintWireSchema => ({
  type: 'integer',
  minimum,
  maximum,
});
const list = (items: BlueprintWireSchema, minItems = 0, maxItems = 80): BlueprintWireSchema => ({
  type: 'array',
  items,
  minItems,
  maxItems,
});
const choice = (...values: string[]): BlueprintWireSchema => ({ type: 'string', enum: values });
const literal = (value: unknown): BlueprintWireSchema => ({ const: value });
const object = (properties: Record<string, BlueprintWireSchema>): BlueprintWireSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const region = object({
  id,
  x: unit,
  y: unit,
  width: { ...unit, minimum: 0.000001 },
  height: { ...unit, minimum: 0.000001 },
});
const qualityId = choice(
  'productIdentity',
  'packagingGeometry',
  'logoLabelIntegrity',
  'modelConsistency',
  'brandColor',
  'brandTypography',
  'compositionFocalPoint',
  'safeAreas',
  'textLegibility',
);
const capability = choice(
  'generateImage',
  'referenceGuidedImage',
  'editImage',
  'segmentForeground',
  'sourcePixelComposite',
  'inpaintImage',
  'evaluateQuality',
);
export const CREATIVE_BLUEPRINT_SCHEMA_V1 = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:nxclip:creative-blueprint:1.0.0',
  ...object({
    schemaVersion: literal('1.0.0'),
    blueprintId: id,
    revision: integer(1, 1000000),
    entryPoint: object({ kind: choice('template', 'exampleBrief'), id, version: text }),
    catalog: object({ templateId: id, templateVersion: text, catalogVersion: text }),
    creative: object({
      objective: text,
      audience: text,
      productOrService: text,
      coreMessage: text,
    }),
    references: list(
      object({
        id,
        availability: choice('committed', 'w7Only', 'missing'),
        approval: choice('approvedVisualBaseline', 'pendingMapping'),
        locator: nullableText,
        sha256: { type: ['string', 'null'], pattern: '^[a-f0-9]{64}$' },
        approvalEvidence: nullableText,
        provenance: nullableText,
        allowedUses: {
          ...list(choice('internalDesignReview', 'compositionGuidance'), 1, 2),
          uniqueItems: true,
        },
      }),
      1,
      10,
    ),
    requirements: list(
      object({
        slotId: id,
        role: id,
        minCount: integer(0, 4),
        maxCount: integer(1, 4),
        distinctBy: choice('assetId', 'productId'),
        acceptedMime: {
          ...list(choice('image/png', 'image/jpeg', 'image/webp'), 1, 3),
          uniqueItems: true,
        },
        minimumWidth: integer(1, 4096),
        minimumHeight: integer(1, 4096),
      }),
      1,
      20,
    ),
    artDirection: object({
      expectedComposition: text,
      background: text,
      lighting: text,
      mood: text,
      camera: text,
      avoid: list(text, 1, 20),
    }),
    composition: object({
      regions: list(region, 1, 80),
      safeArea: region,
      focalPoint: object({ x: unit, y: unit }),
      visualReferenceDifference: nullableText,
    }),
    branding: object({
      source: literal('userBrandKitOrExplicitUnbranded'),
      preserveLogo: literal(true),
      neverUseDemoBrand: literal(true),
    }),
    typography: object({
      headline: { type: 'string', maxLength: 1000 },
      supporting: { type: 'string', maxLength: 4000 },
      cta: { type: 'string', maxLength: 200 },
      fontSource: literal('brandKitOrUserSelection'),
      minimumFontPx: integer(1, 256),
      minimumContrast: { type: 'number', minimum: 1, maximum: 21 },
      renderAsEditableLayers: literal(true),
    }),
    identity: object({
      mode: literal('sourcePixels'),
      generativeIdentityGuaranteed: literal(false),
      protectedFeatures: { ...list(text, 1, 20), uniqueItems: true },
      allowedTransforms: {
        ...list(choice('translate', 'uniformScale', 'crop', 'rotate'), 1, 4),
        uniqueItems: true,
      },
      novelPose: literal('unsupported'),
      humanReviewRequired: literal(true),
    }),
    editableLayers: list(
      object({ id, kind: choice('image', 'text', 'shape', 'logo'), required: { type: 'boolean' } }),
      1,
      80,
    ),
    output: object({
      formatId: choice(
        'square_1080',
        'portrait_1080x1350',
        'vertical_1080x1920',
        'landscape_1920x1080',
      ),
      width: integer(64, 4096),
      height: integer(64, 4096),
      aspectRatio: choice('1:1', '4:5', '9:16', '16:9'),
      exports: { ...list(choice('png', 'jpeg'), 1, 2), uniqueItems: true },
      maxLayers: integer(1, 80),
      sceneGraphVersion: literal('1.0'),
    }),
    qualityChecks: list(
      object({
        id: qualityId,
        verification: choice('automatic', 'aiAssistedUncertain', 'humanReviewRequired'),
        severity: choice('hard', 'review'),
        evaluator: choice(
          'sourceHash',
          'geometryComparison',
          'visualComparison',
          'brandTokens',
          'fontResolution',
          'layoutBounds',
          'contrastAndGlyphs',
        ),
        acceptance: text,
      }),
      9,
      9,
    ),
    providerRequirements: list(object({ capability, reason: text }), 1, 7),
  }),
} satisfies BlueprintWireSchema & { $schema: string; $id: string };

/** Wire schema for the diagnostic response, independent of any execution/billing API. */
export const COMPOSITION_PREFLIGHT_RESULT_SCHEMA_V1 = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:nxclip:composition-preflight-result:1.0.0',
  ...object({
    schemaVersion: literal('1.0.0'),
    mode: literal('nonBillablePreflight'),
    featureEnabled: { type: 'boolean' },
    readyForCompositionPlanning: { type: 'boolean' },
    executionAuthorized: literal(false),
    requiredAssets: list(
      object({ slotId: id, minCount: integer(0, 4), maxCount: integer(1, 4) }),
      0,
      20,
    ),
    missingAssets: list(object({ slotId: id, count: integer(1, 4) }), 0, 20),
    requiredCapabilities: { ...list(capability, 0, 7), uniqueItems: true },
    unsupportedCapabilities: { ...list(capability, 0, 7), uniqueItems: true },
    estimatedSteps: list(
      object({
        operation: choice(
          'understandAssets',
          'planScene',
          'generateImage',
          'segmentForeground',
          'integrateSourcePixels',
          'validateQuality',
        ),
        minCount: integer(0, 80),
        maxCount: integer(0, 80),
        execution: literal('notExecuted'),
      }),
      0,
      6,
    ),
    credits: object({ status: literal('unavailable'), range: literal(null), reason: text }),
    qualityChecks: list(
      object({
        id: qualityId,
        verification: choice('automatic', 'aiAssistedUncertain', 'humanReviewRequired'),
        status: literal('notEvaluated'),
      }),
      0,
      9,
    ),
    warnings: list(object({ code: id, path: text, message: text }), 0, 1000),
    blockers: list(object({ code: id, path: text, message: text }), 0, 1000),
  }),
} satisfies BlueprintWireSchema & { $schema: string; $id: string };
